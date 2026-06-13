import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken } from '@/lib/story-db';
import crypto from 'crypto';
import sharp from 'sharp';

// Videos can be large + PBKDF2 + AES-GCM are CPU-bound. Bumped from default
// 15s to 120s so multi-MB video uploads don't get killed mid-encryption.
export const maxDuration = 120;
export const runtime = 'nodejs';
// 🚨 Railway's reverse proxy caps request bodies at ~32MB by default. Any
// upload above that fails silently before reaching this route handler.
// We honour that ceiling client + server-side and surface a clear error
// to the admin instead of letting them think "the vault doesn't save
// videos" when really their 80MB iPhone clip got truncated at the proxy.
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024; // 30MB safe ceiling under Railway's 32MB cap

// fix/story-vault-mobile-jun13 — generate a small thumbnail for IMAGE uploads.
// ~480px wide, JPEG q70 — a few KB instead of a multi-MB original. Stored
// UNENCRYPTED (it is a tiny, low-resolution derivative) so the gallery grid
// can load it fast on mobile without a per-request AES decrypt. The
// full-resolution original stays AES-256-GCM encrypted at rest and is only
// fetched when the viewer opens. Returns null on any failure (e.g. HEIC that
// the bundled libvips can't decode) — the grid then falls back to the legacy
// full-image path for that file, so a thumbnail miss is never fatal.
async function makeThumbnail(fileBuffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(fileBuffer)
      .rotate() // honour EXIF orientation
      .resize({ width: 480, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
  } catch (e) {
    console.warn('[Vault Upload] thumbnail generation failed:', e);
    return null;
  }
}

function encryptFile(fileBuffer: Buffer, password: string): { encrypted: Buffer; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(32);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(fileBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return { encrypted: combined, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
}

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🚨 Session 113 V2 Story audit F-2.1 — vault token mandatory.
    const vaultTokenValid = await verifyVaultToken(req.headers.get('x-vault-token'));
    if (!vaultTokenValid) {
      return NextResponse.json(
        { error: 'Vault not unlocked', vault_locked: true },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 🚨 Session 131: widened mime allowlist to cover real mobile capture
    // formats. The old whitelist (jpeg/png/gif + mp4/webm) silently rejected
    // ~half of iPhone uploads (HEIC photos + MOV videos) and most Android
    // video captures (3gpp, x-matroska). We accept anything image/* or
    // video/*, then verify the prefix.
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type || 'unknown'}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        {
          error: `Video too large to upload through the vault: ${mb}MB. The server proxy caps body at 30MB. Trim or compress the video and try again.`,
          file_size_bytes: file.size,
          max_bytes: MAX_UPLOAD_BYTES,
        },
        { status: 413 }
      );
    }

    console.log(`[Vault Upload] received ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, ${file.type})`);

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const vaultPassword = process.env.VAULT_PASSWORD;
    if (!vaultPassword) {
      return NextResponse.json({ error: 'Vault not configured' }, { status: 500 });
    }
    const { encrypted, iv, authTag } = encryptFile(fileBuffer, vaultPassword);

    const supabase = getSupabase();
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.enc`;

    const { error: uploadError } = await supabase.storage
      .from('vault-secure')
      .upload(`vault/${filename}`, encrypted, { contentType: 'application/octet-stream', upsert: false });

    if (uploadError) {
      console.error('[Vault Upload] Supabase Storage error:', uploadError);
      const msg = (uploadError as { message?: string } | undefined)?.message ?? 'Upload failed';
      return NextResponse.json(
        { error: `Storage upload failed: ${msg}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from('vault-secure').getPublicUrl(`vault/${filename}`);

    // fix/story-vault-mobile-jun13 — for images, generate + store a small
    // thumbnail so the gallery grid loads fast on mobile. Best-effort: a
    // failure here (or a non-image) just leaves thumbnail_path NULL and the
    // grid falls back to the full image. Videos never get a thumbnail.
    let thumbnailPath: string | null = null;
    if (isImage) {
      const thumb = await makeThumbnail(fileBuffer);
      if (thumb) {
        const thumbName = `vault/thumb-${filename.replace(/\.enc$/, '')}.jpg`;
        const { error: thumbErr } = await supabase.storage
          .from('vault-secure')
          .upload(thumbName, thumb, { contentType: 'image/jpeg', upsert: false });
        if (thumbErr) {
          console.warn('[Vault Upload] thumbnail upload failed:', thumbErr.message);
        } else {
          thumbnailPath = thumbName;
        }
      }
    }

    const { data: result, error } = await supabase
      .from('vault_files')
      .insert({
        filename: file.name,
        file_size: file.size,
        file_url: urlData.publicUrl,
        encrypted_key: `${iv}:${authTag}`,
        file_hash: fileHash,
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
      details: `File: ${file.name} (${file.size} bytes)`,
      success: true
    });

    console.log(`[Vault Upload] SAVED ${file.name} → row ${result?.id}`);
    return NextResponse.json({ success: true, file: result });
  } catch (error) {
    console.error('[Vault Upload] Outer catch:', error);
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
