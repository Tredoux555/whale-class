// lib/montree/gloria/tool-executor.ts
//
// Gloria's tool dispatch. Called from the agent-gloria SSE route inside the
// Opus tool-use loop.
//
// 🚨 CROSS-POLLINATION CONTRACT (load-bearing):
//   Every read tool MUST self-scope by `agentId`. The agent role's JWT is
//   tied to a montree_teachers row whose schools are linked via
//   founding_teacher_id. An agent must never see another agent's pipeline.
//   The executor enforces this — schoolId on the agent JWT is INERT here.
//
//   For draft tools, no DB read happens — they just call Anthropic to produce
//   a text body. School identity isn't used; only the agent's identity for
//   logging.

import type Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HAIKU_MODEL } from '@/lib/ai/anthropic';
import { getLanguageName, getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';

export interface GloriaToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  result_summary?: string;
}

export interface GloriaToolDeps {
  supabase: SupabaseClient;
  anthropic: Anthropic | null;
  /** The agent's userId — the cross-pollination filter. */
  agentId: string;
  /** Agent's UI locale. Forwarded to Haiku for translations to make better choices on register. */
  locale?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

const SCHOOL_FIELDS =
  'id, name, created_at, revenue_share_pct, revenue_share_active, founding_teacher_id';

async function fetchAgentSchools(supabase: SupabaseClient, agentId: string) {
  const { data: schools, error } = await supabase
    .from('montree_schools')
    .select(SCHOOL_FIELDS)
    .eq('founding_teacher_id', agentId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const schoolIds = (schools || []).map((s) => s.id);
  if (!schoolIds.length) return { schools: [], countMap: {} as Record<string, number> };

  const { data: kids } = await supabase
    .from('montree_children')
    .select('school_id')
    .in('school_id', schoolIds)
    .eq('is_active', true);

  const countMap: Record<string, number> = {};
  for (const c of kids || []) {
    countMap[c.school_id] = (countMap[c.school_id] || 0) + 1;
  }

  return { schools: schools || [], countMap };
}

async function fetchSchoolActivity(supabase: SupabaseClient, schoolId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [classroomRes, kidsRes, principalRes, mediaRes, apiRes] = await Promise.all([
    supabase.from('montree_classrooms').select('id').eq('school_id', schoolId).eq('is_active', true),
    supabase.from('montree_children').select('id').eq('school_id', schoolId).eq('is_active', true),
    supabase
      .from('montree_school_admins')
      .select('last_login, created_at')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('montree_media')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('teacher_confirmed', true)
      .gte('captured_at', sevenDaysAgo),
    supabase
      .from('montree_api_usage')
      .select('created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    classroomCount: classroomRes.data?.length || 0,
    studentCount: kidsRes.data?.length || 0,
    principalLastLoginAt: principalRes.data?.last_login || null,
    photosThisWeek: mediaRes.count || 0,
    lastApiCallAt: apiRes.data?.created_at || null,
  };
}

function deriveVerdict(activity: {
  classroomCount: number;
  studentCount: number;
  principalLastLoginAt: string | null;
  photosThisWeek: number;
  lastApiCallAt: string | null;
}): { verdict: 'healthy' | 'quiet' | 'idle' | 'never_started'; days_since_last_activity: number | null } {
  const last =
    activity.lastApiCallAt && activity.principalLastLoginAt
      ? activity.lastApiCallAt > activity.principalLastLoginAt
        ? activity.lastApiCallAt
        : activity.principalLastLoginAt
      : activity.lastApiCallAt || activity.principalLastLoginAt;

  let daysSince: number | null = null;
  if (last) {
    const ms = Date.now() - new Date(last).getTime();
    if (Number.isFinite(ms)) daysSince = Math.floor(ms / (24 * 60 * 60 * 1000));
  }

  if (!last && activity.studentCount === 0 && activity.classroomCount === 0) {
    return { verdict: 'never_started', days_since_last_activity: null };
  }
  if (daysSince === null || daysSince > 21) {
    return { verdict: 'idle', days_since_last_activity: daysSince };
  }
  if (daysSince > 7 || activity.photosThisWeek === 0) {
    return { verdict: 'quiet', days_since_last_activity: daysSince };
  }
  return { verdict: 'healthy', days_since_last_activity: daysSince };
}

// ── Drafting helpers (Haiku for cost — Opus is the orchestrator's job) ──

async function callHaikuForText(
  anthropic: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
  const res = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();
  return text;
}

// ── Main dispatch ─────────────────────────────────────────────────────

export async function executeGloriaTool(
  name: string,
  input: Record<string, unknown>,
  deps: GloriaToolDeps
): Promise<GloriaToolResult> {
  const { supabase, anthropic, agentId, locale = 'en' } = deps;

  try {
    switch (name) {
      // ── READ: list_my_schools ────────────────────────────────────
      case 'list_my_schools': {
        const { schools, countMap } = await fetchAgentSchools(supabase, agentId);
        const summary = schools.map((s) => ({
          id: s.id,
          name: s.name,
          created_at: s.created_at,
          student_count: countMap[s.id] || 0,
          revenue_share_pct: s.revenue_share_pct === null ? null : Number(s.revenue_share_pct),
          revenue_share_active: Boolean(s.revenue_share_active),
        }));
        return {
          success: true,
          data: { schools: summary },
          result_summary: `${summary.length} school(s)`,
        };
      }

      // ── READ: list_my_codes ──────────────────────────────────────
      case 'list_my_codes': {
        const status = typeof input.status === 'string' ? input.status : null;
        let q = supabase
          .from('montree_referral_codes')
          .select(
            'id, code, status, agent_pitch_label, redeemed_by_school_id, revenue_share_pct, created_at'
          )
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false });
        if (status) q = q.eq('status', status);
        const { data: codes, error } = await q;
        if (error) {
          // Most likely cause: montree_referral_codes table missing or schema drift.
          return {
            success: false,
            error: `Codes lookup failed: ${error.message}`,
          };
        }

        // Resolve school names for redeemed codes
        const redeemedSchoolIds = (codes || [])
          .map((c) => c.redeemed_by_school_id)
          .filter((id): id is string => Boolean(id));
        let nameById: Record<string, string> = {};
        if (redeemedSchoolIds.length) {
          const { data: redeemedSchools } = await supabase
            .from('montree_schools')
            .select('id, name')
            .in('id', redeemedSchoolIds);
          nameById = Object.fromEntries(
            (redeemedSchools || []).map((s) => [s.id, s.name || ''])
          );
        }

        const summary = (codes || []).map((c) => ({
          id: c.id,
          code: c.code,
          status: c.status,
          pitch_label: c.agent_pitch_label,
          redeemed_by_school_name: c.redeemed_by_school_id
            ? nameById[c.redeemed_by_school_id] || null
            : null,
          revenue_share_pct: c.revenue_share_pct === null ? null : Number(c.revenue_share_pct),
          created_at: c.created_at,
        }));

        return {
          success: true,
          data: { codes: summary },
          result_summary: `${summary.length} code(s)${status ? ` (${status})` : ''}`,
        };
      }

      // ── READ: school_health ──────────────────────────────────────
      case 'school_health': {
        const schoolId = String(input.school_id || '').trim();
        if (!schoolId) return { success: false, error: 'school_id required' };

        // Cross-pollination check: school must belong to this agent.
        const { data: school } = await supabase
          .from('montree_schools')
          .select('id, name, founding_teacher_id, revenue_share_pct, revenue_share_active')
          .eq('id', schoolId)
          .maybeSingle();
        if (!school || school.founding_teacher_id !== agentId) {
          return {
            success: false,
            error: 'That school is not in your referrals.',
          };
        }

        // Resolve AI tier
        let aiTier: 'free' | 'haiku' | 'sonnet' = 'free';
        try {
          const { data: features } = await supabase
            .from('montree_school_features')
            .select('feature_key, enabled')
            .eq('school_id', schoolId)
            .in('feature_key', ['ai_tier_haiku', 'ai_tier_sonnet']);
          for (const f of features || []) {
            if (f.feature_key === 'ai_tier_sonnet' && f.enabled) aiTier = 'sonnet';
            else if (f.feature_key === 'ai_tier_haiku' && f.enabled && aiTier !== 'sonnet')
              aiTier = 'haiku';
          }
        } catch {
          // best-effort
        }

        const activity = await fetchSchoolActivity(supabase, schoolId);
        const { verdict, days_since_last_activity } = deriveVerdict(activity);

        return {
          success: true,
          data: {
            school: {
              id: school.id,
              name: school.name,
              revenue_share_pct: school.revenue_share_pct === null ? null : Number(school.revenue_share_pct),
              revenue_share_active: Boolean(school.revenue_share_active),
            },
            student_count: activity.studentCount,
            classroom_count: activity.classroomCount,
            principal_last_login_at: activity.principalLastLoginAt,
            photos_this_week: activity.photosThisWeek,
            last_api_call_at: activity.lastApiCallAt,
            days_since_last_activity,
            ai_tier: aiTier,
            verdict,
          },
          result_summary: `${school.name}: ${verdict}`,
        };
      }

      // ── DRAFT: draft_outreach_email ──────────────────────────────
      case 'draft_outreach_email': {
        if (!anthropic) return { success: false, error: 'AI not configured' };
        const schoolName = String(input.school_name || '').trim();
        if (!schoolName) return { success: false, error: 'school_name required' };
        const country = String(input.country || '').trim();
        const lang = typeof input.language === 'string' ? input.language : 'en';
        const context = String(input.context || '').trim();
        const langName = getLanguageName(lang);
        const langInstruction = getAILanguageInstruction(lang);

        const systemPrompt = `You draft cold outreach emails for a Montessori platform agent. Output is ONE email — subject line on the first line, blank line, body. No preamble, no signature placeholder, no commentary.${langInstruction}

Tone: warm, specific, decisive. Like a colleague who has done this work. NOT salesy. Open with one specific reason this school in particular caught attention. Close with a low-friction CTA (a 20-minute call OR a one-month free trial they can self-serve via montree.xyz).

Length: 80-140 words body. Subject line under 60 chars.

Cultural register adapts to ${country || 'the school\'s country'}: Chinese formal, Anglo direct, Italian warmer, Spanish neither too formal nor too casual. Do not lecture about culture — just produce the right tone.

Honesty: never invent specific facts about the school (programmes, history, named individuals) unless they're in the context provided.

Sign-off: short, just first-name placeholder "[Your name]" — the agent fills in.`;

        const userPrompt = `School: ${schoolName}
Country: ${country || 'unknown'}
Target language: ${langName}
${context ? `Context the agent gave:\n${context}\n` : ''}

Draft the email.`;

        const text = await callHaikuForText(anthropic, systemPrompt, userPrompt, 600);
        if (!text) {
          return { success: false, error: 'Draft came back empty — try again.' };
        }
        return {
          success: true,
          data: { draft: text, language: lang },
          result_summary: `outreach draft (${langName})`,
        };
      }

      // ── DRAFT: draft_followup_email ──────────────────────────────
      case 'draft_followup_email': {
        if (!anthropic) return { success: false, error: 'AI not configured' };
        const schoolName = String(input.school_name || '').trim();
        if (!schoolName) return { success: false, error: 'school_name required' };
        const country = String(input.country || '').trim();
        const lang = typeof input.language === 'string' ? input.language : 'en';
        const days = Number(input.days_since_first_email);
        const context = String(input.context || '').trim();
        const langName = getLanguageName(lang);
        const langInstruction = getAILanguageInstruction(lang);

        const systemPrompt = `You draft follow-up emails for a Montessori platform agent. Output is ONE email — subject line (typically "Re: <original subject or topic>"), blank line, body. No preamble, no commentary.${langInstruction}

Tone: warm, brief, NEVER apologetic. The agent is following up because she believes this is worth the school's time, not because she's sorry to bother them. 40-80 words body.

If days_since_first_email is provided, calibrate gently — under 7 days is too soon (suggest waiting), 7-14 days is normal, 14-30 days is overdue, 30+ days warrants a fresh angle (mention what's changed since).

If context contains a partial reply or sentiment, factor it in (acknowledge they're busy, reference whatever they asked).

End with a single low-friction option — a 15-minute call OR "if now isn't the right time, no problem at all, I'm here when you are."

Cultural register adapts to ${country || 'the school\'s country'}.`;

        const userPrompt = `School: ${schoolName}
Country: ${country || 'unknown'}
Target language: ${langName}
${Number.isFinite(days) ? `Days since first email: ${days}\n` : ''}
${context ? `Context the agent gave:\n${context}\n` : ''}

Draft the follow-up.`;

        const text = await callHaikuForText(anthropic, systemPrompt, userPrompt, 500);
        if (!text) {
          return { success: false, error: 'Follow-up draft came back empty — try again.' };
        }
        return {
          success: true,
          data: { draft: text, language: lang },
          result_summary: `follow-up draft (${langName})`,
        };
      }

      // ── DRAFT: translate_text ────────────────────────────────────
      case 'translate_text': {
        if (!anthropic) return { success: false, error: 'AI not configured' };
        const text = String(input.text || '').trim();
        if (!text) return { success: false, error: 'text required' };
        const target = typeof input.target_language === 'string' ? input.target_language : 'en';
        const langName = getLanguageName(target);

        const systemPrompt = `You translate text into ${langName}. Output ONLY the translated text — no preamble, no notes, no quotation marks unless the source has them. Preserve line breaks, paragraph structure, register, and tone. Do not "improve" the source — translate faithfully.`;

        const userPrompt = `Translate the following into ${langName}:

${text}`;

        const translated = await callHaikuForText(anthropic, systemPrompt, userPrompt, 1500);
        if (!translated) {
          return { success: false, error: 'Translation came back empty.' };
        }
        return {
          success: true,
          data: { translated, target_language: target },
          result_summary: `translated to ${langName}`,
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Tool execution failed',
    };
  } finally {
    void locale; // reserved for future per-locale draft adjustments
  }
}
