// lib/montree/tracy/frameworks/unpack-teacher.ts
//
// "How is Susan doing?" — server-side analysis that returns the structured
// intermediate Tracy proses over.
//
// The framework: ACTIVITY → COVERAGE → QUALITY → PATTERN → VERDICT.
// Each layer produces a small, named field. Tracy's prose layer reads the
// intermediate and writes a chief-of-staff answer. The structure means the
// answer's SHAPE is consistent every time — what varies is the substance.
//
// DATA SOURCES (load-bearing — see CLAUDE.md schema notes):
//   - montree_teachers           : last_login_at, classroom_id, name
//   - montree_classrooms         : classroom name + roster lookup
//   - montree_children           : roster (filtered by classroom)
//   - montree_media              : teacher_confirmed photos in window;
//                                  attribution by classroom (proxy) since
//                                  confirmed_by may not be reliable on all rows
//   - montree_teacher_notes      : teacher_id is reliable (per migration 148)
//                                  → THE strongest per-teacher signal
//   - montree_child_progress     : status changes in window for the teacher's
//                                  classroom roster → pattern signal
//                                  mastery_confirmed_by may match teacher_id
//
// SCHOOL-SCOPING:
//   The caller passes schoolId from auth. Every query in here filters by
//   school_id (or by classroom_id, which is itself school-scoped via the
//   teacher row). Cross-school leakage is impossible by construction.

import type { SupabaseClient } from '@supabase/supabase-js';
import type Anthropic from '@anthropic-ai/sdk';
import { scoreNoteQuality } from './note-quality';

export interface UnpackTeacherInput {
  teacherId: string;
  schoolId: string;
  windowDays?: number; // default 7
}

export interface UnpackTeacherResult {
  ok: boolean;
  error?: string;
  // Structured intermediate Tracy proses over.
  data?: {
    teacher: {
      id: string;
      name: string;
      classroom_name: string | null;
      last_login_at: string | null;
      days_since_last_login: number | null;
    };
    window: {
      days: number;
      from_iso: string;
      to_iso: string;
    };
    activity: {
      photos_confirmed_in_classroom: number;
      notes_written: number;
      mastery_confirmations: number;
      logins_in_window_estimate: 'recent' | 'stale' | 'never';
    };
    coverage: {
      roster_size: number;
      children_with_evidence: number; // photo OR note in window
      neglected_children: Array<{ id: string; name: string }>;
      coverage_pct: number; // 0-100
      distribution: 'even' | 'mild_skew' | 'strong_skew';
      // Top 3 children by evidence count (photos+notes) so Tracy can
      // mention if there are obvious favourites.
      most_observed: Array<{ id: string; name: string; evidence_count: number }>;
    };
    quality: {
      notes_sampled: number;
      avg_word_count: number;
      substantive_notes: number; // count of notes scored >=3 of 5
      score: number; // 1-5 average from Haiku scorer; null-friendly via 0
      sample_substantive_quote: string | null;
      // Caller may render "Quality is strong / mixed / thin" — tracy reads.
      label: 'strong' | 'mixed' | 'thin' | 'no_notes';
    };
    pattern: {
      children_with_progress: number;
      children_stalled_3w: Array<{ id: string; name: string; days_stalled: number }>;
      // Whether the children under this teacher are moving forward as a group
      verdict: 'progressing' | 'mixed' | 'stalled';
    };
    verdict: {
      // ONE of:
      //   'strong_week'   — high coverage + non-thin notes + progressing
      //   'normal_week'   — coverage ok, progressing or mixed, non-thin notes
      //   'soft_week'     — quieter than usual, no red flags
      //   'concerning'    — low coverage AND (thin notes OR stalled OR very stale login)
      //   'no_data'       — teacher has no classroom assigned or empty roster
      //                     (so coverage/pattern/etc. are meaningless)
      // Computed deterministically from the layers above so Tracy's prose
      // doesn't drift in tone.
      label:
        | 'strong_week'
        | 'normal_week'
        | 'soft_week'
        | 'concerning'
        | 'no_data';
      headline: string; // one sentence summary the model can quote or paraphrase
      reasons: string[]; // 1-3 evidence bullet points (text, no formatting)
    };
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function unpackTeacher(
  input: UnpackTeacherInput,
  supabase: SupabaseClient,
  anthropic: Anthropic | null
): Promise<UnpackTeacherResult> {
  const windowDays = Math.max(1, Math.min(60, input.windowDays ?? 7));
  const now = Date.now();
  const fromMs = now - windowDays * MS_PER_DAY;
  const fromIso = new Date(fromMs).toISOString();
  const toIso = new Date(now).toISOString();

  // ── 1. Resolve teacher (school-scoped) ─────────────────────────────
  const { data: teacher, error: tErr } = await supabase
    .from('montree_teachers')
    .select('id, name, classroom_id, last_login_at, school_id, is_active')
    .eq('id', input.teacherId)
    .eq('school_id', input.schoolId)
    .maybeSingle();

  if (tErr) return { ok: false, error: `teacher lookup failed: ${tErr.message}` };
  if (!teacher) return { ok: false, error: 'teacher not found in your school' };
  if (!teacher.is_active) {
    return { ok: false, error: 'teacher is not active' };
  }

  // Classroom name (best-effort)
  let classroomName: string | null = null;
  if (teacher.classroom_id) {
    const { data: cl } = await supabase
      .from('montree_classrooms')
      .select('name')
      .eq('id', teacher.classroom_id)
      .maybeSingle();
    classroomName = cl?.name ?? null;
  }

  // Days since last login
  let daysSinceLogin: number | null = null;
  if (teacher.last_login_at) {
    daysSinceLogin = Math.max(
      0,
      Math.floor((now - new Date(teacher.last_login_at).getTime()) / MS_PER_DAY)
    );
  }

  // ── 2. Roster (children assigned to this teacher's classroom) ──────
  // We pull enrolled_at so the stalled-detection layer can avoid flagging
  // a child who joined yesterday as "21 days stalled" (they haven't had
  // time to progress).
  const rosterChildren: Array<{
    id: string;
    name: string;
    enrolled_ms: number | null;
  }> = [];
  if (teacher.classroom_id) {
    const { data: kids } = await supabase
      .from('montree_children')
      .select('id, name, enrolled_at, created_at')
      .eq('classroom_id', teacher.classroom_id)
      .eq('school_id', input.schoolId)
      .eq('is_active', true);
    for (const k of kids || []) {
      // Prefer enrolled_at (the canonical join date); fall back to
      // created_at if enrolled_at is null on legacy rows.
      const joinSource = k.enrolled_at || k.created_at || null;
      const enrolledMs = joinSource
        ? new Date(joinSource).getTime()
        : null;
      rosterChildren.push({
        id: k.id,
        name: k.name,
        enrolled_ms: Number.isFinite(enrolledMs as number)
          ? (enrolledMs as number)
          : null,
      });
    }
  }
  const rosterIds = rosterChildren.map((c) => c.id);
  const rosterById = new Map(rosterChildren.map((c) => [c.id, c.name]));

  // ── 3. Activity layer ──────────────────────────────────────────────
  // Photos: confirmed photos in this teacher's classroom, in the window.
  // (We use classroom-as-proxy for teacher attribution because confirmed_by
  // is not reliably populated on all media rows. Lead teacher gets credit.)
  let photosConfirmed = 0;
  const evidencePhotoChildIds = new Set<string>();
  const evidenceCountById = new Map<string, number>();

  if (rosterIds.length > 0) {
    const { data: photos } = await supabase
      .from('montree_media')
      .select('child_id, captured_at')
      .in('child_id', rosterIds)
      .eq('teacher_confirmed', true)
      .gte('captured_at', fromIso);
    for (const p of photos || []) {
      photosConfirmed++;
      if (p.child_id) {
        evidencePhotoChildIds.add(p.child_id);
        evidenceCountById.set(
          p.child_id,
          (evidenceCountById.get(p.child_id) ?? 0) + 1
        );
      }
    }
  }

  // Notes: teacher_id IS reliable on montree_teacher_notes (migration 148).
  const { data: notes } = await supabase
    .from('montree_teacher_notes')
    .select('id, content, transcription, child_id, created_at')
    .eq('teacher_id', input.teacherId)
    .eq('school_id', input.schoolId)
    .gte('created_at', fromIso)
    .order('created_at', { ascending: false });

  const noteRows = notes || [];
  const notesWritten = noteRows.length;
  const evidenceNoteChildIds = new Set<string>();
  for (const n of noteRows) {
    if (n.child_id) {
      evidenceNoteChildIds.add(n.child_id);
      evidenceCountById.set(
        n.child_id,
        (evidenceCountById.get(n.child_id) ?? 0) + 1
      );
    }
  }

  // Mastery confirmations: teacher marked something mastered in window.
  let masteryConfirmations = 0;
  if (rosterIds.length > 0) {
    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('mastered_at, mastery_confirmed_by, child_id, status, updated_at')
      .in('child_id', rosterIds)
      .eq('mastery_confirmed_by', input.teacherId)
      .gte('mastered_at', fromIso);
    masteryConfirmations = (progress || []).length;
  }

  // Login recency bucket
  let loginBucket: 'recent' | 'stale' | 'never' = 'never';
  if (daysSinceLogin === null) loginBucket = 'never';
  else if (daysSinceLogin <= 3) loginBucket = 'recent';
  else if (daysSinceLogin <= 14) loginBucket = 'stale';
  else loginBucket = 'stale'; // 15+ still 'stale' — Tracy's prose can read days_since_last_login for the precise number

  // ── 4. Coverage layer ──────────────────────────────────────────────
  const childrenWithEvidence = new Set<string>();
  evidencePhotoChildIds.forEach((id) => childrenWithEvidence.add(id));
  evidenceNoteChildIds.forEach((id) => childrenWithEvidence.add(id));
  const coveragePct =
    rosterIds.length > 0
      ? Math.round((childrenWithEvidence.size / rosterIds.length) * 100)
      : 0;

  const neglected: Array<{ id: string; name: string }> = rosterChildren
    .filter((c) => !childrenWithEvidence.has(c.id))
    .slice(0, 6);

  // Distribution: how skewed is the evidence count? Use coefficient of
  // variation across children with at least one piece of evidence.
  let distribution: 'even' | 'mild_skew' | 'strong_skew' = 'even';
  const evidenceCounts = Array.from(evidenceCountById.values());
  if (evidenceCounts.length >= 3) {
    const mean =
      evidenceCounts.reduce((a, b) => a + b, 0) / evidenceCounts.length;
    if (mean > 0) {
      const variance =
        evidenceCounts.reduce((sum, n) => sum + (n - mean) ** 2, 0) /
        evidenceCounts.length;
      const stdev = Math.sqrt(variance);
      const cv = stdev / mean;
      if (cv > 1.0) distribution = 'strong_skew';
      else if (cv > 0.5) distribution = 'mild_skew';
    }
  }

  const mostObserved = Array.from(evidenceCountById.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({
      id,
      name: rosterById.get(id) ?? '(unknown)',
      evidence_count: count,
    }));

  // ── 5. Quality layer (Haiku-scored, capped) ────────────────────────
  // Sample up to 8 of the teacher's notes from the window. Score each on
  // a 1–5 scale via Haiku. Cheap (<$0.005 per call). If anthropic is null
  // we degrade gracefully to length-only scoring.
  const noteTexts: Array<{ id: string; text: string }> = [];
  for (const n of noteRows.slice(0, 8)) {
    const text = (n.transcription || n.content || '').trim();
    if (text.length >= 5) {
      noteTexts.push({ id: n.id, text });
    }
  }

  let avgWords = 0;
  let substantiveCount = 0;
  let qualityScoreAvg = 0;
  let sampleSubstantive: string | null = null;
  let qualityLabel: 'strong' | 'mixed' | 'thin' | 'no_notes' = 'no_notes';

  if (noteTexts.length > 0) {
    avgWords =
      noteTexts.reduce((sum, n) => sum + n.text.split(/\s+/).length, 0) /
      noteTexts.length;

    const scores = await scoreNoteQuality(
      noteTexts.map((n) => n.text),
      anthropic
    );
    if (scores.length > 0) {
      qualityScoreAvg =
        scores.reduce((a, b) => a + b, 0) / scores.length;
      substantiveCount = scores.filter((s) => s >= 3).length;
      const bestIdx = scores.findIndex((s) => s === Math.max(...scores));
      if (bestIdx >= 0 && scores[bestIdx] >= 3) {
        // Truncate sample so we don't bloat tool output.
        const t = noteTexts[bestIdx].text;
        sampleSubstantive = t.length > 240 ? t.slice(0, 240) + '…' : t;
      }
      if (qualityScoreAvg >= 3.5) qualityLabel = 'strong';
      else if (qualityScoreAvg >= 2.5) qualityLabel = 'mixed';
      else qualityLabel = 'thin';
    } else {
      // Haiku unavailable — fall back to word-count heuristic.
      substantiveCount = noteTexts.filter(
        (n) => n.text.split(/\s+/).length >= 12
      ).length;
      qualityLabel =
        substantiveCount >= noteTexts.length * 0.6
          ? 'strong'
          : substantiveCount > 0
            ? 'mixed'
            : 'thin';
    }
  }

  // ── 6. Pattern layer ───────────────────────────────────────────────
  // Children whose progress moved (any status change OR new mastery) in the
  // window. Children stalled = no progress row updated in 21+ days.
  let childrenWithProgress = 0;
  const childrenStalled: Array<{ id: string; name: string; days_stalled: number }> = [];

  if (rosterIds.length > 0) {
    const { data: progressInWindow } = await supabase
      .from('montree_child_progress')
      .select('child_id')
      .in('child_id', rosterIds)
      .gte('updated_at', fromIso);
    const movedSet = new Set<string>();
    for (const p of progressInWindow || []) {
      if (p.child_id) movedSet.add(p.child_id);
    }
    childrenWithProgress = movedSet.size;

    // Stalled detection — find max(updated_at) per child in roster
    const threeWeeksAgoMs = now - 21 * MS_PER_DAY;
    const { data: lastUpdates } = await supabase
      .from('montree_child_progress')
      .select('child_id, updated_at')
      .in('child_id', rosterIds)
      .order('updated_at', { ascending: false });
    const lastByChild = new Map<string, number>();
    for (const row of lastUpdates || []) {
      if (row.child_id && !lastByChild.has(row.child_id)) {
        lastByChild.set(
          row.child_id,
          new Date(row.updated_at).getTime()
        );
      }
    }
    for (const child of rosterChildren) {
      // Skip children who haven't been in the classroom 21+ days yet —
      // they couldn't be "stalled 3 weeks" by definition.
      if (
        child.enrolled_ms !== null &&
        now - child.enrolled_ms < 21 * MS_PER_DAY
      ) {
        continue;
      }
      const last = lastByChild.get(child.id);
      if (last === undefined) {
        // No progress rows ever AND the child has been on roster 21+ days
        // (or we don't know the enrol date). Use enrolled_ms to compute
        // a real "stalled days" if we have it — otherwise fall back to 21.
        const stalledDays =
          child.enrolled_ms !== null
            ? Math.floor((now - child.enrolled_ms) / MS_PER_DAY)
            : 21;
        childrenStalled.push({
          id: child.id,
          name: child.name,
          days_stalled: stalledDays,
        });
      } else if (last < threeWeeksAgoMs) {
        childrenStalled.push({
          id: child.id,
          name: child.name,
          days_stalled: Math.floor((now - last) / MS_PER_DAY),
        });
      }
    }
    childrenStalled.sort((a, b) => b.days_stalled - a.days_stalled);
  }

  let patternVerdict: 'progressing' | 'mixed' | 'stalled' = 'mixed';
  if (rosterIds.length > 0) {
    const movedPct = childrenWithProgress / rosterIds.length;
    const stalledPct = childrenStalled.length / rosterIds.length;
    if (movedPct >= 0.5 && stalledPct < 0.2) patternVerdict = 'progressing';
    else if (stalledPct >= 0.4) patternVerdict = 'stalled';
    else patternVerdict = 'mixed';
  }

  // ── 7. Deterministic verdict ───────────────────────────────────────
  // Combine layers into a single label so Tracy's prose tone doesn't drift.
  // Strong week: high coverage + non-thin quality + progressing pattern.
  // Concerning: low coverage AND (thin notes OR stalled pattern OR very stale login).
  //
  // qualityOk treats 'no_notes' as NEUTRAL — a teacher who photographs well
  // and whose children progress shouldn't be penalised for not writing notes
  // this week. Only explicitly thin notes count against the verdict.
  const coverageOk = coveragePct >= 70;
  const qualityOk = qualityLabel !== 'thin'; // strong, mixed, no_notes all pass
  const loginOk = loginBucket === 'recent';
  const progressOk =
    patternVerdict === 'progressing' || patternVerdict === 'mixed';

  let verdictLabel:
    | 'strong_week'
    | 'normal_week'
    | 'soft_week'
    | 'concerning'
    | 'no_data';
  const reasons: string[] = [];

  // Empty-roster special case — coverage/pattern/etc. are meaningless without
  // children to observe. Tracy's prose layer reads 'no_data' and explains
  // honestly: "Susan isn't assigned to a classroom" / "her classroom has no
  // children yet". DON'T fall through to soft_week, that produced nonsense
  // like "Coverage at 0% — 0 children without evidence."
  if (rosterIds.length === 0) {
    verdictLabel = 'no_data';
    if (!teacher.classroom_id) {
      reasons.push(`${teacher.name} isn't assigned to a classroom yet.`);
    } else {
      reasons.push(
        `${teacher.name}'s classroom (${classroomName ?? 'unnamed'}) has no active children yet.`
      );
    }
    if (notesWritten > 0) {
      reasons.push(
        `She has written ${notesWritten} note(s) in the last ${windowDays} days.`
      );
    }
    if (daysSinceLogin !== null) {
      reasons.push(`Last login ${daysSinceLogin} days ago.`);
    }
    return {
      ok: true,
      data: {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          classroom_name: classroomName,
          last_login_at: teacher.last_login_at,
          days_since_last_login: daysSinceLogin,
        },
        window: { days: windowDays, from_iso: fromIso, to_iso: toIso },
        activity: {
          photos_confirmed_in_classroom: photosConfirmed,
          notes_written: notesWritten,
          mastery_confirmations: masteryConfirmations,
          logins_in_window_estimate: loginBucket,
        },
        coverage: {
          roster_size: 0,
          children_with_evidence: 0,
          neglected_children: [],
          coverage_pct: 0,
          distribution: 'even',
          most_observed: [],
        },
        quality: {
          notes_sampled: noteTexts.length,
          avg_word_count: Math.round(avgWords),
          substantive_notes: substantiveCount,
          score: Number(qualityScoreAvg.toFixed(2)),
          sample_substantive_quote: sampleSubstantive,
          label: qualityLabel,
        },
        pattern: {
          children_with_progress: 0,
          children_stalled_3w: [],
          verdict: 'mixed',
        },
        verdict: {
          label: verdictLabel,
          headline: !teacher.classroom_id
            ? `${teacher.name} isn't assigned to a classroom.`
            : `${teacher.name}'s classroom is empty so far.`,
          reasons,
        },
      },
    };
  }

  if (coverageOk && qualityOk && loginOk && patternVerdict === 'progressing') {
    verdictLabel = 'strong_week';
    reasons.push(
      `Coverage at ${coveragePct}% (${childrenWithEvidence.size} of ${rosterIds.length} children observed).`
    );
    if (qualityLabel === 'strong') reasons.push('Note quality is strong.');
    reasons.push(
      `${childrenWithProgress} of ${rosterIds.length} children moved forward.`
    );
  } else if (
    !coverageOk &&
    (qualityLabel === 'thin' || patternVerdict === 'stalled' || (daysSinceLogin ?? 0) > 14)
  ) {
    verdictLabel = 'concerning';
    if (!coverageOk) {
      reasons.push(
        `Only ${childrenWithEvidence.size} of ${rosterIds.length} children have any evidence this week.`
      );
    }
    if (patternVerdict === 'stalled') {
      reasons.push(
        `${childrenStalled.length} children have not progressed in 3+ weeks.`
      );
    }
    if ((daysSinceLogin ?? 0) > 14) {
      reasons.push(`No login in ${daysSinceLogin} days.`);
    }
    if (qualityLabel === 'thin' && noteTexts.length > 0) {
      reasons.push('Note substance is thin — mostly short, low-detail entries.');
    }
  } else if (coverageOk && progressOk && qualityOk) {
    verdictLabel = 'normal_week';
    reasons.push(
      `Coverage ${coveragePct}%, ${childrenWithProgress} of ${rosterIds.length} children moved forward.`
    );
    if (qualityLabel === 'mixed') {
      reasons.push('Note quality is mixed — some substantive, some brief.');
    }
  } else {
    verdictLabel = 'soft_week';
    reasons.push(
      `Coverage at ${coveragePct}% — ${neglected.length} children without evidence this week.`
    );
    if (qualityLabel === 'thin') {
      reasons.push('Notes are thin this week.');
    }
    if (patternVerdict === 'stalled') {
      reasons.push(`${childrenStalled.length} children stalled 3+ weeks.`);
    }
    if (loginBucket === 'stale' && daysSinceLogin !== null) {
      reasons.push(`Last login ${daysSinceLogin} days ago.`);
    }
  }

  // verdictLabel here is narrowed by TypeScript to exclude 'no_data'
  // because the empty-roster path early-returned above.
  const headline = (() => {
    switch (verdictLabel) {
      case 'strong_week':
        return `${teacher.name} is having a strong week.`;
      case 'normal_week':
        return `${teacher.name} is having a normal week.`;
      case 'soft_week':
        return `${teacher.name} is having a quieter week than usual.`;
      case 'concerning':
        return `Things look concerning with ${teacher.name} this week.`;
    }
  })();

  return {
    ok: true,
    data: {
      teacher: {
        id: teacher.id,
        name: teacher.name,
        classroom_name: classroomName,
        last_login_at: teacher.last_login_at,
        days_since_last_login: daysSinceLogin,
      },
      window: {
        days: windowDays,
        from_iso: fromIso,
        to_iso: toIso,
      },
      activity: {
        photos_confirmed_in_classroom: photosConfirmed,
        notes_written: notesWritten,
        mastery_confirmations: masteryConfirmations,
        logins_in_window_estimate: loginBucket,
      },
      coverage: {
        roster_size: rosterIds.length,
        children_with_evidence: childrenWithEvidence.size,
        neglected_children: neglected,
        coverage_pct: coveragePct,
        distribution,
        most_observed: mostObserved,
      },
      quality: {
        notes_sampled: noteTexts.length,
        avg_word_count: Math.round(avgWords),
        substantive_notes: substantiveCount,
        score: Number(qualityScoreAvg.toFixed(2)),
        sample_substantive_quote: sampleSubstantive,
        label: qualityLabel,
      },
      pattern: {
        children_with_progress: childrenWithProgress,
        children_stalled_3w: childrenStalled.slice(0, 6),
        verdict: patternVerdict,
      },
      verdict: {
        label: verdictLabel,
        headline,
        reasons,
      },
    },
  };
}
