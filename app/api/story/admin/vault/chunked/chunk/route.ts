import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, verifyVaultToken, isVaultOwner } from '@/lib/story-db';

// 🚨 Session 153 — server-proxied chunked (resumable) upload, step 2 of 3.
//
// Relays ONE chunk of bytes from the (admin-authed, vault-unlocked) browser to
// the Supabase TUS upload opened by /vault/chunked/init, using the service key.
// The browser keeps chunks under Railway's ~30MB body cap; the server↔Supabase
// hop is co-located (Singapore) so it's fast + reliable.
//
// Body: raw chunk bytes (application/offset+octet-stream).
// Headers: x-tus-url (the upload URL from init), x-upload-offset (byte offset).
export const runtime = 'nodejs';
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    const tusUrl = req.headers.get('x-tus-url') || '';
    const offsetHeader = req.headers.get('x-upload-offset') || '';
    const offset = parseInt(offsetHeader, 10);

    // 🔒 SSRF guard — the server PATCHes this URL WITH THE SERVICE KEY, so it
    // must be a Supabase resumable-upload URL on OUR project, never a
    // caller-supplied arbitrary destination.
    if (!tusUrl.startsWith(`${SUPABASE_URL}/storage/v1/upload/resumable/`)) {
      return NextResponse.json({ error: 'Invalid upload URL' }, { status: 400 });
    }
    if (!Number.isFinite(offset) || offset < 0) {
      return NextResponse.json({ error: 'Invalid upload offset' }, { status: 400 });
    }

    const chunk = Buffer.from(await req.arrayBuffer());
    if (chunk.length === 0) {
      return NextResponse.json({ error: 'Empty chunk' }, { status: 400 });
    }

    // Relay to Supabase TUS with a couple of retries — the co-located hop is
    // reliable, but a transient blip shouldn't sink a long upload.
    let lastDetail = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      const patchRes = await fetch(tusUrl, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Content-Type': 'application/offset+octet-stream',
          'Upload-Offset': String(offset),
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
        },
        body: chunk,
      });
      if (patchRes.status === 204) {
        const newOffset = parseInt(patchRes.headers.get('upload-offset') || '', 10);
        return NextResponse.json({ offset: newOffset });
      }
      lastDetail = `${patchRes.status} ${(await patchRes.text().catch(() => '')).slice(0, 160)}`;
      // 409 = offset conflict (already have these bytes) — surface so the client resyncs.
      if (patchRes.status === 409 || patchRes.status === 460) {
        return NextResponse.json({ error: 'offset_conflict', detail: lastDetail }, { status: 409 });
      }
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
    console.error('[Vault Chunked Chunk] relay failed:', lastDetail);
    return NextResponse.json({ error: `Chunk relay failed: ${lastDetail}` }, { status: 502 });
  } catch (error) {
    console.error('[Vault Chunked Chunk] Error:', error);
    const msg = error instanceof Error ? error.message : 'Chunk failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
