import { NextRequest, NextResponse } from 'next/server';
import { getVideos } from '@/lib/data';

// Get all videos from the JSON storage (same as homepage)
export async function GET(request: NextRequest) {
  try {
    const videos = await getVideos();

    // Map to expected format for flashcard maker
    const mappedVideos = videos.map(v => ({
      id: v.id,
      original_filename: v.title,
      public_url: v.videoUrl,
      week_number: v.week ? parseInt(v.week.replace(/\D/g, '') || '0') : 0,
      file_type: 'video/mp4',
      created_at: v.uploadedAt,
      category: v.category
    }));

    return NextResponse.json({ 
      success: true, 
      videos: mappedVideos
    });
  } catch (error) {
    console.error('[Videos API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch videos',
      videos: []
    });
  }
}
