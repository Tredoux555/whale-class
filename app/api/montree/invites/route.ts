import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/montree/supabase';

// GET - List invite codes for a child
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');

  if (!childId) {
    return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const { data: invites, error } = await supabase
      .from('montree_parent_invites')
      .select(`
        id, invite_code, parent_email, 
        used_at, expires_at, is_active, created_at,
        used_by
      `)
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Add status to each invite
    const now = new Date();
    const enrichedInvites = (invites || []).map(inv => ({
      ...inv,
      status: inv.used_at ? 'used' : 
              !inv.is_active ? 'revoked' :
              new Date(inv.expires_at) < now ? 'expired' : 'active'
    }));

    return NextResponse.json({ invites: enrichedInvites });
  } catch (error: any) {
    console.error('Get invites error:', error);
    return NextResponse.json({ error: 'Failed to load invites' }, { status: 500 });
  }
}

// POST - Generate new invite code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { childId, teacherId, parentEmail } = body;

    if (!childId) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Generate unique code using DB function
    const { data: codeResult, error: codeError } = await supabase
      .rpc('generate_parent_invite_code');

    if (codeError) throw codeError;

    const inviteCode = codeResult;

    // Create invite record
    const { data: invite, error: insertError } = await supabase
      .from('montree_parent_invites')
      .insert({
        child_id: childId,
        invite_code: inviteCode,
        parent_email: parentEmail || null,
        created_by: teacherId || null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ 
      invite,
      signupUrl: `/montree/parent/signup?code=${inviteCode}`
    });
  } catch (error: any) {
    console.error('Create invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

// DELETE - Revoke an invite code
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const inviteId = searchParams.get('inviteId');

  if (!inviteId) {
    return NextResponse.json({ error: 'Invite ID required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('montree_parent_invites')
      .update({ is_active: false })
      .eq('id', inviteId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Revoke invite error:', error);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
