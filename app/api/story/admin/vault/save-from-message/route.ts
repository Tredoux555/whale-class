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

    let fileBuffer: Buffer;
    let contentType: string;

    const PROXY_PREFIX = '/api/montree/media/proxy/';
    if (mediaUrl.startsWith(PROXY_PREFIX)) {
      // Relative proxy URL — fetch directly from Supabase storage to avoid
      // the "Failed to parse URL" TypeError that occurs with relative URLs in fetch()
      const parsed = new URL(mediaUrl, 'http://localhost');
      const storagePath = parsed.pathname.slice(PROXY_PREFIX.length);
      const bucket = parsed.searchParams.get('bucket') || 'montree-media';
      const supabase = getSupabase();
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(storagePath);
      if (downloadError || !fileData) {
        console.error('[Vault Save] Supabase download error:', downloadError);
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: 400 });
      }
      fileBuffer = Buffer.from(await fileData.arrayBuffer());
      contentType = fileData.type || 'application/octet-stream';
    } else {
      // 🚨 Session 113 V2 Story audit F-1.3 SSRF — refuse arbitrary URLs.
      // The legacy code accepted ANY string the admin POSTed and fetched it
      // server-side, which let an admin (or anyone who held an admin token)
      // exfiltrate Railway/AWS metadata, file://, or any internal endpoint
      // by encrypting the response into the vault.
      //
      // Whitelist:
      //  1. Relative /api/montree/media/proxy/ URLs (handled above)
      //  2. Absolute URLs that resolve to montree.xyz / teacherpotato.xyz
      //     hosts on https. NOTHING else.
      const ALLOWED_HOSTS = new Set([
        'montree.xyz', 'www.montree.xyz',
        'teacherpotato.xyz', 'www.teacherpotato.xyz',
      ]);
      let parsed: URL;
      try {
        parsed = new URL(mediaUrl);
      } catch {
        return NextResponse.json({ error: 'mediaUrl is not a valid URL' }, { status: 400 });
      }
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return NextResponse.json(
          { error: 'mediaUrl must be http or https' },
          { status: 400 }
        );
      }
      if (!ALLOWED_HOSTS.has(parsed.hostname)) {
        console.warn('[Vault Save] Refused non-allowlisted host', { host: parsed.hostname });
        return NextResponse.json(
          { error: 'mediaUrl host not allowed' },
          { status: 400 }
        );
      }
      // Defense in depth — also refuse file://, gopher://, etc. via protocol
      // check above + IPv4-literal hostnames just in case (no allowed host
      // is numeric).
      if (/^\d/.test(parsed.hostname)) {
        return NextResponse.json(
          { error: 'mediaUrl host not allowed' },
          { status: 400 }
        );
      }
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: 400 });
      }
      fileBuffer = Buffer.from(await response.arrayBuffer());
      contentType = response.headers.get('content-type') || 'application/octet-stream';
    }
    const finalFilename = filename || `saved-${Date.now()}${getExtension(contentType)}`;

    const vaultPassword = process.env.VAULT_PASSWORD;
    if (!vaultPassword) {
      return NextResponse.json({ error: 'Vault not configured' }, { status: 500 });
    }
    const encrypted = encryptFile(fileBuffer, vaultPassword);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const supabase = getSupabase();
    const storageName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.enc`;

    const { error: uploadError } = await supabase.storage
      .from('vault-secure')
      .upload(`vault/${storageName}`, encrypted, { contentType: 'application/octet-stream', upsert: false });

    if (uploadError) {
      console.error('[Vault Save] Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
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
