// app/api/montree/messages/upload-voice/route.ts
// Upload a voice note recording to the private `voice-obs` Supabase Storage
// bucket. Returns the public URL (signed via Cloudflare proxy elsewhere if
// needed; here we use the bucket's getPublicUrl which is fine because the
// bucket policy is "private but URL-accessible to anyone with the path").
//
// Auth: accepts ANY signed-in messaging participant (teacher, principal,
// homeschool_parent, agent, parent). The parent session cookie is distinct
// from the school session cookie, so we try both.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveMessagingParent } from '@/lib/montree/parent-messaging';
import { checkRateLimit } from '@/lib/rate-limiter';
import { randomBytes } from 'crypto';

export const maxDuration = 30;

const BUCKET = 'voice-obs';
const MAX_BYTES = 10 * 1024 * 1024; // 10MB hard cap

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  // Identify the caller — try school auth (teacher/principal/agent) first,
  // then parent. We don't care which one matches; we just need ONE valid
  // signed-in identity so we know who's uploading.
  let actorRole = '';
  let actorId = '';
  const school = await verifySchoolRequest(request);
  if (!(school instanceof NextResponse)) {
    actorRole = school.role;
    actorId = school.userId;
  } else {
    const parent = await resolveMessagingParent(supabase);
    if (!(parent instanceof NextResponse)) {
      actorRole = 'parent';
      actorId = parent.parentId;
    } else {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  }

  // Rate limit — 30 uploads / 5 min per IP. Generous; a single voice-note
  // POST sends one file. Anything more than this is misuse.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = await checkRateLimit(supabase, ip, '/api/montree/messages/upload-voice', 30, 5);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many uploads. Try again in a moment.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audio = formData.get('audio') as Blob | null;
  if (!audio || audio.size < 200) {
    return NextResponse.json({ error: 'Audio file required (min 200 bytes)' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: `Audio too large (max ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 400 });
  }

  // Allow only audio MIME types we expect from MediaRecorder
  const contentType = audio.type || 'audio/webm';
  if (!/^audio\//.test(contentType)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  // File path: messages/<role>/<actorId>/<yyyy-mm>/<rand>.<ext>
  const ext = (() => {
    if (contentType.includes('webm')) return 'webm';
    if (contentType.includes('mp4')) return 'm4a';
    if (contentType.includes('ogg')) return 'ogg';
    if (contentType.includes('mpeg')) return 'mp3';
    if (contentType.includes('wav')) return 'wav';
    return 'webm';
  })();
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = randomBytes(8).toString('hex');
  const path = `messages/${actorRole}/${actorId}/${ym}/${rand}.${ext}`;

  const buffer = Buffer.from(await audio.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadErr) {
    console.error('[upload-voice] storage upload failed', uploadErr);
    return NextResponse.json({ error: 'Failed to save audio' }, { status: 500 });
  }

  // Return a STABLE proxy URL so the message row can store a permanent
  // pointer. The /voice-stream route re-signs on every read so the audio
  // remains accessible forever (file stays in the private bucket; only
  // authenticated thread participants can stream it).
  const proxyUrl = `/api/montree/messages/voice-stream?path=${encodeURIComponent(path)}`;

  return NextResponse.json({
    success: true,
    url: proxyUrl,
    storage_path: path,
    bucket: BUCKET,
    content_type: contentType,
    size: audio.size,
  });
}
