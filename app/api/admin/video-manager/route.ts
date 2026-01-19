import { NextRequest, NextResponse } from 'next/server';
import { getVideos, saveVideos, addVideo, Video } from '@/lib/data';
import { createSupabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';

// GET all videos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase();
    
    let videos = await getVideos();

    if (search) {
      videos = videos.filter(v => v.title.toLowerCase().includes(search));
    }

    return NextResponse.json({ 
      success: true, 
      videos,
      total: videos.length
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch videos',
      videos: []
    });
  }
}

// PATCH to update a video
export async function PATCH(request: NextRequest) {
  try {
    const { id, title, week, category } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Video ID required' }, { status: 400 });
    }

    const videos = await getVideos();
    const videoIndex = videos.findIndex(v => v.id === id);
    
    if (videoIndex === -1) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // Update fields
    if (title !== undefined) videos[videoIndex].title = title;
    if (week !== undefined) videos[videoIndex].week = week;
    if (category !== undefined) videos[videoIndex].category = category;

    await saveVideos(videos);

    return NextResponse.json({ success: true, video: videos[videoIndex] });
  } catch (error) {
    console.error('Error updating video:', error);
    return NextResponse.json({ success: false, error: 'Failed to update video' });
  }
}

// POST to upload a new video
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string || 'song-of-week';
    const week = formData.get('week') as string || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    // Generate unique ID
    const id = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ext = file.name.split('.').pop() || 'mp4';
    const fileName = `${id}.${ext}`;

    // Upload to Supabase Storage
    const supabase = createSupabaseAdmin();
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type || 'video/mp4',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ success: false, error: 'Failed to upload video: ' + uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    // Create video metadata
    const video: Video = {
      id,
      title,
      category: category as Video['category'],
      videoUrl: urlData.publicUrl,
      uploadedAt: new Date().toISOString(),
      week: week || undefined
    };

    // Add to metadata
    await addVideo(video);

    return NextResponse.json({ success: true, video });
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload video' }, { status: 500 });
  }
}

// DELETE a video
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Video ID required' }, { status: 400 });
    }

    const videos = await getVideos();
    const filtered = videos.filter(v => v.id !== id);
    
    if (filtered.length === videos.length) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    await saveVideos(filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete video' });
  }
}
