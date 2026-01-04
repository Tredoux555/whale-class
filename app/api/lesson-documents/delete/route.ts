import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

const BUCKET_NAME = 'lesson-documents';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Get document to find storage path
    const { data: doc, error: fetchError } = await supabase
      .from('lesson_documents')
      .select('storage_path')
      .eq('id', docId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([doc.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue anyway to delete metadata
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('lesson_documents')
      .delete()
      .eq('id', docId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted'
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
