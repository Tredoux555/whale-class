import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';
import crypto from 'crypto';

function decryptFile(encryptedBuffer: Buffer, password: string): Buffer {
  const salt = encryptedBuffer.slice(0, 32);
  const iv = encryptedBuffer.slice(32, 48);
  const authTag = encryptedBuffer.slice(48, 64);
  const encrypted = encryptedBuffer.slice(64);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileId = parseInt(id, 10);
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: file } = await supabase
      .from('vault_files')
      .select('filename, file_url')
      .eq('id', fileId)
      .is('deleted_at', null)
      .single();

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const filePathMatch = file.file_url.match(/vault\/[^?]+/);
    if (!filePathMatch) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const { data: encryptedData, error: downloadError } = await supabase.storage
      .from('vault-secure')
      .download(filePathMatch[0]);

    if (downloadError || !encryptedData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const vaultPassword = process.env.VAULT_PASSWORD || 'change-this-in-env';
    const encryptedBuffer = Buffer.from(await encryptedData.arrayBuffer());

    let decryptedBuffer: Buffer;
    try {
      decryptedBuffer = decryptFile(encryptedBuffer, vaultPassword);
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt file' }, { status: 500 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    supabase.from('vault_audit_log').insert({
      action: 'file_download',
      admin_username: adminUsername,
      ip_address: ipAddress,
      details: `Downloaded: ${file.filename}`,
      success: true
    }).then(() => {});

    return new NextResponse(decryptedBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Length': decryptedBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Vault Download] Error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
