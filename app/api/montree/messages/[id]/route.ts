// /api/montree/messages/[id]/route.ts
// Mark message as read

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

interface Params {
  id: string;
}

// PATCH: Mark message as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

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

    // Mark as read
    const { data: updated, error: updateError } = await supabase
      .from('montree_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
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
