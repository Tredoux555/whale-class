import { NextRequest, NextResponse } from 'next/server';
import { getVideos, saveVideos, Video } from '@/lib/data';

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
