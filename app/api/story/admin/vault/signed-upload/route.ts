import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken } from '@/lib/story-db';
import crypto from 'crypto';

// 🚨 Session 153 — large-media vault path.
//
// The legacy /vault/upload route streams the whole file THROUGH this server
// (buffer in memory → AES-256-GCM encrypt → forward to Supabase). That is
// hard-capped at ~30MB by Railway's reverse-proxy body limit, so a 6-min
// iPhone video (~150-400MB) could never be saved.
//
// This route does NOT touch the bytes. It mints a one-time Supabase signed
// UPLOAD url so the browser can push the file DIRECTLY to the private
// `vault-secure` bucket — no Railway hairpin, no body cap, any size up to the
// bucket's 1GB limit. The bytes never enter this container.
//
// Trade-off (approved by Tredoux): files uploaded this way are stored
// unencrypted at rest (the server never sees them, so it can't AES-encrypt
// them). They remain protected by: a PRIVATE bucket, admin-session auth, the
// 1h vault-token gate, and short-lived signed download urls. The metadata row
// is written by /vault/finalize AFTER the upload succeeds.
export const runtime = 'nodejs';

// Matches the bucket file_size_limit (raised to 1GB in Session 153).
const MAX_DIRECT_BYTES = 1024 * 1024 * 1024; // 1GB

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
    const filename = typeof body.filename === 'string' ? body.filename : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType : '';
    const fileSize = Number(body.fileSize) || 0;

    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `File type not allowed: ${contentType || 'unknown'}` },
        { status: 400 }
      );
    }
    if (fileSize > MAX_DIRECT_BYTES) {
      const mb = (fileSize / 1024 / 1024).toFixed(0);
      return NextResponse.json(
        { error: `File too large: ${mb}MB. Vault limit is 1GB per file.` },
        { status: 413 }
      );
    }

    // Preserve the original extension so playback / content-type sniffing works.
    const extMatch = filename.match(/\.([a-zA-Z0-9]{1,8})$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';
    const objectPath = `vault/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from('vault-secure')
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      console.error('[Vault SignedUpload] createSignedUploadUrl error:', error);
      const msg = (error as { message?: string } | undefined)?.message ?? 'Could not create upload url';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    console.log(`[Vault SignedUpload] minted url for ${filename} (${(fileSize / 1024 / 1024).toFixed(1)}MB) → ${objectPath}`);
    return NextResponse.json({
      path: objectPath,
      token: data.token,
      signedUrl: data.signedUrl,
    });
  } catch (error) {
    console.error('[Vault SignedUpload] Outer catch:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create upload url';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
