// /api/montree/phonics-videos/route.ts
//
// PUBLIC: which Dark Phonics lessons have a song video / picture / flashcard
// PDF uploaded. The Songs page uses this to reveal exactly the lessons whose
// media exists — the existence check runs server-side (Railway -> Supabase,
// reliable) instead of relying on the visitor's browser reaching Supabase
// (flaky from some regions, e.g. behind the Great Firewall). No auth: the
// bucket is public and this only returns lesson numbers.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type FileRow = { name: string };

function lessonNums(rows: FileRow[] | null, ext: string): number[] {
  const re = new RegExp(`lesson-(\\d+)\\.${ext}$`, 'i');
  return (rows || [])
    .map((f) => {
      const m = f.name.match(re);
      return m ? Number(m[1]) : null;
    })
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
}

export async function GET() {
  try {
    const bucket = getSupabase().storage.from('dark-phonics');
    const [vid, pic, fc] = await Promise.all([
      bucket.list('videos', { limit: 200 }),
      bucket.list('pictures', { limit: 200 }),
      bucket.list('flashcards', { limit: 200 }),
    ]);
    const uploaded = vid.error ? [] : lessonNums(vid.data as FileRow[], 'mp4');
    const pictures = pic.error ? [] : lessonNums(pic.data as FileRow[], 'png');
    const flashcards = fc.error ? [] : lessonNums(fc.data as FileRow[], 'pdf');
    const master = !fc.error && (fc.data || []).some((f) => /master/i.test(f.name));
    return NextResponse.json(
      { uploaded, pictures, flashcards, master },
      { headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  } catch {
    return NextResponse.json({ uploaded: [], pictures: [], flashcards: [], master: false });
  }
}
