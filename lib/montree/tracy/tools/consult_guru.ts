// lib/montree/tracy/tools/consult_guru.ts
//
// Tracy → Guru bridge. Tracy queries the historical Guru analyses for a child.
//
// CONTEXT:
//   Guru is the per-child Maria-Montessori-in-pocket AI that teachers use. Every
//   Guru chat lands in `montree_guru_interactions` with `response_insight`
//   (Guru's actual analysis), `response_root_cause`, `response_action_plan`,
//   `response_parent_talking_point`, and a `context_snapshot` JSONB.
//
//   The Yo-yo dossier (Session 132) pulled directly from these analyses — the
//   working interpretation of the sleep pattern was largely Guru's, repackaged
//   into Tracy's chief-of-staff voice. This tool makes that workflow native.
//
// FILTER RULES:
//   - Skip photo-identification queries. The convention used elsewhere is
//     `question NOT LIKE 'photo:%'` (see lib/montree/guru/context-builder.ts).
//     Per-photo identification chats are noise; the principal cares about
//     real teacher-asked questions.
//   - Filter by school via the parent classroom + child chain. Since
//     `montree_guru_interactions.child_id` is FK'd to children, and children
//     are FK'd to classrooms, and classrooms have `school_id`, the easiest
//     defence-in-depth check is to verify the child belongs to the school
//     BEFORE running the lookup. The caller (Tracy's tool executor) already
//     does this when it resolves the child via `child_focus`.
//
// CROSS-POLLINATION CONTRACT:
//   - childId is the cross-school boundary. Tracy must NEVER pass a childId
//     she didn't resolve from a school-scoped query first.
//   - This module re-verifies the child belongs to the school as
//     belt-and-braces, but the canonical guard lives in the caller.
//
// COST: pure DB read. No AI spend.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ConsultGuruInput {
  childId: string;
  schoolId: string;
  /**
   * Optional keywords to narrow the recall. When provided, we apply a
   * post-fetch re-rank by keyword overlap (kept simple — no embeddings).
   * Useful for "what has Guru said about Yo-yo's sleep?" rather than
   * "every Guru chat we've ever had about Yo-yo".
   */
  topicKeywords?: string[];
  /** Max number of analyses to return. Default 8, cap 30. */
  limit?: number;
}

export interface GuruAnalysis {
  id: string;
  asked_at_iso: string;
  question: string;
  question_type: string | null;
  insight: string;
  root_cause: string | null;
  action_plan: string[] | null;
  timeline: string | null;
  parent_talking_point: string | null;
  outcome: string | null;
  /** First 240 chars of context_snapshot summary, when present. */
  context_summary: string | null;
}

export interface ConsultGuruResult {
  ok: boolean;
  error?: string;
  data?: {
    child_id: string;
    analyses: GuruAnalysis[];
    /** Total matches before the limit cap. Used by Sonnet to disclaim coverage. */
    total_matches: number;
    /** Whether keyword re-ranking was applied. */
    keyword_filtered: boolean;
  };
}

/**
 * Pull Guru analyses for a child. Skips photo-identification queries.
 * Cross-school safe: re-verifies child belongs to schoolId before reading.
 */
export async function consultGuru(
  input: ConsultGuruInput,
  supabase: SupabaseClient
): Promise<ConsultGuruResult> {
  const { childId, schoolId, topicKeywords, limit = 8 } = input;

  if (!childId) return { ok: false, error: 'childId is required' };
  if (!schoolId) return { ok: false, error: 'schoolId is required' };

  const cappedLimit = Math.max(1, Math.min(30, Math.floor(limit)));

  // Belt-and-braces school check. The caller should have done this already,
  // but cheap insurance.
  const { data: child, error: childErr } = await supabase
    .from('montree_children')
    .select('id, classroom_id, name')
    .eq('id', childId)
    .maybeSingle();
  if (childErr) {
    return { ok: false, error: `child lookup failed: ${childErr.message}` };
  }
  if (!child) {
    return { ok: false, error: 'child not found' };
  }

  if (child.classroom_id) {
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', child.classroom_id)
      .maybeSingle();
    if (!classroom || classroom.school_id !== schoolId) {
      return { ok: false, error: 'child does not belong to this school' };
    }
  }

  // Pull a generous window. We may slice further after keyword re-rank.
  const fetchLimit = topicKeywords && topicKeywords.length > 0
    ? Math.min(50, cappedLimit * 3)
    : cappedLimit;

  // Filter pattern matches lib/montree/guru/context-builder.ts: exclude
  // per-photo identification queries (which start with "photo:") and
  // require a non-null response_insight.
  const { data: rows, error } = await supabase
    .from('montree_guru_interactions')
    .select(
      'id, asked_at, question, question_type, response_insight, response_root_cause, response_action_plan, response_timeline, response_parent_talking_point, outcome, context_snapshot'
    )
    .eq('child_id', childId)
    .not('question', 'like', 'photo:%')
    .not('response_insight', 'is', null)
    .order('asked_at', { ascending: false })
    .limit(fetchLimit);

  if (error) {
    return { ok: false, error: `guru lookup failed: ${error.message}` };
  }

  let analyses: GuruAnalysis[] = (rows || []).map((r) => {
    const actionPlanRaw = r.response_action_plan as unknown;
    let actionPlan: string[] | null = null;
    if (Array.isArray(actionPlanRaw)) {
      actionPlan = actionPlanRaw
        .map((step) => {
          if (typeof step === 'string') return step;
          if (step && typeof step === 'object') {
            const s = step as Record<string, unknown>;
            const action = typeof s.action === 'string' ? s.action : null;
            const text = typeof s.text === 'string' ? s.text : null;
            return action || text || JSON.stringify(step);
          }
          return String(step);
        })
        .filter((s) => s.trim().length > 0)
        .slice(0, 6);
    }

    let contextSummary: string | null = null;
    const ctx = r.context_snapshot as Record<string, unknown> | null;
    if (ctx && typeof ctx === 'object') {
      const summary =
        (ctx.summary as string | undefined) ||
        (ctx.observation as string | undefined) ||
        null;
      if (summary && typeof summary === 'string') {
        contextSummary = summary.slice(0, 240);
      }
    }

    return {
      id: r.id,
      asked_at_iso: r.asked_at,
      question: r.question,
      question_type: r.question_type ?? null,
      insight: r.response_insight,
      root_cause: r.response_root_cause ?? null,
      action_plan: actionPlan,
      timeline: r.response_timeline ?? null,
      parent_talking_point: r.response_parent_talking_point ?? null,
      outcome: r.outcome ?? null,
      context_summary: contextSummary,
    };
  });

  const totalMatches = analyses.length;
  let keywordFiltered = false;

  // Optional keyword re-rank. Simple bag-of-words overlap. Kept deliberately
  // unsophisticated — Sonnet is the smart layer, this is just a filter.
  if (topicKeywords && topicKeywords.length > 0 && analyses.length > 0) {
    const kws = topicKeywords
      .map((k) => k.toLowerCase().trim())
      .filter((k) => k.length > 1);

    if (kws.length > 0) {
      const scored = analyses.map((a) => {
        const haystack = [
          a.question,
          a.insight,
          a.root_cause || '',
          a.parent_talking_point || '',
          a.context_summary || '',
        ]
          .join(' ')
          .toLowerCase();
        let score = 0;
        for (const kw of kws) {
          if (haystack.includes(kw)) score += 1;
        }
        return { a, score };
      });

      // Keep matches > 0 and sort by score DESC, asked_at DESC.
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (
          new Date(b.a.asked_at_iso).getTime() -
          new Date(a.a.asked_at_iso).getTime()
        );
      });
      analyses = scored.filter((s) => s.score > 0).map((s) => s.a);
      keywordFiltered = true;
    }
  }

  analyses = analyses.slice(0, cappedLimit);

  return {
    ok: true,
    data: {
      child_id: childId,
      analyses,
      total_matches: totalMatches,
      keyword_filtered: keywordFiltered,
    },
  };
}
