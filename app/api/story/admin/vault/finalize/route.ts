import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken } from '@/lib/story-db';
import sharp from 'sharp';

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

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const { data: result, error } = await supabase
      .from('vault_files')
      .insert({
        filename,
        file_size: fileSize,
        file_url: path,            // store the storage path; download routes parse `vault/...`
        encrypted_key: 'plain',    // sentinel: unencrypted direct upload
        file_hash: 'direct-upload',
        uploaded_by: adminUsername,
        thumbnail_path: thumbnailPath,
      })
      .select('id, filename, uploaded_at')
      .single();

    if (error) throw error;

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await supabase.from('vault_audit_log').insert({
      action: 'file_upload',
      admin_username: adminUsername,
      ip_address: ipAddress,
      details: `Direct upload: ${filename} (${fileSize} bytes, unencrypted)`,
      success: true,
    });

    console.log(`[Vault Finalize] SAVED ${filename} → row ${result?.id}`);
    return NextResponse.json({ success: true, file: result });
  } catch (error) {
    console.error('[Vault Finalize] Error:', error);
    const msg = error instanceof Error ? error.message : 'Finalize failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
