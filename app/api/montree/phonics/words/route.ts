// /api/montree/phonics/words/route.ts
// CRUD for teacher-managed phonics words (school-scoped)
// GET: fetch custom words for a phase (+ optional image overrides for default words)
// POST: add a new custom word
// PATCH: update a custom word
// DELETE: remove a custom word

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { checkRateLimit } from '@/lib/rate-limiter';

const VALID_PHASES = ['initial', 'phase2', 'blue1', 'blue2'];
const MAX_WORD_LENGTH = 50;
const MAX_GROUP_ID_LENGTH = 50;
const MAX_EMOJI_LENGTH = 10;
const MAX_MINIATURE_LENGTH = 200;
const MAX_URL_LENGTH = 2000;

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const phase = searchParams.get('phase');

    if (phase && !VALID_PHASES.includes(phase)) {
      return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch custom words
    let wordsQuery = supabase
      .from('montree_phonics_words')
      .select('*')
      .eq('school_id', auth.schoolId)
      .order('created_at', { ascending: true });

    if (phase) {
      wordsQuery = wordsQuery.eq('phase', phase);
    }

    const { data: words, error: wordsError } = await wordsQuery;
    if (wordsError) {
      console.error('Phonics words fetch error:', wordsError);
      return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
    }

    // Fetch image overrides for default words
    let imagesQuery = supabase
      .from('montree_phonics_images')
      .select('*')
      .eq('school_id', auth.schoolId);

    if (phase) {
      imagesQuery = imagesQuery.eq('phase', phase);
    }

    const { data: images, error: imagesError } = await imagesQuery;
    if (imagesError) {
      console.error('Phonics images fetch error:', imagesError);
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    return NextResponse.json({
      customWords: words || [],
      imageOverrides: images || [],
    });
  } catch (err) {
    console.error('Phonics words GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimited = await checkRateLimit(`phonics-word-${auth.userId}`, 30, 60);
    if (rateLimited) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const body = await request.json();
    const { phase, group_id, word, image_emoji, miniature, is_noun, custom_image_url } = body;

    // Validate required fields
    if (!phase || !VALID_PHASES.includes(phase)) {
      return NextResponse.json({ error: 'Invalid or missing phase' }, { status: 400 });
    }
    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }
    if (word.length > MAX_WORD_LENGTH) {
      return NextResponse.json({ error: 'Word too long' }, { status: 400 });
    }

    // Validate optional fields
    const safeGroupId = (group_id && typeof group_id === 'string')
      ? group_id.slice(0, MAX_GROUP_ID_LENGTH)
      : 'custom';
    const safeEmoji = (image_emoji && typeof image_emoji === 'string')
      ? image_emoji.slice(0, MAX_EMOJI_LENGTH)
      : '';
    const safeMiniature = (miniature && typeof miniature === 'string')
      ? miniature.slice(0, MAX_MINIATURE_LENGTH)
      : '';
    const safeImageUrl = (custom_image_url && typeof custom_image_url === 'string' && custom_image_url.length <= MAX_URL_LENGTH)
      ? custom_image_url
      : null;

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('montree_phonics_words')
      .insert({
        school_id: auth.schoolId,
        phase,
        group_id: safeGroupId,
        word: word.trim().toLowerCase(),
        image_emoji: safeEmoji,
        miniature: safeMiniature,
        is_noun: typeof is_noun === 'boolean' ? is_noun : true,
        custom_image_url: safeImageUrl,
        created_by: auth.userId,
      })
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Word already exists in this phase' }, { status: 409 });
      }
      console.error('Phonics word insert error:', error);
      return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
    }

    return NextResponse.json({ word: data }, { status: 201 });
  } catch (err) {
    console.error('Phonics words POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimited = await checkRateLimit(`phonics-word-${auth.userId}`, 30, 60);
    if (rateLimited) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const body = await request.json();
    const { id, word, image_emoji, miniature, is_noun, custom_image_url } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Word ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (word !== undefined) {
      if (typeof word !== 'string' || word.trim().length === 0 || word.length > MAX_WORD_LENGTH) {
        return NextResponse.json({ error: 'Invalid word' }, { status: 400 });
      }
      updates.word = word.trim().toLowerCase();
    }
    if (image_emoji !== undefined) {
      updates.image_emoji = typeof image_emoji === 'string' ? image_emoji.slice(0, MAX_EMOJI_LENGTH) : '';
    }
    if (miniature !== undefined) {
      updates.miniature = typeof miniature === 'string' ? miniature.slice(0, MAX_MINIATURE_LENGTH) : '';
    }
    if (is_noun !== undefined) {
      updates.is_noun = typeof is_noun === 'boolean' ? is_noun : true;
    }
    if (custom_image_url !== undefined) {
      updates.custom_image_url = (typeof custom_image_url === 'string' && custom_image_url.length <= MAX_URL_LENGTH)
        ? custom_image_url
        : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('montree_phonics_words')
      .update(updates)
      .eq('id', id)
      .eq('school_id', auth.schoolId)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Word already exists in this phase' }, { status: 409 });
      }
      console.error('Phonics word update error:', error);
      return NextResponse.json({ error: 'Failed to update word' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    return NextResponse.json({ word: data });
  } catch (err) {
    console.error('Phonics words PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimited = await checkRateLimit(`phonics-word-del-${auth.userId}`, 50, 60);
    if (rateLimited) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Word ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('montree_phonics_words')
      .delete()
      .eq('id', id)
      .eq('school_id', auth.schoolId);

    if (error) {
      console.error('Phonics word delete error:', error);
      return NextResponse.json({ error: 'Failed to delete word' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Phonics words DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
