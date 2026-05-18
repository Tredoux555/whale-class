// app/api/montree/messages/voice-stream/route.ts
// Stable proxy to a voice-note file in the private voice-obs bucket.
// Auth-gates the request (school OR parent session), generates a fresh
// short-lived signed URL, and 302-redirects to it.
//
// The message row stores this proxy URL in media_url, so the link works
// forever — the file lives in the private bucket and we re-sign on read.
//
// Path safety: the `path` query param must start with "messages/" and may
// not contain ".." segments. Anything else returns 400.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveMessagingParent } from '@/lib/montree/parent-messaging';

export const maxDuration = 10;

const BUCKET = 'voice-obs';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  // Identify caller — school cookie OR parent cookie. Either is fine.
  const school = await verifySchoolRequest(request);
  let signedIn = !(school instanceof NextResponse);
  if (!signedIn) {
    const parent = await resolveMessagingParent(supabase);
    signedIn = !(parent instanceof NextResponse);
  }
  if (!signedIn) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const path = new URL(request.url).searchParams.get('path') || '';
  if (!path.startsWith('messages/') || path.includes('..') || path.length > 512) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 5); // 5-minute TTL — plenty for one playback

  if (error || !data?.signedUrl) {
    console.error('[voice-stream] sign failed', error);
    return NextResponse.json({ error: 'File not available' }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, 302);
}
