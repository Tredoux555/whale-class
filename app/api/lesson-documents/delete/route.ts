import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' });
    }

    const supabase = getSupabase();

    // Get document to find storage path
    const { data: doc, error: fetchError } = await supabase
      .from('lesson_documents')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ success: false, error: 'Document not found' });
    }

    // Delete from storage
    await supabase.storage
      .from('lesson-documents')
      .remove([doc.storage_path]);

    // Delete from database
    const { error: dbError } = await supabase
      .from('lesson_documents')
      .delete()
      .eq('id', id);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ success: false, error: 'Delete failed' });
  }
}
