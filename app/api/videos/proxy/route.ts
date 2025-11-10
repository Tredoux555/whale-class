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

    const videoSize = blobInfo.size || 0;
    const range = request.headers.get('range');
    
    if (range) {
      // Handle range requests for video seeking
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

    // For initial requests without range header (iOS Safari initial request)
    // Return the first chunk (first 2MB) so iOS can read video metadata
    // This prevents loading entire large videos into memory and fixes playback issues
    const initialChunkSize = Math.min(2 * 1024 * 1024, videoSize); // 2MB or full video if smaller
    const end = initialChunkSize - 1;

    try {
      const initialResponse = await fetch(blobInfo.url, {
        headers: { Range: `bytes=0-${end}` },
      });

      if (initialResponse.ok) {
        const chunkBuffer = await initialResponse.arrayBuffer();

        return new NextResponse(chunkBuffer, {
          status: 206, // Partial Content
          headers: {
            'Content-Type': blobInfo.contentType || 'video/mp4',
            'Content-Length': initialChunkSize.toString(),
            'Content-Range': `bytes 0-${end}/${videoSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (rangeError) {
      console.error('Initial range request failed, falling back to full video:', rangeError);
    }

    // Fallback: If range request fails, fetch full video (for small videos or compatibility)
    const videoBuffer = await videoResponse.arrayBuffer();
    
    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': blobInfo.contentType || 'video/mp4',
        'Content-Length': videoSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
