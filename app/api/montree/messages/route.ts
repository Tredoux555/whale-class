// /api/montree/messages/route.ts
// Teacher-Parent messaging endpoints (LEGACY flat-table system).
//
// CROSS-POLLINATION CONTRACT:
//   - GET filters by child_id IN (children of auth.schoolId). Never returns
//     messages for children outside the caller's school. classroom_id, if
//     provided, must also belong to auth.schoolId.
//   - POST derives sender identity from auth (role + userId). Never trusts
//     client-supplied senderType / senderId / senderName. Looks up the
//     display name server-side from the appropriate role table.
//   - Agents and super-admins are not messaging roles → 403.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

// GET: List messages for a classroom or parent
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role === 'agent') {
      return NextResponse.json({ error: 'Agents cannot use messaging' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    const childId = searchParams.get('child_id');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    // --- Resolve the set of child IDs the caller is allowed to see.
    // For teachers/principals: children whose classroom belongs to auth.schoolId.
    // For homeschool parents: children linked via montree_parent_children, then
    //   intersected with auth.schoolId for safety.
    let allowedChildIds: string[] = [];

    if (auth.role === 'homeschool_parent') {
      // Pull parent-linked children, then verify each child is in auth.schoolId.
      const { data: links } = await supabase
        .from('montree_parent_children')
        .select('child_id')
        .eq('parent_id', auth.userId);
      const candidate = (links || []).map((l) => l.child_id);
      if (!candidate.length) return NextResponse.json({ messages: [] });

      const { data: schoolChildren } = await supabase
        .from('montree_children')
        .select('id, montree_classrooms!inner(school_id)')
        .in('id', candidate)
        .eq('montree_classrooms.school_id', auth.schoolId);
      allowedChildIds = (schoolChildren || []).map((c: { id: string }) => c.id);
    } else {
      // Teacher / principal scope precedence:
      //   1. Explicit ?classroom_id= query param wins (verified against schoolId)
      //   2. Else, for teachers: scope to auth.classroomId (JWT) if set, otherwise
      //      look up the teacher's classroom_id from montree_teachers as a fallback
      //   3. Else (principals, or teachers with no classroom assignment): every
      //      child in auth.schoolId is in scope.
      if (classroomId) {
        const { data: classroom } = await supabase
          .from('montree_classrooms')
          .select('id, school_id')
          .eq('id', classroomId)
          .maybeSingle();
        if (!classroom || classroom.school_id !== auth.schoolId) {
          return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }
        const { data: children } = await supabase
          .from('montree_children')
          .select('id')
          .eq('classroom_id', classroomId);
        allowedChildIds = (children || []).map((c) => c.id);
      } else if (auth.role === 'teacher') {
        // NEW-4: scope teachers to their classroom rather than the whole school.
        let teacherClassroomId: string | null = auth.classroomId ?? null;
        if (!teacherClassroomId) {
          const { data: t } = await supabase
            .from('montree_teachers')
            .select('classroom_id, school_id')
            .eq('id', auth.userId)
            .maybeSingle();
          if (t && t.school_id === auth.schoolId && t.classroom_id) {
            teacherClassroomId = t.classroom_id;
          }
        }
        if (teacherClassroomId) {
          const { data: children } = await supabase
            .from('montree_children')
            .select('id')
            .eq('classroom_id', teacherClassroomId);
          allowedChildIds = (children || []).map((c) => c.id);
        } else {
          // Teacher with no classroom assignment — fall through to school-wide
          // (same legacy behaviour, prevents lockout).
          const { data: children } = await supabase
            .from('montree_children')
            .select('id, montree_classrooms!inner(school_id)')
            .eq('montree_classrooms.school_id', auth.schoolId);
          allowedChildIds = (children || []).map((c: { id: string }) => c.id);
        }
      } else {
        const { data: children } = await supabase
          .from('montree_children')
          .select('id, montree_classrooms!inner(school_id)')
          .eq('montree_classrooms.school_id', auth.schoolId);
        allowedChildIds = (children || []).map((c: { id: string }) => c.id);
      }
    }

    if (!allowedChildIds.length) {
      return NextResponse.json({ messages: [] });
    }

    // If a specific child was requested, intersect with the allowed set.
    let scopedChildIds = allowedChildIds;
    if (childId) {
      if (!allowedChildIds.includes(childId)) {
        return NextResponse.json({ error: 'Child not found' }, { status: 404 });
      }
      scopedChildIds = [childId];
    }

    // Build query.
    let query = supabase
      .from('montree_messages')
      .select('*')
      .in('child_id', scopedChildIds)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query.limit(200);

    if (error) {
      console.error('Failed to fetch messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: data || [] }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Send a new message
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role === 'agent') {
      return NextResponse.json({ error: 'Agents cannot use messaging' }, { status: 403 });
    }

    const supabase = getSupabase();
    const body = await request.json();
    const { childId, subject, messageText } = body;

    // Validate required fields. NOTE: senderType, senderId, senderName are
    // intentionally NOT read from the body — they are derived from auth below.
    if (!childId || !messageText) {
      return NextResponse.json(
        { error: 'childId and messageText are required' },
        { status: 400 }
      );
    }

    // Phase 9: Input length validation
    if (typeof messageText === 'string' && messageText.length > 5000) {
      return NextResponse.json(
        { error: 'Message text must be 5000 characters or fewer' },
        { status: 400 }
      );
    }
    if (subject && typeof subject === 'string' && subject.length > 500) {
      return NextResponse.json(
        { error: 'Subject must be 500 characters or fewer' },
        { status: 400 }
      );
    }

    // Map auth.role → senderType. The legacy montree_messages.sender_type
    // CHECK constraint accepts only 'teacher' or 'parent', so principals
    // cannot post via this legacy endpoint — they should use the threaded
    // /messages/threads system. homeschool_parent maps to 'parent'.
    let senderType: 'teacher' | 'parent';
    if (auth.role === 'teacher') {
      senderType = 'teacher';
    } else if (auth.role === 'homeschool_parent') {
      senderType = 'parent';
    } else {
      // 'principal' or anything else — not supported on this legacy route.
      return NextResponse.json(
        { error: 'Use /api/montree/messages/threads for principal messaging' },
        { status: 403 }
      );
    }

    // Verify child belongs to authenticated user's school
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: 'Child not found' },
        { status: 404 }
      );
    }

    // Resolve the sender's display name server-side. Never trust the body.
    let senderName = 'Unknown';
    if (senderType === 'teacher') {
      const { data: t } = await supabase
        .from('montree_teachers')
        .select('name, classroom_id, school_id, is_active')
        .eq('id', auth.userId)
        .maybeSingle();
      if (!t || !t.is_active || t.school_id !== auth.schoolId) {
        return NextResponse.json({ error: 'Sender not found' }, { status: 403 });
      }
      // Belt-and-braces: teacher must be assigned to the child's classroom.
      if (t.classroom_id && access.classroomId && t.classroom_id !== access.classroomId) {
        return NextResponse.json(
          { error: 'You are not assigned to this child’s classroom' },
          { status: 403 }
        );
      }
      senderName = t.name || 'Teacher';
    } else {
      // parent
      const { data: p } = await supabase
        .from('montree_parents')
        .select('id, name, email, school_id, is_active')
        .eq('id', auth.userId)
        .maybeSingle();
      if (!p || !p.is_active || p.school_id !== auth.schoolId) {
        return NextResponse.json({ error: 'Sender not found' }, { status: 403 });
      }
      // Belt-and-braces: parent must be linked to the child.
      const { data: link } = await supabase
        .from('montree_parent_children')
        .select('child_id')
        .eq('parent_id', auth.userId)
        .eq('child_id', childId)
        .maybeSingle();
      if (!link) {
        return NextResponse.json(
          { error: 'You are not linked to this child' },
          { status: 403 }
        );
      }
      senderName = p.name || p.email || 'Parent';
    }

    // Create the message with server-derived sender identity.
    const { data: message, error: messageError } = await supabase
      .from('montree_messages')
      .insert({
        child_id: childId,
        sender_type: senderType,
        sender_id: auth.userId,
        sender_name: senderName,
        subject: subject || null,
        message_text: messageText.trim(),
      })
      .select()
      .single();

    if (messageError) {
      console.error('Failed to create message:', messageError);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
