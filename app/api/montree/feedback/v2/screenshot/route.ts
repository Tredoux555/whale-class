// app/api/montree/feedback/v2/screenshot/route.ts
//
// GET ?path=<object path> — serve a post's screenshot.
//
// A proxy rather than a raw bucket URL on purpose. The post row stores an
// OBJECT PATH, so nothing a client sends ever becomes a URL the page loads,
// and the bucket can change (or become private) without touching a single
// stored row. The path is validated against the shape the upload route mints,
// so `..`, a leading slash or a full URL cannot get through.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

const BUCKET = 'feedback-screenshots';
// Exactly what upload/route.ts writes: v2/<digits>-<alnum>.<ext>, plus the
// older flat names from the original upload-screenshot route.
const SAFE_PATH = /^(v2\/)?[a-zA-Z0-9][a-zA-Z0-9._-]{0,200}$/;

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') ?? '';
  if (!path || path.includes('..') || !SAFE_PATH.test(path)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // A redirect rather than a byte-for-byte proxy: the bucket is public and its
  // CDN is better at this than a Node process is. The indirection that matters
  // — a client never naming a URL — is already bought above.
  return NextResponse.redirect(data.publicUrl, 302);
}
