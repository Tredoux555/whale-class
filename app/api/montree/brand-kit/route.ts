// app/api/montree/brand-kit/route.ts
// ============================================================================
// THE SCHOOL BRAND KIT — read it, save it, switch it off.
// ============================================================================
// One logo, uploaded once, and the derived print tokens that come with it.
// Stored in two places on the school row, on purpose:
//
//   montree_schools.logo_url            the client-facing URL of the mark
//   montree_schools.settings.brand_kit  the derived kit (tokens + intensity)
//
// `logo_url` is a first-class column because "this school's logo" is a fact
// about the school, not a fact about class documents — anything else that ever
// wants to show a school's mark reads that column, not this feature's blob.
//
// A CLASSROOM may hold its own, one folder down and one table across:
//
//   montree_classrooms.settings.brand_kit   the room's kit, if it has one
//
// An ACTIVE room kit beats the school's; anything else falls back to it (the
// rule lives in lib/montree/brand-kit/resolve.ts, and only there). Scope is
// chosen by ONE optional `classroomId` on every verb — absent, this route is
// byte-for-byte the school-only route it has always been.
//
// 🚨 NO MIGRATION. `logo_url` and `settings` (JSONB) already exist on
// `montree_schools`, and `settings` (JSONB) has been on `montree_classrooms`
// since migration 067. Nothing here creates a table, a column or a bucket.
//
// 🚨 THE SERVER NEVER EXTRACTS. Palette extraction is a canvas job and runs in
// the browser of the person who chose the logo (lib/montree/brand-kit/extract).
// This route's job is to VALIDATE what comes back — `parseBrandKit` rejects
// anything that is not a strict BrandKit — store the file, and stamp the row.
// A client that posts `{ tokens: { ink: 'red; } body{display:none' } }` gets a
// kit whose ink is #101820, because the parser drops what it cannot recognise.
//
// 🚨 TENANCY COMES FROM THE SESSION. The school is `auth.schoolId`; no request
// body may name one. Storage keys are built from that same value and the delete
// guard re-checks the prefix — the Jul-3 lesson, again: existence is not
// ownership.
//
// 🚨 EVERY FAILURE IS SOFT ON READ. A project whose `settings` column is
// missing, a blob written by a future build, an unparseable JSON string — all
// of them resolve to `brandKit: null`, which means "print the plain sheet".
// A school must never lose its class documents because its theme is broken.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import {
  BRAND_KIT_VERSION,
  isSafeLogoUrl,
  parseBrandKit,
  type BrandKit,
} from '@/lib/montree/brand-kit/types';
import {
  readBrandKitFromSettings,
  resolveBrandKit,
} from '@/lib/montree/brand-kit/resolve';

export const dynamic = 'force-dynamic';

/** Same bucket and same posture as /api/montree/uploads — a public bucket read
 *  through the Cloudflare-cached proxy. The logo is printed on sheets that go
 *  home in twenty book bags; it is not a secret, and a signed URL would expire
 *  in the middle of a print job. */
const BUCKET = 'montree-media';

/** 4MB. A logo is a logo. Anything larger is a photograph somebody has
 *  mistaken for one, and it would be re-downloaded on every document render. */
const MAX_LOGO_BYTES = 4 * 1024 * 1024;

/**
 * 🚨 SVG IS DELIBERATELY NOT ACCEPTED, and this is a security call rather than
 * a taste one. An SVG served from our own origin renders as a DOCUMENT when
 * opened directly — scripts and all — which would turn "upload your logo" into
 * stored XSS on montree.xyz. (Inside an <img> it is inert; the direct-navigation
 * case is the problem.) It also frequently has no intrinsic size, which the
 * canvas extractor cannot read. Schools export a PNG instead; the settings
 * screen says so.
 */
const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function folderFor(schoolId: string): string {
  return `brand/${schoolId}`;
}

/**
 * A classroom's own folder, nested UNDER its school's.
 *
 * 🚨 THE NESTING IS THE POINT. Every delete in this file guards on a prefix
 * built from the SESSION's school id, and a classroom folder that lived beside
 * the school's rather than inside it would need a second, separate guard that
 * somebody would eventually forget to write.
 */
function classroomFolderFor(schoolId: string, classroomId: string): string {
  return `brand/${schoolId}/classroom/${classroomId}`;
}

/** A classroom id arrives from a query string or a form field. Anything that
 *  is not a uuid is rejected before it reaches Postgres, which would otherwise
 *  raise `invalid input syntax for type uuid` and be read here as "the row is
 *  unreadable" — a much vaguer answer than "you sent nonsense". */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Only teachers, principals and homeschool parents configure a school's own
 *  identity — a homeschool parent OWNS their homeschool, and the settings card
 *  is on their page, so refusing the save was a 403 nobody could act on. Agent
 *  and org-admin tokens carry an INERT schoolId (see lib/montree/server-auth.ts)
 *  — letting one through would rebrand whichever school happened to be on the
 *  token. Read defensively: a verified session that does not expose a role is
 *  treated as a school session, which is what it has always been. */
function mayConfigureBrand(auth: unknown): boolean {
  const role = (auth as { role?: string } | null)?.role;
  return (
    !role || role === 'teacher' || role === 'principal' || role === 'homeschool_parent'
  );
}

interface SchoolBrandRow {
  logo_url: string | null;
  settings: Record<string, unknown> | null;
}

/**
 * The settings bag, or an empty one.
 *
 * 🚨 SPREADING A NON-OBJECT IS A DATA-LOSS BUG, not a type error. The column is
 * declared JSONB, but a row that comes back as a JSON *string* — a text-typed
 * column somewhere, a client that stored one — spreads CHARACTER BY CHARACTER:
 * `{ ...'{"menu":…}' }` is `{ 0: '{', 1: '"', … }`, and the update then writes
 * that over the school's whole settings bag. Anything that is not a plain
 * object is treated as absent, which loses nothing this feature can read anyway.
 */
function settingsBag(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Read the school's brand columns. Returns `null` for the whole row rather
 * than throwing when the columns are not there (42703) — see the header note.
 */
async function loadSchoolBrand(
  supabase: ReturnType<typeof getSupabase>,
  schoolId: string
): Promise<SchoolBrandRow | null> {
  const { data, error } = await supabase
    .from('montree_schools')
    .select('logo_url, settings')
    .eq('id', schoolId)
    .maybeSingle();

  if (error) {
    console.warn('[brand-kit] school read soft-failed:', error.message);
    return null;
  }
  return (data as SchoolBrandRow | null) ?? null;
}

/** The stored kit, parsed and validated, or null. Never throws. */
function kitFromRow(row: SchoolBrandRow | null): BrandKit | null {
  if (!row) return null;
  const settings = (row.settings || {}) as Record<string, unknown>;
  const kit = parseBrandKit(settings.brand_kit);
  if (!kit) return null;

  // `logo_url` is the column of record, and it is the FALLBACK here: the kit's
  // own copy wins when it has one, because the kit's `logoUrl` and `logoPath`
  // are written as a pair by this route and the cleanup on replace depends on
  // them agreeing. The column fills the gap for a kit saved before a logo was
  // uploaded, or one whose URL was dropped by the parser.
  if (!kit.logoUrl && isSafeLogoUrl(row.logo_url)) {
    return { ...kit, logoUrl: row.logo_url };
  }
  return kit;
}

// ── the classroom half (2026-08) ────────────────────────────────────────────
//
// A room may carry its own emblem, stored the same way one folder down:
// `montree_classrooms.settings.brand_kit` (the column has existed since
// migration 067 — NO MIGRATION). There is deliberately NO classroom-level
// `logo_url` column: a school's mark is a fact about the school and other
// features read that column, whereas a room's emblem is a fact about this
// feature alone and lives entirely inside the kit.

interface ClassroomBrandRow {
  id: string;
  school_id: string;
  settings: Record<string, unknown> | null;
}

/**
 * The classroom, re-proved to belong to the SESSION's school.
 *
 * 🚨 EXISTENCE IS NOT OWNERSHIP — the Jul-3 lesson, and the only reason this
 * function exists rather than a bare select. The id comes off a query string
 * or a form field, so it is checked against `auth.schoolId` on EVERY call, and
 * a row belonging to another school reads identically to a row that is not
 * there: `'forbidden'`. Telling a caller which of the two it was is a tenant
 * enumeration oracle.
 *
 * `null` means "could not read" (a soft failure, e.g. the column is missing on
 * some ancient project) — the callers decide what that costs them, and they do
 * not agree: a READ degrades to "no classroom kit", a WRITE must refuse,
 * because silently writing to the school instead would rebrand the building.
 */
async function loadClassroomBrand(
  supabase: ReturnType<typeof getSupabase>,
  schoolId: string,
  classroomId: string
): Promise<ClassroomBrandRow | 'forbidden' | null> {
  const { data, error } = await supabase
    .from('montree_classrooms')
    .select('id, school_id, settings')
    .eq('id', classroomId)
    .maybeSingle();

  if (error) {
    console.warn('[brand-kit] classroom read soft-failed:', error.message);
    return null;
  }
  const row = (data as ClassroomBrandRow | null) ?? null;
  if (!row || row.school_id !== schoolId) return 'forbidden';
  return row;
}

// ── GET: the kits in play for this caller ───────────────────────────────────
//
// `?classroomId=` is OPTIONAL and purely additive. Without it this is byte-for
// byte the read it has always been: the school's own kit on `brandKit`, raw,
// disabled ones included — Settings renders its off state from that object, so
// it must never be filtered through `isBrandKitActive` on the way out.
//
// With it, three more fields come back: the room's own kit, the school's, and
// `kit`/`scope` — the ANSWER, already resolved. A renderer reads `kit`; only a
// screen that EDITS a theme reads the two raw ones.

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId =
      searchParams.get('classroomId') || searchParams.get('classroom_id') || '';

    if (classroomId && !isUuid(classroomId)) {
      return NextResponse.json({ error: 'Invalid classroomId' }, { status: 400 });
    }

    const [row, classroomRow] = await Promise.all([
      loadSchoolBrand(supabase, auth.schoolId),
      classroomId
        ? loadClassroomBrand(supabase, auth.schoolId, classroomId)
        : Promise.resolve(null as ClassroomBrandRow | 'forbidden' | null),
    ]);

    if (classroomRow === 'forbidden') {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 403 });
    }

    const schoolKit = kitFromRow(row);
    const classroomKit = classroomRow ? readBrandKitFromSettings(classroomRow.settings) : null;
    const resolved = resolveBrandKit(classroomKit, schoolKit);

    return NextResponse.json({
      // 🚨 LEGACY FIELD, UNCHANGED MEANING: the SCHOOL's own kit, raw. Settings
      // has always read this and needs a disabled kit to come back disabled, so
      // it is never swapped for the resolved one — new callers read `kit`.
      success: true,
      brandKit: schoolKit,
      logoUrl: row && isSafeLogoUrl(row.logo_url) ? row.logo_url : null,
      /** False when the school row could not be read at all — the settings
       *  screen shows "not available on this school" instead of an empty form
       *  that silently fails to save. */
      available: row !== null,
      // ── additive ──────────────────────────────────────────────────────────
      /** The kit that would actually print, already proven active. */
      kit: resolved.kit,
      scope: resolved.scope,
      /** The two RAW kits, for the screens that edit them. */
      schoolKit,
      classroomKit,
      classroomId: classroomId || null,
      /** False when a classroom WAS asked for and its row could not be read —
       *  the card says so instead of offering a save that will 500. */
      classroomAvailable: classroomId ? classroomRow !== null : true,
    });
  } catch (error) {
    console.error('[brand-kit] GET error:', error);
    // Even here: a settings page that cannot read the kit should render the
    // empty state, not an error screen.
    return NextResponse.json({
      success: true,
      brandKit: null,
      logoUrl: null,
      available: false,
      kit: null,
      scope: 'none',
      schoolKit: null,
      classroomKit: null,
      classroomId: null,
      classroomAvailable: false,
    });
  }
}

// ── POST: save the kit (with or without a new logo) ─────────────────────────
//
// Two shapes, one handler:
//   multipart/form-data  { logo: File, kit: string }  — a new mark was chosen
//   application/json     { kit: {...} }               — intensity / on-off only
//
// The second exists because changing intensity re-solves the wash from the two
// SOURCE colours already on the kit; asking a school to re-upload their logo to
// move a slider would be absurd.
//
// EITHER shape may carry a `classroomId` — as a form field, a JSON property or
// a query parameter — and that single value is the whole difference between
// "this room's emblem" and "the building's". Absent, every line below behaves
// exactly as it did before classrooms could be themed.

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!mayConfigureBrand(auth)) {
      return NextResponse.json({ error: 'Not allowed for this account' }, { status: 403 });
    }

    const supabase = getSupabase();
    const contentType = request.headers.get('content-type') || '';
    const { searchParams } = new URL(request.url);

    let incoming: unknown = null;
    let file: File | null = null;
    let classroomId =
      searchParams.get('classroomId') || searchParams.get('classroom_id') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const formRoom = formData.get('classroomId');
      if (typeof formRoom === 'string' && formRoom.length > 0) classroomId = formRoom;
      const raw = formData.get('kit');
      if (typeof raw === 'string' && raw.length > 0) {
        try {
          incoming = JSON.parse(raw);
        } catch {
          return NextResponse.json({ error: 'kit is not valid JSON' }, { status: 400 });
        }
      }
      const maybeFile = formData.get('logo');
      file = maybeFile instanceof File ? maybeFile : null;
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
      const bodyRoom = (body as { classroomId?: unknown } | null)?.classroomId;
      if (typeof bodyRoom === 'string' && bodyRoom.length > 0) classroomId = bodyRoom;
      // 🚨 THE BARE BODY IS ONLY A KIT IF IT LOOKS LIKE ONE. Falling back from
      // `body.kit` to `body` is a convenience for clients that post the kit
      // unwrapped — but `parseBrandKit` fills every missing field with a plain
      // default, so an empty `POST {}` used to parse as a perfectly valid
      // PLAIN kit and overwrite the school's saved theme. A candidate must
      // carry a `tokens` object to be read as a kit; anything else falls
      // through to the 400 below rather than resetting the colours.
      const candidate = (body as { kit?: unknown } | null)?.kit ?? body;
      const hasTokens =
        typeof candidate === 'object' &&
        candidate !== null &&
        !Array.isArray(candidate) &&
        typeof (candidate as { tokens?: unknown }).tokens === 'object' &&
        (candidate as { tokens?: unknown }).tokens !== null &&
        !Array.isArray((candidate as { tokens?: unknown }).tokens);
      incoming = hasTokens ? candidate : null;
    }

    const posted = parseBrandKit(incoming);
    if (!posted) {
      return NextResponse.json(
        { error: 'A valid brand kit is required (see lib/montree/brand-kit/types).' },
        { status: 400 }
      );
    }

    if (classroomId && !isUuid(classroomId)) {
      return NextResponse.json({ error: 'Invalid classroomId' }, { status: 400 });
    }

    const existingRow = await loadSchoolBrand(supabase, auth.schoolId);

    // 🚨 THE ROOM IS RE-PROVED ON EVERY SAVE, from the session — never from the
    // body. And a classroom row that cannot be READ must not fall through to
    // the school: a save that silently rebrands the whole building because one
    // select hiccuped is the worst outcome this route has.
    let classroomRow: ClassroomBrandRow | null = null;
    if (classroomId) {
      const found = await loadClassroomBrand(supabase, auth.schoolId, classroomId);
      if (found === 'forbidden') {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 403 });
      }
      if (!found) {
        return NextResponse.json(
          { error: 'This classroom cannot store a brand kit.' },
          { status: 500 }
        );
      }
      classroomRow = found;
    } else if (!existingRow) {
      return NextResponse.json(
        { error: 'This school cannot store a brand kit.' },
        { status: 500 }
      );
    }

    const existingKit = classroomRow
      ? readBrandKitFromSettings(classroomRow.settings)
      : kitFromRow(existingRow);
    const toClassroom = classroomRow !== null;
    const targetFolder = toClassroom
      ? classroomFolderFor(auth.schoolId, classroomId)
      : folderFor(auth.schoolId);

    // ── the file, if there is one ──────────────────────────────────────────
    // 🚨 THE SERVER OWNS THE LOGO URL. The posted kit's `logoUrl`/`logoPath`
    // are ignored outright — they are minted here, from a file this route
    // stored, in this school's own folder. Trusting the body would let a saved
    // theme point a school's crest at any URL on the internet, which is both a
    // hotlink and a way to make one school's sheet render another's mark.
    let logoUrl = existingKit?.logoUrl ?? null;
    let logoPath = existingKit?.logoPath ?? null;
    const previousPath = existingKit?.logoPath ?? null;

    if (file) {
      const mime = (file.type || '').toLowerCase();
      const ext = ALLOWED_MIME[mime];
      if (!ext) {
        return NextResponse.json(
          { error: 'Use a PNG, JPG, WebP or GIF image.' },
          { status: 400 }
        );
      }
      if (file.size > MAX_LOGO_BYTES) {
        return NextResponse.json({ error: 'That image is larger than 4MB.' }, { status: 400 });
      }

      // Timestamped key, never a fixed name: a fixed key would be served stale
      // from the Cloudflare cache for as long as its TTL, and the school would
      // print their OLD logo for a week after replacing it.
      const key = `${targetFolder}/logo-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      const buffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(key, buffer, { contentType: mime, upsert: false });

      if (uploadError) {
        console.error('[brand-kit] upload error:', uploadError.message);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
      }

      logoPath = key;
      logoUrl = getProxyUrl(key);
    }

    // ── the row ────────────────────────────────────────────────────────────
    const kit: BrandKit = {
      ...posted,
      version: BRAND_KIT_VERSION,
      logoUrl,
      logoPath,
    };

    // Merge, never replace. `settings` is a shared JSONB bag — menu config,
    // feature preferences, whatever a future feature parks there — and writing
    // `{ brand_kit }` over it would quietly delete all of it. True of BOTH
    // rows: a classroom's settings bag is just as shared as a school's.
    if (classroomRow) {
      const settings = { ...settingsBag(classroomRow.settings), brand_kit: kit };
      // 🚨 `montree_schools.logo_url` IS NOT TOUCHED HERE. That column is the
      // school's mark of record and other features read it; a single room
      // choosing a whale for its own sheets must not restamp the building.
      // The `school_id` filter is belt-and-braces on top of loadClassroomBrand.
      const { error: updateError } = await supabase
        .from('montree_classrooms')
        .update({ settings })
        .eq('id', classroomRow.id)
        .eq('school_id', auth.schoolId);

      if (updateError) {
        console.error('[brand-kit] classroom save error:', updateError.message);
        return NextResponse.json({ error: 'Could not save the brand kit' }, { status: 500 });
      }
    } else {
      const settings = {
        ...settingsBag(existingRow?.settings),
        brand_kit: kit,
      };

      const { error: updateError } = await supabase
        .from('montree_schools')
        .update({ logo_url: logoUrl, settings })
        .eq('id', auth.schoolId);

      if (updateError) {
        console.error('[brand-kit] save error:', updateError.message);
        return NextResponse.json({ error: 'Could not save the brand kit' }, { status: 500 });
      }
    }

    // The old file, once the new one is safely referenced. Best-effort and
    // strictly after the update: a failed cleanup costs a few KB, whereas
    // deleting first and then failing to save costs the school its logo.
    // The prefix guard is the TARGET folder's, so a classroom save can only
    // ever delete out of its own room's folder.
    if (file && previousPath && previousPath !== logoPath) {
      const prefix = `${targetFolder}/`;
      if (previousPath.startsWith(prefix) && !previousPath.includes('..')) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove([previousPath]);
        if (removeError) console.warn('[brand-kit] old logo cleanup failed:', removeError.message);
      }
    }

    const schoolKit = toClassroom ? kitFromRow(existingRow) : kit;
    const classroomKit = toClassroom ? kit : null;
    const resolved = resolveBrandKit(classroomKit, schoolKit);

    return NextResponse.json({
      // Legacy: the kit that was just saved, whichever scope it belongs to.
      success: true,
      brandKit: kit,
      // Additive, same vocabulary as GET.
      kit: resolved.kit,
      scope: resolved.scope,
      schoolKit,
      classroomKit,
      classroomId: toClassroom ? classroomId : null,
    });
  } catch (error) {
    console.error('[brand-kit] POST error:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ── DELETE: switch the theme off ────────────────────────────────────────────
//
// 🚨 THIS DISABLES; IT DOES NOT FORGET. `?purge=1` additionally removes the
// stored file and the kit. The default is the quiet one on purpose: a school
// that turns the theme off for one term should get their crest back with one
// tap, not have to find the logo file again.
//
// `?classroomId=` narrows all of that to ONE ROOM and touches nothing else —
// the school's kit, its `logo_url` column and its stored file are all left
// exactly as they were, and the room falls back to the school's theme the
// moment its own is gone. Clearing a room is never a way to clear a building.

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!mayConfigureBrand(auth)) {
      return NextResponse.json({ error: 'Not allowed for this account' }, { status: 403 });
    }

    const supabase = getSupabase();
    const requestUrl = new URL(request.url);
    const purge = requestUrl.searchParams.get('purge') === '1';
    const classroomId =
      requestUrl.searchParams.get('classroomId') ||
      requestUrl.searchParams.get('classroom_id') ||
      '';

    if (classroomId) {
      if (!isUuid(classroomId)) {
        return NextResponse.json({ error: 'Invalid classroomId' }, { status: 400 });
      }
      const found = await loadClassroomBrand(supabase, auth.schoolId, classroomId);
      if (found === 'forbidden') {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 403 });
      }
      if (!found) {
        return NextResponse.json(
          { error: 'This classroom cannot store a brand kit.' },
          { status: 500 }
        );
      }
      return classroomDelete(supabase, auth.schoolId, found, purge);
    }

    const row = await loadSchoolBrand(supabase, auth.schoolId);
    if (!row) return NextResponse.json({ success: true, brandKit: null });

    const existingKit = kitFromRow(row);
    const settings = { ...settingsBag(row.settings) };

    if (purge) {
      delete settings.brand_kit;
      const { error } = await supabase
        .from('montree_schools')
        .update({ logo_url: null, settings })
        .eq('id', auth.schoolId);
      if (error) {
        console.error('[brand-kit] purge error:', error.message);
        return NextResponse.json({ error: 'Could not remove the brand kit' }, { status: 500 });
      }

      const prefix = `${folderFor(auth.schoolId)}/`;
      if (existingKit?.logoPath?.startsWith(prefix) && !existingKit.logoPath.includes('..')) {
        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove([existingKit.logoPath]);
        if (removeError) console.warn('[brand-kit] logo removal failed:', removeError.message);
      }
      return NextResponse.json({ success: true, brandKit: null });
    }

    if (!existingKit) return NextResponse.json({ success: true, brandKit: null });

    const disabled: BrandKit = { ...existingKit, enabled: false };
    settings.brand_kit = disabled;

    const { error } = await supabase
      .from('montree_schools')
      .update({ settings })
      .eq('id', auth.schoolId);

    if (error) {
      console.error('[brand-kit] disable error:', error.message);
      return NextResponse.json({ error: 'Could not switch the theme off' }, { status: 500 });
    }

    return NextResponse.json({ success: true, brandKit: disabled });
  } catch (error) {
    console.error('[brand-kit] DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── DELETE, the classroom half ──────────────────────────────────────────────
//
// The same two moves as the school path — disable by default, forget on
// `?purge=1` — pointed at one room's `settings.brand_kit` and one room's
// storage folder. Split out rather than threaded through the school handler
// with flags: the two writes touch different tables and different columns, and
// a shared body would be one `if` away from clearing `montree_schools.logo_url`
// because somebody was removing a classroom emblem.

async function classroomDelete(
  supabase: ReturnType<typeof getSupabase>,
  schoolId: string,
  row: ClassroomBrandRow,
  purge: boolean
): Promise<NextResponse> {
  const existingKit = readBrandKitFromSettings(row.settings);
  const settings = { ...settingsBag(row.settings) };
  const prefix = `${classroomFolderFor(schoolId, row.id)}/`;

  /** The room is themed by whatever survives this call, falling back to the
   *  school — so the caller learns the ANSWER, not just what was removed. */
  const answer = async (classroomKit: BrandKit | null) => {
    const schoolKit = kitFromRow(await loadSchoolBrand(supabase, schoolId));
    const resolved = resolveBrandKit(classroomKit, schoolKit);
    return NextResponse.json({
      success: true,
      brandKit: classroomKit,
      kit: resolved.kit,
      scope: resolved.scope,
      schoolKit,
      classroomKit,
      classroomId: row.id,
    });
  };

  if (purge) {
    delete settings.brand_kit;
    const { error } = await supabase
      .from('montree_classrooms')
      .update({ settings })
      .eq('id', row.id)
      .eq('school_id', schoolId);
    if (error) {
      console.error('[brand-kit] classroom purge error:', error.message);
      return NextResponse.json({ error: 'Could not remove the brand kit' }, { status: 500 });
    }

    // Best-effort, and only ever inside this room's own folder.
    if (existingKit?.logoPath?.startsWith(prefix) && !existingKit.logoPath.includes('..')) {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([existingKit.logoPath]);
      if (removeError) {
        console.warn('[brand-kit] classroom logo removal failed:', removeError.message);
      }
    }
    return answer(null);
  }

  if (!existingKit) return answer(null);

  const disabled: BrandKit = { ...existingKit, enabled: false };
  settings.brand_kit = disabled;

  const { error } = await supabase
    .from('montree_classrooms')
    .update({ settings })
    .eq('id', row.id)
    .eq('school_id', schoolId);

  if (error) {
    console.error('[brand-kit] classroom disable error:', error.message);
    return NextResponse.json({ error: 'Could not switch the theme off' }, { status: 500 });
  }

  // The room's kit is kept but inert, so the room reverts to the SCHOOL's
  // theme — see the fall-through rule in lib/montree/brand-kit/resolve.ts.
  return answer(disabled);
}
