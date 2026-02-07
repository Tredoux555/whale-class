// /api/montree/media/url/route.ts
// Generate signed URL for media file

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'path required' }, { status: 400 });
    }

    // Generate signed URL (1 hour expiry) - no transforms (requires Pro plan)
    const { data, error } = await supabase.storage
      .from('montree-media')
      .createSignedUrl(path, 3600);

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
