import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const activityId = formData.get('activityId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!activityId) {
      return NextResponse.json(
        { error: 'No activity ID provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'File must be a video' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File must be less than 100MB' },
        { status: 400 }
      );
    }

    // Create file path with timestamp to avoid conflicts
    const timestamp = Date.now();
    const fileName = `activity-videos/${activityId}/${timestamp}-${file.name}`;

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('activity-materials')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload video' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('activity-materials')
      .getPublicUrl(fileName);

    const videoUrl = urlData.publicUrl;

    // Optional: Update activity with video URL in database
    // This assumes you add a video_url field to activities table
    // Uncomment if you've added the field:
    /*
    const { error: dbError } = await supabase
      .from('activities')
      .update({ video_url: videoUrl })
      .eq('id', activityId);

    if (dbError) {
      console.error('Database update error:', dbError);
      // Don't fail the request - video is uploaded, just DB update failed
    }
    */

    return NextResponse.json(
      {
        success: true,
        url: videoUrl,
        fileName: data?.path,
        message: 'Video uploaded successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}


