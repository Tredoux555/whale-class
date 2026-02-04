// /api/montree/media/url/route.ts
// Generate signed URL for media file with optional image transforms

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const size = searchParams.get('size'); // 'thumbnail' | 'medium' | 'full'

    if (!path) {
      return NextResponse.json({ error: 'path required' }, { status: 400 });
    }

    // Check if this is an image (for transforms)
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(path);

    // Define transform options based on size
    let transformOptions: { width?: number; height?: number; quality?: number } | undefined;

    if (isImage && size) {
      switch (size) {
        case 'thumbnail':
          transformOptions = { width: 400, height: 400, quality: 80 };
          break;
        case 'medium':
          transformOptions = { width: 800, height: 800, quality: 85 };
          break;
        case 'full':
        default:
          // No transform for full size
          break;
      }
    }

    // Generate signed URL (1 hour expiry) with optional transform
    const { data, error } = await supabase.storage
      .from('montree-media')
      .createSignedUrl(path, 3600, {
        transform: transformOptions
      });

    if (error) {
      console.error('Failed to create signed URL:', error);
      return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: data.signedUrl
    });

  } catch (error) {
    console.error('Media URL API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
