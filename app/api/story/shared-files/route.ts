import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserTokenFromRequest } from '@/lib/story-db';

export async function GET(req: NextRequest) {
  try {
    // 🚨 Session 113 V2 F-1.2 — header first, story-auth cookie fallback.
    const username = await verifyUserTokenFromRequest(req);
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data: files, error } = await supabase
      .from('story_shared_files')
      .select('id, original_filename, file_size, mime_type, description, uploaded_by, created_at, public_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Shared Files] Error:', error);
      return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
    }

    return NextResponse.json({ files: files || [] });
  } catch (error) {
    console.error('[Shared Files] Error:', error);
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}
