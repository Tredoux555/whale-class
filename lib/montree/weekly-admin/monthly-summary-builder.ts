// lib/montree/weekly-admin/monthly-summary-builder.ts
//
// PURE FORMAT LOGIC for the per-child Language Monthly Summary paragraph.
// Mirrors the format Tredoux refined over months of hand-edits. April 2026
// (Whale_Class_April_Language_Summary.docx) is the canonical reference.
//
// 🚨 FORMAT RULES (locked — do NOT let future agents drift):
//
// Activities sentence (always first):
//   0 sessions + 0 record  → "X did not have Language work photographed in {Month}."
//   0 sessions + N record  → "X has {N} Language works on record but was not photographed doing Language work in {Month}."
//   1 work                 → "X worked with {Work} this month."
//   2 works                → "X worked with {A} and {B} this month."
//   3+ works               → "X worked across {N} Language sessions this month, including {A} ({N} sessions), {B} ({N} sessions), {C}."
//     - Top 3 by session count
//     - "(N sessions)" suffix ONLY when N ≥ 2
//
// Mastery sentence (skip if no mastered works):
//   1 mastered → "X has reached mastery on {A}."
//   2 mastered → "X has reached mastery on {A}, {B}."          ← COMMA (NOT "and")
//   3 mastered → "X has reached mastery on {A}, {B}, {C}."
//   - Top 3 by updated_at DESC
//
// Practicing sentence (skip if no practicing works):
//   1 practicing → "Currently practicing {A}."
//   2 practicing → "Currently practicing {A} and {B}."         ← "AND" (different from mastery)
//   - Top 2 by updated_at DESC
//
// Recommendation (always last):
//   "Next, we can look at {Work}."
//   - Gap-fill via sequence: find max(sequence) child has touched, recommend next untouched
//   - If child has touched everything forward: gap-fill earliest untouched
//   - If child is brand-new: earliest curriculum work
//
// 🚨 ARCHITECTURAL RULES:
// - Mastery = ONLY from montree_child_progress.status='mastered' (Session 66).
//   Never derive mastery from photo count. The teacher decides.
// - Skip malformed work names < 4 chars (catches placeholders like "seq").
// - This module is PURE — no DB calls, no fetching. Caller passes pre-fetched
//   data. Reusable from auto-fill route, generate route, and Mira dossier tools.

export interface WorkRef {
  id: string;
  name: string;
  /** 0-based ordering for gap-fill recommendations. */
  sequence: number;
}

export interface ChildSummaryInput {
  childId: string;
  childName: string;
  /** Language sessions this child had in the period, deduplicated as (work_id, media_id). */
  sessions: Array<{ workId: string; workName: string }>;
  /** All montree_child_progress rows for this child, language area only. */
  mastered: Array<{ workName: string; updatedAt: string }>;
  practicing: Array<{ workName: string; updatedAt: string }>;
  /** Total distinct Language works this child has touched (all-time). Drives the "N works on record" branch. */
  alltimeWorksCount: number;
  /** Lowercased set of all work names this child has ever touched. Drives recommendation gap-fill. */
  touchedWorkNamesLower: Set<string>;
}

export interface BuildOptions {
  /** Display month name, e.g. "May" — used in "did not have Language work photographed in May." */
  monthName: string;
  /** Full curriculum, sorted by sequence ascending. Drives the recommendation. */
  curriculum: WorkRef[];
}

const MIN_WORK_NAME_LEN = 4;

/**
 * Defensive filter — skip work names that are clearly malformed (< 4 chars,
 * empty after trim). Catches placeholder rows like "seq" that occasionally
 * appear in montree_child_progress.
 */
function isValidWorkName(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.trim().length >= MIN_WORK_NAME_LEN;
}

/**
 * Recommendation algorithm — find next untouched curriculum work for this child.
 *
 * Strategy:
 *   1. Find max(sequence) among curriculum works the child HAS touched.
 *   2. Walk forward in sequence — recommend the first untouched work after that.
 *   3. If everything forward is touched, gap-fill backward to earliest untouched.
 *   4. If child has touched nothing, recommend the earliest curriculum work.
 */
export function recommendNextWork(
  touchedWorkNamesLower: Set<string>,
  curriculum: WorkRef[]
): string | null {
  if (curriculum.length === 0) return null;
  if (touchedWorkNamesLower.size === 0) {
    return curriculum[0].name;
  }
  let maxTouchedSeq = -1;
  for (const w of curriculum) {
    if (touchedWorkNamesLower.has(w.name.trim().toLowerCase())) {
      if (w.sequence > maxTouchedSeq) maxTouchedSeq = w.sequence;
    }
  }
  // First untouched AFTER max
  for (const w of curriculum) {
    if (
      w.sequence > maxTouchedSeq &&
      !touchedWorkNamesLower.has(w.name.trim().toLowerCase())
    ) {
      return w.name;
    }
  }
  // Gap-fill backward — earliest untouched
  for (const w of curriculum) {
    if (!touchedWorkNamesLower.has(w.name.trim().toLowerCase())) {
      return w.name;
    }
  }
  // Everything touched — fall back to last work
  return curriculum[curriculum.length - 1].name;
}

function formatActivities(
  childName: string,
  sessions: ChildSummaryInput['sessions'],
  alltimeWorksCount: number,
  monthName: string
): string {
  if (sessions.length === 0) {
    if (alltimeWorksCount > 0) {
      return `${childName} has ${alltimeWorksCount} Language works on record but was not photographed doing Language work in ${monthName}.`;
    }
    return `${childName} did not have Language work photographed in ${monthName}.`;
  }

  // Count sessions per work_id (dedupe same media used multiple times by caller upstream)
  const countByWorkId = new Map<string, { name: string; count: number }>();
  for (const s of sessions) {
    if (!isValidWorkName(s.workName)) continue;
    const existing = countByWorkId.get(s.workId);
    if (existing) existing.count += 1;
    else countByWorkId.set(s.workId, { name: s.workName, count: 1 });
  }

  const sorted = Array.from(countByWorkId.values()).sort((a, b) => b.count - a.count);
  if (sorted.length === 0) {
    return `${childName} did not have Language work photographed in ${monthName}.`;
  }

  if (sorted.length === 1) {
    return `${childName} worked with ${sorted[0].name} this month.`;
  }
  if (sorted.length === 2) {
    return `${childName} worked with ${sorted[0].name} and ${sorted[1].name} this month.`;
  }
  // 3+: top 3 with "(N sessions)" suffix only when N ≥ 2
  const top3 = sorted.slice(0, 3);
  const parts = top3.map(t => (t.count >= 2 ? `${t.name} (${t.count} sessions)` : t.name));
  const totalSessions = sorted.reduce((sum, t) => sum + t.count, 0);
  return `${childName} worked across ${totalSessions} Language sessions this month, including ${parts.join(', ')}.`;
}

function formatMastered(
  childName: string,
  mastered: ChildSummaryInput['mastered']
): string {
  const valid = mastered.filter(m => isValidWorkName(m.workName));
  if (valid.length === 0) return '';
  // Sort by updated_at DESC, take top 3
  const sorted = [...valid].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const top = sorted.slice(0, 3).map(m => m.workName);
  if (top.length === 1) {
    return `${childName} has reached mastery on ${top[0]}.`;
  }
  if (top.length === 2) {
    // 🚨 COMMA, not "and" — April format rule.
    return `${childName} has reached mastery on ${top[0]}, ${top[1]}.`;
  }
  return `${childName} has reached mastery on ${top[0]}, ${top[1]}, ${top[2]}.`;
}

function formatPracticing(practicing: ChildSummaryInput['practicing']): string {
  const valid = practicing.filter(p => isValidWorkName(p.workName));
  if (valid.length === 0) return '';
  const sorted = [...valid].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const top = sorted.slice(0, 2).map(p => p.workName);
  if (top.length === 1) {
    return `Currently practicing ${top[0]}.`;
  }
  return `Currently practicing ${top[0]} and ${top[1]}.`;
}

/**
 * Build the full per-child paragraph in the locked April-format style.
 */
export function buildChildSummaryParagraph(
  input: ChildSummaryInput,
  opts: BuildOptions
): string {
  const sentences: string[] = [];

  sentences.push(
    formatActivities(input.childName, input.sessions, input.alltimeWorksCount, opts.monthName)
  );

  const masteryS = formatMastered(input.childName, input.mastered);
  if (masteryS) sentences.push(masteryS);

  const practicingS = formatPracticing(input.practicing);
  if (practicingS) sentences.push(practicingS);

  const rec = recommendNextWork(input.touchedWorkNamesLower, opts.curriculum);
  if (rec) sentences.push(`Next, we can look at ${rec}.`);

  return sentences.join(' ');
}
