// GET /api/lens/media/proxy/<storage path> — stream a photo out of the private
// `lens-photos` bucket.
//
// 🚨 THE BUCKET IS PRIVATE AND STAYS PRIVATE. These are photographs of other
// people's classrooms taken under a professional engagement; a public bucket
// URL is a permanent unauthenticated link to a client's premises. So every read
// goes through here, behind the observer's own cookie.
//
// 🚨 THE PATH PREFIX IS THE AUTHORISATION. Every object is written at
// `<observerId>/<visitId>/<day>/<name>` by the moments route, so an object
// belongs to the caller precisely when the path's first segment is her own
// observer id. That check is done BEFORE the bucket is touched — no signed URL
// is minted for a path she does not own, so a guessed path is refused rather
// than proxied.

import { NextRequest, NextResponse } from 'next/server';
import { LENS_BUCKET, lensDb } from '@/lib/lens/db';
import { lensError, requireObserver } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;

  const { path } = await params;
  const segments = (path ?? []).map((s) => decodeURIComponent(s));
  if (segments.length < 2) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  // No traversal, no absolute paths, no empty segments.
  if (segments.some((s) => !s || s === '.' || s === '..' || s.includes('\\'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (segments[0] !== session.observerId) {
    // Deliberately 404, not 403: a caller probing for other observers' paths
    // learns nothing about which of them exist.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const objectPath = segments.join('/');

  try {
    const { data, error } = await lensDb().storage.from(LENS_BUCKET).download(objectPath);
    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': data.type || 'image/jpeg',
        'Content-Length': String(buffer.byteLength),
        // Private, because the response is authorised per-viewer. A shared
        // cache holding this would serve one observer's classroom to another.
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return lensError('media:proxy', error);
  }
}
