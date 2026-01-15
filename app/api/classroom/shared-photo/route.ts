import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST - Upload shared photo (distributes to all children via trigger)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const title = formData.get('title') as string || 'Group Photo';
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Determine media type
    const isVideo = file.type.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'photo';
    const bucket = isVideo ? 'work-videos' : 'work-photos';

    // Validate size
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: `File too large. Max ${isVideo ? '50MB' : '10MB'}` 
      }, { status: 400 });
    }

    // Generate filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const filename = `shared/${timestamp}.${ext}`;

    // Upload to storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
    const mediaUrl = urlData.publicUrl;

    // Insert into shared_photos - trigger will distribute to all children
    const { data: photo, error: dbError } = await supabase
      .from('shared_photos')
      .insert({
        media_url: mediaUrl,
        media_type: mediaType,
        title,
        description,
        taken_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      // Clean up uploaded file
      await supabase.storage.from(bucket).remove([filename]);
      return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
    }

    // Count how many children received the photo
    const { count } = await supabase
      .from('children')
      .select('id', { count: 'exact', head: true })
      .eq('active_status', true);

    return NextResponse.json({
      success: true,
      photo,
      distributedTo: count || 0
    });

  } catch (error) {
    console.error('Shared photo error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// GET - List all shared photos
export async function GET() {
  try {
    const supabase = getSupabase();
    
    const { data: photos, error } = await supabase
      .from('shared_photos')
      .select('*')
      .order('taken_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, photos });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
