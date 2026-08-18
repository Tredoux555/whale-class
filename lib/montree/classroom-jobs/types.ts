// lib/montree/classroom-jobs/types.ts
// ============================================================================
// THE CLASSROOM JOBS POSTER — the stored shape, and the only gate into it.
// ============================================================================
// A room's jobs chart: a list of jobs, and which child holds each one. Parked
// on the classroom row as `montree_classrooms.settings.jobs_poster`.
//
// 🚨 NO MIGRATION. `settings` (JSONB) has been on `montree_classrooms` since
// migration 067 and is a SHARED bag — `brand_kit` already lives beside this.
// Every write is read-merge-write; nothing here creates a table or a column.
//
// 🚨 EVERYTHING IN HERE IS UNTRUSTED UNTIL `parseJobsPoster` HAS SEEN IT. The
// blob is written by a browser and read back onto a printed sheet, so the
// parser is the ONLY sanctioned way to turn JSONB — or a request body — into a
// JobsPoster. It validates every field, drops what it cannot recognise, and
// returns `null` rather than a half-trusted object. Same posture, and the same
// reasoning, as lib/montree/brand-kit/types.ts.
//
// PURE. No I/O, no React, no locale. The API route and the tool page both
// import it, so the shape cannot drift between what is saved and what prints.

/** Bumped when the stored shape changes in a way a reader must notice. A
 *  poster whose version this build does not understand is ignored (the room
 *  gets the default job list back) rather than half-read into a broken chart. */
export const JOBS_POSTER_VERSION = 1;

/** One job on the wall. */
export interface ClassroomJob {
  /** Stable slug. One of the DEFAULT_JOBS ids, or `custom-<random>`. */
  id: string;
  /** A single emoji, drawn big on the card. May be empty. */
  icon: string;
  /** What the job is called, in the teacher's own words. */
  name: string;
  /** Off means "not this term" — kept, not deleted, so the wording and the
   *  emoji survive being switched back on. */
  active: boolean;
  /** `montree_children.id`, or null for an unassigned job (which prints as a
   *  ruled blank line the teacher can write on). */
  childId: string | null;
}

export interface JobsPoster {
  version: number;
  jobs: ClassroomJob[];
  /** ISO stamp of the save that produced this. Advisory only. */
  updatedAt?: string;
}

// ── limits ──────────────────────────────────────────────────────────────────
// None of these are taste. Each is the point past which a value stops being
// the thing it claims to be and starts being a storage bug on a row that
// several other features share.

/** More than this is not a jobs chart; it is a spreadsheet. */
export const MAX_JOBS = 40;
/** A job name that does not fit a card is a job name nobody reads. */
export const MAX_NAME_LEN = 40;
/** An emoji plus its modifiers and a ZWJ — enough for a two-part glyph, not
 *  for a sentence somebody has typed into the icon box. */
export const MAX_ICON_LEN = 12;

/**
 * The curated Montessori starting set — the twelve jobs a 3–6 room actually
 * runs. A teacher renames these, switches them off, and adds their own; they
 * are a starting point, never a vocabulary.
 */
export const DEFAULT_JOBS: readonly { id: string; icon: string; name: string }[] = [
  { id: 'line_leader', icon: '🚶', name: 'Line Leader' },
  { id: 'door_holder', icon: '🚪', name: 'Door Holder' },
  { id: 'light_helper', icon: '💡', name: 'Light Helper' },
  { id: 'snack_helper', icon: '🍎', name: 'Snack Helper' },
  { id: 'plant_care', icon: '🪴', name: 'Plant Care' },
  { id: 'librarian', icon: '📚', name: 'Librarian' },
  { id: 'sweeper', icon: '🧹', name: 'Sweeper' },
  { id: 'table_washer', icon: '🫧', name: 'Table Washer' },
  { id: 'chair_helper', icon: '🪑', name: 'Chair Helper' },
  { id: 'calendar_helper', icon: '📅', name: 'Calendar Helper' },
  { id: 'weather_reporter', icon: '⛅', name: 'Weather Reporter' },
  { id: 'greeter', icon: '👋', name: 'Greeter' },
];

/** The chart a room gets when it has never saved one. */
export function defaultJobsPoster(): JobsPoster {
  return {
    version: JOBS_POSTER_VERSION,
    jobs: DEFAULT_JOBS.map((j) => ({ ...j, active: true, childId: null })),
  };
}

/** A fresh id for a teacher-added job. Never collides with a DEFAULT_JOBS id
 *  (those carry no `custom-` prefix) and never with another custom one in any
 *  realistic room. */
export function newCustomJobId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── validation ──────────────────────────────────────────────────────────────

const ID_RE = /^[a-z0-9][a-z0-9_-]{0,47}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Control characters, line breaks, and the Unicode direction overrides. A job
 *  name is one short line on a card; anything that could make it become two
 *  lines — or reverse the ones printed around it — is not part of the name. */
const UNSAFE_TEXT_RE = /[\u0000-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(UNSAFE_TEXT_RE, '').trim().slice(0, max);
}

export function isJobsChildId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * The gate. Anything that is not recognisably a JobsPoster becomes `null`, and
 * a `null` poster means "this room has not saved one".
 *
 * 🚨 IT NEVER THROWS. It runs against a JSONB column written by an older
 * build, against a request body written by a browser, and inside a render
 * path — three places where an exception is strictly worse than a default job
 * list.
 */
export function parseJobsPoster(raw: unknown): JobsPoster | null {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const o = raw as Record<string, unknown>;

    // Unknown FUTURE versions are ignored; there is no forwards compatibility
    // to guess at. Unversioned blobs read as v1, which is all that has ever
    // been written.
    const version = typeof o.version === 'number' ? o.version : JOBS_POSTER_VERSION;
    if (version > JOBS_POSTER_VERSION) return null;

    if (!Array.isArray(o.jobs)) return null;

    const seen = new Set<string>();
    const jobs: ClassroomJob[] = [];

    for (const entry of o.jobs) {
      if (jobs.length >= MAX_JOBS) break;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const e = entry as Record<string, unknown>;

      const id = typeof e.id === 'string' && ID_RE.test(e.id) ? e.id : '';
      // 🚨 A DUPLICATE ID IS DROPPED, NOT RENAMED. Ids are the React key and
      // the handle every edit uses; two jobs sharing one would make renaming
      // the first silently rename the second.
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const name = cleanText(e.name, MAX_NAME_LEN);
      // A job with no name is not a job — an icon on its own prints as a
      // mystery nobody in the room can read.
      if (!name) continue;

      jobs.push({
        id,
        icon: cleanText(e.icon, MAX_ICON_LEN),
        name,
        // Absent means yes — a saved job is a wanted job.
        active: e.active !== false,
        childId: isJobsChildId(e.childId) ? e.childId : null,
      });
    }

    if (jobs.length === 0) return null;

    return {
      version: JOBS_POSTER_VERSION,
      jobs,
      updatedAt:
        typeof o.updatedAt === 'string' && o.updatedAt.length <= 40 ? o.updatedAt : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Pull a validated poster out of a `settings` JSONB bag.
 *
 * 🚨 NEVER THROWS, AND TREATS A NON-OBJECT AS ABSENT. The column is declared
 * JSONB, but a row that comes back as a JSON *string* must read as "no poster"
 * rather than being indexed character by character. Same trap, same guard, as
 * lib/montree/brand-kit/resolve.ts.
 */
export function readJobsPosterFromSettings(settings: unknown): JobsPoster | null {
  try {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
    return parseJobsPoster((settings as Record<string, unknown>).jobs_poster);
  } catch {
    return null;
  }
}

/**
 * Drop assignments that name a child this classroom does not have.
 *
 * 🚨 THE ROSTER IS THE SERVER'S, NEVER THE BODY'S — the Jul-3 lesson applied
 * to a child id: a saved poster must not be able to print a name out of
 * another room. It also self-heals, because a child who leaves the class stops
 * holding a job on the next save rather than printing forever.
 *
 * `known` is every child id ON the classroom, active or not: this function
 * answers "does this child belong to this room", and whether they are still
 * enrolled is the roster read's business at print time.
 */
export function scrubAssignments(poster: JobsPoster, known: ReadonlySet<string>): JobsPoster {
  return {
    ...poster,
    jobs: poster.jobs.map((j) =>
      j.childId && !known.has(j.childId) ? { ...j, childId: null } : j
    ),
  };
}
