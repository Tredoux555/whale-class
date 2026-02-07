// /api/montree/debug/parent-link/route.ts
// DEBUG: Check invite code and child linkage
// REMOVE IN PRODUCTION after debugging

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const cleanCode = code.toUpperCase().trim();
  const results: Record<string, any> = {
    input_code: code,
    clean_code: cleanCode,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
  };

  // Step 1: Look up invite
  const { data: invite, error: inviteError } = await supabase
    .from('montree_parent_invites')
    .select('*')
    .eq('invite_code', cleanCode)
    .single();

  results.invite_lookup = {
    found: !!invite,
    error: inviteError?.message,
    data: invite ? {
      id: invite.id,
      child_id: invite.child_id,
      is_active: invite.is_active,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
    } : null
  };

  if (invite) {
    // Step 2: Look up child by ID from invite
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, nickname, classroom_id')
      .eq('id', invite.child_id)
      .single();

    results.child_lookup = {
      searched_id: invite.child_id,
      found: !!child,
      error: childError?.message,
      data: child ? {
        id: child.id,
        name: child.name,
        nickname: child.nickname,
        classroom_id: child.classroom_id,
      } : null
    };

    // Step 3: Check if ANY children exist
    const { data: allChildren, error: countError } = await supabase
      .from('montree_children')
      .select('id, name')
      .limit(5);

    results.sample_children = {
      count: allChildren?.length || 0,
      error: countError?.message,
      samples: allChildren?.map(c => ({ id: c.id, name: c.name }))
    };

    // Step 4: Search for child by name pattern
    if (invite.child_id) {
      const { data: similar, error: similarError } = await supabase
        .from('montree_children')
        .select('id, name')
        .limit(10);

      results.all_children_in_db = {
        error: similarError?.message,
        children: similar?.map(c => ({ id: c.id, name: c.name }))
      };
    }
  }

  // Step 5: Check all invites
  const { data: allInvites } = await supabase
    .from('montree_parent_invites')
    .select('invite_code, child_id, is_active')
    .limit(10);

  results.recent_invites = allInvites?.map(i => ({
    code: i.invite_code,
    child_id: i.child_id?.slice(0, 8) + '...',
    is_active: i.is_active
  }));

  return NextResponse.json(results, { status: 200 });
}
