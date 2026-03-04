// lib/montree/voice/observation-analyzer.ts
// AI analysis pipeline — segments transcript, extracts observations via Claude Haiku tool_use

import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';
import { matchWork } from '@/lib/montree/fuzzy-matcher';
import { matchStudentName, loadAliases } from './student-matcher';
import { buildObservationExtractionPrompt, getExtractionToolDefinition } from './prompts';

interface ExtractionInput {
  child_name: string;
  work_name?: string;
  area?: string;
  observation_text: string;
  proposed_status?: 'presented' | 'practicing' | 'mastered';
  event_type: 'mastery' | 'presentation' | 'practice' | 'behavioral' | 'other';
  evidence?: string;
  behavioral_notes?: string;
  approximate_minute?: number;
}

interface ExtractionRecord {
  session_id: string;
  child_id: string | null;
  child_name_spoken: string;
  work_name: string | null;
  work_key: string | null;
  area: string | null;
  work_match_confidence: number;
  observation_text: string;
  proposed_status: string | null;
  status_confidence: number;
  event_type: string;
  behavioral_notes: string | null;
  transcript_excerpt: string | null;
  timestamp_seconds: number | null;
  review_status: string;
}

/**
 * Split transcript into segments of roughly maxWords each with overlap
 */
export function splitTranscriptForAnalysis(transcript: string, maxWords: number = 2000): string[] {
  const words = transcript.split(/\s+/);
  if (words.length <= maxWords) return [transcript];

  const overlap = 200; // 200-word overlap between segments
  const segments: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    segments.push(words.slice(start, end).join(' '));
    if (end >= words.length) break;
    start = end - overlap; // overlap for context continuity
  }

  return segments;
}

/**
 * Analyze a single transcript segment with Claude Haiku
 */
async function analyzeSegment(
  segment: string,
  segmentIndex: number,
  totalSegments: number,
  systemPrompt: string,
  minuteOffset: number
): Promise<ExtractionInput[]> {
  const userMessage = totalSegments > 1
    ? `Here is segment ${segmentIndex + 1} of ${totalSegments} of the classroom recording transcript. The approximate start time of this segment is minute ${minuteOffset}.\n\n---\n\n${segment}`
    : `Here is the full classroom recording transcript:\n\n---\n\n${segment}`;

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: [getExtractionToolDefinition()],
      messages: [{ role: 'user', content: userMessage }]
    });

    // Extract tool_use calls
    const extractions: ExtractionInput[] = [];
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'extract_observation') {
        const input = block.input as ExtractionInput;
        // Adjust approximate_minute by segment offset
        if (input.approximate_minute !== undefined) {
          input.approximate_minute += minuteOffset;
        }
        extractions.push(input);
      }
    }

    return extractions;
  } catch (error) {
    console.error(`[VoiceObs] Segment ${segmentIndex + 1} analysis failed:`, error);
    return [];
  }
}

/**
 * Consolidate extractions — deduplicate same child+work across segments
 */
function consolidateExtractions(extractions: ExtractionInput[]): ExtractionInput[] {
  const seen = new Map<string, ExtractionInput>();

  for (const ext of extractions) {
    const key = `${ext.child_name.toLowerCase()}::${(ext.work_name || '').toLowerCase()}::${ext.event_type}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, ext);
    } else {
      // Keep the one with more detail (longer observation text)
      if ((ext.observation_text?.length || 0) > (existing.observation_text?.length || 0)) {
        seen.set(key, ext);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Load custom works for a classroom (works with work_key starting with 'custom_')
 */
async function loadCustomWorks(classroomId: string): Promise<{ name: string; work_key: string; area_key: string }[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('montree_child_progress')
    .select('work_name, work_key, area')
    .eq('classroom_id', classroomId)
    .ilike('work_key', 'custom_%');

  if (!data) return [];

  // Deduplicate by work_key
  const unique = new Map<string, { name: string; work_key: string; area_key: string }>();
  for (const row of data) {
    if (row.work_key && !unique.has(row.work_key)) {
      unique.set(row.work_key, {
        name: row.work_name,
        work_key: row.work_key,
        area_key: row.area || 'practical_life'
      });
    }
  }

  return Array.from(unique.values());
}

/**
 * Main analysis orchestrator
 * Splits transcript into segments, analyzes each with Haiku, consolidates, matches names/works
 */
export async function analyzeTranscript(
  sessionId: string,
  classroomId: string,
  schoolId: string,
  transcript: string,
  language: string = 'en'
): Promise<{ extractions: ExtractionRecord[]; analysisCostCents: number }> {
  const supabase = getSupabase();

  // Load classroom data in parallel
  const [childrenRes, aliases, allCurriculum, customWorks] = await Promise.all([
    supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', classroomId),
    loadAliases(classroomId),
    Promise.resolve(loadAllCurriculumWorks()),
    loadCustomWorks(classroomId)
  ]);

  const children = childrenRes.data || [];
  const curriculum = allCurriculum.map(w => ({
    name: w.name,
    work_key: w.work_key,
    area_key: w.area_key,
    category: w.category
  }));

  // Build system prompt
  const systemPrompt = buildObservationExtractionPrompt(
    children,
    curriculum,
    customWorks,
    aliases,
    language
  );

  // Split transcript into segments
  const segments = splitTranscriptForAnalysis(transcript, 2000);
  const wordCount = transcript.split(/\s+/).length;
  const wordsPerMinute = 150; // average speech rate
  const totalMinutes = wordCount / wordsPerMinute;

  // Update session status
  await supabase
    .from('voice_observation_sessions')
    .update({ status: 'analyzing' })
    .eq('id', sessionId);

  // Analyze segments (parallel, max 3 concurrent)
  const allRawExtractions: ExtractionInput[] = [];
  const batchSize = 3;

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((segment, batchIdx) => {
        const segIdx = i + batchIdx;
        const minuteOffset = Math.round((segIdx * 2000 / wordCount) * totalMinutes);
        return analyzeSegment(segment, segIdx, segments.length, systemPrompt, minuteOffset);
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allRawExtractions.push(...result.value);
      }
    }
  }

  // Consolidate duplicates
  const consolidated = consolidateExtractions(allRawExtractions);

  // Match student names and work names
  const extractionRecords: ExtractionRecord[] = [];

  for (const ext of consolidated) {
    // Match student name
    const nameMatch = matchStudentName(ext.child_name, children, aliases);

    // Match work name (if provided)
    let workKey: string | null = null;
    let workMatchConfidence = 0;
    let matchedWorkName = ext.work_name || null;
    let matchedArea = ext.area || null;

    if (ext.work_name) {
      try {
        const workMatch = await matchWork(ext.work_name, ext.area || '', schoolId);
        if (workMatch.status === 'auto' || workMatch.status === 'suggest') {
          workKey = workMatch.match?.work_id || null;
          workMatchConfidence = (workMatch.confidence || 0) / 100; // normalize to 0-1
          matchedWorkName = workMatch.match?.work_name || ext.work_name;
          matchedArea = workMatch.match?.area || ext.area || null;
        }
      } catch {
        // Fuzzy match failed — keep raw name
        workMatchConfidence = 0;
      }
    }

    // Status confidence heuristic
    let statusConfidence = 0.5; // default moderate
    if (ext.event_type === 'mastery') statusConfidence = 0.7;
    if (ext.event_type === 'presentation') statusConfidence = 0.8;
    if (ext.evidence && ext.evidence.length > 50) statusConfidence += 0.1;
    statusConfidence = Math.min(statusConfidence, 1.0);

    extractionRecords.push({
      session_id: sessionId,
      child_id: nameMatch.childId,
      child_name_spoken: ext.child_name,
      work_name: matchedWorkName,
      work_key: workKey,
      area: matchedArea,
      work_match_confidence: workMatchConfidence,
      observation_text: ext.observation_text,
      proposed_status: ext.proposed_status || null,
      status_confidence: statusConfidence,
      event_type: ext.event_type,
      behavioral_notes: ext.behavioral_notes || null,
      transcript_excerpt: null, // Not storing excerpts (privacy)
      timestamp_seconds: ext.approximate_minute ? ext.approximate_minute * 60 : null,
      review_status: 'pending'
    });
  }

  // Insert extractions into DB
  if (extractionRecords.length > 0) {
    await supabase
      .from('voice_observation_extractions')
      .insert(extractionRecords);
  }

  // Estimate cost (rough: ~$0.25/1M input tokens for Haiku, ~$1.25/1M output)
  const inputTokenEstimate = systemPrompt.length / 4 * segments.length + wordCount / 0.75;
  const outputTokenEstimate = consolidated.length * 200; // ~200 tokens per extraction
  const analysisCostCents = Math.ceil(
    (inputTokenEstimate * 0.25 / 1_000_000 + outputTokenEstimate * 1.25 / 1_000_000) * 100
  );

  return { extractions: extractionRecords, analysisCostCents };
}
