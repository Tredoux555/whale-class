// app/api/montree/admin/parent-meetings/[meetingId]/proposals/route.ts
//
// Ultimate Astra Phase B — apply approved profile-update proposals from
// an analysis row to the live parent profile.
//
// POST body:
//   { approvals: { [field]: 'approved' | 'edited' | 'dismissed' },
//     edits?: { [field]: any } }
//
//   `approvals` says what action to take per field. `edits` carries
//   principal-edited values when action='edited'.
//
// The route:
//   1. Loads analysis + meeting + verifies school.
//   2. For each approval=approved → use the proposed value from analysis.
//   3. For each approval=edited → use the principal's edit value.
//   4. For each approval=dismissed → no write.
//   5. Stamps proposals_reviewed_at + proposals_review_outcome on analysis.
//   6. Upserts changes to montree_parent_profiles.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const maxDuration = 30;

const EDITABLE_PROFILE_FIELDS = new Set([
  'archetypes',
  'cultural_register',
  'preferred_language',
  'known_triggers',
  'effective_moves',
  'relationship_temperature',
  'family_context',
  'priorities_for_child',
  'history_notes',
]);

interface ProposalShape {
  current?: unknown;
  proposed?: unknown;
  reason?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can approve profile updates.' },
      { status: 403 }
    );
  }

  const { meetingId } = await params;
  if (!meetingId) {
    return NextResponse.json({ error: 'meeting id missing' }, { status: 400 });
  }

  let body: {
    approvals?: Record<string, 'approved' | 'edited' | 'dismissed'>;
    edits?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const approvals = body.approvals ?? {};
  const edits = body.edits ?? {};

  const supabase = getSupabase();

  const { data: meeting } = await supabase
    .from('montree_parent_meetings')
    .select('id, school_id, parent_id, analysis_id')
    .eq('id', meetingId)
    .maybeSingle();
  if (!meeting) {
    return NextResponse.json({ error: 'meeting not found' }, { status: 404 });
  }
  if (meeting.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'meeting not in this school' }, { status: 403 });
  }
  if (!meeting.analysis_id) {
    return NextResponse.json(
      { error: 'meeting has no analysis to act on' },
      { status: 400 }
    );
  }

  const { data: analysis } = await supabase
    .from('montree_parent_meeting_analyses')
    .select('id, profile_update_proposals, proposals_reviewed_at')
    .eq('id', meeting.analysis_id)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  if (!analysis) {
    return NextResponse.json({ error: 'analysis not found' }, { status: 404 });
  }

  const proposals =
    (analysis.profile_update_proposals as Record<string, ProposalShape>) ?? {};

  // Build profile update payload from approved/edited proposals.
  const profileUpdate: Record<string, unknown> = {};
  let approvedCount = 0;
  let editedCount = 0;
  let dismissedCount = 0;

  for (const [field, action] of Object.entries(approvals)) {
    if (!EDITABLE_PROFILE_FIELDS.has(field)) continue;
    if (action === 'dismissed') {
      dismissedCount += 1;
      continue;
    }
    if (action === 'approved') {
      const proposal = proposals[field];
      if (proposal && proposal.proposed !== undefined) {
        profileUpdate[field] = proposal.proposed;
        approvedCount += 1;
      }
      continue;
    }
    if (action === 'edited') {
      const editVal = edits[field];
      if (editVal !== undefined) {
        profileUpdate[field] = editVal;
        editedCount += 1;
      }
    }
  }

  // Determine review outcome.
  let outcome: 'approved_all' | 'approved_some' | 'dismissed_all' | 'edited' =
    'dismissed_all';
  if (editedCount > 0) {
    outcome = 'edited';
  } else if (approvedCount > 0 && dismissedCount === 0) {
    outcome = 'approved_all';
  } else if (approvedCount > 0) {
    outcome = 'approved_some';
  } else if (dismissedCount > 0) {
    outcome = 'dismissed_all';
  }

  // If anything to write, upsert the profile.
  if (Object.keys(profileUpdate).length > 0) {
    // Load existing profile to merge (don't overwrite fields not in patch).
    const { data: existing } = await supabase
      .from('montree_parent_profiles')
      .select('id')
      .eq('parent_id', meeting.parent_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('montree_parent_profiles')
        .update({
          ...profileUpdate,
          source: 'extracted_from_meeting',
          evaluated_by_role: 'principal',
          evaluated_by_id: auth.userId,
          last_evaluated_at: new Date().toISOString(),
        } as never)
        .eq('id', existing.id)
        .eq('school_id', auth.schoolId);
    } else {
      // Create new profile with the approved values.
      await supabase.from('montree_parent_profiles').insert({
        parent_id: meeting.parent_id,
        school_id: auth.schoolId,
        ...profileUpdate,
        source: 'extracted_from_meeting',
        evaluated_by_role: 'principal',
        evaluated_by_id: auth.userId,
        last_evaluated_at: new Date().toISOString(),
      } as never);
    }
  }

  // Stamp the analysis review.
  await supabase
    .from('montree_parent_meeting_analyses')
    .update({
      proposals_reviewed_at: new Date().toISOString(),
      proposals_review_outcome: outcome,
    } as never)
    .eq('id', analysis.id)
    .eq('school_id', auth.schoolId);

  return NextResponse.json({
    outcome,
    approved_count: approvedCount,
    edited_count: editedCount,
    dismissed_count: dismissedCount,
  });
}
