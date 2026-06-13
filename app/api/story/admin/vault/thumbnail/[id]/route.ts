import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken } from '@/lib/story-db';

// fix/story-vault-mobile-jun13 — serves the small (~480px, q70 JPEG) grid
// thumbnail for an image vault file. Thumbnails are stored UNENCRYPTED in the
// private vault-secure bucket (a tiny low-resolution derivative), so this
// route can stream them directly with no per-request AES decrypt — that is the
// whole point: the gallery grid loads fast on mobile instead of pulling +
// decrypting full-resolution originals through the throttled decrypt proxy.
//
// Still gated by admin JWT + vault token (same as every other vault route).
// Returns 404 when the row has no thumbnail (the pre-fix backlog / videos) so
// the client can fall back to its legacy full-image grid path.
export const runtime = 'nodejs';

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
      .select('thumbnail_path')
      .eq('id', fileId)
      .is('deleted_at', null)
      .single();

    if (!file || !file.thumbnail_path) {
      return NextResponse.json({ error: 'No thumbnail' }, { status: 404 });
    }

    const { data: blob, error: dlErr } = await supabase.storage
      .from('vault-secure')
      .download(file.thumbnail_path);

    if (dlErr || !blob) {
      return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 });
    }

    const buf = Buffer.from(await blob.arrayBuffer());
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': buf.length.toString(),
        // no-store keeps decrypted-equivalent vault media out of a shared
        // machine's disk cache after the vault is locked (matches the full
        // download route's posture).
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Vault Thumbnail] Error:', error);
    return NextResponse.json({ error: 'Thumbnail failed' }, { status: 500 });
  }
}
