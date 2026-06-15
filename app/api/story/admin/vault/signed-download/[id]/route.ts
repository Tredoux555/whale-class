import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken, isVaultOwner } from '@/lib/story-db';

// 🚨 Session 153 — issues a short-lived signed download url for UNENCRYPTED
// (direct/large-media) vault files. The browser fetches the bytes straight
// from Supabase, so a 400MB video is never buffered through this container
// (the legacy /vault/download/[id] route downloads + decrypts in-memory,
// which both blows Node's heap and re-hits the Railway limits on the way out).
//
// Encrypted files (encrypted_key !== 'plain') are rejected here — they keep
// using the legacy decrypt-proxy route.
export const runtime = 'nodejs';

// 🚨 Security audit C2 (Jun 2026) + streaming fix (Session 154): 5 min was
// ample to START a stream, but the <video> element keeps issuing Range
// requests against the SAME signed url for the whole playback — a long video
// (or a pause + resume, or a late seek) blew past the 5-min TTL and every
// subsequent byte-range fetch 400'd, freezing playback mid-film. 1h covers
// any realistic single viewing session while staying short-lived; issuance
// of the url is still admin-JWT + vault-token gated, and the player only
// requests a url at the moment of playback (never at page load) and
// re-requests a fresh one on expiry errors, so a leaked url's useful life
// stays bounded.
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

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

    // Owner-space gate (defense-in-depth on top of the unlock choke point).
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

    const fileId = parseInt(id, 10);
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: file } = await supabase
      .from('vault_files')
      .select('filename, file_url, encrypted_key')
      .eq('id', fileId)
      .is('deleted_at', null)
      .single();

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    if (file.encrypted_key !== 'plain') {
      return NextResponse.json(
        { error: 'File is encrypted — use the standard download endpoint' },
        { status: 400 }
      );
    }

    const filePathMatch = String(file.file_url).match(/vault\/[^?]+/);
    if (!filePathMatch) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Serve INLINE (no `download` option) so the browser plays the video /
    // shows the image when the signed url is opened, instead of forcing a
    // multi-hundred-MB download on a phone. The object's stored content-type
    // (e.g. video/quicktime) drives playback; Supabase storage honours HTTP
    // range requests so the video is seekable.
    const { data: signed, error: signErr } = await supabase.storage
      .from('vault-secure')
      .createSignedUrl(filePathMatch[0], SIGNED_URL_TTL_SECONDS);

    if (signErr || !signed) {
      console.error('[Vault SignedDownload] createSignedUrl error:', signErr);
      return NextResponse.json({ error: 'Could not create download url' }, { status: 500 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    supabase.from('vault_audit_log').insert({
      action: 'file_download',
      admin_username: adminUsername,
      ip_address: ipAddress,
      details: `Signed download: ${file.filename}`,
      success: true,
    }).then(() => {});

    return NextResponse.json({ url: signed.signedUrl, filename: file.filename });
  } catch (error) {
    console.error('[Vault SignedDownload] Error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
