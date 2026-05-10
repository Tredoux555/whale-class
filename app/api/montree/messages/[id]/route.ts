// /api/montree/messages/[id]/route.ts
// Mark message as read / fetch a single message (LEGACY flat-table system).
//
// CROSS-POLLINATION + PARTICIPANT CONTRACT:
//   - Verify message's child belongs to auth.schoolId.
//   - Then verify the caller is actually a participant of this child's
//     conversation: teacher must be assigned to the child's classroom;
//     parent must have the child in their linked-children set; principal
//     sees everything in their school. Agents are blocked.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

interface Params {
  id: string;
}

/**
 * Verify the caller is a participant in this message's conversation.
 * Returns true if access allowed, false otherwise.
 *
 * Semantic: messages on `montree_messages` are 1:1 between a teacher
 * (assigned to the child's classroom) and a parent (linked to the child).
 * The principal sees everything in their school for transparency.
 */
async function verifyMessageParticipant(
  supabase: ReturnType<typeof getSupabase>,
  auth: { role: string; userId: string; schoolId: string },
  childId: string,
  classroomId: string | undefined
): Promise<boolean> {
  if (auth.role === 'principal') return true;

  if (auth.role === 'teacher') {
    if (!classroomId) return false;
    const { data: t } = await supabase
      .from('montree_teachers')
      .select('id, classroom_id, school_id, is_active')
      .eq('id', auth.userId)
      .maybeSingle();
    if (!t || !t.is_active) return false;
    if (t.school_id !== auth.schoolId) return false;
    if (t.classroom_id && t.classroom_id !== classroomId) return false;
    return true;
  }

  if (auth.role === 'homeschool_parent') {
    const { data: link } = await supabase
      .from('montree_parent_children')
      .select('child_id')
      .eq('parent_id', auth.userId)
      .eq('child_id', childId)
      .maybeSingle();
    return !!link;
  }

  // agent / unknown — denied
  return false;
}

// PATCH: Mark message as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role === 'agent') {
      return NextResponse.json({ error: 'Agents cannot use messaging' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { id } = params;

    // Get current message
    const { data: message, error: fetchError } = await supabase
      .from('montree_messages')
      .select('id, is_read, child_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify message's child belongs to authenticated user's school
    const access = await verifyChildBelongsToSchool(message.child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify caller is a participant of this conversation.
    const allowed = await verifyMessageParticipant(supabase, auth, message.child_id, access.classroomId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Mark as read
    const { data: updated, error: updateError } = await supabase
      .from('montree_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateError || !updated) {
      console.error('Failed to mark message as read:', updateError);
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Fetch a specific message
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role === 'agent') {
      return NextResponse.json({ error: 'Agents cannot use messaging' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { id } = params;

    const { data: message, error } = await supabase
      .from('montree_messages')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify message's child belongs to authenticated user's school
    const access = await verifyChildBelongsToSchool(message.child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify caller is a participant of this conversation.
    const allowed = await verifyMessageParticipant(supabase, auth, message.child_id, access.classroomId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Fetch message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
