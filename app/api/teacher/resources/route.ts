import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Fetch all resources
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
      console.error('GET error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, resources: data || [] });
  } catch (error: any) {
    console.error('GET catch:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
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
    if (file && file.size > 0) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `resources/${timestamp}_${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Try work-photos bucket first, fall back to creating in public
      const { error: uploadError } = await supabase.storage
        .from('work-photos')
        .upload(filename, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json({ 
          success: false, 
          error: 'File upload failed: ' + uploadError.message 
        }, { status: 500 });
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
      console.error('DB insert error:', error);
      return NextResponse.json({ success: false, error: 'Database error: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, resource: data });
  } catch (error: any) {
    console.error('POST catch:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
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

    const { data: resource } = await supabase
      .from('teacher_resources')
      .select('file_url')
      .eq('id', id)
      .single();

    if (resource?.file_url) {
      const path = resource.file_url.split('/work-photos/')[1];
      if (path) {
        await supabase.storage.from('work-photos').remove([path]);
      }
    }

    const { error } = await supabase
      .from('teacher_resources')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE catch:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
