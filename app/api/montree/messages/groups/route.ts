// /api/montree/messages/groups/route.ts
// Session 97 — list/create custom message groups (principal-defined).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role === 'agent') {
    return NextResponse.json({ error: 'Agents cannot use messaging' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data: groups } = await supabase
    .from('montree_message_groups')
    .select('id, name, description, created_at, created_by_role, created_by_id, archived_at')
    .eq('school_id', auth.schoolId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (!groups || !groups.length) return NextResponse.json({ groups: [] });

  const groupIds = groups.map((g) => g.id);
  const { data: members } = await supabase
    .from('montree_message_group_members')
    .select('group_id, member_role, member_id')
    .in('group_id', groupIds);

  // Hydrate names.
  const teacherIds = (members || []).filter((m) => m.member_role === 'teacher').map((m) => m.member_id);
  const parentIds = (members || []).filter((m) => m.member_role === 'parent').map((m) => m.member_id);
  const principalIds = (members || []).filter((m) => m.member_role === 'principal').map((m) => m.member_id);

  const [teachers, parents, principals] = await Promise.all([
    teacherIds.length
      ? supabase.from('montree_teachers').select('id, name').in('id', teacherIds)
      : Promise.resolve({ data: [] }),
    parentIds.length
      ? supabase.from('montree_parents').select('id, name, email').in('id', parentIds)
      : Promise.resolve({ data: [] }),
    principalIds.length
      ? supabase.from('montree_school_admins').select('id, name').in('id', principalIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map<string, string>();
  for (const t of (teachers.data || []) as Array<{ id: string; name: string }>) nameById.set(`teacher:${t.id}`, t.name);
  for (const p of (parents.data || []) as Array<{ id: string; name: string; email: string }>)
    nameById.set(`parent:${p.id}`, p.name || p.email);
  for (const p of (principals.data || []) as Array<{ id: string; name: string }>)
    nameById.set(`principal:${p.id}`, p.name);

  const membersByGroup = new Map<string, Array<{ role: string; id: string; name: string | null }>>();
  for (const m of members || []) {
    const arr = membersByGroup.get(m.group_id) || [];
    arr.push({
      role: m.member_role,
      id: m.member_id,
      name: nameById.get(`${m.member_role}:${m.member_id}`) || null,
    });
    membersByGroup.set(m.group_id, arr);
  }

  return NextResponse.json({
    groups: groups.map((g) => ({
      ...g,
      members: membersByGroup.get(g.id) || [],
      member_count: (membersByGroup.get(g.id) || []).length,
    })),
  });
}

interface PostBody {
  name: string;
  description?: string;
  members: Array<{ role: 'teacher' | 'parent' | 'principal'; id: string }>;
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role === 'agent') {
    return NextResponse.json({ error: 'Agents cannot use messaging' }, { status: 403 });
  }

  // Only principals can create custom groups.
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Only principals can create groups' }, { status: 403 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  if (!Array.isArray(body.members) || body.members.length === 0) {
    return NextResponse.json({ error: 'at least one member required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // M4: validate every member belongs to auth.schoolId BEFORE creating the group.
  // Batch by role for efficiency.
  const teacherIds = body.members.filter((m) => m.role === 'teacher').map((m) => m.id);
  const parentIds = body.members.filter((m) => m.role === 'parent').map((m) => m.id);
  const principalIds = body.members.filter((m) => m.role === 'principal').map((m) => m.id);

  const [teachersRes, parentsRes, principalsRes] = await Promise.all([
    teacherIds.length
      ? supabase
          .from('montree_teachers')
          .select('id, school_id, is_active')
          .in('id', teacherIds)
      : Promise.resolve({ data: [] }),
    parentIds.length
      ? supabase
          .from('montree_parents')
          .select('id, school_id, is_active')
          .in('id', parentIds)
      : Promise.resolve({ data: [] }),
    principalIds.length
      ? supabase
          .from('montree_school_admins')
          .select('id, school_id, is_active')
          .in('id', principalIds)
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

  // Reject if any member fails school validation.
  for (const m of body.members) {
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

  const { data: group, error: groupErr } = await supabase
    .from('montree_message_groups')
    .insert({
      school_id: auth.schoolId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      created_by_role: 'principal',
      created_by_id: auth.userId,
    })
    .select()
    .single();

  if (groupErr || !group) {
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }

  // Dedup + insert members.
  const seen = new Set<string>();
  const rows = body.members
    .filter((m) => {
      const key = `${m.role}:${m.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((m) => ({
      group_id: group.id,
      member_role: m.role,
      member_id: m.id,
      added_by_id: auth.userId,
    }));

  if (rows.length) {
    const { error: memErr } = await supabase
      .from('montree_message_group_members')
      .insert(rows);
    if (memErr) {
      console.error('[groups POST] member insert failed', memErr);
    }
  }

  return NextResponse.json({ group_id: group.id, member_count: rows.length }, { status: 201 });
}
