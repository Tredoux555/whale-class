// app/api/montree/feedback/v2/upload/route.ts
//
// POST one screenshot for a post. Generalises the older
// /api/montree/feedback/upload-screenshot route (which required a full Montree
// session, so a guest could never attach anything) to the board's own identity
// model: a guest with a token may upload, an anon may not.
//
// It reuses that route's bucket (`feedback-screenshots`) and the shared
// safe-upload allow-list, so there is one place in the codebase that decides
// what content type a stored file is served as.
//
// Returns the object PATH, not a URL. The path is what goes in the post row;
// the page renders it through the existing public-URL helper. Handing back a
// URL would let a client store whatever string it liked in screenshot_path.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { safeContentType, uploadKind } from '@/lib/montree/media/safe-upload';
import { clientIp, jsonError, requireIdentity, resolveBoardContext } from '@/lib/montree/feedback/board';

export const dynamic = 'force-dynamic';

const BUCKET = 'feedback-screenshots';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB — the brief's budget, one image per post

export async function POST(request: NextRequest) {
  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;

  // An anon cannot upload. A guest CAN: they have an httpOnly token, which is
  // the same identity the rate limiter meters and the post will be written to.
  const denied = requireIdentity(ctx);
  if (denied) return denied;

  const rl = await checkRateLimit(
    getSupabase(),
    ctx.viewer.key ?? `ip:${clientIp(request)}`,
    'feedback_v2_upload',
    10,
    15,
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many uploads.', code: 'rate_limited' }, { status: 429 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    file = form.get('file') as File | null;
  } catch {
    return jsonError('Send a file.', 400, 'bad_form');
  }
  if (!file) return jsonError('Send a file.', 400, 'no_file');
  if (file.size > MAX_SIZE) return jsonError('That image is over 5MB.', 400, 'too_large');

  // The allow-list decides, not the browser's Content-Type header.
  const kind = uploadKind(file.type, file.name);
  if (kind !== 'image') {
    return jsonError('Screenshots only, please.', 400, 'not_an_image');
  }

  const supabase = getSupabase();
  try {
    await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_SIZE });
  } catch {
    // Already there. createBucket is the repo's idiom for "ensure".
  }

  // The filename is ours, never the client's: an uploaded name is attacker
  // input and this one lands in a public bucket.
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  const filename = `v2/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext || 'png'}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType: safeContentType(file.type, file.name),
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      console.error('[feedback/v2/upload] storage', error);
      return jsonError('Upload failed.', 500, 'upload_failed');
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return NextResponse.json({ ok: true, path: data.path, url: urlData.publicUrl });
  } catch (err) {
    console.error('[feedback/v2/upload] POST', err);
    return jsonError('Upload failed.', 500, 'upload_failed');
  }
}
