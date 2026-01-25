import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const fileId = parseInt(id, 10);
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get file info first
    const { data: file, error: fetchError } = await supabase
      .from('story_shared_files')
      .select('id, storage_path, original_filename')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('story-files')
      .remove([file.storage_path]);

    if (storageError) {
      console.error('[Files Delete] Storage error:', storageError);
    }

    // Soft delete in database (set is_active to false)
    const { error: dbError } = await supabase
      .from('story_shared_files')
      .update({ is_active: false })
      .eq('id', fileId);

    if (dbError) {
      console.error('[Files Delete] DB error:', dbError);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: file.original_filename });
  } catch (error) {
    console.error('[Files Delete] Error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
