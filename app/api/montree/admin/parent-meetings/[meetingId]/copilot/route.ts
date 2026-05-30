// app/api/montree/admin/parent-meetings/[meetingId]/copilot/route.ts
//
// Live meeting co-pilot — the REAL-TIME sibling of analyse/route.ts.
//
// POST → receives the rolling transcript window of an in-progress meeting
// (plain text, in the request body, NOT from the DB and NEVER persisted),
// loads the parent profile for personalisation, and asks Haiku for the
// next-best response the principal could say. Returns a structured
// suggestion for a side-panel. Fast + cheap (Haiku) so it keeps up with
// a live conversation.
//
// SAFETY / PRIVACY
//   - Nothing is written. The transcript window is used once and dropped.
//   - School-scoped: the meeting row is re-verified against auth.schoolId.
//   - Gated by the `live_copilot` feature flag → returns {enabled:false}
//     (HTTP 200) when off, so the UI degrades silently in production.
//   - Suggestion only: the principal always decides and speaks.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { isFeatureEnabled } from '@/lib/montree/features';
import { loadParentProfile } from '@/lib/montree/parent-profile/loader';
import {
  buildCopilotSystemPrompt,
  COPILOT_SUGGESTION_TOOL,
} from '@/lib/montree/parent-meeting/copilot-prompt';

export const maxDuration = 30;

const COPILOT_TIMEOUT_MS = 12_000;
const MAX_WINDOW_CHARS = 6000; // keep the live prompt small + fast

interface MeetingRow {
  id: string;
  school_id: string;
  parent_id: string;
  child_id: string | null;
  meeting_type: string;
  locale: string;
}

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

function sanitizeStringArray(val: unknown, cap = 4): string[] {
  if (!Array.isArray(val)) return [];
  return (val as unknown[])
    .map((s) => String(s).trim().slice(0, 280))
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
      { error: 'Only principals or teachers can use the meeting co-pilot.' },
      { status: 403 }
    );
  }

  const { meetingId } = await params;
  if (!meetingId) {
    return NextResponse.json({ error: 'meeting id missing' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Feature gate — OFF by default in production (DB-driven flag).
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'live_copilot');
  if (!enabled) {
    return NextResponse.json({ enabled: false });
  }

  if (!anthropic) {
    return NextResponse.json(
      { error: 'Anthropic client unavailable', enabled: true },
      { status: 503 }
    );
  }

  // Parse + bound the rolling transcript window (never persisted).
  let body: { transcript_window?: unknown };
  try {
    body = (await request.json()) as { transcript_window?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const transcriptWindow = String(body.transcript_window ?? '')
    .trim()
    .slice(-MAX_WINDOW_CHARS);
  if (!transcriptWindow) {
    return NextResponse.json(
      { error: 'transcript_window is required' },
      { status: 400 }
    );
  }

  // Load meeting + verify school.
  let meeting: MeetingRow | null;
  try {
    const { data, error } = await supabase
      .from('montree_parent_meetings')
      .select('id, school_id, parent_id, child_id, meeting_type, locale')
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
    return NextResponse.json(
      { error: 'meeting not in this school' },
      { status: 403 }
    );
  }

  // Load parent + child names + existing profile (best-effort personalisation).
  const { data: parent } = await supabase
    .from('montree_parents')
    .select('id, name')
    .eq('id', meeting.parent_id)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  const parentName = (parent as { name?: string } | null)?.name || 'this parent';

  let childName: string | null = null;
  if (meeting.child_id) {
    const { data: child } = await supabase
      .from('montree_children')
      .select('name')
      .eq('id', meeting.child_id)
      .maybeSingle();
    childName = (child as { name?: string } | null)?.name ?? null;
  }

  const existingProfile = await loadParentProfile(
    supabase,
    meeting.parent_id,
    auth.schoolId
  );
  const existingProfileSummary = existingProfile
    ? [
        `archetypes=${(existingProfile.archetypes ?? []).join(',') || 'none'}`,
        `relationship_temperature=${existingProfile.relationship_temperature}`,
        `known_triggers=${(existingProfile.known_triggers ?? []).join('; ') || 'none'}`,
        `effective_moves=${(existingProfile.effective_moves ?? []).join('; ') || 'none'}`,
        `priorities_for_child=${(existingProfile.priorities_for_child ?? []).join('; ') || 'none'}`,
      ].join('\n')
    : '';

  const systemPrompt = buildCopilotSystemPrompt({
    parentName,
    childName,
    meetingType: meeting.meeting_type,
    locale: meeting.locale || 'en',
    hasExistingProfile: !!existingProfile,
    existingProfileSummary,
  });

  // Haiku call — fast + cheap so it keeps pace with a live conversation.
  let resp;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), COPILOT_TIMEOUT_MS);
    try {
      resp = await anthropic.messages.create(
        {
          model: HAIKU_MODEL,
          max_tokens: 600,
          system: systemPrompt,
          tools: [COPILOT_SUGGESTION_TOOL],
          tool_choice: { type: 'tool', name: 'suggest_next_response' },
          messages: [
            {
              role: 'user',
              content: `Conversation so far (most recent last):\n\n${transcriptWindow}\n\nWhat should the principal say next?`,
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
        enabled: true,
        error: err instanceof Error ? err.message : 'co-pilot call failed',
      },
      { status: 502 }
    );
  }

  const toolUse = resp.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return NextResponse.json(
      { enabled: true, error: 'co-pilot returned no suggestion' },
      { status: 502 }
    );
  }

  const input = (toolUse.input ?? {}) as Record<string, unknown>;
  const nextResponse = String(input.next_response ?? '').trim().slice(0, 1000);
  const talkingPoints = sanitizeStringArray(input.talking_points);
  const watchOut = String(input.watch_out ?? '').trim().slice(0, 280);
  const toneRaw = String(input.tone ?? 'warm');
  const tone = ['warm', 'calm', 'reassure', 'firm', 'clarify'].includes(toneRaw)
    ? toneRaw
    : 'warm';

  if (!nextResponse) {
    return NextResponse.json(
      { enabled: true, error: 'co-pilot returned empty response' },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      enabled: true,
      suggestion: {
        next_response: nextResponse,
        talking_points: talkingPoints,
        watch_out: watchOut,
        tone,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
