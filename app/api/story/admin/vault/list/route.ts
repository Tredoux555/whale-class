import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken, isVaultOwner } from '@/lib/story-db';
import { isMissingColumnError } from '@/lib/story/vault/transcode';

export async function GET(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🚨 Session 113 V2 Story audit F-2.1 — vault token mandatory. Admin
    // session alone is not sufficient to list vault files; the operator
    // must have unlocked the vault within the last hour. Closes the
    // 'stealing an admin JWT = unrestricted vault access' hole.
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

    const supabase = getSupabase();

    const COLUMNS =
      'id, filename, file_size, file_url, encrypted_key, thumbnail_path, uploaded_by, uploaded_at';

    // transcode_status arrives with migration 357. Select it when it exists and
    // fall back cleanly when it does not, so the vault keeps listing on a
    // database where the migration has not been run yet (42703).
    interface VaultRow {
      id: number;
      filename: string;
      file_size: number;
      file_url: string | null;
      encrypted_key: string | null;
      thumbnail_path: string | null;
      uploaded_by: string | null;
      uploaded_at: string;
      transcode_status?: string | null;
    }

    const primary = await supabase
      .from('vault_files')
      .select(`${COLUMNS}, transcode_status`)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });

    let rows = primary.data as VaultRow[] | null;
    let error = primary.error;

    if (error && isMissingColumnError(error)) {
      const fallback = await supabase
        .from('vault_files')
        .select(COLUMNS)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: false });
      rows = fallback.data as VaultRow[] | null;
      error = fallback.error;
    }

    if (error) throw error;

    const files = (rows || []).map(row => ({
      id: row.id,
      filename: row.filename,
      file_size: row.file_size,
      file_url: row.file_url,
      // 'plain' marks an unencrypted direct (large-media) upload — the client
      // uses this to route downloads through the signed-url endpoint.
      encrypted: row.encrypted_key !== 'plain',
      // fix/story-vault-mobile-jun13 — whether a small grid thumbnail exists.
      // When true the grid loads /vault/thumbnail/[id] (a few KB) instead of
      // the full-resolution original (fast on mobile). NULL for the existing
      // image backlog and for videos → grid falls back to its old behaviour.
      has_thumbnail: !!row.thumbnail_path,
      // Migration 357 — NULL on images and on pre-357 rows; 'pending' /
      // 'processing' while the H.264 conversion is in flight; 'done' /
      // 'skipped' when it plays everywhere; 'failed' = Safari-only original.
      transcode_status: row.transcode_status ?? null,
      uploaded_by: row.uploaded_by,
      uploaded_at: row.uploaded_at
    }));

    // Audit log
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await supabase.from('vault_audit_log').insert({
      action: 'list_files',
      admin_username: adminUsername,
      ip_address: ipAddress,
      success: true
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error('[Vault List] Error:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
