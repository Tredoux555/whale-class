import { NextRequest, NextResponse } from 'next/server';
import { head } from '@vercel/blob';

// Configure for larger files and longer duration
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large video streaming

// This endpoint proxies videos from blob storage through our domain
// This helps with China firewall issues by serving videos from the same domain
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoPath = searchParams.get('path');
    
    if (!videoPath) {
      return NextResponse.json({ error: 'Video path required' }, { status: 400 });
    }

    // Get blob info
    const blobInfo = await head(videoPath);
    if (!blobInfo || !blobInfo.url) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Fetch the video from blob storage
    const videoResponse = await fetch(blobInfo.url);
    if (!videoResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
    }

    // Get the range header for partial content support (video seeking)
    const range = request.headers.get('range');
    
    if (range) {
      // Handle range requests for video seeking
      const videoSize = blobInfo.size || 0;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
      const chunkSize = end - start + 1;

      // Fetch only the requested range
      const rangeResponse = await fetch(blobInfo.url, {
        headers: { Range: `bytes=${start}-${end}` },
      });

      if (!rangeResponse.ok) {
        return NextResponse.json({ error: 'Range request failed' }, { status: 416 });
      }

      const chunkBuffer = await rangeResponse.arrayBuffer();

      return new NextResponse(chunkBuffer, {
        status: 206, // Partial Content
        headers: {
          'Content-Type': blobInfo.contentType || 'video/mp4',
          'Content-Length': chunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${videoSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // For full video requests, stream the entire video
    const videoBuffer = await videoResponse.arrayBuffer();
    
    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': blobInfo.contentType || 'video/mp4',
        'Content-Length': blobInfo.size?.toString() || '',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
