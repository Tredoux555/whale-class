// lib/montree/progress/write-progress.ts
//
// THE single sanctioned writer for montree_child_progress.
//
// WHY THIS EXISTS
// ---------------
// Before this file, fifteen-odd call sites upserted into montree_child_progress
// directly, each with its own idea of the rules: some rank-gated, some not; some
// stamped classroom_id, most didn't; some preserved mastered_at, one nulled it;
// none of them recorded WHAT CHANGED. The institutional layer
// (docs/oversight-pack-aug01/INSTITUTIONAL_LAYER_MASTER_PLAN.md §4c) cannot be
// built on top of that: aggregation never fixes dirty data, it amplifies it. A
// school's Progress Index is only as honest as the write that produced each row,
// and "momentum over the trailing 30 days" is unanswerable from a table that only
// ever holds current state.
//
// So every rule lives HERE, once:
//
//   1. STAMPS      — classroom_id / school_id / work_key are resolved and written on
//                    every write, so a child who transfers schools next term does not
//                    take their history out of the rollup with them.
//   2. RANK GATE   — not_started < presented < practicing < mastered. A write never
//                    lowers a child's rung unless the caller passes allowDowngrade,
//                    which means one thing only: a teacher explicitly correcting the
//                    record. Automated evidence (a photo, a recording, a sheet, a
//                    recommendation, an AI tool call) never downgrades.
//   3. FIRST TIMES — mastered_at is stamped on the FIRST transition to mastered and
//                    never rewritten; presented_at likewise. The date a child mastered
//                    a work is a fact, not a field to refresh.
//   4. JOURNAL     — every ACTUAL status change appends one montree_progress_events
//                    row (migration 314). That append-only journal is what momentum,
//                    stalled-child flags and every trend line at every level read from.
//                    It is written BEFORE the cache and it is NOT best-effort any more
//                    (2026-09-06, audit 08-verify-tracking §6a): rule 3 makes
//                    montree_child_progress a cache of the journal, so a cache row whose
//                    transition never reached the journal is a permanent lie that the
//                    recovery tool then ERASES. If the append fails for anything other
//                    than "migration 314 is not pasted here" or the same-day guard's
//                    23505, the entry comes back outcome 'failed' and NO cache row is
//                    written. Every result carries `journalled`.
//
// WHERE THE RULES ACTUALLY LIVE (2026-09-06, Engine v2)
// -----------------------------------------------------
// Rules 3 and 4 — the ladder, and the one-ladder-move-per-calendar-day dedupe —
// are NOT re-implemented here any more. They live in lib/montree/tracking/ledger.ts
// (applyEvent / dedupeSameDay), the pure engine the whole tracking system reasons
// with, and this file CALLS it for every decision. There is exactly one copy of
// the rules, and tests/tracking's simulated term is testing the same code the door
// runs. What stays here is everything the engine cannot know: stamps, key
// resolution, the review queue, first-time dates, and the SQL.
//
// Two deliberate compatibility carve-outs, both documented at the call site:
//   * a work with NO existing row is always created (the engine would call
//     not_started → not_started a no-op; creating the row is what every caller
//     has always meant);
//   * allowDowngrade is mapped to engine source 'correction' — the only source
//     rule 4 lets move a child down — and, when the caller gave no reason, one is
//     synthesised from the source so the journal is never silently unexplained.
//
// If you are about to write to montree_child_progress from somewhere else: don't.
// Add what you need here instead. The institutional rollups depend on every write
// passing through this choke point.
//
// Depends on migration 314 for montree_progress_events. Until it is applied the
// progress writes still land and the journal insert logs a warning — deploy-before-
// migration is safe by design (migrations are pasted by hand into the SQL editor).

import type { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';
import {
  parseWorkName as parseDarkPhonicsWorkName,
  workName as darkPhonicsWorkName,
  workId as darkPhonicsWorkId,
} from '@/lib/montree/dark-phonics/tracker-works';
import { applyEvent, dayOf, DEFAULT_SCHOOL_TZ, emptyState, type LedgerState } from '@/lib/montree/tracking/ledger';
import { getSchoolTimezone } from '@/lib/montree/school-time';
import type { ProgressEvent as EngineEvent, Source as EngineSource, Status as EngineStatus } from '@/lib/montree/tracking/types';

type SupabaseClient = ReturnType<typeof getSupabase>;

/**
 * The progress ladder, ranked. Higher never becomes lower.
 *
 * 'completed' is a LEGACY ALIAS for 'mastered' and must stay in this table. Migration
 * 111 normalised the rows it could see, but 'completed' still arrives from old clients
 * and still sits in historical rows — and an unranked value scores 0, which would let
 * anything at all demote a mastered work. It is a read-side alias only: nothing writes
 * 'completed' any more.
 */
export const STATUS_RANK: Record<string, number> = {
  not_started: 0,
  presented: 1,
  practicing: 2,
  mastered: 3,
  completed: 3,
};

export type ProgressStatus = 'not_started' | 'presented' | 'practicing' | 'mastered';

export interface ProgressEntry {
  childId: string;
  /** Free-text work name — the (child_id, work_name) upsert key from migration 111. */
  workName: string;
  /** Canonical catalog slug. Resolved from workName when omitted. */
  workKey?: string | null;
  area?: string | null;
  status: string;
  /** Where this write came from: 'paper_scan', 'voice_observation', 'teacher_update', … */
  source: string;
  classroomId?: string | null;
  schoolId?: string | null;
  /** Only written when provided — undefined leaves any existing note untouched. */
  notes?: string | null;
  /**
   * Bypass the rank gate. EXPLICIT TEACHER CORRECTION ONLY (a status picker, a
   * teacher_final_status override). Never set this for automated evidence.
   */
  allowDowngrade?: boolean;
  /** Optional column, written only when provided (importers carry it). */
  workNameChinese?: string | null;
  /** Optional columns (migration 155), written only when provided. */
  masteryConfirmedAt?: string | null;
  masteryConfirmedBy?: string | null;
  /** The photo this observation came off, recorded on a review-queue row. */
  evidenceMediaId?: string | null;
  /**
   * The photo/recording/session this observation came off, recorded on the JOURNAL row
   * (montree_progress_events.evidence_id, migration 346). Defaults to evidenceMediaId.
   */
  evidenceId?: string | null;
  /**
   * RULE 4 — a downgrade is a deliberate, reasoned teacher act. Recorded on the journal
   * row. Required in spirit whenever allowDowngrade actually lowers a rung; when it is
   * missing the door synthesises one rather than dropping the explanation entirely.
   */
  reason?: string | null;
  /**
   * RULE 5 — UNKNOWN NAMES NEVER WRITE. Defaults to TRUE: when no work_key can be
   * resolved the write is REFUSED and a montree_progress_review_queue row is left
   * for a human instead. Pass false ONLY when the caller has itself just created the
   * curriculum row and knows the key exists (photo-audit new_custom).
   */
  strict?: boolean;
}

export type ProgressOutcome = 'written' | 'skipped_rank' | 'skipped_noop' | 'queued' | 'failed';

export interface ProgressResult {
  outcome: ProgressOutcome;
  childId: string;
  workName: string;
  /** The status now on the row (the new one if written, the old one if skipped). */
  status: string;
  /** Status before this write; null when there was no row. */
  previousStatus: string | null;
  workKey: string | null;
  classroomId: string | null;
  schoolId: string | null;
  /** True only on the FIRST transition to mastered — the shelf-advance trigger. */
  firstMastery: boolean;
  /**
   * RULE 3 — the journal is the truth and the cache is derived from it, so the
   * journal is written FIRST and this says whether it took. `false` with outcome
   * 'written' means exactly one thing: this environment has no
   * montree_progress_events table yet (migration 314 not pasted). Any OTHER
   * journal failure returns outcome 'failed' and writes no cache row at all.
   */
  journalled: boolean;
  /** The upserted row, when the driver returned it. Shape: { id, status }. */
  row?: { id: string; status: string } | null;
  /**
   * Why nothing was written. 'unresolved-work' with outcome 'queued' (rule 5);
   * 'duplicate-same-day' / 'no-op' / 'backward-without-correction' /
   * 'correction-without-reason' — the engine's own verdict — on a skip.
   */
  reason?: string;
  error?: string;
}

export interface WriteProgressOptions {
  /** Who/what performed the write, recorded on the event row (teacher id, 'guru', …). */
  actor?: string | null;
}

// ── static catalog index (module-level, immutable JSON) ────────────────────
// Exact name + alias → work_key. NO fuzzy matching here: this is a write path, and a
// wrong work_key is worse than a null one. Fuzzy resolution belongs in the extraction
// layer (lib/montree/paper-scan/work-matcher.ts) where a human reviews the guess.
//
// The index maps a name to ALL catalog works that answer to it, because names are NOT
// unique across areas — "Bells" is both se_bells and cu_bells, "Clock"/"Calendar" are
// both mathematics and cultural. First-registered-wins would silently file a cultural
// observation under sensorial forever. Disambiguation is by area, and when the area is
// unknown or still ambiguous the answer is NO KEY (see resolveCatalogKey).
interface CatalogEntry { work_key: string; area_key: string }
let _catalogByName: Map<string, CatalogEntry[]> | null = null;

function catalogByName(): Map<string, CatalogEntry[]> {
  if (_catalogByName) return _catalogByName;
  const map = new Map<string, CatalogEntry[]>();
  const add = (raw: string | null | undefined, entry: CatalogEntry) => {
    const n = normaliseName(raw);
    if (!n) return;
    const list = map.get(n);
    if (!list) { map.set(n, [entry]); return; }
    if (!list.some((e) => e.work_key === entry.work_key)) list.push(entry);
  };
  try {
    for (const work of loadAllCurriculumWorks()) {
      if (!work.work_key) continue;
      const entry: CatalogEntry = { work_key: work.work_key, area_key: work.area_key };
      add(work.name, entry);
      for (const alias of work.aliases || []) add(alias, entry);
    }
  } catch (err) {
    console.error('[writeProgress] curriculum catalog load failed (work_key resolution degraded):', err);
  }
  _catalogByName = map;
  return map;
}

/**
 * Catalog name/alias → work_key, area-disambiguated.
 * Returns null rather than guessing when the name spans areas and `area` can't settle it.
 */
function resolveCatalogKey(workName: string, area: string | null | undefined): string | null {
  const hits = catalogByName().get(normaliseName(workName));
  if (!hits || hits.length === 0) return null;
  if (hits.length === 1) return hits[0].work_key;
  if (!area) return null;
  const sameArea = hits.filter((h) => h.area_key === area);
  return sameArea.length === 1 ? sameArea[0].work_key : null;
}

/** Case- and whitespace-insensitive. Deliberately NOT punctuation-stripping — exact means exact. */
function normaliseName(s: string | null | undefined): string {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const progressKey = (childId: string, workName: string) => `${childId}\u0000${workName}`;

interface ExistingRow {
  // Optional columns (work_name_chinese, mastery_confirmed_*) are selected only when
  // a caller in the batch asks for them — hence the index signature.
  [column: string]: string | null;
  id: string;
  child_id: string;
  work_name: string;
  status: string | null;
  area: string | null;
  work_key: string | null;
  classroom_id: string | null;
  school_id: string | null;
  notes: string | null;
  presented_at: string | null;
  mastered_at: string | null;
}

// ── engine adapters ────────────────────────────────────────────────────────
// The door's vocabulary is wider than the engine's on purpose: `status` arrives
// as a free string from a dozen callers and `source` carries years of legacy
// values ('photo_confirm', 'teacher_update', 'guru'). These two functions are the
// only place the two vocabularies meet.

const ENGINE_STATUSES: readonly EngineStatus[] = ['not_started', 'presented', 'practicing', 'mastered'];

/** null for "no row yet". 'completed' is migration 111's legacy alias for 'mastered'. */
export function toEngineStatus(raw: string | null | undefined): EngineStatus | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (s === 'completed') return 'mastered';
  return (ENGINE_STATUSES as readonly string[]).includes(s) ? (s as EngineStatus) : null;
}

const ENGINE_SOURCES: readonly EngineSource[] = ['tap', 'photo', 'ai', 'digital', 'live', 'import', 'backfill', 'correction'];

/**
 * Rule 3's eight-word vocabulary. IMPORTANT: nothing unrecognised may become
 * 'correction' — that is the one source with a behavioural consequence (it is the
 * only one allowed to lower a rung and the only one exempt from the same-day
 * dedupe), so an unknown legacy source falls back to 'tap'.
 */
export function toEngineSource(raw: string | null | undefined): EngineSource {
  const s = String(raw ?? '').trim().toLowerCase();
  if ((ENGINE_SOURCES as readonly string[]).includes(s)) return s as EngineSource;
  if (s.includes('correct')) return 'correction';
  if (s.includes('photo') || s.includes('scan') || s.includes('gallery')) return 'photo';
  if (s.includes('guru') || s.includes('ai') || s.includes('voice') || s.includes('insight')) return 'ai';
  if (s.includes('import') || s.includes('onboard') || s.includes('bulk')) return 'import';
  if (s.includes('backfill')) return 'backfill';
  if (s.includes('live') || s.includes('recap')) return 'live';
  if (s.includes('digital') || s.includes('shelf') || s.includes('game') || s.includes('book')) return 'digital';
  return 'tap';
}

/**
 * A one-pair LedgerState: the child's CURRENT rung for this work, plus the days on
 * which it already moved today. That is everything applyEvent() needs to reach the
 * same verdict it would reach mid-replay of the whole journal.
 */
function seedState(
  childId: string,
  workKey: string,
  previousStatus: string | null,
  movedToday: Map<string, Set<string>>,
): LedgerState {
  const state = emptyState();
  const status = toEngineStatus(previousStatus);
  if (status) state.current.set(childId, new Map([[workKey, status]]));
  const days = movedToday.get(`${childId}|${workKey}`);
  if (days && days.size > 0) state.movedOn.set(`${childId}|${workKey}`, new Set(days));
  return state;
}

/**
 * The journal row for a repeat observation: old_status === new_status, so
 * ledger.applyEvent() classifies it as a no-op with attachAsEvidence and
 * derive.weekTicks() reports it as activity that advanced nothing.
 */
function evidenceRow(
  event: EngineEvent,
  previousStatus: string | null,
  eff: { classroom_id: string | null; school_id: string | null },
  result: ProgressResult,
): Record<string, unknown> {
  const held = previousStatus || 'not_started';
  return {
    child_id: event.child_id,
    school_id: result.schoolId ?? eff.school_id ?? null,
    classroom_id: result.classroomId ?? eff.classroom_id ?? null,
    work_key: event.work_key,
    work_name: event.work_name,
    area: event.area ?? null,
    old_status: held,
    new_status: held,
    source: event.source,
    actor: event.actor ?? null,
    reason: event.reason ?? null,
    evidence_id: event.evidence_id ?? null,
    created_at: event.created_at,
  };
}

/**
 * Write one progress entry. Thin wrapper over writeProgressBatch — same rules,
 * same guarantees, one result.
 */
export async function writeProgress(
  supabase: SupabaseClient,
  entry: ProgressEntry,
  opts: WriteProgressOptions = {},
): Promise<ProgressResult> {
  const [result] = await writeProgressBatch(supabase, [entry], opts);
  return result;
}

/**
 * Write many progress entries. One stamp-resolution pass, one pre-read, one upsert,
 * one journal insert — regardless of how many entries come in.
 *
 * Results are returned in the SAME ORDER as the entries. Duplicate (childId, workName)
 * pairs within a batch collapse to the last one (Postgres cannot touch the same row
 * twice in one ON CONFLICT statement); the superseded entries come back as
 * 'skipped_noop'.
 */
export async function writeProgressBatch(
  supabase: SupabaseClient,
  entries: ProgressEntry[],
  opts: WriteProgressOptions = {},
): Promise<ProgressResult[]> {
  const now = new Date().toISOString();
  const results: ProgressResult[] = entries.map((e) => ({
    outcome: 'failed',
    childId: e?.childId,
    workName: String(e?.workName || '').trim(),
    status: e?.status,
    previousStatus: null,
    workKey: e?.workKey || null,
    classroomId: e?.classroomId || null,
    schoolId: e?.schoolId || null,
    firstMastery: false,
    journalled: false,
  }));

  // Normalise + reject the unusable up front. A blank work name would create an
  // un-addressable row that no read path can ever find again.
  const live: Array<{ index: number; entry: ProgressEntry; workName: string }> = [];
  entries.forEach((entry, index) => {
    const raw = String(entry?.workName || '').trim();
    if (!entry?.childId || !raw) {
      results[index].error = 'childId and workName are required';
      return;
    }
    // RULE 6, minimal — the forgiving reader runs BEFORE the row is addressed. A
    // Dark Phonics work typed as 't w3', 'T-Work-3' or 't dark phonics work 3' is the
    // SAME work as 't Dark Phonics work 3', and (child_id, work_name) is the upsert
    // key: without this, three spellings would be three rows for one work.
    const dp = parseDarkPhonicsWorkName(raw);
    const workName = dp ? darkPhonicsWorkName(dp.letter, dp.n) : raw;
    results[index].workName = workName;
    live.push({ index, entry, workName });
  });
  if (live.length === 0) return results;

  // ── 1. Stamps: child → classroom → school, one query per hop, batch-wide ──
  const childIds = Array.from(new Set(live.map((l) => l.entry.childId)));
  const classroomByChild = new Map<string, string | null>();
  const schoolByClassroom = new Map<string, string | null>();

  const needsStamps = live.some((l) => !l.entry.classroomId || !l.entry.schoolId);
  if (needsStamps) {
    try {
      const { data: children } = await supabase
        .from('montree_children')
        .select('id, classroom_id')
        .in('id', childIds);
      for (const c of children || []) classroomByChild.set(c.id, c.classroom_id || null);

      const classroomIds = Array.from(
        new Set(
          live
            .map((l) => l.entry.classroomId || classroomByChild.get(l.entry.childId) || null)
            .filter((id): id is string => !!id),
        ),
      );
      if (classroomIds.length > 0) {
        const { data: classrooms } = await supabase
          .from('montree_classrooms')
          .select('id, school_id')
          .in('id', classroomIds);
        for (const c of classrooms || []) schoolByClassroom.set(c.id, c.school_id || null);
      }
    } catch (err) {
      // Stamps are enrichment, not correctness — a lookup hiccup must not cost the
      // teacher their write. The backfill script fills the gap later.
      console.error('[writeProgress] stamp resolution failed (writing unstamped):', err);
    }
  }

  const resolvedClassroom = (entry: ProgressEntry) =>
    entry.classroomId || classroomByChild.get(entry.childId) || null;
  const resolvedSchool = (entry: ProgressEntry) => {
    if (entry.schoolId) return entry.schoolId;
    const classroomId = resolvedClassroom(entry);
    return classroomId ? schoolByClassroom.get(classroomId) || null : null;
  };

  // ── 1b. The school's calendar day (audit 08-verify-tracking §5) ───────────
  // "One ladder move per day" is one move per SCHOOL day. Read in UTC, a Beijing
  // 07:30 photo and an 08:30 photo of the same work fell on two different days and
  // both advanced the rung; west of UTC the split lands mid-afternoon. One lookup
  // per school per batch (memoised inside school-time.ts for five minutes).
  const tzBySchool = new Map<string, string>();
  const schoolIdsInBatch = Array.from(
    new Set(live.map((l) => resolvedSchool(l.entry)).filter((id): id is string => !!id)),
  );
  for (const schoolId of schoolIdsInBatch) {
    try {
      tzBySchool.set(schoolId, await getSchoolTimezone(schoolId));
    } catch {
      tzBySchool.set(schoolId, DEFAULT_SCHOOL_TZ);
    }
  }
  const resolvedTz = (entry: ProgressEntry): string => {
    const schoolId = resolvedSchool(entry);
    return (schoolId && tzBySchool.get(schoolId)) || DEFAULT_SCHOOL_TZ;
  };

  // ── 2. Pre-read: current state for every (child, work) in the batch ────────
  // ONE query. old_status for the journal, mastered_at/presented_at for the
  // first-time stamps, and the existing stamps so we never null one out.
  // Optional columns are read and written ONLY when some entry in the batch asks for
  // them. An entry that does not mention one must never null out what is stored, and
  // an environment missing the column stays unaffected until a caller uses it.
  const extraColumns: string[] = [];
  if (live.some((l) => l.entry.workNameChinese !== undefined)) extraColumns.push('work_name_chinese');
  if (live.some((l) => l.entry.masteryConfirmedAt !== undefined)) extraColumns.push('mastery_confirmed_at');
  if (live.some((l) => l.entry.masteryConfirmedBy !== undefined)) extraColumns.push('mastery_confirmed_by');
  const providedExtra = (entry: ProgressEntry, column: string): string | null | undefined =>
    column === 'work_name_chinese' ? entry.workNameChinese
    : column === 'mastery_confirmed_at' ? entry.masteryConfirmedAt
    : entry.masteryConfirmedBy;

  const existingByKey = new Map<string, ExistingRow>();
  try {
    const workNames = Array.from(new Set(live.map((l) => l.workName)));
    const { data: rows, error } = await supabase
      .from('montree_child_progress')
      .select(['id, child_id, work_name, status, area, work_key, classroom_id, school_id, notes, presented_at, mastered_at', ...extraColumns].join(', '))
      .in('child_id', childIds)
      .in('work_name', workNames);
    if (error) throw error;
    // `unknown` first: the select list is assembled at runtime (extraColumns), so
    // PostgREST's generic can't narrow it.
    for (const row of (rows || []) as unknown as ExistingRow[]) {
      existingByKey.set(progressKey(row.child_id, row.work_name), row);
    }
  } catch (err) {
    // Without the pre-read we cannot rank-gate or preserve mastered_at. Failing the
    // whole batch is the honest answer — a blind upsert here is how progress got
    // overwritten before this file existed.
    console.error('[writeProgress] pre-read failed:', err);
    for (const l of live) results[l.index].error = 'progress pre-read failed';
    return results;
  }

  // ── 3. work_key resolution — classroom curriculum first, then the spine ────
  // Classroom copies preserve the catalog work_key verbatim (migration 099) and are
  // the ONLY source for teacher-custom works (custom_*/auto_* keys), so they win.
  const needKey = live.filter((l) => !l.entry.workKey && !existingByKey.get(progressKey(l.entry.childId, l.workName))?.work_key);
  const classroomKeyByName = new Map<string, string>();
  if (needKey.length > 0) {
    const classroomIds = Array.from(
      new Set(needKey.map((l) => resolvedClassroom(l.entry)).filter((id): id is string => !!id)),
    );
    const names = Array.from(new Set(needKey.map((l) => l.workName)));
    if (classroomIds.length > 0) {
      try {
        // Filtered by name as well as classroom: a classroom curriculum is ~330 rows
        // and this runs on the teacher-facing write path. Case-exact by necessity
        // (PostgREST `in` is case-sensitive) — the catalog fallback below is the
        // case-insensitive net.
        const { data: works } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('work_key, name, classroom_id')
          .in('classroom_id', classroomIds)
          .in('name', names);
        for (const w of works || []) {
          const k = `${w.classroom_id}\u0000${normaliseName(w.name)}`;
          if (w.work_key && !classroomKeyByName.has(k)) classroomKeyByName.set(k, w.work_key);
        }
      } catch (err) {
        console.error('[writeProgress] classroom work_key lookup failed (falling back to catalog):', err);
      }

      // Second pass, case-insensitive. PostgREST `in` is case-sensitive, so a work
      // typed 'sandpaper letters' against a row named 'Sandpaper Letters' misses the
      // filtered query above. Under RULE 5 that miss is no longer harmless — it sends
      // a real observation to the review queue — so when anything is still unresolved
      // we pull the classroom's works (≈330 rows) and match on the normalised name.
      const stillMissing = needKey.filter((l) => {
        const cid = resolvedClassroom(l.entry);
        return cid ? !classroomKeyByName.has(`${cid}\u0000${normaliseName(l.workName)}`) : false;
      });
      if (stillMissing.length > 0) {
        try {
          const { data: allWorks } = await supabase
            .from('montree_classroom_curriculum_works')
            .select('work_key, name, classroom_id')
            .in('classroom_id', classroomIds);
          for (const w of allWorks || []) {
            const k = `${w.classroom_id}\u0000${normaliseName(w.name)}`;
            if (w.work_key && !classroomKeyByName.has(k)) classroomKeyByName.set(k, w.work_key);
          }
        } catch (err) {
          console.error('[writeProgress] classroom work_key second pass failed:', err);
        }
      }
    }
  }

  // ── 3b. Today's ladder moves — the seed for the engine's same-day dedupe ──
  // ledger.dedupeSameDay() asks "has this (child, work) already moved the ladder on
  // this calendar day?". The answer lives in the journal, so one narrow read of
  // today's events (a handful of rows) is what lets the door apply the SAME rule the
  // engine applies in memory. Best-effort: if the journal cannot be read (migration
  // 314 not pasted, a transient error) we simply do not dedupe — losing a duplicate
  // suppression is survivable, losing the observation is not.
  const movedToday = new Map<string, Set<string>>();
  try {
    // 36 hours, not "since UTC midnight": a school day east or west of UTC starts
    // before/after it, and a row from the same SCHOOL day must be visible here or
    // the dedupe silently stops working at the timezone seam.
    const startOfDay = new Date(Date.parse(now) - 36 * 3600 * 1000).toISOString();
    const { data: todays } = await supabase
      .from('montree_progress_events')
      .select('child_id, work_key, old_status, new_status, created_at')
      .in('child_id', childIds)
      .gte('created_at', startOfDay);
    for (const row of (todays || []) as Array<{
      child_id: string; work_key: string | null; old_status: string | null; new_status: string | null; created_at: string;
    }>) {
      if (!row.work_key) continue;
      // Evidence rows (old === new) did NOT move the ladder, so they must not
      // suppress a later real advance on the same day.
      if (row.old_status === row.new_status) continue;
      const pk = `${row.child_id}|${row.work_key}`;
      const set = movedToday.get(pk) ?? new Set<string>();
      // Every school day this row could belong to. The batch's own timezone(s)
      // decide which one the incoming event is compared against.
      for (const tz of tzBySchool.size ? tzBySchool.values() : [DEFAULT_SCHOOL_TZ]) {
        set.add(dayOf(row.created_at, tz));
      }
      movedToday.set(pk, set);
    }
  } catch (err) {
    console.warn('[writeProgress] same-day dedupe pre-read unavailable (not deduping):', err);
  }

  const resolveWorkKey = (entry: ProgressEntry, workName: string, area: string | null, existingKey: string | null): string | null => {
    if (entry.workKey) return entry.workKey;
    // RULE 1 — a Dark Phonics work has ONE permanent key. workName was canonicalised
    // above, so this is the same dp:<letter>:<n> the classroom curriculum row carries
    // (seeded by migration 344) no matter how the teacher typed it.
    const dp = parseDarkPhonicsWorkName(workName);
    if (dp) return darkPhonicsWorkId(dp.letter, dp.n);
    const classroomId = resolvedClassroom(entry);
    if (classroomId) {
      // NOTE (2026-09-06): this lookup used a SPACE while the map above is keyed with
      // a NUL separator - so the classroom-curriculum work_key path never matched a row
      // and every resolution silently fell through to the static catalog. Under rule 5
      // that stopped being invisible: a custom/classroom-only work would resolve to no
      // key and be refused. Fixed to use the same separator.
      const hit = classroomKeyByName.get(`${classroomId}\u0000${normaliseName(workName)}`);
      if (hit) return hit;
    }
    // Area-disambiguated, and null rather than a guess when the name spans areas.
    const fromCatalog = resolveCatalogKey(workName, area);
    if (fromCatalog) return fromCatalog;
    return existingKey || null;
  };

  // ── 4. Decide, per entry ──────────────────────────────────────────────────
  interface Planned {
    index: number;
    entry: ProgressEntry;
    workName: string;
    key: string;
    record: Record<string, unknown>;
    previousStatus: string | null;
    newStatus: string;
    /**
     * THE EVENT THE ENGINE ACCEPTED (audit 08-verify-tracking §2, CRITICAL).
     *
     * The door builds this to ask lib/montree/tracking/ledger.ts applyEvent()
     * whether the move is legal, and the engine's answer is only meaningful for
     * THIS event: allowDowngrade is mapped to source 'correction' with a reason,
     * which is the only shape rule 4 lets go down the ladder. The journal used to
     * be written from the CALLER's raw fields instead — source 'teacher_update' /
     * 'guru', reason null — so replaying the journal REFUSED the very row the door
     * had accepted, and the derived ribbon/summary/parent report disagreed with the
     * cache forever. Carrying the event fixes it at the source: what was decided is
     * what is recorded.
     */
    engineEvent: EngineEvent;
  }
  const planned: Planned[] = [];
  const plannedByKey = new Map<string, Planned>();
  const queued: Array<Record<string, unknown>> = [];
  // Rule 3 + the "duplicate photo same morning" scenario: a repeat observation moves
  // nothing, but it IS activity. It is journalled with old_status === new_status so
  // derive.weekTicks() reports it (advanced:false) and the stuck flag can see it.
  const evidenceRows: Array<Record<string, unknown>> = [];

  // The state each (child, work) row is in AS THE BATCH PROCEEDS. Starts as whatever
  // the pre-read found and advances with every accepted write, so the rank gate applies
  // WITHIN a batch as well as against the database. Without this, two entries for the
  // same work in one batch would be gated only against the DB and the last one would
  // win — letting a mixed-status caller (none today, but the primitive must not depend
  // on that) regress a child inside a single call.
  interface EffectiveState {
    exists: boolean;
    status: string | null;
    area: string | null;
    work_key: string | null;
    classroom_id: string | null;
    school_id: string | null;
    notes: string | null;
    presented_at: string | null;
    mastered_at: string | null;
    extra: Record<string, string | null>;
  }
  const effectiveByKey = new Map<string, EffectiveState>();
  const effectiveFor = (key: string): EffectiveState => {
    const cached = effectiveByKey.get(key);
    if (cached) return cached;
    const ex = existingByKey.get(key);
    const state: EffectiveState = ex
      ? {
          exists: true,
          status: ex.status,
          area: ex.area,
          work_key: ex.work_key,
          classroom_id: ex.classroom_id,
          school_id: ex.school_id,
          notes: ex.notes,
          presented_at: ex.presented_at,
          mastered_at: ex.mastered_at,
          extra: Object.fromEntries(extraColumns.map((c) => [c, (ex[c] as string | null) ?? null])),
        }
      : {
          exists: false,
          status: null,
          area: null,
          work_key: null,
          classroom_id: null,
          school_id: null,
          notes: null,
          presented_at: null,
          mastered_at: null,
          extra: Object.fromEntries(extraColumns.map((c) => [c, null])),
        };
    effectiveByKey.set(key, state);
    return state;
  };

  for (const { index, entry, workName } of live) {
    const key = progressKey(entry.childId, workName);
    const eff = effectiveFor(key);
    const previousStatus = eff.status;
    const newStatus = entry.status;

    const classroomId = resolvedClassroom(entry);
    const schoolId = resolvedSchool(entry);
    const area = entry.area ?? eff.area ?? null;
    const workKey = resolveWorkKey(entry, workName, area, eff.work_key);

    results[index].previousStatus = previousStatus;
    results[index].classroomId = classroomId || eff.classroom_id || null;
    results[index].schoolId = schoolId || eff.school_id || null;
    results[index].workKey = workKey;

    // ── RULE 5: UNKNOWN NAMES NEVER WRITE ─────────────────────────────────
    // No confident key means no row. The observation is NOT discarded — it goes to
    // montree_progress_review_queue (migration 345) where a human resolves the name,
    // which is the whole point: a keyless progress row is invisible to every rollup,
    // ranks nowhere in the sequence and can never be found again by name.
    if (entry.strict !== false && !workKey) {
      results[index].outcome = 'queued';
      results[index].reason = 'unresolved-work';
      results[index].status = previousStatus || 'not_started';
      queued.push({
        child_id: entry.childId,
        classroom_id: classroomId ?? eff.classroom_id ?? null,
        school_id: schoolId ?? eff.school_id ?? null,
        raw_work_name: workName,
        area,
        requested_status: newStatus,
        source: entry.source || 'unknown',
        actor: opts.actor ?? null,
        evidence_media_id: entry.evidenceMediaId ?? null,
        created_at: now,
      });
      continue;
    }

    // ── RULES 3 + 4: the engine decides, not this file ────────────────────
    // lib/montree/tracking/ledger.ts owns the ladder and the same-day dedupe. The
    // door builds the event the engine would see and asks it.
    const engineEvent: EngineEvent = {
      child_id: entry.childId,
      classroom_id: classroomId ?? eff.classroom_id ?? null,
      work_key: workKey,
      work_name: workName,
      area,
      old_status: toEngineStatus(previousStatus),
      new_status: toEngineStatus(newStatus) ?? 'not_started',
      // allowDowngrade means exactly one thing (see the header): a teacher correcting
      // the record. That is engine source 'correction' — the only source rule 4 lets
      // move a child down, and the only one exempt from the same-day dedupe.
      source: entry.allowDowngrade ? 'correction' : toEngineSource(entry.source),
      actor: opts.actor ?? null,
      created_at: now,
      reason: entry.allowDowngrade
        ? (entry.reason?.trim() || `teacher correction via ${entry.source || 'unknown'}`)
        : (entry.reason ?? null),
      evidence_id: entry.evidenceId ?? entry.evidenceMediaId ?? null,
    };

    // CARVE-OUT: a work with no row yet is always created. The engine would call
    // not_started → not_started a no-op, but "create the row" is what every caller
    // that writes a fresh not_started/presented row has always meant.
    // workKey is non-null here for every strict caller; strict:false is the one
    // escape hatch that can still arrive keyless, and applyEvent would reject it
    // outright ('no-key'), so those keep their historical unconditional write.
    const verdict =
      eff.exists && workKey
        ? applyEvent(
            seedState(entry.childId, workKey, previousStatus, movedToday),
            engineEvent,
            resolvedTz(entry),
          )
        : { accepted: true as const, state: emptyState() };

    if (!verdict.accepted) {
      const why = verdict.why;
      // CARVE-OUT: an explicit correction that lands on the rung the child is already
      // on is the "refresh updated_at" write advanceProgressOnConfirm has always made.
      // Let the row be touched; the journal still records only the evidence.
      const refresh = why === 'no-op' && !!entry.allowDowngrade;
      if (!refresh) {
        results[index].outcome = why === 'no-op' || why === 'duplicate-same-day' ? 'skipped_noop' : 'skipped_rank';
        results[index].reason = why;
        results[index].status = previousStatus || newStatus;
        // Evidence, not a rung: only for the two verdicts that mean "we saw the child
        // at this work again". A refused DOWNGRADE is not evidence of anything.
        if (why === 'no-op' || why === 'duplicate-same-day') {
          evidenceRows.push(evidenceRow(engineEvent, previousStatus, eff, results[index]));
        }
        continue;
      }
      evidenceRows.push(evidenceRow(engineEvent, previousStatus, eff, results[index]));
    }

    const isFirstMastery = newStatus === 'mastered' && !eff.mastered_at;
    results[index].firstMastery = isFirstMastery;

    // Every record in the batch carries the SAME key set — PostgREST bulk upserts
    // want a uniform shape, and filling from the current state means an unspecified
    // field is preserved rather than nulled.
    const record: Record<string, unknown> = {
      child_id: entry.childId,
      work_name: workName,
      area,
      status: newStatus,
      work_key: workKey ?? null,
      classroom_id: classroomId ?? eff.classroom_id ?? null,
      school_id: schoolId ?? eff.school_id ?? null,
      notes: entry.notes !== undefined ? entry.notes : (eff.notes ?? null),
      presented_at: eff.presented_at ?? (newStatus === 'presented' ? now : null),
      mastered_at: eff.mastered_at ?? (newStatus === 'mastered' ? now : null),
      updated_at: now,
    };
    for (const column of extraColumns) {
      const provided = providedExtra(entry, column);
      record[column] = provided !== undefined ? provided : (eff.extra[column] ?? null);
    }

    // Advance the in-batch state so the next entry for this row is gated against it.
    effectiveByKey.set(key, {
      exists: true,
      status: newStatus,
      area: record.area as string | null,
      work_key: record.work_key as string | null,
      classroom_id: record.classroom_id as string | null,
      school_id: record.school_id as string | null,
      notes: record.notes as string | null,
      presented_at: record.presented_at as string | null,
      mastered_at: record.mastered_at as string | null,
      extra: Object.fromEntries(extraColumns.map((c) => [c, (record[c] as string | null) ?? null])),
    });

    const p: Planned = { index, entry, workName, key, record, previousStatus, newStatus, engineEvent };

    // Postgres refuses to touch the same row twice in one ON CONFLICT statement, so
    // only the LAST accepted record per row is sent. The gate above guarantees it is
    // also the highest rung; the ones it subsumes report skipped_noop.
    const superseded = plannedByKey.get(key);
    if (superseded) {
      results[superseded.index].outcome = 'skipped_noop';
      results[superseded.index].status = superseded.newStatus;
      results[superseded.index].firstMastery = false;
      const at = planned.indexOf(superseded);
      if (at >= 0) planned.splice(at, 1);
    }
    plannedByKey.set(key, p);
    planned.push(p);
  }

  if (planned.length === 0) {
    await queueForReview(supabase, queued);
    await appendEvents(supabase, evidenceRows, opts);
    return results;
  }

  // ── 5. THE JOURNAL, FIRST (audit 08-verify-tracking §6a) ──────────────────
  //
  // RULE 3: the journal is the truth and montree_child_progress is a CACHE of it.
  // This used to run the other way round — cache upsert committed, journal appended
  // afterwards on a best-effort basis that "cannot throw and whose failure is
  // invisible". A dropped append left the cache permanently AHEAD of its own source,
  // and the recovery tool (rebuild) then ERASES the row, because the journal says it
  // never happened. Writing the journal first inverts the failure: the worst case is
  // an event with no cache row, which is exactly what a rebuild repairs.
  //
  // old_status comes from the PRE-READ, not from p.previousStatus: when several batch
  // entries collapse onto one row, only the surviving record is written, and the
  // journal must describe the transition the database actually made (db → final), not
  // the intermediate in-batch rung.
  const changes = planned
    .map((p) => ({ p, dbStatus: existingByKey.get(p.key)?.status || null }))
    .filter(({ p, dbStatus }) => dbStatus !== p.newStatus)
    .map(({ p, dbStatus }) => ({
      index: p.index,
      childId: p.entry.childId,
      workName: p.workName,
      planned: p,
      row: {
        child_id: p.entry.childId,
        school_id: results[p.index].schoolId,
        classroom_id: results[p.index].classroomId,
        work_key: results[p.index].workKey,
        work_name: p.workName,
        area: (p.record.area as string | null) ?? null,
        old_status: dbStatus,
        new_status: p.newStatus,
        // §2: the SOURCE AND REASON THE ENGINE ACCEPTED, not the caller's raw
        // fields. allowDowngrade already became source 'correction' plus a reason
        // in the event applyEvent() was asked about; journalling anything else
        // makes the row unreplayable and the cache a lie.
        source: p.engineEvent.source,
        reason: p.engineEvent.reason ?? null,
        evidence_id: p.entry.evidenceId ?? p.entry.evidenceMediaId ?? null,
        created_at: now,
      } as Record<string, unknown>,
    }));

  await queueForReview(supabase, queued);
  // The change rows come FIRST, so an index below the change count identifies a
  // change row; anything above it is an evidence row, which the guard index cannot
  // reject (old_status = new_status is outside its predicate).
  const appended = await appendEvents(
    supabase,
    [...changes.map((c) => c.row), ...evidenceRows],
    opts,
  );

  // ── 6. What the journal refused ───────────────────────────────────────────
  //
  // 23505 — migration 347's one-move-per-day guard index already holds this exact
  // rung for this child, this work, this day: another writer got there first. Not an
  // error (see reportSameDayRace); the rung is where the caller wanted it, so the
  // cache write is skipped and the row is re-read instead.
  //
  // Anything else — a constraint we do not know about, a permissions failure, a
  // driver error — is FATAL for that entry. Rule 3 does not permit a cache row whose
  // transition is not in the journal, so nothing is written for it.
  const racedIndexes = new Set(appended.duplicated.filter((i) => i < changes.length));
  const failedIndexes = new Set(appended.failed.filter((i) => i < changes.length));

  const raced = [...racedIndexes].map((i) => changes[i]);
  for (const i of failedIndexes) {
    const c = changes[i];
    results[c.index].outcome = 'failed';
    results[c.index].journalled = false;
    results[c.index].status = c.planned.previousStatus || c.planned.newStatus;
    results[c.index].error = 'journal append failed — the cache was not written (rule 3)';
  }

  const blocked = new Set<number>();
  for (const i of racedIndexes) blocked.add(changes[i].index);
  for (const i of failedIndexes) blocked.add(changes[i].index);
  const toWrite = planned.filter((p) => !blocked.has(p.index));

  // A change row that reached the journal (or an entry whose transition needed no
  // change row at all) is safe to cache. tableMissing is the one documented
  // carve-out: an environment where migration 314 has not been pasted still writes
  // progress, and says so on the result.
  for (const p of toWrite) results[p.index].journalled = !appended.tableMissing;

  if (toWrite.length === 0) {
    if (raced.length > 0) await reportSameDayRace(supabase, raced, results);
    return results;
  }

  // ── 7. The cache write ────────────────────────────────────────────────────
  const { data: upserted, error: upsertError } = await supabase
    .from('montree_child_progress')
    .upsert(toWrite.map((p) => p.record), { onConflict: 'child_id,work_name', ignoreDuplicates: false })
    .select('id, child_id, work_name, status');

  if (upsertError) {
    // Legacy environments without the unique_child_work constraint (migration 111)
    // reject the ON CONFLICT clause outright. Fall back to per-row update/insert so
    // those environments keep working — carried over from progress/update's own
    // fallback, which this primitive replaced.
    const constraintMissing =
      upsertError.code === '42P10' || /constraint/i.test(upsertError.message || '');
    if (!constraintMissing) {
      console.error('[writeProgress] upsert failed:', upsertError.message || upsertError);
      for (const p of toWrite) results[p.index].error = 'progress upsert failed';
      if (raced.length > 0) await reportSameDayRace(supabase, raced, results);
      return results;
    }

    for (const p of toWrite) {
      const existing = existingByKey.get(p.key);
      try {
        if (existing) {
          const { error } = await supabase
            .from('montree_child_progress')
            .update(p.record)
            .eq('id', existing.id);
          if (error) throw error;
          results[p.index].row = { id: existing.id, status: p.newStatus };
        } else {
          const { data, error } = await supabase
            .from('montree_child_progress')
            .insert(p.record)
            .select('id, status')
            .maybeSingle();
          if (error) throw error;
          results[p.index].row = data ? { id: data.id, status: data.status } : null;
        }
        results[p.index].outcome = 'written';
        results[p.index].status = p.newStatus;
      } catch (err) {
        console.error('[writeProgress] fallback write failed:', err);
        results[p.index].error = 'progress write failed';
      }
    }
  } else {
    const rowByKey = new Map<string, { id: string; status: string }>();
    for (const row of upserted || []) {
      rowByKey.set(progressKey(row.child_id, row.work_name), { id: row.id, status: row.status });
    }
    for (const p of toWrite) {
      results[p.index].outcome = 'written';
      results[p.index].status = p.newStatus;
      results[p.index].row = rowByKey.get(progressKey(p.entry.childId, p.workName)) || null;
    }
  }

  // ── 8. Migration 347's guard index had already recorded this move ─────────
  if (raced.length > 0) await reportSameDayRace(supabase, raced, results);

  return results;
}

/**
 * RULES 3 + 4, under concurrency.
 *
 * The same-day dedupe in this file is READ-then-WRITE: step 3b reads today's journal,
 * step 4 asks lib/montree/tracking/ledger.ts whether the rung already moved. Two taps
 * that interleave between those two points BOTH see "not moved yet". Migration 347's
 * partial unique index makes the second journal insert fail with 23505 instead, and
 * this is what the door does about it.
 *
 * It is NOT an error. The rung is exactly where the caller wanted it — the other
 * writer put it there a moment earlier — so the honest answer is the one the
 * in-memory dedupe gives for a slow double-tap: outcome 'skipped_noop', reason
 * 'duplicate-same-day'. The cache row is RE-READ rather than assumed, because the
 * winner may have been a correction or a higher rung, and the caller is told what the
 * row actually says now. Nothing throws; a failed re-read simply leaves the status
 * this call computed.
 */
async function reportSameDayRace(
  supabase: SupabaseClient,
  raced: Array<{ index: number; childId: string; workName: string }>,
  results: ProgressResult[],
): Promise<void> {
  const current = new Map<string, string>();
  try {
    const { data, error } = await supabase
      .from('montree_child_progress')
      .select('child_id, work_name, status')
      .in('child_id', Array.from(new Set(raced.map((r) => r.childId))))
      .in('work_name', Array.from(new Set(raced.map((r) => r.workName))));
    if (error) throw error;
    for (const row of (data || []) as Array<{ child_id: string; work_name: string; status: string }>) {
      current.set(progressKey(row.child_id, row.work_name), row.status);
    }
  } catch (err) {
    console.warn('[writeProgress] same-day race re-read failed (reporting the computed status):', err);
  }

  for (const r of raced) {
    const status = current.get(progressKey(r.childId, r.workName)) ?? results[r.index].status;
    results[r.index].outcome = 'skipped_noop';
    results[r.index].reason = 'duplicate-same-day';
    results[r.index].status = status;
    results[r.index].previousStatus = status;
    // Another writer moved this rung, so this call did not perform the first mastery
    // and must not fire the shelf-advance a second time.
    results[r.index].firstMastery = false;
    if (results[r.index].row) results[r.index].row = { ...results[r.index].row!, status };
  }
}

/**
 * Same rules as writeProgressBatch, in chunks. The primitive issues ONE upsert for
 * the whole batch, and an import can hand it a thousand rows at once — past a few
 * hundred that is a single statement big enough to trip PostgREST's payload limits
 * and to make one bad row cost the whole import. Chunking keeps behaviour identical
 * (same order in, same order out) and bounds the blast radius.
 *
 * Chunks are cut on (child_id, work_name) boundaries so the in-batch rank gate still
 * sees every entry for a row together — an importer that lists the same work twice
 * must not have those two entries land in different statements.
 */
export async function writeProgressBatchChunked(
  supabase: SupabaseClient,
  entries: ProgressEntry[],
  opts: WriteProgressOptions & { chunkSize?: number } = {},
): Promise<ProgressResult[]> {
  const chunkSize = Math.max(1, opts.chunkSize ?? 200);
  if (entries.length <= chunkSize) return writeProgressBatch(supabase, entries, opts);

  // Group by row identity first, then fill chunks group by group.
  const groups = new Map<string, number[]>();
  entries.forEach((e, i) => {
    const raw = String(e?.workName || '').trim();
    const dp = parseDarkPhonicsWorkName(raw);
    const key = `${e?.childId}\u0000${dp ? darkPhonicsWorkName(dp.letter, dp.n) : raw}`;
    const list = groups.get(key);
    if (list) list.push(i); else groups.set(key, [i]);
  });

  const chunks: number[][] = [];
  let current: number[] = [];
  for (const indexes of groups.values()) {
    if (current.length > 0 && current.length + indexes.length > chunkSize) {
      chunks.push(current);
      current = [];
    }
    current.push(...indexes);
  }
  if (current.length > 0) chunks.push(current);

  const results: ProgressResult[] = new Array(entries.length);
  for (const chunk of chunks) {
    const chunkResults = await writeProgressBatch(supabase, chunk.map((i) => entries[i]), opts);
    chunk.forEach((entryIndex, position) => { results[entryIndex] = chunkResults[position]; });
  }
  return results;
}

/**
 * RULE 5's other half: the observation nobody could key. Best-effort, exactly like the
 * journal — a queue failure is logged and never surfaces as a write failure, because
 * the write it describes did not happen either.
 */
async function queueForReview(
  supabase: SupabaseClient,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  if (rows.length === 0) return;
  // Two entries in one batch for the same child + same unknown name are a DUPLICATE,
  // not two questions for the teacher. Collapsing them here is what makes the 23505
  // below rare rather than routine (audit 08-verify-tracking §6c).
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const k = [r.child_id, String(r.raw_work_name ?? '').trim().toLowerCase(), r.requested_status].join('\u0000');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  try {
    const { error } = await supabase.from('montree_progress_review_queue').insert(unique);
    if (!error) return;
    if (error.code === '42P01') {
      console.warn('[writeProgress] montree_progress_review_queue missing — run migration 345; unresolved works were NOT written');
      return;
    }
    if (error.code === UNIQUE_VIOLATION) {
      // Migration 345's dedup index. ONE colliding row used to cost the WHOLE
      // statement — every other queued observation in the batch was silently
      // dropped. Retry row by row with ON CONFLICT semantics: a duplicate is
      // already queued (nothing to do), everything else still lands.
      await queueForReviewIndividually(supabase, unique);
      return;
    }
    console.error('[writeProgress] review-queue insert failed (non-fatal):', error.message || error);
  } catch (err) {
    console.error('[writeProgress] review-queue insert threw (non-fatal):', err);
  }
}

/** One statement per row, duplicates ignored. Only reached after a batch 23505. */
async function queueForReviewIndividually(
  supabase: SupabaseClient,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  for (const row of rows) {
    try {
      const { error } = await supabase.from('montree_progress_review_queue').insert([row]);
      if (!error || error.code === UNIQUE_VIOLATION) continue;
      console.error('[writeProgress] review-queue row insert failed (non-fatal):', error.message || error);
    } catch (err) {
      console.error('[writeProgress] review-queue row insert threw (non-fatal):', err);
    }
  }
}

/**
 * Remove every progress row for a child. The ONE place a delete on
 * montree_child_progress lives — child deletion (GDPR erasure) is the only reason
 * the rows go away, and it goes through the door like everything else. The journal
 * is deliberately left intact (migration 314: "a child deleted tomorrow must not
 * erase the history that fed last month's rollup").
 */
export async function deleteProgressForChild(
  supabase: SupabaseClient,
  childId: string,
): Promise<{ error: unknown }> {
  return supabase.from('montree_child_progress').delete().eq('child_id', childId);
}

/**
 * What the journal insert did. `duplicated` holds the INDEXES (into the `events`
 * array as it was passed in) of rows the database refused with 23505 because
 * migration 347's guard index already holds that exact ladder move for that child,
 * that work and that UTC day — i.e. someone else advanced the same rung at the same
 * moment. Callers that do not care can keep ignoring the return value.
 */
export interface AppendEventsResult {
  /** Rows the journal accepted. */
  inserted: number;
  /** Indexes of rows rejected by the same-day guard index (Postgres 23505). */
  duplicated: number[];
  /**
   * Indexes of rows the journal refused for a reason that is NOT 23505 and NOT one
   * of the known missing-column retries. Rule 3 makes these fatal to the write that
   * produced them: the caller must not cache a transition the journal does not hold.
   */
  failed: number[];
  /**
   * montree_progress_events does not exist on this environment (migration 314 not
   * pasted). The ONE tolerated journal failure — deploy-before-migration is safe by
   * design here — reported so the caller can say `journalled: false` rather than
   * pretend the row was recorded.
   */
  tableMissing: boolean;
}

/** Postgres unique_violation — migration 347's one-move-per-day guard index. */
const UNIQUE_VIOLATION = '23505';

/**
 * Insert the journal rows ONE AT A TIME, so a single 23505 does not cost the whole
 * batch its history. Only reached when the batch insert came back 23505 — the happy
 * path is still exactly one statement.
 */
async function appendEventsIndividually(
  supabase: SupabaseClient,
  payload: Array<Record<string, unknown>>,
): Promise<AppendEventsResult> {
  const duplicated: number[] = [];
  const failed: number[] = [];
  let inserted = 0;
  for (let i = 0; i < payload.length; i++) {
    const { error } = await supabase.from('montree_progress_events').insert([payload[i]]);
    if (!error) { inserted++; continue; }
    if (error.code === UNIQUE_VIOLATION) { duplicated.push(i); continue; }
    console.error('[writeProgress] event append failed:', error.message || error);
    failed.push(i);
  }
  return { inserted, duplicated, failed, tableMissing: false };
}

/**
 * Append to montree_progress_events. It still never THROWS, but it no longer hides:
 * every refusal is reported in the result (duplicated / failed / tableMissing) and
 * writeProgressBatch refuses to cache a transition the journal would not take. The
 * journal is written BEFORE the cache (rule 3) precisely so this result can decide.
 *
 * RULE 3 + MIGRATION 347: the table now carries a partial UNIQUE index over
 * (child_id, work_key, new_status, UTC day) for status-CHANGING rows, so two
 * simultaneous taps on the same rung cannot both be journalled. A 23505 here is not
 * an error — it is the database giving the same verdict lib/montree/tracking/ledger.ts
 * dedupeSameDay() gives in memory — so the batch is retried row by row and the losers
 * are reported back in `duplicated` for the caller to mark 'duplicate-same-day'.
 */
export async function appendEvents(
  supabase: SupabaseClient,
  events: Array<Record<string, unknown>>,
  _opts: WriteProgressOptions = {},
): Promise<AppendEventsResult> {
  const none: AppendEventsResult = { inserted: 0, duplicated: [], failed: [], tableMissing: false };
  const allIndexes = events.map((_, i) => i);
  if (events.length === 0) return none;

  // Optional journal columns, newest migration first. Each is an EXPLANATION or a
  // POINTER, never the event itself, so on an environment where the migration has
  // not been pasted we drop the column and keep the row. Dropped cumulatively:
  // an environment behind on 346 is usually behind on 345 too.
  const OPTIONAL_COLUMNS = ['evidence_id', 'reason'] as const;
  const MIGRATION_OF: Record<string, string> = { evidence_id: '346', reason: '345' };

  const strip = (rows: Array<Record<string, unknown>>, columns: readonly string[]) =>
    rows.map((row) => {
      const copy = { ...row };
      for (const column of columns) delete copy[column];
      return copy;
    });

  try {
    let payload = events;
    const dropped: string[] = [];
    for (let attempt = 0; attempt <= OPTIONAL_COLUMNS.length; attempt++) {
      const { error } = await supabase.from('montree_progress_events').insert(payload);
      if (!error) return { inserted: payload.length, duplicated: [], failed: [], tableMissing: false };

      const nextColumn = OPTIONAL_COLUMNS[attempt];
      if (error.code === '42703' && nextColumn && payload.some((e) => nextColumn in e)) {
        console.warn(
          `[writeProgress] montree_progress_events.${nextColumn} missing — run migration ${MIGRATION_OF[nextColumn]}; journalling without it`,
        );
        dropped.push(nextColumn);
        payload = strip(events, dropped);
        continue;
      }
      if (error.code === UNIQUE_VIOLATION) {
        // Migration 347's guard index. At least one row in this batch is a rung that
        // has already been journalled for this child, this work, this day. Which one
        // the batch does not say, so ask row by row: everything else still lands.
        return appendEventsIndividually(supabase, payload);
      }
      if (error.code === '42P01') {
        // Migration 314 not pasted yet on this environment. Expected during rollout,
        // and the one journal failure the door tolerates.
        console.warn('[writeProgress] montree_progress_events missing — run migration 314 to start the journal');
        return { inserted: 0, duplicated: [], failed: [], tableMissing: true };
      }
      console.error('[writeProgress] event append failed:', error.message || error);
      return { inserted: 0, duplicated: [], failed: allIndexes, tableMissing: false };
    }
  } catch (err) {
    console.error('[writeProgress] event append threw:', err);
    return { inserted: 0, duplicated: [], failed: allIndexes, tableMissing: false };
  }
  return { inserted: 0, duplicated: [], failed: allIndexes, tableMissing: false };
}

/**
 * RULE 3's other half: montree_child_progress is a CACHE of the journal, and this is
 * how the cache is refilled. lib/montree/tracking/persistence.ts computes the rebuilt
 * rows with the engine (rebuiltRowsFor) and hands them here, because rule 2 says the
 * table has exactly one writer and this file is it.
 *
 * Deliberately NOT a writeProgressBatch call: a rebuild is not an observation. It
 * asserts the state the journal already proves, so it must not rank-gate (the journal
 * may legitimately have gone DOWN via a correction), must not journal again (that
 * would double-count every rebuild), and must not queue anything (every row it writes
 * already has a key).
 *
 * The equivalent server-side function is montree_rebuild_child_progress(uuid)
 * (migration 346), for the nightly job and for a rebuild of the whole school.
 */
export async function applyRebuiltProgress(
  supabase: SupabaseClient,
  childId: string,
  rows: Array<{
    child_id: string;
    work_name: string;
    work_key: string;
    area: string | null;
    status: string;
    classroom_id: string | null;
    school_id: string | null;
    presented_at: string | null;
    mastered_at: string | null;
  }>,
): Promise<{ written: number; error?: string }> {
  if (rows.length === 0) return { written: 0 };
  const now = new Date().toISOString();
  const records = rows.map((r) => ({
    child_id: r.child_id,
    work_name: r.work_name,
    work_key: r.work_key,
    area: r.area,
    status: r.status,
    classroom_id: r.classroom_id,
    school_id: r.school_id,
    presented_at: r.presented_at,
    mastered_at: r.mastered_at,
    updated_at: now,
  }));

  const { error } = await supabase
    .from('montree_child_progress')
    .upsert(records, { onConflict: 'child_id,work_name', ignoreDuplicates: false });

  if (error) {
    console.error(`[writeProgress] rebuild upsert failed for child ${childId}:`, error.message || error);
    return { written: 0, error: error.message || 'rebuild upsert failed' };
  }
  return { written: records.length };
}
