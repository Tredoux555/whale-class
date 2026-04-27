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
      error: 'Failed to fetch videos'
    }, { status: 500 });
  }
}

// Allow up to 120s for large video uploads
export const maxDuration = 120;

// POST - Upload new video
// Supports two modes:
// 1. mode=signed-url: Returns a signed upload URL for direct browser→Supabase upload (preferred for large files)
// 2. Default: Proxies upload through server (legacy, may fail for large files on Railway)
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Mode 1: Generate signed upload URL (client uploads directly to Supabase)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { title, category, week, fileName: originalName, contentType: fileContentType, mediaType } = body;

      if (!title || !category || !originalName) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: title, category, fileName'
        }, { status: 400 });
      }

      const isAudio = mediaType === 'audio';
      const idPrefix = isAudio ? 'aud' : 'vid';
      const id = `${idPrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const extension = originalName.split('.').pop() || (isAudio ? 'mp3' : 'mp4');
      const storageFolder = isAudio ? 'audio' : 'videos';
      const storagePath = `${storageFolder}/${id}.${extension}`;

      const supabase = createSupabaseAdmin();
      const { data: signedData, error: signedError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUploadUrl(storagePath);

      if (signedError || !signedData) {
        console.error('Signed URL error:', signedError);
        return NextResponse.json({
          success: false,
          error: `Failed to create upload URL: ${signedError?.message || 'unknown'}`
        }, { status: 500 });
      }

      // Get the public URL for after upload completes
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      // Save metadata now (file will be available once client uploads)
      const video: Video = {
        id,
        title,
        category,
        videoUrl: urlData.publicUrl,
        uploadedAt: new Date().toISOString(),
        ...(week && { week }),
        ...(isAudio && { mediaType: 'audio' as const })
      };
      await addVideo(video);

      return NextResponse.json({
        success: true,
        signedUrl: signedData.signedUrl,
        token: signedData.token,
        path: signedData.path,
        video
      });
    }

    // Mode 2: Legacy FormData proxy upload (kept as fallback)
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
        error: `Failed to upload video: ${uploadError.message}`
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
      error: 'Failed to upload video'
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
      error: 'Failed to update video'
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

    // Try to delete the actual file from storage (best effort)
    try {
      const supabase = createSupabaseAdmin();
      const fileName = video.videoUrl.split('/').pop();
      if (fileName) {
        const folder = video.mediaType === 'audio' ? 'audio' : 'videos';
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([`${folder}/${fileName}`]);
      }
    } catch (storageError) {
      // Continue anyway - metadata is deleted
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE video error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete video'
    }, { status: 500 });
  }
}
