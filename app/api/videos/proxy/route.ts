import { NextRequest, NextResponse } from 'next/server';
import { head } from '@vercel/blob';

// Configure for larger files and longer duration
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large video streaming

// This endpoint proxies videos from blob storage through our domain
// This helps with China firewall issues by serving videos from the same domain
// Properly handles range requests for iOS Safari and other browsers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoPath = searchParams.get('path');
    
    if (!videoPath) {
      return NextResponse.json({ error: 'Video path required' }, { status: 400 });
    }

    // Get blob info (size, content type, URL)
    let blobInfo;
    try {
      blobInfo = await head(videoPath);
    } catch (headError) {
      const errorMessage = headError instanceof Error ? headError.message : String(headError);
      console.error('Error getting blob info:', errorMessage);
      
      // Check if it's a "not found" error
      if (errorMessage.includes('not found') || errorMessage.includes('404') || errorMessage.includes('BLOB_NOT_FOUND')) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }
      
      return NextResponse.json({ error: 'Failed to access video' }, { status: 500 });
    }

    if (!blobInfo || !blobInfo.url) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const videoSize = blobInfo.size || 0;
    const contentType = blobInfo.contentType || 'video/mp4';
    const blobUrl = blobInfo.url;
    
    // Get range header from request
    const range = request.headers.get('range');
    
    if (range) {
      // Handle range requests for video seeking and playback
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
      
      // Validate range
      if (isNaN(start) || isNaN(end) || start < 0 || end >= videoSize || start > end) {
        return new NextResponse(null, {
          status: 416, // Range Not Satisfiable
          headers: {
            'Content-Range': `bytes */${videoSize}`,
            'Accept-Ranges': 'bytes',
          },
        });
      }
      
      const chunkSize = end - start + 1;

      try {
        // Fetch only the requested range from blob storage
        const rangeResponse = await fetch(blobUrl, {
          headers: { Range: `bytes=${start}-${end}` },
        });

        if (!rangeResponse.ok) {
          // If range request fails, try to return error
          if (rangeResponse.status === 416) {
            return new NextResponse(null, {
              status: 416,
              headers: {
                'Content-Range': `bytes */${videoSize}`,
                'Accept-Ranges': 'bytes',
              },
            });
          }
          throw new Error(`Range request failed: ${rangeResponse.status}`);
        }

        const chunkBuffer = await rangeResponse.arrayBuffer();

        return new NextResponse(chunkBuffer, {
          status: 206, // Partial Content
          headers: {
            'Content-Type': contentType,
            'Content-Length': chunkSize.toString(),
            'Content-Range': `bytes ${start}-${end}/${videoSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (rangeError) {
        console.error('Range request error:', rangeError);
        // Fall through to return full video or initial chunk
      }
    }

    // For initial requests without range header
    // Return a larger initial chunk (10MB) that should include video metadata
    // This allows iOS Safari to read video metadata without loading the entire file
    // But is large enough that most videos will have their moov atom in this range
    const initialChunkSize = Math.min(10 * 1024 * 1024, videoSize); // 10MB or full video if smaller
    const end = initialChunkSize - 1;

    // For very small videos (< 10MB), return the full video
    if (videoSize <= 10 * 1024 * 1024) {
      try {
        const fullResponse = await fetch(blobUrl);
        if (!fullResponse.ok) {
          throw new Error(`Failed to fetch video: ${fullResponse.status}`);
        }
        const videoBuffer = await fullResponse.arrayBuffer();
        
        return new NextResponse(videoBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': videoSize.toString(),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (fetchError) {
        console.error('Full video fetch error:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
      }
    }

    // For larger videos, return initial chunk with proper headers
    try {
      const initialResponse = await fetch(blobUrl, {
        headers: { Range: `bytes=0-${end}` },
      });

      if (initialResponse.ok) {
        const chunkBuffer = await initialResponse.arrayBuffer();

        return new NextResponse(chunkBuffer, {
          status: 206, // Partial Content
          headers: {
            'Content-Type': contentType,
            'Content-Length': initialChunkSize.toString(),
            'Content-Range': `bytes 0-${end}/${videoSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (rangeError) {
      console.error('Initial range request failed:', rangeError);
    }

    // Final fallback: try to return full video (may fail for very large videos)
    try {
      const fullResponse = await fetch(blobUrl);
      if (!fullResponse.ok) {
        throw new Error(`Failed to fetch video: ${fullResponse.status}`);
      }
      const videoBuffer = await fullResponse.arrayBuffer();
      
      return new NextResponse(videoBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': videoSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (fetchError) {
      console.error('Final fallback fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
    }
  } catch (error) {
    console.error('Video proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Proxy failed: ${errorMessage}` }, { status: 500 });
  }
}
