import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';

export async function DELETE(
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

    // 🚨 Session 113 V2 Story audit F-2.2 — fetch file_url too so we can
    // hard-delete the storage object alongside the soft-delete DB flip.
    // The legacy code only flipped deleted_at; the Supabase Storage object
    // remained at its public URL forever, leaving an exfiltration window
    // for anyone who saw the URL during the file's active period (Railway
    // logs, CSV exports, DB backups). factory_reset + clear_vault both
    // already remove storage; soft-delete was the inconsistent path.
    const { data: file } = await supabase
      .from('vault_files')
      .select('filename, file_url')
      .eq('id', fileId)
      .is('deleted_at', null)
      .single();

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await supabase
      .from('vault_files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId);

    // 🚨 Hard-delete the storage object. Mirror the regex used by
    // system-controls clear_vault / factory_reset: extract the vault/...
    // suffix from the public URL and remove it from the 'vault-secure'
    // bucket. Best-effort — DB delete already succeeded so we log + move on
    // if storage removal fails (re-run later via reconciliation).
    let storageRemoved = false;
    let storageError: string | null = null;
    try {
      const match = (file as { file_url: string | null }).file_url?.match(/vault\/[^?]+/);
      const storagePath = match ? match[0] : null;
      if (storagePath) {
        const { error: storageErr } = await supabase.storage
          .from('vault-secure')
          .remove([storagePath]);
        if (storageErr) {
          storageError = storageErr.message;
          console.error('[Vault Delete] storage remove failed (soft-delete still effective)', storageErr);
        } else {
          storageRemoved = true;
        }
      }
    } catch (e) {
      storageError = e instanceof Error ? e.message : 'unknown';
      console.error('[Vault Delete] storage remove threw', e);
    }

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await supabase.from('vault_audit_log').insert({
      action: 'file_delete',
      admin_username: adminUsername,
      ip_address: ipAddress,
      details: `File ID: ${fileId} — storage_removed=${storageRemoved}${storageError ? ` storage_error=${storageError}` : ''}`,
      success: true
    });

    return NextResponse.json({ success: true, storage_removed: storageRemoved });
  } catch (error) {
    console.error('[Vault Delete] Error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
