import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, verifyVaultToken, isVaultOwner } from '@/lib/story-db';
import { transcodeVaultVideo } from '@/lib/story/vault/transcode';

// POST /api/story/admin/vault/transcode/[id]
//
// Converts ONE plain vault video to H.264/AAC MP4 (see
// lib/story/vault/transcode.ts for the why). /vault/finalize already kicks
// this off itself via `after()`, so in the normal flow nobody calls this — it
// exists for (a) a client-side retry after a 'failed' row, and (b) the backlog
// of videos uploaded before this shipped.
//
// Auth is IDENTICAL to every other vault route: admin JWT + owner space + an
// unlocked vault token. No new door.
//
// NODE RUNTIME — the transcoder shells out to ffmpeg.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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

    const result = await transcodeVaultVideo(fileId);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    console.error('[Vault Transcode] Error:', error);
    return NextResponse.json({ error: 'Transcode failed' }, { status: 500 });
  }
}
