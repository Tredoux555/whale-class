import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const workId = formData.get('workId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!workId) {
      return NextResponse.json(
        { success: false, error: 'Work ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${workId}-${Date.now()}.${fileExt}`;
    const filePath = `montessori-works/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading video:', uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    // Update work with video URL
    const { data: work, error: updateError } = await supabase
      .from('montessori_works')
      .update({ video_url: publicUrl })
      .eq('id', workId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating work with video URL:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        videoUrl: publicUrl,
        work
      },
      message: 'Video uploaded successfully'
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/whale/montessori-works/upload-video:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

