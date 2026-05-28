// app/api/montree/admin/parent-meetings/[meetingId]/analyse/route.ts
//
// Ultimate Tracy Phase B — Sonnet analysis of a transcribed meeting.
//
// POST → decrypts the transcript, loads the parent profile (if any),
// calls Sonnet via PARENT_MEETING_ANALYSIS_TOOL, persists the result
// to montree_parent_meeting_analyses, links it back onto the meeting.
//
// SCHOOL-SCOPING
//   Every read + write filters by auth.schoolId. The transcript is
//   re-verified against the meeting row's school_id before decryption.
//
// COST
//   ~$0.05 per analysis (Sonnet 4.6). Returns cost_usd in the response.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { readEncryptedField } from '@/lib/montree/messaging-crypto';
import {
  buildAnalysisSystemPrompt,
  PARENT_MEETING_ANALYSIS_TOOL,
} from '@/lib/montree/parent-meeting/analysis-prompt';
import { loadParentProfile } from '@/lib/montree/parent-profile/loader';

export const maxDuration = 180;

const SONNET_INPUT_USD_PER_MTOK = 3;
const SONNET_OUTPUT_USD_PER_MTOK = 15;
const ANALYSIS_TIMEOUT_MS = 120_000;

interface MeetingRow {
  id: string;
  school_id: string;
  parent_id: string;
  child_id: string | null;
  transcript_id: string | null;
  analysis_id: string | null;
  meeting_type: string;
  locale: string;
}

interface TranscriptRow {
  id: string;
  school_id: string;
  meeting_id: string;
  transcript_text_encrypted: string;
  encryption_version: number | null;
}

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

function sanitizeStringArray(val: unknown, cap = 7): string[] {
  if (!Array.isArray(val)) return [];
  return (val as unknown[])
    .map((s) => String(s).trim().slice(0, 500))
    .filter((s) => s.length > 0)
    .slice(0, cap);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Only principals or teachers can analyse meetings.' },
      { status: 403 }
    );
  }

  if (!anthropic) {
    return NextResponse.json(
      { error: 'Anthropic client unavailable' },
      { status: 503 }
    );
  }

  const { meetingId } = await params;
  if (!meetingId) {
    return NextResponse.json({ error: 'meeting id missing' }, { status: 400 });
  }

  const supabase = getSupabase();

  // 1. Load meeting + verify school.
  let meeting: MeetingRow | null;
  try {
    const { data, error } = await supabase
      .from('montree_parent_meetings')
      .select('id, school_id, parent_id, child_id, transcript_id, analysis_id, meeting_type, locale')
      .eq('id', meetingId)
      .maybeSingle();
    if (error) {
      if (isMigrationMissing(error)) {
        return NextResponse.json({ migration_pending: true }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    meeting = (data as MeetingRow | null) ?? null;
  } catch (err) {
    if (isMigrationMissing(err)) {
      return NextResponse.json({ migration_pending: true }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }

  if (!meeting) {
    return NextResponse.json({ error: 'meeting not found' }, { status: 404 });
  }
  if (meeting.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'meeting not in this school' }, { status: 403 });
  }
  if (!meeting.transcript_id) {
    return NextResponse.json(
      { error: 'meeting has no transcript yet' },
      { status: 400 }
    );
  }
  if (meeting.analysis_id) {
    return NextResponse.json(
      { error: 'meeting has already been analysed', existing_analysis_id: meeting.analysis_id },
      { status: 409 }
    );
  }

  // 2. Load transcript + re-verify school.
  const { data: tRow, error: tErr } = await supabase
    .from('montree_parent_meeting_transcripts')
    .select('id, school_id, meeting_id, transcript_text_encrypted, encryption_version')
    .eq('id', meeting.transcript_id)
    .maybeSingle();
  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }
  if (!tRow) {
    return NextResponse.json({ error: 'transcript row missing' }, { status: 500 });
  }
  const transcriptRow = tRow as TranscriptRow;
  if (transcriptRow.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'transcript not in this school' }, { status: 403 });
  }

  const transcriptText = readEncryptedField(
    transcriptRow.transcript_text_encrypted,
    transcriptRow.encryption_version
  );
  if (!transcriptText || transcriptText.startsWith('[Encrypted')) {
    return NextResponse.json(
      { error: 'Could not decrypt transcript (key rotation issue?)' },
      { status: 500 }
    );
  }

  // 3. Load parent + existing profile.
  const { data: parent } = await supabase
    .from('montree_parents')
    .select('id, name, email')
    .eq('id', meeting.parent_id)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  if (!parent) {
    return NextResponse.json({ error: 'parent not found' }, { status: 404 });
  }
  const parentName = parent.name || 'this parent';

  let childName: string | null = null;
  if (meeting.child_id) {
    const { data: child } = await supabase
      .from('montree_children')
      .select('name')
      .eq('id', meeting.child_id)
      .maybeSingle();
    childName = child?.name ?? null;
  }

  const existingProfile = await loadParentProfile(
    supabase,
    meeting.parent_id,
    auth.schoolId
  );
  const existingProfileSummary = existingProfile
    ? `archetypes=${(existingProfile.archetypes ?? []).join(',') || 'none'}\nrelationship_temperature=${existingProfile.relationship_temperature}\nknown_triggers=${(existingProfile.known_triggers ?? []).join('; ') || 'none'}\neffective_moves=${(existingProfile.effective_moves ?? []).join('; ') || 'none'}\npriorities_for_child=${(existingProfile.priorities_for_child ?? []).join('; ') || 'none'}\nfamily_context=${existingProfile.family_context || 'none'}\nhistory_notes=${existingProfile.history_notes || 'none'}`
    : '';

  // 4. Sonnet call.
  const systemPrompt = buildAnalysisSystemPrompt({
    parentName,
    childName,
    meetingType: meeting.meeting_type,
    locale: meeting.locale || 'en',
    hasExistingProfile: !!existingProfile,
    existingProfileSummary,
  });

  const startMs = Date.now();
  let sonnetResp;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
    try {
      sonnetResp = await anthropic.messages.create(
        {
          model: AI_MODEL,
          max_tokens: 4000,
          system: systemPrompt,
          tools: [PARENT_MEETING_ANALYSIS_TOOL],
          tool_choice: { type: 'tool', name: 'analyse_parent_meeting' },
          messages: [
            {
              role: 'user',
              content: `Meeting transcript (${meeting.meeting_type}):\n\n${transcriptText}`,
            },
          ],
        },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Sonnet call failed',
      },
      { status: 502 }
    );
  }
  const generationMs = Date.now() - startMs;

  const toolUse = sonnetResp.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use' || toolUse.name !== 'analyse_parent_meeting') {
    return NextResponse.json(
      { error: 'Sonnet did not return analyse_parent_meeting tool call' },
      { status: 502 }
    );
  }

  const input = (toolUse.input ?? {}) as Record<string, unknown>;
  const summaryMarkdown = String(input.summary_markdown ?? '').trim().slice(0, 8000);
  if (!summaryMarkdown) {
    return NextResponse.json(
      { error: 'Sonnet returned empty summary' },
      { status: 502 }
    );
  }

  const parent_revealed = sanitizeStringArray(input.parent_revealed);
  const commitments_made = sanitizeStringArray(input.commitments_made);
  const emotional_arc = String(input.emotional_arc ?? '').trim().slice(0, 500);
  const triggers_observed = sanitizeStringArray(input.triggers_observed, 5);
  const moves_that_landed = sanitizeStringArray(input.moves_that_landed, 5);
  const unresolved_threads = sanitizeStringArray(input.unresolved_threads, 5);
  const recommended_follow_up = String(input.recommended_follow_up ?? '').trim().slice(0, 2000);
  const profile_update_proposals =
    typeof input.profile_update_proposals === 'object' &&
    input.profile_update_proposals !== null
      ? (input.profile_update_proposals as Record<string, unknown>)
      : {};
  const corpus_extractions = sanitizeStringArray(input.corpus_extractions, 5);

  // 5. Cost telemetry.
  const usage = sonnetResp.usage;
  const inputTokens = usage?.input_tokens ?? 0;
  const outputTokens = usage?.output_tokens ?? 0;
  const costUsd = Number(
    (
      (inputTokens / 1_000_000) * SONNET_INPUT_USD_PER_MTOK +
      (outputTokens / 1_000_000) * SONNET_OUTPUT_USD_PER_MTOK
    ).toFixed(4)
  );

  // 6. Persist analysis row.
  const { data: analysisRow, error: insErr } = await supabase
    .from('montree_parent_meeting_analyses')
    .insert({
      meeting_id: meetingId,
      school_id: auth.schoolId,
      summary_markdown: summaryMarkdown,
      parent_revealed,
      commitments_made,
      emotional_arc,
      triggers_observed,
      moves_that_landed,
      unresolved_threads,
      recommended_follow_up,
      profile_update_proposals,
      corpus_extractions,
      model_used: AI_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      generation_ms: generationMs,
    } as never)
    .select('*')
    .single();

  if (insErr) {
    if (isMigrationMissing(insErr)) {
      return NextResponse.json({ migration_pending: true }, { status: 503 });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // 7. Link analysis onto the meeting + bump parent profile stats.
  await supabase
    .from('montree_parent_meetings')
    .update({ analysis_id: analysisRow.id } as never)
    .eq('id', meetingId)
    .eq('school_id', auth.schoolId);

  // Bump meeting_count + last_meeting_date on the parent profile (best-effort).
  if (existingProfile) {
    await supabase
      .from('montree_parent_profiles')
      .update({
        meeting_count: (existingProfile.meeting_count ?? 0) + 1,
        last_meeting_date: new Date().toISOString(),
      } as never)
      .eq('parent_id', meeting.parent_id)
      .eq('school_id', auth.schoolId);
  }

  // Phase C — fire-and-forget corpus extraction. The analysis row now
  // exists; the extraction job reads corpus_extractions, refines via
  // Haiku, embeds via OpenAI, persists to montree_tracy_corpus.
  // Failures inside extract are caught + logged + the analysis row is
  // marked extracted to prevent retry loops.
  if (analysisRow.id && corpus_extractions.length > 0) {
    void (async () => {
      try {
        const { extractCorpusFromAnalysis } = await import(
          '@/lib/montree/tracy/corpus/extract'
        );
        const result = await extractCorpusFromAnalysis(
          analysisRow.id,
          supabase,
          anthropic
        );
        console.log(
          '[parent-meeting/analyse] corpus extraction:',
          result
        );
      } catch (err) {
        console.warn(
          '[parent-meeting/analyse] corpus extraction failed:',
          err instanceof Error ? err.message : 'unknown'
        );
      }
    })();
  }

  return NextResponse.json({ analysis: analysisRow });
}

// GET — return the analysis (with decrypted transcript link).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Only principals or teachers can read analyses.' },
      { status: 403 }
    );
  }

  const { meetingId } = await params;
  if (!meetingId) {
    return NextResponse.json({ error: 'meeting id missing' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: meeting } = await supabase
    .from('montree_parent_meetings')
    .select('id, school_id, analysis_id, transcript_id, parent_id, child_id, meeting_type, locale, held_at, outcome_notes')
    .eq('id', meetingId)
    .maybeSingle();
  if (!meeting) {
    return NextResponse.json({ error: 'meeting not found' }, { status: 404 });
  }
  if (meeting.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'meeting not in this school' }, { status: 403 });
  }
  if (!meeting.analysis_id) {
    return NextResponse.json({ analysis: null, meeting });
  }

  const { data: analysis } = await supabase
    .from('montree_parent_meeting_analyses')
    .select('*')
    .eq('id', meeting.analysis_id)
    .eq('school_id', auth.schoolId)
    .maybeSingle();

  return NextResponse.json(
    { analysis, meeting },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
