// /api/montree/phonics-videos/route.ts
//
// PUBLIC: which Dark Phonics lessons have a song video uploaded.
// The Songs page uses this to reveal exactly the lessons that have a video —
// the existence check runs server-side (Railway -> Supabase, reliable) instead
// of relying on the visitor's browser reaching Supabase (which is flaky from
// some regions, e.g. behind the Great Firewall). No auth: the bucket is public
// and this only returns lesson numbers.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from('dark-phonics').list('videos', { limit: 200 });
    if (error) return NextResponse.json({ uploaded: [] });
    const uploaded = (data || [])
      .map((f) => {
        const m = f.name.match(/lesson-(\d+)\.mp4$/i);
        return m ? Number(m[1]) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
    return NextResponse.json(
      { uploaded },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch {
    return NextResponse.json({ uploaded: [] });
  }
}
