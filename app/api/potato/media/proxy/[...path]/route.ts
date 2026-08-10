// GET|HEAD /api/potato/media/proxy/<storage path>
//
// The ONLY way a byte leaves the `potato-snaps` bucket. That bucket is PRIVATE,
// so this route reads it with the service role and hands the stream on — after
// proving the caller owns the path.
//
// 🚨 THREE THINGS THAT MUST NOT BE "SIMPLIFIED"
//
// 1. ONE BUCKET, HARD-CODED. There is no ?bucket= parameter and no default
//    fallback. Montree's proxy resolves an unknown bucket name to its default
//    instead of refusing; that silent fallback is a trap this route deliberately
//    does not copy.
//
// 2. PRIVATE CACHING ONLY. Montree's proxy sets `public, s-maxage=…` because its
//    buckets are public. Ours are not: a shared CDN copy of a child's face or a
//    family's film would be readable by anyone who guessed the URL, with the
//    auth check bypassed entirely. Responses are therefore `private` and are
//    never stored by Cloudflare.
//
// 3. AUTH BEFORE FETCH. The cookie is checked against the `class/<classId>/`
//    prefix in the path before any upstream request is made. Everything that
//    fails is a 404, not a 403 — a 403 confirms that the object exists.
//
// 4. 🚨 v1.3 — THE SEND GATE IS ENFORCED HERE TOO, NOT JUST IN THE LIST.
//    /api/potato/montages filters unsent films out of a parent's feed, but
//    that is a list-layer courtesy, not the actual confidentiality boundary —
//    THIS route is the only thing standing between a byte and a parent. A
//    parent who somehow ends up holding the storage path of their own child's
//    film (a shared/returned device, a forwarded link, a cached URL from a
//    service worker, a future "share preview" feature) must not be able to
//    fetch it just because the class/child prefix matches. So a parent's
//    request for a `montages/` path additionally requires the job's
//    `sent_at` to be set — the exact same law the list endpoint enforces,
//    checked again at the only place that actually releases bytes. A teacher
//    is unaffected: she may always preview her own class's unsent films.
//    Pre-migration (no `sent_at` column) this degrades to the v1.2 rule —
//    every rendered film readable — via the same `caps.send` probe every
//    other route uses, so this route never 500s during the deploy window.
//
// Path grammar this route recognises:
//   class/<classId>/faces/<childId>.jpg
//   class/<classId>/photos/<yyyy>/<mm>/<uuid>.<ext>
//   class/<classId>/montages/<childId>/<weekStart>-<jobId>.mp4
//   class/<classId>/intake/<childId>/<face|pickup-N|vaccination|…>.<ext>

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher, verifyPotatoParent, UUID_RE } from '@/lib/potato/auth';
import { potatoDb, loadClass, potatoCapabilities, isSetupPending, POTATO_BUCKET } from '@/lib/potato/db';

export const dynamic = 'force-dynamic';
// Long enough for a parent on a slow phone to finish a film.
export const maxDuration = 300;

const NOT_FOUND = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

async function isAuthorized(request: NextRequest, segments: string[]): Promise<boolean> {
  // class / <classId> / <kind> / …
  if (segments.length < 4) return false;
  if (segments[0] !== 'class') return false;
  const classId = segments[1];
  if (!UUID_RE.test(classId)) return false;
  const kind = segments[2];

  // 🚨 Deactivating a class is the only revocation lever for a 10-year
  // teacher/parent cookie. Without this check a still-cookied device keeps
  // streaming a private bucket of children's faces and films forever, even
  // after HQ has explicitly cut the class off — a confidentiality gap, not
  // just a stale-write gap. Any lookup failure (including pre-migration
  // 42P01, when the table doesn't exist yet) fails CLOSED to "not
  // authorized": pre-migration the bucket doesn't exist either, so this
  // route was already a guaranteed 404 for every request — failing here
  // instead of at the upstream fetch changes nothing observable.
  try {
    const klass = await loadClass(potatoDb(), classId);
    if (!klass) return false;
  } catch (error) {
    console.error('[potato/proxy] class lookup failed:', error);
    return false;
  }

  const teacher = await verifyPotatoTeacher(request);
  if (teacher) {
    // A teacher owns everything filed under her own class.
    return teacher.classId === classId;
  }

  const parent = await verifyPotatoParent(request);
  if (parent) {
    if (parent.classId !== classId) return false;
    // Their child's face, for the little avatar in the header.
    if (kind === 'faces' && segments.length === 4) {
      return segments[3] === `${parent.childId}.jpg`;
    }
    // Their child's films.
    if (kind === 'montages' && segments.length >= 4) {
      if (segments[3] !== parent.childId) return false;
      return isSentToParent(classId, segments.join('/'));
    }
    // 🚨 Child Onboarding: everything under their OWN child's intake prefix —
    // class/<classId>/intake/<childId>/… — and nothing else. This is the
    // family's own upload (their child's face, the authorized adults' photos,
    // a vaccination booklet) being read back so they can see what they sent
    // and replace a blurry one. The childId segment is compared against the
    // cookie, exactly as `faces` and `montages` are, so one family can never
    // reach another family's documents even though they share a class prefix.
    //
    // No send-gate equivalent applies here: these bytes came FROM this family,
    // so there is no teacher approval standing between them and it.
    if (kind === 'intake' && segments.length >= 5) {
      return segments[3] === parent.childId;
    }
    // Raw classroom photos are NOT parent-reachable. The storage path carries
    // no child id, so ownership cannot be proven from the path, and a single
    // shot may hold four other people's children. Parents get films only.
    return false;
  }

  return false;
}

/**
 * 🚨 THE SECOND GATE. Path ownership proves this is the right family; it does
 * not prove the teacher has sent the film. A rendered-but-unsent film is the
 * teacher's alone even when its path names her child correctly, so a parent
 * request additionally has to find a job row for this exact object that has
 * actually been published.
 *
 * `storage_path` carries a unique index (migration 320), so this is a single
 * indexed lookup — not a scan — and it reuses the same class_id the caller
 * already matched, never trusting the path alone.
 *
 * Pre-migration (no `sent_at` column) there is nothing to gate on, so this
 * falls back to v1.2: any rendered film readable. Any other lookup failure
 * fails CLOSED, the same as the class-ownership check above.
 */
async function isSentToParent(classId: string, storagePath: string): Promise<boolean> {
  const supabase = potatoDb();
  try {
    const caps = await potatoCapabilities(supabase);
    if (!caps.send) return true;
    const { data, error } = await supabase
      .from('tp_montage_jobs')
      .select('sent_at')
      .eq('class_id', classId)
      .eq('storage_path', storagePath)
      .eq('status', 'done')
      .maybeSingle();
    if (error) throw error;
    return !!data?.sent_at;
  } catch (error) {
    if (isSetupPending(error)) return true;
    console.error('[potato/proxy] send-gate lookup failed:', error);
    return false;
  }
}

async function handle(request: NextRequest, segments: string[], method: 'GET' | 'HEAD') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('[potato/proxy] Supabase env not configured');
    return NextResponse.json({ error: 'Not available' }, { status: 503 });
  }

  const storagePath = segments.join('/');
  if (!storagePath || storagePath.includes('..') || storagePath.startsWith('/')) {
    return NOT_FOUND();
  }

  if (!(await isAuthorized(request, segments))) return NOT_FOUND();

  const upstream =
    `${supabaseUrl}/storage/v1/object/authenticated/${POTATO_BUCKET}/` +
    segments.map(encodeURIComponent).join('/');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
  };
  // Range passthrough — without it iOS Safari cannot seek an mp4 and long
  // videos die mid-download.
  const range = request.headers.get('range');
  if (range) headers.range = range;

  // Time out the HEADERS only. Attaching a timeout to the whole fetch also
  // kills the body stream, which truncates a large video on a slow network.
  const controller = new AbortController();
  const headerTimeout = setTimeout(() => controller.abort(), 30_000);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream, { method, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    console.error('[potato/proxy] upstream fetch failed:', error);
    return NextResponse.json({ error: 'Media unavailable' }, { status: 502 });
  } finally {
    clearTimeout(headerTimeout);
  }

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    return upstreamResponse.status === 404
      ? NOT_FOUND()
      : NextResponse.json({ error: 'Media unavailable' }, { status: 502 });
  }

  const out: Record<string, string> = {
    'Content-Type': upstreamResponse.headers.get('content-type') || 'application/octet-stream',
    'Accept-Ranges': upstreamResponse.headers.get('accept-ranges') || 'bytes',
    // Private, browser-only. Never a shared cache — see note 2 at the top.
    'Cache-Control': 'private, max-age=600, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  };
  const passthrough = ['content-length', 'content-range', 'etag', 'last-modified'] as const;
  for (const name of passthrough) {
    const value = upstreamResponse.headers.get(name);
    if (value) out[name] = value;
  }

  if (method === 'HEAD') {
    return new Response(null, { status: upstreamResponse.status, headers: out });
  }
  // Stream through — never buffer a whole file into memory.
  return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: out });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return handle(request, path ?? [], 'GET');
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return handle(request, path ?? [], 'HEAD');
}
