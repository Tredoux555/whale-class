// app/api/montree/media/url/route.ts
// Get signed URL for media file
// Phase 2 - Session 53

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';

// URL expiration: 1 hour
const URL_EXPIRATION = 60 * 60;

// GET /api/montree/media/url?path=... - Get signed URL for single file
export async function GET(request: NextRequest) {
  try {
    // Verify teacher is logged in
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;
    
    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { success: false, error: 'Path is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Generate signed URL
    const { data, error } = await supabase.storage
      .from('whale-media')
      .createSignedUrl(path, URL_EXPIRATION);

    if (error) {
      console.error('Signed URL error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
      expiresIn: URL_EXPIRATION,
    });

  } catch (error) {
    console.error('URL API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
