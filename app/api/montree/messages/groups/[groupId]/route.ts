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
