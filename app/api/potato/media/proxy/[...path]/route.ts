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
// Path grammar this route recognises:
//   class/<classId>/faces/<childId>.jpg
//   class/<classId>/photos/<yyyy>/<mm>/<uuid>.<ext>
//   class/<classId>/montages/<childId>/<weekStart>-<jobId>.mp4

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher, verifyPotatoParent, UUID_RE } from '@/lib/potato/auth';
import { potatoDb, loadClass, POTATO_BUCKET } from '@/lib/potato/db';

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
    // A teacher owns everything filed under her own class, branding included.
    return teacher.classId === classId;
  }

  const parent = await verifyPotatoParent(request);
  if (parent) {
    if (parent.classId !== classId) return false;
    // Their child's face, for the little avatar in the header.
    if (kind === 'faces' && segments.length === 4) {
      return segments[3] === `${parent.childId}.jpg`;
    }
    if (kind === 'montages' && segments.length >= 4) {
      // v1.1: the CLASS film is for every parent in the class. The literal
      // segment 'class' can never collide with a child id — child ids are
      // uuids, and the class film is written to
      //   class/<classId>/montages/class/<weekStart>-<jobId>.mp4
      if (segments[3] === 'class') return true;
      // …and their own child's films.
      return segments[3] === parent.childId;
    }
    // v1.1: school logo + class emblem. These are the school's public face —
    // they appear on the parent's own feed and at the end of every film — so
    // any parent of THIS class may read them. Still never cross-class.
    if (kind === 'branding') return true;
    // Raw classroom photos are NOT parent-reachable. The storage path carries
    // no child id, so ownership cannot be proven from the path, and a single
    // shot may hold four other people's children. Parents get films only.
    return false;
  }

  return false;
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
