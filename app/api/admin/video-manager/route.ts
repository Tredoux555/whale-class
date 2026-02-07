// /api/admin/video-manager/route.ts
// Video Manager API - CRUD operations for homepage videos
// Uses Supabase Storage for video files and metadata

import { NextRequest, NextResponse } from 'next/server';
import { getVideos, saveVideos, addVideo, deleteVideo, Video } from '@/lib/data';
import { createSupabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase-client';

// GET - Fetch all videos with optional search
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.toLowerCase() || '';
    
    let videos = await getVideos();
    
    // Filter by search term if provided
    if (search) {
      videos = videos.filter(v => 
        v.title.toLowerCase().includes(search) ||
        v.category.toLowerCase().includes(search) ||
        (v.week && v.week.toLowerCase().includes(search))
      );
    }
    
    return NextResponse.json({ success: true, videos });
  } catch (error) {
    console.error('GET videos error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch videos' 
    }, { status: 500 });
  }
}

// POST - Upload new video
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const category = formData.get('category') as Video['category'];
    const week = formData.get('week') as string | null;

    if (!file || !title || !category) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: file, title, category' 
      }, { status: 400 });
    }

    // Generate unique ID
    const id = `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const extension = file.name.split('.').pop() || 'mp4';
    const fileName = `${id}.${extension}`;

    // Upload to Supabase Storage
    const supabase = createSupabaseAdmin();
    const buffer = await file.arrayBuffer();
    
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(`videos/${fileName}`, buffer, {
        contentType: file.type,
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
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(`videos/${fileName}`);

    // Create video metadata
    const video: Video = {
      id,
      title,
      category,
      videoUrl: urlData.publicUrl,
      uploadedAt: new Date().toISOString(),
      ...(week && { week })
    };

    // Add to metadata
    await addVideo(video);

    return NextResponse.json({ success: true, video });
  } catch (error) {
    console.error('POST video error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload video' 
    }, { status: 500 });
  }
}


// PATCH - Update video metadata
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, week, category } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing video ID' 
      }, { status: 400 });
    }

    const videos = await getVideos();
    const videoIndex = videos.findIndex(v => v.id === id);

    if (videoIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Video not found' 
      }, { status: 404 });
    }

    // Update fields
    if (title !== undefined) videos[videoIndex].title = title;
    if (week !== undefined) videos[videoIndex].week = week || undefined;
    if (category !== undefined) videos[videoIndex].category = category;

    await saveVideos(videos);

    return NextResponse.json({ success: true, video: videos[videoIndex] });
  } catch (error) {
    console.error('PATCH video error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update video' 
    }, { status: 500 });
  }
}

// DELETE - Delete video
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing video ID' 
      }, { status: 400 });
    }

    // Get video to find the file URL
    const videos = await getVideos();
    const video = videos.find(v => v.id === id);

    if (!video) {
      return NextResponse.json({ 
        success: false, 
        error: 'Video not found' 
      }, { status: 404 });
    }

    // Delete from metadata
    const deleted = await deleteVideo(id);

    if (!deleted) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete video' 
      }, { status: 500 });
    }

    // Try to delete the actual video file from storage (best effort)
    try {
      const supabase = createSupabaseAdmin();
      const fileName = video.videoUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([`videos/${fileName}`]);
      }
    } catch (storageError) {
      console.warn('Could not delete video file from storage:', storageError);
      // Continue anyway - metadata is deleted
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE video error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete video' 
    }, { status: 500 });
  }
}
