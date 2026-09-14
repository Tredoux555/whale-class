import { NextRequest, NextResponse, after } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken, isVaultOwner } from '@/lib/story-db';
import sharp from 'sharp';
import { isMissingColumnError, isVaultVideoFilename, transcodeVaultVideo } from '@/lib/story/vault/transcode';

// fix/story-vault-mobile-jun13 — extensions we treat as images for thumbnail
// generation on the direct (chunked) upload path. Videos never get a thumbnail.
const IMAGE_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif',
]);

// 🚨 Session 153 — records the metadata row for a direct (large-media) vault
// upload AFTER the browser has pushed the bytes straight to Supabase via the
// signed url from /vault/signed-upload.
//
// `encrypted_key = 'plain'` is the sentinel that marks an UNENCRYPTED file —
// the download path uses it to serve a signed url instead of attempting AES
// decryption. `file_hash = 'direct-upload'` because the server never saw the
// bytes and so cannot compute a hash (the column is NOT NULL).
export const runtime = 'nodejs';
// 🚨 The H.264 conversion below runs inside `after()`, i.e. still inside this
// invocation's lifetime. Give it room — a 6-minute 4K iPhone clip is a real
// ffmpeg pass, not a thumbnail.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isVaultOwner(req.headers.get('authorization')))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const vaultTokenValid = await verifyVaultToken(req.headers.get('x-vault-token'));
    if (!vaultTokenValid) {
      return NextResponse.json(
        { error: 'Vault not unlocked', vault_locked: true },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === 'string' ? body.path : '';
    const filename = typeof body.filename === 'string' ? body.filename : '';
    const fileSize = Math.max(0, Math.floor(Number(body.fileSize) || 0));

    // Only allow paths our signed-upload route generates — never a
    // caller-supplied arbitrary object path.
    if (!/^vault\/[A-Za-z0-9._-]+$/.test(path)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Confirm the object actually landed in the bucket before we write a row,
    // so a failed/abandoned upload can't leave a dangling vault entry.
    const lastSlash = path.lastIndexOf('/');
    const dir = path.slice(0, lastSlash);
    const objectName = path.slice(lastSlash + 1);
    const { data: listed } = await supabase.storage
      .from('vault-secure')
      .list(dir, { search: objectName, limit: 1 });
    const found = (listed || []).find(o => o.name === objectName);
    if (!found) {
      return NextResponse.json(
        { error: 'Upload not found in storage — the direct upload may have failed. Please retry.' },
        { status: 409 }
      );
    }

    // fix/story-vault-mobile-jun13 — direct uploads are stored UNENCRYPTED, so
    // for large IMAGES we can download the just-landed object and build a small
    // grid thumbnail (videos are skipped — the grid renders a ▶ tile, never a
    // thumbnail). Best-effort: any failure leaves thumbnail_path NULL and the
    // grid falls back to the full image. Large videos take the common case and
    // skip this entirely.
    let thumbnailPath: string | null = null;
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (IMAGE_EXTS.has(ext)) {
      try {
        const { data: orig } = await supabase.storage.from('vault-secure').download(path);
        if (orig) {
          const origBuf = Buffer.from(await orig.arrayBuffer());
          const thumb = await sharp(origBuf)
            .rotate()
            .resize({ width: 480, withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();
          const thumbName = `${path}.thumb.jpg`;
          const { error: thumbErr } = await supabase.storage
            .from('vault-secure')
            .upload(thumbName, thumb, { contentType: 'image/jpeg', upsert: false });
          if (!thumbErr) thumbnailPath = thumbName;
          else console.warn('[Vault Finalize] thumbnail upload failed:', thumbErr.message);
        }
      } catch (e) {
        console.warn('[Vault Finalize] thumbnail generation failed:', e);
      }
    }

    // 🚨 iPhone .MOV is usually HEVC, which Chrome/Firefox/Android cannot
    // decode (black screen, audio only). Videos are therefore queued for a
    // server-side H.264 conversion — see lib/story/vault/transcode.ts. Images
    // never get a status, so the client only ever polls actual videos.
    const isVideo = isVaultVideoFilename(filename);
    const baseRow: Record<string, unknown> = {
      filename,
      file_size: fileSize,
      file_url: path,            // store the storage path; download routes parse `vault/...`
      encrypted_key: 'plain',    // sentinel: unencrypted direct upload
      file_hash: 'direct-upload',
      uploaded_by: adminUsername,
      thumbnail_path: thumbnailPath,
    };

    let { data: result, error } = await supabase
      .from('vault_files')
      .insert(isVideo ? { ...baseRow, transcode_status: 'pending' } : baseRow)
      .select('id, filename, uploaded_at')
      .single();

    // Pre-migration-357 database: no transcode_status column. Save the row
    // anyway (uploads must never break on a pending migration) — the video
    // just stays in its original codec until the column exists.
    let transcodeQueued = isVideo;
    if (error && isMissingColumnError(error)) {
      transcodeQueued = false;
      ({ data: result, error } = await supabase
        .from('vault_files')
        .insert(baseRow)
        .select('id, filename, uploaded_at')
        .single());
    }

    if (error) throw error;

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await supabase.from('vault_audit_log').insert({
      action: 'file_upload',
      admin_username: adminUsername,
      ip_address: ipAddress,
      details: `Direct upload: ${filename} (${fileSize} bytes, unencrypted)`,
      success: true,
    });

    // 🚨 Respond FIRST, convert after. `after()` runs the callback once the
    // response has been flushed, so the upload UI never waits on ffmpeg, and
    // the work still happens inside this (long-running, Railway) process —
    // no cron, no queue, no second service. transcodeVaultVideo never throws
    // and claims the row conditionally, so a duplicate kick-off is a no-op.
    if (transcodeQueued && result?.id) {
      const queuedId = result.id as number;
      after(async () => {
        try {
          await transcodeVaultVideo(queuedId);
        } catch (e) {
          console.error('[Vault Finalize] transcode kick-off failed:', e);
        }
      });
    }

    console.log(`[Vault Finalize] SAVED ${filename} → row ${result?.id}`);
    return NextResponse.json({
      success: true,
      file: result ? { ...result, transcode_status: transcodeQueued ? 'pending' : null } : result,
    });
  } catch (error) {
    console.error('[Vault Finalize] Error:', error);
    const msg = error instanceof Error ? error.message : 'Finalize failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
