// POST /api/lens/transcribe — a whispered voice note becomes text.
//
// Modelled on app/api/montree/guru/transcribe/route.ts: same OpenAI Whisper
// call, same bounded timeout with one retry, same "audio is never stored"
// promise. Differences, both deliberate:
//
//   • Auth is the Lens cookie, not verifySchoolRequest.
//   • `language` is NOT pinned to English. Montree's route sends language=en
//     because it transcribes a Montree teacher's notes; a Lens observer works
//     in Chinese schools and will whisper in whichever language is in her head
//     at that second. Letting Whisper detect costs nothing and stops a Chinese
//     note coming back as English-sounding nonsense.
//
// 🚨 THE AUDIO IS NEVER STORED. It is read from the request, sent to Whisper,
// and dropped. The moment row carries the TRANSCRIPT, which she can edit —
// keeping the recording of a real classroom would be a different privacy
// promise than the one this product makes.

import { NextRequest, NextResponse } from 'next/server';
import { checkLensRateLimit, clientKey } from '@/lib/lens/auth';
import { requireObserver } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';
// Railway's default is 15s; a Whisper call can exceed it. 90 matches the
// Montree route: two 35s attempts plus overhead fits comfortably inside.
export const maxDuration = 90;

const MAX_BYTES = 25 * 1024 * 1024; // Whisper's own limit

export async function POST(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;

  // Whisper bills per audio-minute. 60 notes per 15 minutes is far more than a
  // real visit needs and far less than a runaway client can spend.
  if (!checkLensRateLimit(clientKey(request, 'lens-transcribe'), 60)) {
    return NextResponse.json({ error: 'Slow down a moment.' }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Voice notes aren’t configured on this deployment.' },
      { status: 503 },
    );
  }

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const file = form.get('audio');
    audio = file instanceof File && file.size > 0 ? file : null;
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }
  if (!audio) return NextResponse.json({ error: 'No audio was attached.' }, { status: 400 });
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That recording is too long.' }, { status: 413 });
  }

  // FormData is rebuilt per attempt — a consumed multipart stream cannot be
  // re-sent, which is the bug the Montree route's comment warns about.
  const callWhisper = (): Promise<Response> => {
    const wf = new FormData();
    wf.append('file', audio as File, (audio as File).name || 'note.webm');
    wf.append('model', 'whisper-1');
    return fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: wf,
      signal: AbortSignal.timeout(35000),
    });
  };

  let response: Response | null = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await callWhisper();
      if ((r.status === 429 || r.status >= 500) && attempt === 1) {
        await new Promise((res) => setTimeout(res, 600));
        continue;
      }
      response = r;
      break;
    } catch (err) {
      lastError = err;
      if (attempt === 1) {
        await new Promise((res) => setTimeout(res, 600));
        continue;
      }
    }
  }

  if (!response) {
    console.error('[lens/transcribe] Whisper unreachable after retry:', lastError);
    return NextResponse.json(
      { error: 'Transcription timed out. Your note is still saved — try again.' },
      { status: 504 },
    );
  }
  if (!response.ok) {
    console.error('[lens/transcribe] Whisper error:', response.status);
    return NextResponse.json({ error: 'Transcription failed.' }, { status: 502 });
  }

  const result = (await response.json()) as { text?: string };
  const text = result.text?.trim();
  if (!text) {
    return NextResponse.json({ error: 'I couldn’t hear anything in that.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, text });
}
