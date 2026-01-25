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

    const { data: file } = await supabase
      .from('vault_files')
      .select('filename')
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

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await supabase.from('vault_audit_log').insert({
      action: 'file_delete',
      admin_username: adminUsername,
      ip_address: ipAddress,
      details: `File ID: ${fileId}`,
      success: true
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vault Delete] Error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
