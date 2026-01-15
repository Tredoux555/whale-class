import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CATEGORIES = ['games', 'esl_games', 'activities', 'printables', 'videos', 'documents', 'other'];

// GET - Fetch all resources (optionally filter by category)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    let query = supabase
      .from('teacher_resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, resources: data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// POST - Upload new resource
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string || 'other';
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title required' }, { status: 400 });
    }

    let fileUrl = null;
    let fileType = null;
    let fileSize = null;

    // Upload file if provided
    if (file) {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'bin';
      const filename = `resources/${category}/${timestamp}_${file.name.replace(/\s+/g, '_')}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('work-photos')
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        return NextResponse.json({ success: false, error: 'Upload failed: ' + uploadError.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from('work-photos').getPublicUrl(filename);
      fileUrl = urlData.publicUrl;
      fileType = file.type;
      fileSize = file.size;
    }

    // Save to database
    const { data, error } = await supabase
      .from('teacher_resources')
      .insert({
        title,
        description: description || null,
        category,
        file_url: fileUrl,
        file_type: fileType,
        file_size_bytes: fileSize,
        uploaded_by: uploadedBy || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, resource: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Remove resource
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    }

    // Get resource to delete file from storage
    const { data: resource } = await supabase
      .from('teacher_resources')
      .select('file_url')
      .eq('id', id)
      .single();

    // Delete from storage if file exists
    if (resource?.file_url) {
      const path = resource.file_url.split('/work-photos/')[1];
      if (path) {
        await supabase.storage.from('work-photos').remove([path]);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('teacher_resources')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
