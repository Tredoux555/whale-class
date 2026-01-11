import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET all lesson documents with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'video', 'image', 'document', or null for all
    const search = searchParams.get('search');
    
    let query = getSupabase()
      .from('lesson_documents')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by type
    if (type === 'video') {
      query = query.like('file_type', 'video/%');
    } else if (type === 'image') {
      query = query.like('file_type', 'image/%');
    } else if (type === 'document') {
      query = query.not('file_type', 'like', 'video/%').not('file_type', 'like', 'image/%');
    }

    // Search by filename
    if (search) {
      query = query.ilike('original_filename', `%${search}%`);
    }

    const { data, error } = await query.limit(200);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      documents: data || [],
      total: data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch documents',
      documents: []
    });
  }
}

// PATCH to update a document (change week, rename, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const { id, week_number, original_filename, description } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (week_number !== undefined) updates.week_number = week_number;
    if (original_filename !== undefined) updates.original_filename = original_filename;
    if (description !== undefined) updates.description = description;

    const { data, error } = await getSupabase()
      .from('lesson_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, document: data });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ success: false, error: 'Failed to update document' });
  }
}

// DELETE a document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID required' }, { status: 400 });
    }

    // First get the document to find the storage path
    const { data: doc, error: fetchError } = await getSupabase()
      .from('lesson_documents')
      .select('filename')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (doc?.filename) {
      await getSupabase().storage
        .from('lesson-documents')
        .remove([doc.filename]);
    }

    // Delete from database
    const { error: deleteError } = await getSupabase()
      .from('lesson_documents')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete document' });
  }
}
