// app/api/montree/admin/parents/[parentId]/route.ts
//
// Ultimate Tracy Phase E — per-parent endpoint.
//   PATCH  — set recording_consent_on_file (the durable consent flag)
//   DELETE — hard-delete the parent + cascade (with audit log)
//
// SCHOOL-SCOPED. Principal-only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const maxDuration = 30;

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

interface ParentRow {
  id: string;
  school_id: string;
  name: string | null;
  email: string | null;
}

// ── PATCH — set consent / other settable parent fields ────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can update parent settings.' },
      { status: 403 }
    );
  }

  const { parentId } = await params;
  if (!parentId) {
    return NextResponse.json({ error: 'parentId is required' }, { status: 400 });
  }

  let body: { recording_consent_on_file?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Verify parent.
  const { data: parent } = await supabase
    .from('montree_parents')
    .select('id, school_id')
    .eq('id', parentId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  if (!parent) {
    return NextResponse.json({ error: 'parent not found in this school' }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.recording_consent_on_file === 'boolean') {
    patch.recording_consent_on_file = body.recording_consent_on_file;
    patch.recording_consent_set_at = new Date().toISOString();
    patch.recording_consent_set_by = auth.userId;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no editable fields in patch' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('montree_parents')
      .update(patch)
      .eq('id', parentId)
      .eq('school_id', auth.schoolId);
    if (error) {
      if (isMigrationMissing(error)) {
        return NextResponse.json({ migration_pending: true }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isMigrationMissing(err)) {
      return NextResponse.json({ migration_pending: true }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}

// ── DELETE — hard-delete parent + cascade with audit log ──────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can delete parents.' },
      { status: 403 }
    );
  }

  const { parentId } = await params;
  if (!parentId) {
    return NextResponse.json({ error: 'parentId is required' }, { status: 400 });
  }

  let body: { reason?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const reason = String(body.reason || '').trim().slice(0, 500);

  const supabase = getSupabase();

  // Verify parent + load identity for audit.
  const { data: parent } = await supabase
    .from('montree_parents')
    .select('id, school_id, name, email')
    .eq('id', parentId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  if (!parent) {
    return NextResponse.json({ error: 'parent not found in this school' }, { status: 404 });
  }
  const parentRow = parent as ParentRow;

  // Snapshot meeting count + profile existence for audit BEFORE deletion.
  let meetingCount = 0;
  let profileExisted = false;
  try {
    const { count } = await supabase
      .from('montree_parent_meetings')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', parentId)
      .eq('school_id', auth.schoolId);
    meetingCount = count ?? 0;
  } catch {
    /* migration pending — meeting_count stays 0 */
  }
  try {
    const { data: profileRow } = await supabase
      .from('montree_parent_profiles')
      .select('id')
      .eq('parent_id', parentId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
    profileExisted = !!profileRow;
  } catch {
    /* migration pending — profileExisted stays false */
  }

  // Write audit row BEFORE the destructive cascade — audit table is
  // intentionally FK-less so the parent_id reference survives.
  try {
    await supabase.from('montree_parent_deletion_audit').insert({
      parent_id: parentRow.id,
      parent_name: parentRow.name ?? null,
      parent_email: parentRow.email ?? null,
      school_id: parentRow.school_id,
      deleted_by: auth.userId,
      reason,
      meetings_count_at_deletion: meetingCount,
      profile_existed_at_deletion: profileExisted,
    });
  } catch (err) {
    // Non-fatal — log loudly + proceed. Without audit, a deletion is
    // still done, but the operator should notice the warning.
    console.warn(
      '[parents/delete] audit insert failed (proceeding with delete):',
      err instanceof Error ? err.message : 'unknown'
    );
  }

  // Hard delete the parent — cascades drop:
  //   montree_parent_profiles (ON DELETE CASCADE)
  //   montree_parent_children (junction)
  //   montree_parent_meetings (ON DELETE CASCADE)
  //     → montree_parent_meeting_transcripts (CASCADE)
  //     → montree_parent_meeting_analyses (CASCADE)
  const { error } = await supabase
    .from('montree_parents')
    .delete()
    .eq('id', parentId)
    .eq('school_id', auth.schoolId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deleted: true,
    meetings_count_at_deletion: meetingCount,
    profile_existed_at_deletion: profileExisted,
  });
}
