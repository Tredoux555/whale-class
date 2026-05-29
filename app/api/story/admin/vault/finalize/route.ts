import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyVaultToken } from '@/lib/story-db';

// 🚨 Session 153 — records the metadata row for a direct (large-media) vault
// upload AFTER the browser has pushed the bytes straight to Supabase via the
// signed url from /vault/signed-upload.
//
// `encrypted_key = 'plain'` is the sentinel that marks an UNENCRYPTED file —
// the download path uses it to serve a signed url instead of attempting AES
// decryption. `file_hash = 'direct-upload'` because the server never saw the
// bytes and so cannot compute a hash (the column is NOT NULL).
export const runtime = 'nodejs';

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
    const path = typeof body.path === 'string' ? body.path : '';
    const filename = typeof body.filename === 'string' ? body.filename : '';
    const fileSize = Math.max(0, Math.floor(Number(body.fileSize) || 0));

    // Only allow paths our signed-upload route generates — never a
    // caller-supplied arbitrary object path.
    if (!/^vault\/[A-Za-z0-9._-]+$/.test(path)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Confirm the object actually landed in the bucket before we write a row,
    // so a failed/abandoned upload can't leave a dangling vault entry.
    const lastSlash = path.lastIndexOf('/');
    const dir = path.slice(0, lastSlash);
    const objectName = path.slice(lastSlash + 1);
    const { data: listed } = await supabase.storage
      .from('vault-secure')
      .list(dir, { search: objectName, limit: 1 });
    const found = (listed || []).find(o => o.name === objectName);
    if (!found) {
      return NextResponse.json(
        { error: 'Upload not found in storage — the direct upload may have failed. Please retry.' },
        { status: 409 }
      );
    }

    const { data: result, error } = await supabase
      .from('vault_files')
      .insert({
        filename,
        file_size: fileSize,
        file_url: path,            // store the storage path; download routes parse `vault/...`
        encrypted_key: 'plain',    // sentinel: unencrypted direct upload
        file_hash: 'direct-upload',
        uploaded_by: adminUsername,
      })
      .select('id, filename, uploaded_at')
      .single();

    if (error) throw error;

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await supabase.from('vault_audit_log').insert({
      action: 'file_upload',
      admin_username: adminUsername,
      ip_address: ipAddress,
      details: `Direct upload: ${filename} (${fileSize} bytes, unencrypted)`,
      success: true,
    });

    console.log(`[Vault Finalize] SAVED ${filename} → row ${result?.id}`);
    return NextResponse.json({ success: true, file: result });
  } catch (error) {
    console.error('[Vault Finalize] Error:', error);
    const msg = error instanceof Error ? error.message : 'Finalize failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
