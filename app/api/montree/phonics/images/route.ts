// /api/montree/phonics/images/route.ts
// Manage image overrides for default phonics words (from phonics-data.ts)
// Teachers can upload a photo to replace the emoji for any built-in word
// POST: set/update an image override
// DELETE: remove an image override (revert to emoji)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { checkRateLimit } from '@/lib/rate-limiter';

const VALID_PHASES = ['initial', 'phase2', 'blue1', 'blue2'];
const MAX_WORD_LENGTH = 50;
const MAX_URL_LENGTH = 2000;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimited = await checkRateLimit(`phonics-img-${auth.userId}`, 30, 60);
    if (rateLimited) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const body = await request.json();
    const { phase, word, image_url } = body;

    // Validate
    if (!phase || !VALID_PHASES.includes(phase)) {
      return NextResponse.json({ error: 'Invalid or missing phase' }, { status: 400 });
    }
    if (!word || typeof word !== 'string' || word.trim().length === 0 || word.length > MAX_WORD_LENGTH) {
      return NextResponse.json({ error: 'Invalid or missing word' }, { status: 400 });
    }
    if (!image_url || typeof image_url !== 'string' || image_url.length > MAX_URL_LENGTH) {
      return NextResponse.json({ error: 'Invalid or missing image_url' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Upsert — update if exists, insert if not
    const { data, error } = await supabase
      .from('montree_phonics_images')
      .upsert(
        {
          school_id: auth.schoolId,
          phase,
          word: word.trim().toLowerCase(),
          image_url,
          created_by: auth.userId,
        },
        { onConflict: 'school_id,phase,word' }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.error('Phonics image upsert error:', error);
      return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
    }

    return NextResponse.json({ image: data }, { status: 201 });
  } catch (err) {
    console.error('Phonics images POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimited = await checkRateLimit(`phonics-img-del-${auth.userId}`, 50, 60);
    if (rateLimited) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('montree_phonics_images')
      .delete()
      .eq('id', id)
      .eq('school_id', auth.schoolId);

    if (error) {
      console.error('Phonics image delete error:', error);
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Phonics images DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
