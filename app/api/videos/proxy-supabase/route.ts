import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

// Configure for larger files and longer duration
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large video streaming

// This endpoint proxies videos from Supabase Storage through our domain
// This helps with China firewall issues by serving videos from the same domain
// Public endpoint - accessible to everyone when proxy mode is enabled by admin
// Properly handles range requests for iOS Safari and other browsers
export async function GET(request: NextRequest) {
  // Note: Proxy endpoint is public - admin controls proxy mode via toggle
  // When proxy mode is enabled, this endpoint serves videos to bypass firewall
  
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');
    
    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL required' }, { status: 400 });
    }

    // Extract file path from Supabase Storage URL
    // URL format: https://xxxxx.supabase.co/storage/v1/object/public/videos/path/to/file
    let filePath: string;
    try {
      const urlObj = new URL(videoUrl);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/videos\/(.+)/);
      
      if (!pathMatch || !pathMatch[1]) {
        return NextResponse.json({ error: 'Invalid Supabase Storage URL' }, { status: 400 });
      }
      
      filePath = decodeURIComponent(pathMatch[1]);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid video URL format' }, { status: 400 });
    }

    // Get file info from Supabase Storage
    const supabase = createSupabaseAdmin();
    const { data: fileData, error: fileError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(filePath.split('/').slice(0, -1).join('/') || '', {
        limit: 1,
        search: filePath.split('/').pop() || '',
      });

    if (fileError) {
      console.error('Error getting file info:', fileError);
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const supabaseUrl = urlData.publicUrl;
    const contentType = 'video/mp4'; // Default, could be improved by checking file metadata
    
    // Get range header from request
    const range = request.headers.get('range');
    
    // Try to get file size by making a HEAD request
    let videoSize = 0;
    try {
      const headResponse = await fetch(supabaseUrl, { method: 'HEAD' });
      const contentLength = headResponse.headers.get('content-length');
      if (contentLength) {
        videoSize = parseInt(contentLength, 10);
      }
    } catch (error) {
      console.error('Error getting file size:', error);
    }
    
    if (range && videoSize > 0) {
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
        // Fetch only the requested range from Supabase Storage
        const rangeResponse = await fetch(supabaseUrl, {
          headers: { Range: `bytes=${start}-${end}` },
        });

        if (!rangeResponse.ok) {
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
    const initialChunkSize = videoSize > 0 ? Math.min(10 * 1024 * 1024, videoSize) : 10 * 1024 * 1024;
    const end = initialChunkSize - 1;

    // For very small videos (< 10MB), return the full video
    if (videoSize > 0 && videoSize <= 10 * 1024 * 1024) {
      try {
        const fullResponse = await fetch(supabaseUrl);
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
      const initialResponse = await fetch(supabaseUrl, {
        headers: { Range: `bytes=0-${end}` },
      });

      if (initialResponse.ok) {
        const chunkBuffer = await initialResponse.arrayBuffer();
        const contentRange = initialResponse.headers.get('content-range') || `bytes 0-${end}/${videoSize}`;

        return new NextResponse(chunkBuffer, {
          status: 206, // Partial Content
          headers: {
            'Content-Type': contentType,
            'Content-Length': initialChunkSize.toString(),
            'Content-Range': contentRange,
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
      const fullResponse = await fetch(supabaseUrl);
      if (!fullResponse.ok) {
        throw new Error(`Failed to fetch video: ${fullResponse.status}`);
      }
      const videoBuffer = await fullResponse.arrayBuffer();
      
      return new NextResponse(videoBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': videoSize > 0 ? videoSize.toString() : fullResponse.headers.get('content-length') || '0',
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
