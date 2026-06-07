// /api/montree/super-admin/phonics-video-upload-url/route.ts
//
// Super-admin self-serve uploader for Dark Phonics song videos.
//
//   GET  -> { uploaded: number[] }  — which lesson numbers already have a video
//   POST { lesson } -> { token, path, publicUrl }
//          A one-time Supabase *signed upload URL* token. The browser then
//          uploads the (~60MB) .mp4 DIRECTLY to storage via uploadToSignedUrl,
//          bypassing this serverless route's body-size limit.
//
// Videos live in the same public `dark-phonics` bucket as the song MP3s, at
// videos/lesson-NN.mp4, so the public songs page can show them with no auth.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BUCKET = 'dark-phonics';
const pathFor = (lesson: number) => `videos/lesson-${String(lesson).padStart(2, '0')}.mp4`;

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(BUCKET).list('videos', { limit: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const uploaded = (data || [])
    .map((f) => {
      const m = f.name.match(/lesson-(\d+)\.mp4$/i);
      return m ? Number(m[1]) : null;
    })
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  return NextResponse.json({ uploaded });
}

export async function POST(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { lesson?: number | string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const lesson = Number(body.lesson);
  if (!Number.isInteger(lesson) || lesson < 1 || lesson > 99) {
    return NextResponse.json({ error: 'Invalid lesson number' }, { status: 400 });
  }

  const supabase = getSupabase();
  const path = pathFor(lesson);

  // Remove any existing video first so a re-upload can't fail on "already exists"
  // (createSignedUploadUrl has no upsert across all client versions). Non-fatal.
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    /* nothing to remove — fine */
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Could not create upload URL' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    token: data.token,
    path: data.path,
    publicUrl: getPublicUrl(BUCKET, path),
  });
}
