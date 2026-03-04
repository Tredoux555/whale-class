// lib/montree/voice/audio-processor.ts
// Audio chunking, Whisper transcription, transcript merging, and session processing orchestrator

import { getSupabase } from '@/lib/supabase-client';
import { analyzeTranscript } from './observation-analyzer';

const WHISPER_COST_PER_MINUTE = 0.006; // $0.006/min

/**
 * Transcribe a single audio chunk via OpenAI Whisper
 */
export async function transcribeChunk(
  chunkBuffer: ArrayBuffer,
  language: string = 'en',
  filename: string = 'chunk.webm'
): Promise<{ text: string; detectedLanguage?: string }> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

  const blob = new Blob([chunkBuffer], { type: 'audio/webm' });

  const formData = new FormData();
  // Use Blob with filename param (compatible with Node.js 18+, unlike File constructor)
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');

  // If language is 'auto', let Whisper detect. Otherwise specify.
  if (language !== 'auto') {
    formData.append('language', language);
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Whisper API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return {
    text: result.text?.trim() || '',
    detectedLanguage: result.language
  };
}

/**
 * Merge transcripts from multiple chunks with overlap deduplication
 * Uses longest common subsequence on the last/first N words of adjacent chunks
 */
export function mergeTranscripts(chunkTexts: string[]): string {
  if (chunkTexts.length === 0) return '';
  if (chunkTexts.length === 1) return chunkTexts[0];

  const overlapWords = 30;
  let merged = chunkTexts[0];

  for (let i = 1; i < chunkTexts.length; i++) {
    const prev = merged;
    const curr = chunkTexts[i];

    if (!curr) continue;

    const prevWords = prev.split(/\s+/);
    const currWords = curr.split(/\s+/);

    // Get last N words of previous and first N words of current
    const prevTail = prevWords.slice(-overlapWords);
    const currHead = currWords.slice(0, overlapWords);

    // Find the best overlap point using simple matching
    let bestOverlap = 0;
    for (let len = Math.min(prevTail.length, currHead.length); len >= 3; len--) {
      const tailSlice = prevTail.slice(-len).join(' ').toLowerCase();
      const headSlice = currHead.slice(0, len).join(' ').toLowerCase();
      if (tailSlice === headSlice) {
        bestOverlap = len;
        break;
      }
    }

    if (bestOverlap > 0) {
      // Skip the overlapping words from current chunk
      merged = prev + ' ' + currWords.slice(bestOverlap).join(' ');
    } else {
      // No overlap found — just concatenate
      merged = prev + ' ' + curr;
    }
  }

  return merged.trim();
}

/**
 * Calculate Whisper transcription cost
 */
export function calculateWhisperCost(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  return Math.ceil(minutes * WHISPER_COST_PER_MINUTE * 100); // cents
}

/**
 * Clean up expired/abandoned sessions (check-on-access pattern)
 * Called from /start and /status routes since Railway has no cron
 */
export async function cleanupExpiredSessions(schoolId: string): Promise<number> {
  const supabase = getSupabase();
  let cleaned = 0;

  // Sessions in 'ready_for_review' for >48 hours → expire
  const { data: expiredSessions } = await supabase
    .from('voice_observation_sessions')
    .select('id')
    .eq('school_id', schoolId)
    .eq('status', 'ready_for_review')
    .lt('updated_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

  if (expiredSessions?.length) {
    for (const session of expiredSessions) {
      await deleteSessionAudioAndTranscripts(session.id);
      await supabase
        .from('voice_observation_sessions')
        .update({ status: 'expired', transcript_deleted_at: new Date().toISOString() })
        .eq('id', session.id);
      cleaned++;
    }
  }

  // Sessions in 'recording' for >6 hours → abandon
  const { data: abandonedSessions } = await supabase
    .from('voice_observation_sessions')
    .select('id')
    .eq('school_id', schoolId)
    .in('status', ['recording', 'paused'])
    .lt('updated_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());

  if (abandonedSessions?.length) {
    for (const session of abandonedSessions) {
      await deleteSessionAudioAndTranscripts(session.id);
      await supabase
        .from('voice_observation_sessions')
        .update({ status: 'abandoned', transcript_deleted_at: new Date().toISOString() })
        .eq('id', session.id);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Delete all audio files and transcript data for a session
 */
export async function deleteSessionAudioAndTranscripts(sessionId: string): Promise<void> {
  const supabase = getSupabase();

  // Get all chunk storage paths
  const { data: chunks } = await supabase
    .from('voice_observation_audio_chunks')
    .select('storage_path')
    .eq('session_id', sessionId);

  // Delete audio files from Supabase Storage
  if (chunks?.length) {
    const paths = chunks.map(c => c.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from('voice-obs').remove(paths);
    }
  }

  // NULL out transcript fields
  await supabase
    .from('voice_observation_sessions')
    .update({ full_transcript: null })
    .eq('id', sessionId);

  // NULL out chunk transcription texts
  await supabase
    .from('voice_observation_audio_chunks')
    .update({ transcription_text: null })
    .eq('session_id', sessionId);

  // NULL out extraction transcript excerpts
  await supabase
    .from('voice_observation_extractions')
    .update({ transcript_excerpt: null })
    .eq('session_id', sessionId);

  // Delete chunk records entirely
  await supabase
    .from('voice_observation_audio_chunks')
    .delete()
    .eq('session_id', sessionId);
}

/**
 * Main session processing pipeline (called fire-and-forget from /end route)
 * Transcribes all chunks → merges → analyzes → creates extractions
 */
export async function processSession(
  sessionId: string,
  classroomId: string,
  schoolId: string
): Promise<void> {
  const supabase = getSupabase();

  try {
    // 1. Set status to transcribing
    await supabase
      .from('voice_observation_sessions')
      .update({ status: 'transcribing' })
      .eq('id', sessionId);

    // 2. Fetch session info
    const { data: session } = await supabase
      .from('voice_observation_sessions')
      .select('language, duration_seconds')
      .eq('id', sessionId)
      .single();

    const language = session?.language || 'auto';

    // 3. Fetch all chunks ordered by chunk_number
    const { data: chunks } = await supabase
      .from('voice_observation_audio_chunks')
      .select('id, chunk_number, storage_path, duration_seconds')
      .eq('session_id', sessionId)
      .order('chunk_number', { ascending: true });

    if (!chunks?.length) {
      throw new Error('No audio chunks found for session');
    }

    // 4. Transcribe chunks — first chunk alone (for language detection), then rest in parallel
    let detectedLanguage: string | undefined;
    const chunkTexts: string[] = new Array(chunks.length).fill('');

    // Transcribe first chunk to detect language
    const firstChunk = chunks[0];
    const { data: firstAudio, error: firstError } = await supabase.storage
      .from('voice-obs')
      .download(firstChunk.storage_path);

    if (firstError || !firstAudio) {
      throw new Error(`Failed to download first chunk: ${firstError?.message}`);
    }

    const firstBuffer = await firstAudio.arrayBuffer();
    const firstResult = await transcribeChunk(firstBuffer, language, `chunk-${firstChunk.chunk_number}.webm`);
    chunkTexts[0] = firstResult.text;
    detectedLanguage = firstResult.detectedLanguage;

    await supabase
      .from('voice_observation_audio_chunks')
      .update({ transcription_status: 'done', transcription_text: firstResult.text })
      .eq('id', firstChunk.id);

    // Transcribe remaining chunks in parallel using detected language
    const remainingChunks = chunks.slice(1);
    const transcriptionResults = await Promise.allSettled(
      remainingChunks.map(async (chunk, idx) => {
        const { data: audioData, error } = await supabase.storage
          .from('voice-obs')
          .download(chunk.storage_path);

        if (error || !audioData) {
          throw new Error(`Failed to download chunk ${chunk.chunk_number}: ${error?.message}`);
        }

        const buffer = await audioData.arrayBuffer();
        const chunkLang = detectedLanguage || language;
        const result = await transcribeChunk(buffer, chunkLang, `chunk-${chunk.chunk_number}.webm`);

        await supabase
          .from('voice_observation_audio_chunks')
          .update({ transcription_status: 'done', transcription_text: result.text })
          .eq('id', chunk.id);

        chunkTexts[idx + 1] = result.text;
        return result;
      })
    );

    // Check for failures (first chunk already succeeded, check remaining)
    const failures = transcriptionResults.filter(r => r.status === 'rejected');
    if (remainingChunks.length > 0 && failures.length === remainingChunks.length) {
      throw new Error('All remaining chunk transcriptions failed');
    }

    // 5. Merge transcripts
    const fullTranscript = mergeTranscripts(chunkTexts.filter(Boolean));
    const wordCount = fullTranscript.split(/\s+/).length;

    // Save detected language and full transcript
    const transcriptionCostCents = calculateWhisperCost(session?.duration_seconds || 0);

    await supabase
      .from('voice_observation_sessions')
      .update({
        full_transcript: fullTranscript,
        transcript_word_count: wordCount,
        transcription_cost_cents: transcriptionCostCents,
        language: detectedLanguage || language
      })
      .eq('id', sessionId);

    // 6. Analyze transcript with Claude Haiku
    const { extractions, analysisCostCents } = await analyzeTranscript(
      sessionId,
      classroomId,
      schoolId,
      fullTranscript,
      detectedLanguage || language
    );

    // 7. Update session with final counts and costs
    const totalCostCents = transcriptionCostCents + analysisCostCents;

    await supabase
      .from('voice_observation_sessions')
      .update({
        status: 'ready_for_review',
        extractions_count: extractions.length,
        analysis_cost_cents: analysisCostCents,
        total_cost_cents: totalCostCents
      })
      .eq('id', sessionId);

  } catch (error) {
    // Set session to failed with safe error message
    const message = error instanceof Error ? error.message : 'Processing failed';
    console.error(`[VoiceObs] Session ${sessionId} processing failed:`, error);

    await supabase
      .from('voice_observation_sessions')
      .update({ status: 'failed', error_message: message.slice(0, 500) })
      .eq('id', sessionId);
  }
}
