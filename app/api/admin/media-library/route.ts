// /api/admin/media-library/route.ts
// Admin API for managing media library files
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Fetch all documents with optional filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type'); // video, image, document
    const search = searchParams.get('search');
    const week = searchParams.get('week');

    let query = supabase
      .from('lesson_documents')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by file type category
    if (type === 'video') {
      query = query.ilike('file_type', 'video/%');
    } else if (type === 'image') {
      query = query.ilike('file_type', 'image/%');
    } else if (type === 'document') {
      query = query.not('file_type', 'ilike', 'video/%').not('file_type', 'ilike', 'image/%');
    }

    // Search by filename
    if (search) {
      query = query.ilike('original_filename', `%${search}%`);
    }

    // Filter by week
    if (week) {
      query = query.eq('week_number', parseInt(week));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, documents: data || [] });
  } catch (error) {
    console.error('Media library fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 });
  }
}

// POST - Upload new document
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const weekNumber = parseInt(formData.get('week_number') as string) || 1;
    const description = formData.get('description') as string || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'bin';
    const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeOriginalName}`;

    // Storage path organized by year/week
    const now = new Date();
    const year = now.getFullYear();
    const storagePath = `${year}/week-${weekNumber}/${filename}`;

    // Upload to Supabase storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('lesson-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({
        success: false,
        error: `Upload failed: ${uploadError.message}`
      }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('lesson-documents')
      .getPublicUrl(storagePath);

    // Create database record
    const { data: doc, error: dbError } = await supabase
      .from('lesson_documents')
      .insert({
        week_number: weekNumber,
        year: year,
        filename: filename,
        original_filename: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        storage_path: storagePath,
        public_url: publicUrl,
        description: description,
        uploaded_by: 'admin'
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      // Clean up uploaded file
      await supabase.storage.from('lesson-documents').remove([storagePath]);
      return NextResponse.json({
        success: false,
        error: `Database error: ${dbError.message}`
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 });
  }
}

// DELETE - Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'No id provided' }, { status: 400 });
    }

    // Get the document to find storage path
    const { data: doc, error: fetchError } = await supabase
      .from('lesson_documents')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('lesson-documents')
      .remove([doc.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue to delete DB record anyway
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('lesson_documents')
      .delete()
      .eq('id', id);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 });
  }
}

// PATCH - Update document metadata
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { id, week_number, original_filename, description } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'No id provided' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (week_number !== undefined) updates.week_number = week_number;
    if (original_filename !== undefined) updates.original_filename = original_filename;
    if (description !== undefined) updates.description = description;

    const { data, error } = await supabase
      .from('lesson_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, document: data });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 });
  }
}
