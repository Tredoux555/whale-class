// lib/montree/parent-meeting/transcribe.ts
//
// Ultimate Astra Phase B — chunked-audio transcription helpers for the
// parent-meeting recording flow.
//
// Long meetings (>~20-25 minutes) blow past Whisper's per-request limits,
// so the client splits the recording into chunks (~20 min each) and
// uploads them sequentially. The server holds chunk transcripts in
// memory keyed by (meeting_id) until the client sends final=true, at
// which point we stitch + encrypt + persist.
//
// IN-MEMORY CACHE
//   Module-scoped Map. Single-instance Railway = fine. Multi-instance
//   would require Redis. The cache TTL is 30 min; expired entries get
//   pruned on every new chunk insert.
//
// SCHOOL-SCOPING
//   The cache key includes school_id so a meeting_id collision across
//   schools (statistically negligible — UUID v4) still can't bleed.

interface ChunkBuffer {
  schoolId: string;
  parts: string[];
  createdAt: number;
  updatedAt: number;
}

const CACHE: Map<string, ChunkBuffer> = new Map();
const CACHE_TTL_MS = 30 * 60_000;

function cacheKey(meetingId: string, schoolId: string): string {
  return `${schoolId}:${meetingId}`;
}

function pruneStale(): void {
  const now = Date.now();
  for (const [k, v] of CACHE.entries()) {
    if (now - v.updatedAt > CACHE_TTL_MS) CACHE.delete(k);
  }
}

export function recordChunk(
  meetingId: string,
  schoolId: string,
  chunkIndex: number,
  transcript: string
): { totalChunks: number } {
  pruneStale();
  const key = cacheKey(meetingId, schoolId);
  let buf = CACHE.get(key);
  if (!buf) {
    buf = {
      schoolId,
      parts: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    CACHE.set(key, buf);
  }
  // Preserve order even if chunks arrive out-of-sequence.
  buf.parts[chunkIndex] = transcript;
  buf.updatedAt = Date.now();
  return { totalChunks: buf.parts.filter((p) => typeof p === 'string').length };
}

export function finalizeAndDrain(
  meetingId: string,
  schoolId: string
): { transcript: string; chunkCount: number } | null {
  pruneStale();
  const key = cacheKey(meetingId, schoolId);
  const buf = CACHE.get(key);
  if (!buf) return null;
  const stitched = buf.parts
    .filter((p) => typeof p === 'string' && p.trim().length > 0)
    .join('\n\n');
  const chunkCount = buf.parts.filter((p) => typeof p === 'string').length;
  CACHE.delete(key);
  return { transcript: stitched, chunkCount };
}

/**
 * Whisper API call. Mirrors /api/montree/voice-notes/transcribe but is
 * called inline by the chunk route (instead of via internal HTTP) to
 * avoid an extra hop.
 *
 * Throws on Whisper failure — caller catches + returns appropriate
 * HTTP status. Audio bytes are NEVER persisted; the FormData blob is
 * GC'd after the response.
 */
export async function transcribeAudioBlob(
  audio: Blob,
  abortSignal?: AbortSignal
): Promise<{
  transcript: string;
  language: string | null;
  durationSeconds: number | null;
  costUsd: number;
}> {
  if (audio.size < 100) {
    throw new Error('audio too small');
  }
  if (audio.size > 25 * 1024 * 1024) {
    throw new Error('audio exceeds 25MB Whisper limit');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY env var missing');
  }

  const form = new FormData();
  form.append('file', audio, 'chunk.webm');
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: abortSignal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Whisper HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    text?: string;
    language?: string;
    duration?: number;
  };

  const transcript = (data.text ?? '').trim();
  const language = (data.language ?? null) as string | null;
  const durationSeconds =
    typeof data.duration === 'number' ? data.duration : null;

  // Whisper $0.006 / minute. Bill in seconds for accuracy.
  const costUsd = durationSeconds
    ? Number(((durationSeconds / 60) * 0.006).toFixed(4))
    : 0;

  return { transcript, language, durationSeconds, costUsd };
}
