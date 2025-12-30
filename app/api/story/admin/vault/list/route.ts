import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';

export async function GET(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data: rows, error } = await supabase
      .from('vault_files')
      .select('id, filename, file_size, file_url, uploaded_by, uploaded_at')
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    const files = (rows || []).map(row => ({
      id: row.id,
      filename: row.filename,
      file_size: row.file_size,
      file_url: row.file_url,
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
