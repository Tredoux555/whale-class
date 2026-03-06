// app/api/montree/voice-notes/transcribe/route.ts
// Transcribe audio blob via OpenAI Whisper — returns text + detected language

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  // Auth
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Rate limit: 30 per minute per teacher
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const supabase = getSupabase();
  const { allowed } = await checkRateLimit(supabase, ip, '/api/montree/voice-notes/transcribe', 30, 1);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob | null;

    if (!audioFile || audioFile.size < 100) {
      return NextResponse.json({ error: 'Audio file required (min 100 bytes)' }, { status: 400 });
    }

    // Max 5MB for a quick voice note
    if (audioFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio too large (max 5MB)' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Transcription service unavailable' }, { status: 503 });
    }

    // Prepare form data for Whisper API
    const whisperForm = new FormData();
    const buffer = await audioFile.arrayBuffer();
    const blob = new Blob([buffer], { type: audioFile.type || 'audio/webm' });
    whisperForm.append('file', blob, 'recording.webm');
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('response_format', 'verbose_json');
    // Don't set language — let Whisper auto-detect (supports en + zh)

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperForm,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text().catch(() => 'Unknown error');
      console.error('[voice-notes] Whisper API error:', whisperResponse.status, errorText);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
    }

    const result = await whisperResponse.json();

    // Calculate duration from Whisper response
    const duration = result.duration ? Math.ceil(result.duration) : 0;

    return NextResponse.json({
      success: true,
      transcript: result.text?.trim() || '',
      language: result.language || 'en',
      duration_seconds: duration,
    });
  } catch (err) {
    console.error('[voice-notes] Transcribe error:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
