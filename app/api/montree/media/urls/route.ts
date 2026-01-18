// app/api/montree/media/urls/route.ts
// Get signed URLs for multiple media files (batch)
// Phase 2 - Session 53

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';

// URL expiration: 1 hour
const URL_EXPIRATION = 60 * 60;

// POST /api/montree/media/urls - Get signed URLs for multiple files
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { paths } = body;

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Paths array is required' },
        { status: 400 }
      );
    }

    // Limit to 50 URLs at a time
    if (paths.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 paths allowed per request' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Generate signed URLs for all paths
    const urls: Record<string, string> = {};
    const errors: Record<string, string> = {};

    await Promise.all(
      paths.map(async (path: string) => {
        try {
          const { data, error } = await supabase.storage
            .from('whale-media')
            .createSignedUrl(path, URL_EXPIRATION);

          if (error) {
            errors[path] = error.message;
          } else if (data) {
            urls[path] = data.signedUrl;
          }
        } catch (err) {
          errors[path] = 'Failed to generate URL';
        }
      })
    );

    return NextResponse.json({
      success: true,
      urls,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      expiresIn: URL_EXPIRATION,
    });

  } catch (error) {
    console.error('URLs API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
