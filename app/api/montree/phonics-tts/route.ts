// app/api/montree/phonics-tts/route.ts
//
// Laura speaks the phonics platform. ElevenLabs TTS (voice "Laura",
// FGY2WhTYpPnrIDTdsKH5 — the voice settled on in the 2026-08 voice audition;
// same model + voice settings as _voice-audition/gen_laura.py) behind a
// PERMANENT CACHE in the dark-phonics bucket (tts/laura/<hash>.mp3):
// each distinct utterance costs one ElevenLabs call EVER, then serves from
// storage. The phonics vocabulary is closed (~60 words, ~40 phoneme
// respellings, short sentences), so the cache converges to a finished audio
// bank on its own.
//
// GET /api/montree/phonics-tts?text=cat[&slow=1]  → audio/mpeg
//
// Deliberately UNAUTHENTICATED (the journey/shelf surfaces run with and
// without teacher sessions, and the parent classroom must hear Laura too) —
// abuse is bounded instead: strict charset, 300-char cap, IP rate limit on
// cache MISSES only (cache hits are just storage reads).

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';

export const maxDuration = 60;

const VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'; // Laura
const MODEL_ID = 'eleven_multilingual_v2';
/** "Recipe D" (picked by ear, Aug 29 2026, against the approved audition
 *  bank): style 0 + high stability kills the sassy/accent-drift rolls that
 *  multilingual_v2 produces on short words, and the previous_text anchor
 *  leans every clip warm. Changing any of this = new CACHE_DIR, old clips
 *  simply go cold in the bucket. */
const RECIPE = {
  previous_text: 'The kind teacher smiles and gently says the next little word to the children.',
  voice_settings: { stability: 0.7, similarity_boost: 0.85, style: 0.0, use_speaker_boost: true },
};
const CACHE_DIR = 'tts/laura-warm';
const BUCKET = 'dark-phonics';
const TEXT_MAX = 300;
// Letters, digits, spaces and the punctuation the works actually produce
// (sentences, "c, a, t. cat!", ellipses, apostrophes, slashes for phonemes).
const TEXT_RE = /^[a-zA-Z0-9 ,.!?'’…-]+$/;

const AUDIO_HEADERS = {
  'Content-Type': 'audio/mpeg',
  // Immutable: the hash IS the content address.
  'Cache-Control': 'public, max-age=31536000, immutable',
};

export async function GET(request: NextRequest) {
  try {
    // Collapse whitespace BEFORE validation/hashing so ' cat ' and 'cat' are
    // one cache entry — an attacker can't mint misses from spacing variants.
    const text = (request.nextUrl.searchParams.get('text') ?? '').replace(/\s+/g, ' ').trim();
    const slow = request.nextUrl.searchParams.get('slow') === '1';

    if (!text || text.length > TEXT_MAX || !TEXT_RE.test(text)) {
      return NextResponse.json({ error: 'bad_text' }, { status: 400 });
    }

    const supabase = getSupabase();
    const hash = createHash('sha1')
      .update(`${VOICE_ID}|${MODEL_ID}|${slow ? 'slow' : 'norm'}|${text.toLowerCase()}`)
      .digest('hex');
    const storagePath = `${CACHE_DIR}/${hash}.mp3`;

    // ---- cache hit: serve straight from the bucket ----------------------
    try {
      const { data: cached } = await supabase.storage.from(BUCKET).download(storagePath);
      if (cached && cached.size > 1000) {
        return new NextResponse(await cached.arrayBuffer(), { headers: AUDIO_HEADERS });
      }
    } catch {
      /* miss or storage hiccup — fall through to generation */
    }

    // ---- cache miss: rate-limit the expensive path only -----------------
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'tts_not_configured' }, { status: 503 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rate = await checkRateLimit(supabase, ip, '/api/montree/phonics-tts', 30, 1);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
    // XFF's first hop can be attacker-supplied, so the per-IP limit alone
    // can't cap spend on an unauthenticated billed route. This GLOBAL budget
    // can: at most 400 generations/hour across ALL callers, spoofing or not.
    // The closed vocabulary means legitimate traffic converges to cache hits,
    // which never touch this counter.
    const global = await checkRateLimit(supabase, 'GLOBAL', '/api/montree/phonics-tts:gen', 400, 60);
    if (!global.allowed) {
      return NextResponse.json({ error: 'generation_budget_exhausted' }, { status: 429 });
    }

    // Recipe D settings; `speed` is the one addition (the snail voice). If the
    // model rejects it, retry without.
    const settings: Record<string, unknown> = {
      ...RECIPE.voice_settings,
      ...(slow ? { speed: 0.7 } : {}),
    };

    let audio = await elevenlabs(apiKey, text, settings);
    // NOTE: the slow retry below is a second billed call — worst case 2x per
    // request, still bounded by the global budget above.
    if (!audio && slow) {
      // Older models without `speed`: stretch with ellipses instead.
      audio = await elevenlabs(apiKey, text.split('').join('… '), { ...RECIPE.voice_settings });
    }
    if (!audio) {
      return NextResponse.json({ error: 'tts_failed' }, { status: 502 });
    }

    // Cache is best-effort — a dev database without the bucket still speaks.
    void supabase.storage
      .from(BUCKET)
      .upload(storagePath, Buffer.from(audio), { contentType: 'audio/mpeg', upsert: true })
      .then(({ error }) => {
        if (error) console.warn('[phonics-tts] cache write failed:', error.message);
      });

    return new NextResponse(audio, { headers: AUDIO_HEADERS });
  } catch (err) {
    console.error('[phonics-tts] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

async function elevenlabs(
  apiKey: string,
  text: string,
  voiceSettings: Record<string, unknown>
): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        previous_text: RECIPE.previous_text,
        voice_settings: voiceSettings,
      }),
    });
    if (!res.ok) {
      console.warn('[phonics-tts] elevenlabs', res.status, await res.text().catch(() => ''));
      return null;
    }
    const buf = await res.arrayBuffer();
    return buf.byteLength > 1000 ? buf : null;
  } catch (err) {
    console.warn('[phonics-tts] elevenlabs fetch failed', err);
    return null;
  }
}
