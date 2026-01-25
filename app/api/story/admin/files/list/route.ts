import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';

export async function GET(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    
    const { data: files, error } = await supabase
      .from('story_shared_files')
      .select('id, original_filename, file_size, mime_type, description, uploaded_by, created_at, public_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Files List] Error:', error);
      return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
    }

    return NextResponse.json({ files: files || [] });
  } catch (error) {
    console.error('[Files List] Error:', error);
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}
