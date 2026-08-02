import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

// GET - List invite codes for a child
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
    }

    // SECURITY: verifySchoolRequest only proves the caller holds a valid token
    // for SOME school. The child must belong to THIS caller's school, or any
    // authenticated teacher could read another school's invite codes — which
    // are live credentials into that child's parent portal.
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const childAccess = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!childAccess.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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

    return NextResponse.json({ invites: enrichedInvites }, {
      headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=300' }
    });
  } catch (error: unknown) {
    console.error('Get invites error:', error);
    return NextResponse.json({ error: 'Failed to load invites' }, { status: 500 });
  }
}

// POST - Generate new invite code (reusable by default, unlimited uses)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    // NOTE: created_by is taken from the verified token, never from the body —
    // a client-supplied teacherId would let a teacher misattribute invite
    // creation to someone else.
    const { childId, parentEmail } = body;

    if (!childId) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
    }

    // SECURITY: without this, an authenticated teacher could mint a working
    // parent-portal access code for any child in any school.
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const childAccess = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!childAccess.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Generate unique code using DB function
    const { data: codeResult, error: codeError } = await supabase
      .rpc('generate_parent_invite_code');

    if (codeError) throw codeError;

    const inviteCode = codeResult;

    // Create invite record - reusable by default with unlimited uses
    const { data: invite, error: insertError } = await supabase
      .from('montree_parent_invites')
      .insert({
        child_id: childId,
        invite_code: inviteCode,
        parent_email: parentEmail || null,
        created_by: auth.userId,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        is_reusable: true,
        max_uses: null // unlimited uses
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      invite,
      accessUrl: `/montree/parent?code=${inviteCode}`
    });
  } catch (error: unknown) {
    console.error('Create invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

// PUT - Reset code (revoke old, create new for same child)
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    // See POST: created_by comes from the verified token, not the body.
    const { childId } = body;

    if (!childId) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
    }

    // SECURITY: without this, an authenticated teacher could revoke another
    // school's family access and reissue the code to themselves.
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const childAccess = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!childAccess.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Deactivate all old codes for this child
    await supabase
      .from('montree_parent_invites')
      .update({ is_active: false })
      .eq('child_id', childId)
      .eq('is_active', true);

    // Generate new code
    const { data: codeResult, error: codeError } = await supabase
      .rpc('generate_parent_invite_code');

    if (codeError) throw codeError;

    const inviteCode = codeResult;

    // Create new invite record - reusable by default with unlimited uses
    const { data: invite, error: insertError } = await supabase
      .from('montree_parent_invites')
      .insert({
        child_id: childId,
        invite_code: inviteCode,
        created_by: auth.userId,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        is_reusable: true,
        max_uses: null // unlimited uses
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      invite,
      accessUrl: `/montree/parent?code=${inviteCode}`
    });
  } catch (error: unknown) {
    console.error('Reset code error:', error);
    return NextResponse.json({ error: 'Failed to reset code' }, { status: 500 });
  }
}

// DELETE - Revoke an invite code
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('inviteId');

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // SECURITY: resolve the invite to its child, then verify that child belongs
    // to the caller's school. Without this, ANY invite in the system could be
    // revoked by raw UUID, cutting a real family off from their child's portal.
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const { data: inviteRow } = await supabase
      .from('montree_parent_invites')
      .select('id, child_id')
      .eq('id', inviteId)
      .maybeSingle();

    if (!inviteRow) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const childAccess = await verifyChildBelongsToSchool(
      inviteRow.child_id as string,
      auth.schoolId,
    );
    if (!childAccess.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { error } = await supabase
      .from('montree_parent_invites')
      .update({ is_active: false })
      .eq('id', inviteId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Revoke invite error:', error);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
