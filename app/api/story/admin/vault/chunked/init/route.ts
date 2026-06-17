import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, verifyVaultToken, isVaultOwner } from '@/lib/story-db';
import crypto from 'crypto';

// 🚨 Session 153 — server-proxied chunked (resumable) upload, step 1 of 3.
//
// Why this exists: large videos (a 6-min iPhone clip ≈ 535MB) can't reach the
// vault any other way. Streaming through the server is capped at ~30MB by
// Railway's proxy; a single direct browser→Supabase PUT hits Supabase's
// standard-upload ceiling; and Supabase REFUSES resumable (TUS) uploads
// authenticated by the public/anon key (it needs a real Supabase user
// session, which the Story vault — own admin auth — doesn't have).
//
// So the ONLY credential that can drive a resumable upload is the service
// key, server-side. This route opens a Supabase TUS upload with that key and
// hands the resulting upload URL back to the (admin-authed, vault-unlocked)
// browser. The browser then streams the file to /vault/chunked/chunk in
// <30MB pieces, and the server relays each piece to this TUS URL. The service
// key never leaves the server; the TUS URL is not a secret (PATCHing it still
// requires the service-key bearer, which only the server holds).
//
// Files land UNENCRYPTED in the private vault-secure bucket (approved
// trade-off) — gated by admin auth + vault token + signed download urls.
export const runtime = 'nodejs';
export const maxDuration = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB ceiling (vault_files.file_size is int4 → <2.147GB)

const b64 = (s: string) => Buffer.from(s).toString('base64');

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await isVaultOwner(req.headers.get('authorization')))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const vaultTokenValid = await verifyVaultToken(req.headers.get('x-vault-token'));
    if (!vaultTokenValid) {
      return NextResponse.json({ error: 'Vault not unlocked', vault_locked: true }, { status: 401 });
    }
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Vault not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const filename = typeof body.filename === 'string' ? body.filename : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType : '';
    const fileSize = Math.floor(Number(body.fileSize) || 0);

    if (!filename) return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: `File type not allowed: ${contentType || 'unknown'}` }, { status: 400 });
    }
    if (fileSize <= 0 || fileSize > MAX_BYTES) {
      return NextResponse.json({ error: `Invalid file size (max ${MAX_BYTES} bytes)` }, { status: 413 });
    }

    const extMatch = filename.match(/\.([a-zA-Z0-9]{1,8})$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';
    const objectPath = `vault/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const meta = [
      `bucketName ${b64('vault-secure')}`,
      `objectName ${b64(objectPath)}`,
      `contentType ${b64(contentType)}`,
      `cacheControl ${b64('3600')}`,
    ].join(',');

    const createRes = await fetch(`${SUPABASE_URL}/storage/v1/upload/resumable`, {
      method: 'POST',
      headers: {
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': meta,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'x-upsert': 'false',
      },
    });
    if (createRes.status !== 201) {
      const detail = await createRes.text().catch(() => '');
      console.error('[Vault Chunked Init] TUS create failed:', createRes.status, detail.slice(0, 200));
      return NextResponse.json({ error: `Could not start upload (${createRes.status})` }, { status: 502 });
    }
    const tusUrl = createRes.headers.get('location');
    if (!tusUrl) return NextResponse.json({ error: 'No upload URL returned' }, { status: 502 });

    console.log(`[Vault Chunked Init] ${filename} (${(fileSize / 1048576).toFixed(1)}MB) → ${objectPath}`);
    return NextResponse.json({ tusUrl, path: objectPath });
  } catch (error) {
    console.error('[Vault Chunked Init] Error:', error);
    const msg = error instanceof Error ? error.message : 'Init failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
