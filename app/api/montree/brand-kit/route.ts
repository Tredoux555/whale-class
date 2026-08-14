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
// 🚨 NO MIGRATION. Both `logo_url` and `settings` (JSONB) already exist on
// `montree_schools`. Nothing here creates a table, a column or a bucket.
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

// ── GET: the caller's school kit ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const row = await loadSchoolBrand(supabase, auth.schoolId);

    return NextResponse.json({
      success: true,
      brandKit: kitFromRow(row),
      logoUrl: row && isSafeLogoUrl(row.logo_url) ? row.logo_url : null,
      /** False when the school row could not be read at all — the settings
       *  screen shows "not available on this school" instead of an empty form
       *  that silently fails to save. */
      available: row !== null,
    });
  } catch (error) {
    console.error('[brand-kit] GET error:', error);
    // Even here: a settings page that cannot read the kit should render the
    // empty state, not an error screen.
    return NextResponse.json({ success: true, brandKit: null, logoUrl: null, available: false });
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

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!mayConfigureBrand(auth)) {
      return NextResponse.json({ error: 'Not allowed for this account' }, { status: 403 });
    }

    const supabase = getSupabase();
    const contentType = request.headers.get('content-type') || '';

    let incoming: unknown = null;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
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

    const existingRow = await loadSchoolBrand(supabase, auth.schoolId);
    if (!existingRow) {
      return NextResponse.json(
        { error: 'This school cannot store a brand kit.' },
        { status: 500 }
      );
    }
    const existingKit = kitFromRow(existingRow);

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
      const key = `${folderFor(auth.schoolId)}/logo-${Date.now()}-${Math.random()
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
    // `{ brand_kit }` over it would quietly delete all of it.
    const settings = {
      ...settingsBag(existingRow.settings),
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

    // The old file, once the new one is safely referenced. Best-effort and
    // strictly after the update: a failed cleanup costs a few KB, whereas
    // deleting first and then failing to save costs the school its logo.
    if (file && previousPath && previousPath !== logoPath) {
      const prefix = `${folderFor(auth.schoolId)}/`;
      if (previousPath.startsWith(prefix) && !previousPath.includes('..')) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove([previousPath]);
        if (removeError) console.warn('[brand-kit] old logo cleanup failed:', removeError.message);
      }
    }

    return NextResponse.json({ success: true, brandKit: kit });
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

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!mayConfigureBrand(auth)) {
      return NextResponse.json({ error: 'Not allowed for this account' }, { status: 403 });
    }

    const supabase = getSupabase();
    const purge = new URL(request.url).searchParams.get('purge') === '1';

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
