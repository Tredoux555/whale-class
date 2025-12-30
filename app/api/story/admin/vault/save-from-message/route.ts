import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';
import crypto from 'crypto';

function encryptFile(fileBuffer: Buffer, password: string): Buffer {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(32);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(fileBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
    'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm',
  };
  return map[contentType] || '';
}

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, mediaUrl, filename } = await req.json();
    if (!mediaUrl) {
      return NextResponse.json({ error: 'No media URL provided' }, { status: 400 });
    }

    const response = await fetch(mediaUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const finalFilename = filename || `saved-${Date.now()}${getExtension(contentType)}`;

    const vaultPassword = process.env.VAULT_PASSWORD || 'change-this-in-env';
    const encrypted = encryptFile(fileBuffer, vaultPassword);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const supabase = getSupabase();
    const storageName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.enc`;

    const { error: uploadError } = await supabase.storage
      .from('vault-secure')
      .upload(`vault/${storageName}`, encrypted, { contentType: 'application/octet-stream', upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('vault-secure').getPublicUrl(`vault/${storageName}`);

    const { data: result, error } = await supabase
      .from('vault_files')
      .insert({
        filename: finalFilename,
        file_size: fileBuffer.length,
        file_url: urlData.publicUrl,
        encrypted_key: 'from-message',
        file_hash: fileHash,
        uploaded_by: adminUsername
      })
      .select('id, filename, uploaded_at')
      .single();

    if (error) throw error;

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await supabase.from('vault_audit_log').insert({
      action: 'save_from_message',
      admin_username: adminUsername,
      ip_address: ipAddress,
      details: `Saved: ${finalFilename} from message ${messageId || 'unknown'}`,
      success: true
    });

    return NextResponse.json({ success: true, file: result });
  } catch (error) {
    console.error('[Vault Save From Message] Error:', error);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
