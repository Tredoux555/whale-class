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

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { success: false, error: 'File must be a video' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File must be less than 100MB' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${workId}-${Date.now()}.${fileExt}`;
    const filePath = `montessori-works/${fileName}`;

    // Convert File to Buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading video:', uploadError);
      
      // Provide more specific error messages
      let errorMessage = uploadError.message || 'Upload failed';
      let statusCode = 500;
      
      // Check error message for common issues
      const errorMsg = uploadError.message?.toLowerCase() || '';
      if (errorMsg.includes('403') || errorMsg.includes('forbidden') || errorMsg.includes('permission')) {
        errorMessage = 'Storage bucket permissions error. Please check Supabase Storage bucket settings and policies.';
        statusCode = 403;
      } else if (errorMsg.includes('bucket') || errorMsg.includes('not found')) {
        errorMessage = 'Storage bucket "videos" not found or not accessible. Please create the bucket in Supabase dashboard.';
        statusCode = 404;
      } else if (errorMsg.includes('413') || errorMsg.includes('too large')) {
        errorMessage = 'File is too large. Maximum size is 100MB.';
        statusCode = 413;
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: uploadError.message
        },
        { status: statusCode }
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

