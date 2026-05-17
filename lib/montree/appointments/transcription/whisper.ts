// lib/montree/appointments/transcription/whisper.ts
//
// Take a recorded audio file from Supabase Storage and run Whisper on it.
// Returns the transcript + detected locale. NEVER persists audio bytes —
// they flow Storage → Whisper → response → discarded.
//
// COST: $0.006/min for Whisper. ~$0.18 for a 30-min meeting.
// LIMIT: Whisper max file size 25 MB (Agora audio recording at 32kbps for
//        a 60-min meeting ≈ 14 MB — well under).
//
// IDEMPOTENCY: caller can re-invoke safely. We return the same transcript
// every time for the same input (Whisper is deterministic at temperature=0).
//
// PRIVACY: OpenAI's default retention on Whisper is 30 days. Our audio
// only flows through during the API call itself; nothing persisted on our
// infra beyond what Supabase Storage already has from the Agora upload.

import OpenAI from 'openai';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (openai) return openai;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  openai = new OpenAI({ apiKey: key });
  return openai;
}

export interface TranscribeResult {
  ok: boolean;
  transcript?: string;
  locale?: string;
  error?: string;
}

interface TranscribeInput {
  /** The audio file as a Blob/File. Caller fetches from Supabase Storage. */
  audio: Blob;
  /** Original filename — helps Whisper guess format (.m4a, .mp3, .webm). */
  filename: string;
  /** Optional locale hint (ISO 639-1). Improves accuracy when known. */
  expectedLocale?: string;
}

/**
 * Run Whisper on the given audio. Caller is responsible for downloading
 * the audio bytes from Supabase Storage and discarding them after.
 */
export async function transcribeAudio(input: TranscribeInput): Promise<TranscribeResult> {
  const client = getOpenAI();
  if (!client) {
    return { ok: false, error: 'openai_not_configured' };
  }

  if (!input.audio || input.audio.size === 0) {
    return { ok: false, error: 'audio_empty' };
  }
  if (input.audio.size > MAX_AUDIO_BYTES) {
    return {
      ok: false,
      error: `audio_too_large: ${input.audio.size} > ${MAX_AUDIO_BYTES}`,
    };
  }

  // Whisper wants a File-like object with a name. Wrap the Blob.
  // Node 20+ has File globally; older runtimes may need a polyfill.
  const file = new File([input.audio], input.filename, {
    type: input.audio.type || 'audio/webm',
  });

  try {
    const result = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      // Asking for verbose_json so we get the detected language back.
      response_format: 'verbose_json',
      // language hint when caller knows it — Whisper still auto-detects
      // if this is omitted.
      ...(input.expectedLocale ? { language: input.expectedLocale } : {}),
      // Low temperature = consistent transcripts across re-runs.
      temperature: 0,
    });

    const transcript = (result as { text?: string }).text || '';
    const locale =
      (result as { language?: string }).language || input.expectedLocale || 'en';

    if (!transcript.trim()) {
      return { ok: false, error: 'transcript_empty' };
    }

    return { ok: true, transcript: transcript.trim(), locale };
  } catch (err) {
    const msg = (err as Error).message || 'unknown';
    return { ok: false, error: `whisper_failed: ${msg.slice(0, 300)}` };
  }
}
