// /api/montree/messages/groups/[groupId]/route.ts
// Session 97 — edit/delete a custom group.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

interface PatchBody {
  name?: string;
  description?: string;
  add_members?: Array<{ role: 'teacher' | 'parent' | 'principal'; id: string }>;
  remove_members?: Array<{ role: 'teacher' | 'parent' | 'principal'; id: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role === 'agent') {
    return NextResponse.json({ error: 'Agents cannot use messaging' }, { status: 403 });
  }
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Only principals can edit groups' }, { status: 403 });
  }

  const { groupId } = await params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = getSupabase();
  // Verify group is in caller's school.
  const { data: group } = await supabase
    .from('montree_message_groups')
    .select('id, school_id')
    .eq('id', groupId)
    .maybeSingle();
  if (!group || group.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim() || null;
  if (Object.keys(updates).length) {
    await supabase.from('montree_message_groups').update(updates).eq('id', groupId);
  }

  if (Array.isArray(body.add_members) && body.add_members.length) {
    // M4-extension: validate every member to add belongs to auth.schoolId.
    const teacherIds = body.add_members.filter((m) => m.role === 'teacher').map((m) => m.id);
    const parentIds = body.add_members.filter((m) => m.role === 'parent').map((m) => m.id);
    const principalIds = body.add_members.filter((m) => m.role === 'principal').map((m) => m.id);

    const [teachersRes, parentsRes, principalsRes] = await Promise.all([
      teacherIds.length
        ? supabase.from('montree_teachers').select('id, school_id, is_active').in('id', teacherIds)
        : Promise.resolve({ data: [] }),
      parentIds.length
        ? supabase.from('montree_parents').select('id, school_id, is_active').in('id', parentIds)
        : Promise.resolve({ data: [] }),
      principalIds.length
        ? supabase.from('montree_school_admins').select('id, school_id, is_active').in('id', principalIds)
        : Promise.resolve({ data: [] }),
    ]);

    const validTeacherIds = new Set(
      ((teachersRes.data || []) as Array<{ id: string; school_id: string; is_active: boolean }>)
        .filter((t) => t.is_active && t.school_id === auth.schoolId)
        .map((t) => t.id)
    );
    const validParentIds = new Set(
      ((parentsRes.data || []) as Array<{ id: string; school_id: string; is_active: boolean }>)
        .filter((p) => p.is_active && p.school_id === auth.schoolId)
        .map((p) => p.id)
    );
    const validPrincipalIds = new Set(
      ((principalsRes.data || []) as Array<{ id: string; school_id: string; is_active: boolean }>)
        .filter((p) => p.is_active && p.school_id === auth.schoolId)
        .map((p) => p.id)
    );

    for (const m of body.add_members) {
      const ok =
        (m.role === 'teacher' && validTeacherIds.has(m.id)) ||
        (m.role === 'parent' && validParentIds.has(m.id)) ||
        (m.role === 'principal' && validPrincipalIds.has(m.id));
      if (!ok) {
        return NextResponse.json(
          { error: `Member ${m.role}:${m.id} is not in your school` },
          { status: 400 }
        );
      }
    }

    const rows = body.add_members.map((m) => ({
      group_id: groupId,
      member_role: m.role,
      member_id: m.id,
      added_by_id: auth.userId,
    }));
    await supabase
      .from('montree_message_group_members')
      .upsert(rows, { onConflict: 'group_id,member_role,member_id' });
  }

  if (Array.isArray(body.remove_members) && body.remove_members.length) {
    for (const m of body.remove_members) {
      await supabase
        .from('montree_message_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('member_role', m.role)
        .eq('member_id', m.id);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role === 'agent') {
    return NextResponse.json({ error: 'Agents cannot use messaging' }, { status: 403 });
  }
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Only principals can delete groups' }, { status: 403 });
  }
  const { groupId } = await params;
  const supabase = getSupabase();

  const { data: group } = await supabase
    .from('montree_message_groups')
    .select('id, school_id')
    .eq('id', groupId)
    .maybeSingle();
  if (!group || group.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Soft archive.
  await supabase
    .from('montree_message_groups')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', groupId);

  return NextResponse.json({ success: true });
}
