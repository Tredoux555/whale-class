import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken } from '@/lib/story-db';
import crypto from 'crypto';

// Videos can be large + PBKDF2 + AES-GCM are CPU-bound. Bumped from default
// 15s to 120s so multi-MB video uploads don't get killed mid-encryption,
// which was matching the "vault not saving videos" symptom.
export const maxDuration = 120;

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

    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 500MB)' }, { status: 400 });
    }

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
      console.error('[Vault Upload] Error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('vault-secure').getPublicUrl(`vault/${filename}`);

    const { data: result, error } = await supabase
      .from('vault_files')
      .insert({
        filename: file.name,
        file_size: file.size,
        file_url: urlData.publicUrl,
        encrypted_key: `${iv}:${authTag}`,
        file_hash: fileHash,
        uploaded_by: adminUsername
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

    return NextResponse.json({ success: true, file: result });
  } catch (error) {
    console.error('[Vault Upload] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
