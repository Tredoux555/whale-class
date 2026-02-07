// /api/montree/invites/send/route.ts
// Send parent invite email with invite code
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { sendParentInviteEmail } from '@/lib/montree/email';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { invite_id, recipient_email } = await request.json();

    if (!invite_id) {
      return NextResponse.json({ error: 'invite_id required' }, { status: 400 });
    }
    if (!recipient_email) {
      return NextResponse.json({ error: 'recipient_email required' }, { status: 400 });
    }

    // Get invite details with child and school info
    const { data: invite, error: inviteError } = await supabase
      .from('montree_parent_invites')
      .select(`
        id,
        invite_code,
        child:montree_children (
          id,
          name,
          classroom:montree_classrooms (
            school:montree_schools (
              id,
              name
            )
          )
        )
      `)
      .eq('id', invite_id)
      .eq('is_active', true)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const child = invite.child as Record<string, unknown>;
    const childName = child?.name || 'Your Child';
    const schoolName = child?.classroom?.school?.name || 'School';
    const inviteCode = invite.invite_code;
    
    const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://teacherpotato.xyz'}/montree/parent/signup`;

    // Send the email
    const result = await sendParentInviteEmail(
      recipient_email,
      childName,
      schoolName,
      inviteCode,
      signupUrl
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    // Update invite with recipient email
    await supabase
      .from('montree_parent_invites')
      .update({ parent_email: recipient_email })
      .eq('id', invite_id);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: recipient_email
    });

  } catch (error) {
    console.error('Send invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
