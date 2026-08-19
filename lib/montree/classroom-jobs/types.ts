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
  /** A single emoji, drawn big on the card. May be empty. Ignored on the
   *  printed card once `imageUrl` is set — see `imageUrl` below. */
  icon: string;
  /** What the job is called, in the teacher's own words. */
  name: string;
  /** Off means "not this term" — kept, not deleted, so the wording and the
   *  emoji survive being switched back on. */
  active: boolean;
  /** `montree_children.id`, or null for an unassigned job (which prints as a
   *  ruled blank line the teacher can write on). */
  childId: string | null;
  /** A teacher-uploaded picture in place of the emoji, at the icon spot on the
   *  card. Written as a PAIR with `imagePath` by
   *  `POST /api/montree/classroom-jobs/icon` — same pairing, same reasoning,
   *  as `logoUrl`/`logoPath` on `BrandKit`. The API route re-proves the path
   *  belongs to THIS classroom's own storage folder before a save may keep
   *  it (see the route's `scrubJobImagePaths` — that check cannot live in
   *  this pure parser, which has no schoolId or classroomId to check
   *  against). */
  imageUrl?: string;
  /** Storage object key for `imageUrl`, kept so a replacement upload — or a
   *  removal — can clean up the file it replaces. Never rendered. */
  imagePath?: string;
}

export interface JobsPoster {
  version: number;
  jobs: ClassroomJob[];
  /** The poster's own heading, in the teacher's words — "Classroom Helpers",
   *  "Room 4 Jobs". Absent (or blank) means the room has not chosen one, and
   *  `DEFAULT_POSTER_TITLE` prints instead; the two are never confused by
   *  storing the default as text, so a later locale change of the default
   *  moves every room that never customised theirs. */
  title?: string;
  /** Print a round roster photo beside each assigned child's name (names mode
   *  only — slots mode already carries a photo on the printed strip itself).
   *  Absent means yes, same "a saved poster is a wanted poster" idiom as
   *  `ClassroomJob.active`: an old poster that predates this field prints
   *  photos rather than silently losing them. Nothing photo-shaped is ever
   *  stored alongside this flag — the photo itself is resolved at render time
   *  from the roster fetch, by `childId`, never copied into this blob. */
  showChildPhotos?: boolean;
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
/** A poster title is one line under the masthead, not a subtitle. */
export const MAX_TITLE_LEN = 60;
/** The proxy URL `POST /api/montree/classroom-jobs/icon` hands back — see
 *  `isSafeImageUrl`. A job icon travels inside the same small poster blob as
 *  everything else here, so it is bounded far tighter than a raw upload URL
 *  would need to be. */
export const MAX_IMAGE_URL_LEN = 500;
/** A storage object key, not a URL — see `isSafeImagePath`. */
export const MAX_IMAGE_PATH_LEN = 300;

/** What a poster's masthead reads when no room has typed its own. */
export const DEFAULT_POSTER_TITLE = 'Our Classroom Jobs';

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
 * A URL safe to drop straight into an `<img src>` for a job's icon.
 *
 * 🚨 THE UPLOAD ROUTE HANDS BACK A SITE-RELATIVE PROXY PATH — the house rule
 * for every uploaded file in this codebase (see `getProxyUrl` and
 * `BrandKit.logoUrl`), never a raw Supabase URL. So both forms are accepted,
 * same posture as `isSafeLogoUrl` in lib/montree/brand-kit/types.ts: an
 * absolute `https://` URL, or a same-origin path starting with a single `/`
 * (protocol-relative `//host/...` is rejected — it is not ours). Bare `http`
 * is refused outright, tighter than the brand kit's gate, because nothing
 * that serves this feature's uploads is ever plain http. Never `javascript:`,
 * never `data:`, and never anything carrying a quote, parenthesis, backslash,
 * whitespace or angle bracket — the characters an injected URL would need to
 * break out of its context.
 */
function isSafeImageUrl(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > MAX_IMAGE_URL_LEN) return false;
  if (/["'()\\<>\s]/.test(v)) return false;
  if (v.startsWith('/')) return !v.startsWith('//');
  return /^https:\/\//i.test(v);
}

/** A storage object key, NEVER an `<img src>` path: no leading slash (it is
 *  joined onto a folder, not treated as absolute), no `..` (no walking out of
 *  the folder the route scrubs it against), and nothing outside the narrow
 *  charset a storage key is ever built from. */
const IMAGE_PATH_RE = /^[A-Za-z0-9_.\-/]+$/;

function isSafeImagePath(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > MAX_IMAGE_PATH_LEN) return false;
  if (v.startsWith('/') || v.includes('..')) return false;
  return IMAGE_PATH_RE.test(v);
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

      // 🚨 THE TWO FIELDS ARE VALIDATED AS ONE PAIR: either both are safe and
      // both are kept, or neither is. An `imageUrl` with no matching
      // `imagePath` cannot be cleaned up when it is later replaced or removed,
      // and an `imagePath` with no `imageUrl` has nothing safe to print — so a
      // half-valid pair is worth exactly as little as a wholly invalid one.
      // The job itself always survives; only the picture is dropped, and the
      // card falls back to its emoji.
      const imageValid = isSafeImageUrl(e.imageUrl) && isSafeImagePath(e.imagePath);

      jobs.push({
        id,
        icon: cleanText(e.icon, MAX_ICON_LEN),
        name,
        // Absent means yes — a saved job is a wanted job.
        active: e.active !== false,
        childId: isJobsChildId(e.childId) ? e.childId : null,
        ...(imageValid
          ? { imageUrl: e.imageUrl as string, imagePath: e.imagePath as string }
          : {}),
      });
    }

    if (jobs.length === 0) return null;

    // A blank or whitespace-only title is not a chosen title — `cleanText`
    // trims before slicing, so " " comes back as "", and "" reads as absent
    // rather than as a poster deliberately headed with nothing.
    const title = cleanText(o.title, MAX_TITLE_LEN) || undefined;

    return {
      version: JOBS_POSTER_VERSION,
      jobs,
      title,
      // Absent (or anything that is not the literal boolean `false`) means
      // yes — same idiom as `ClassroomJob.active` above, and for the same
      // reason: a poster saved before this field existed must keep printing
      // photos, not have them switched off underneath the room that never
      // asked for that.
      showChildPhotos: o.showChildPhotos !== false,
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
