import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy client creation to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Fetch lesson documents (optionally filtered by week)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    let query = getSupabase()
      .from('lesson_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (week) {
      query = query.eq('week_number', parseInt(week)).eq('year', parseInt(year));
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ documents: data || [] });
  } catch (error) {
    console.error('Error fetching lesson documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST - Upload a new lesson document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const weekNumber = formData.get('week_number') as string;
    const year = formData.get('year') as string || new Date().getFullYear().toString();
    const description = formData.get('description') as string || '';
    const uploadedBy = formData.get('uploaded_by') as string || 'admin';

    if (!file || !weekNumber) {
      return NextResponse.json(
        { error: 'File and week_number are required' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `week${weekNumber}_${timestamp}.${ext}`;
    const storagePath = `${year}/week${weekNumber}/${filename}`;

    // Upload to Supabase Storage
    const supabase = getSupabase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('lesson-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lesson-documents')
      .getPublicUrl(storagePath);

    // Save to database
    const { data, error: dbError } = await supabase
      .from('lesson_documents')
      .insert({
        week_number: parseInt(weekNumber),
        year: parseInt(year),
        filename,
        original_filename: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        description,
        uploaded_by: uploadedBy
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ document: data });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a lesson document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get document to find storage path
    const supabase = getSupabase();
    const { data: doc, error: fetchError } = await supabase
      .from('lesson_documents')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('lesson-documents')
      .remove([doc.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('lesson_documents')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
