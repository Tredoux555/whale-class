import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = getSupabase();
  const { childId } = await params;

  const { data: media, error } = await supabase
    .from('child_work_media')
    .select('*')
    .eq('child_id', childId)
    .order('taken_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Fetch media error:', error);
    return NextResponse.json({ media: [] });
  }

  return NextResponse.json({
    media: media || [],
    counts: {
      total: media?.length || 0,
      photos: media?.filter(m => m.media_type === 'photo').length || 0,
      videos: media?.filter(m => m.media_type === 'video').length || 0
    }
  });
}
