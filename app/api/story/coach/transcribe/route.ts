// app/api/story/coach/transcribe/route.ts
//
// Voice → text for the Coach. Story-admin only. Records in the browser, posts
// the audio blob here, we run OpenAI Whisper and return the text — so Tredoux
// can just speak to the Coach ("I have a meeting Wednesday, I'm nervous…") and
// it lands in the composer. Mirrors app/api/montree/voice-notes/transcribe.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/story-db';

// Whisper on a 60-90s clip can exceed the 15s default — give it headroom.
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Transcription not configured', code: 'MISSING_API_KEY' }, { status: 503 });
  }

  let audio: Blob | null;
  try {
    const form = await req.formData();
    audio = form.get('audio') as Blob | null;
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }
  if (!audio || audio.size < 100) {
    return NextResponse.json({ error: 'Audio required (min 100 bytes)' }, { status: 400 });
  }
  if (audio.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio too large (max 5MB)' }, { status: 400 });
  }

  const whisperForm = new FormData();
  const buffer = await audio.arrayBuffer();
  whisperForm.append('file', new Blob([buffer], { type: audio.type || 'audio/webm' }), 'recording.webm');
  whisperForm.append('model', 'whisper-1');
  whisperForm.append('response_format', 'json');
  // No language hint — let Whisper auto-detect.

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: whisperForm,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[coach/transcribe] Whisper error:', res.status, errText.slice(0, 300));
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
    }
    const data = (await res.json()) as { text?: string };
    return NextResponse.json({ text: (data.text || '').trim() });
  } catch (e) {
    clearTimeout(timeoutId);
    const aborted = e instanceof Error && e.name === 'AbortError';
    console.error('[coach/transcribe] error:', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({ error: aborted ? 'Transcription timed out' : 'Transcription failed' }, { status: 502 });
  }
}
