// /api/montree/messages/[id]/route.ts
// Mark message as read

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase env vars');
  }
  return createClient(supabaseUrl, supabaseKey);
}

interface Params {
  id: string;
}

// PATCH: Mark message as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = getSupabase();
    const { id } = params;

    // Get current message
    const { data: message, error: fetchError } = await supabase
      .from('montree_messages')
      .select('id, is_read')
      .eq('id', id)
      .single();

    if (fetchError || !message) {
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
    const supabase = getSupabase();
    const { id } = params;

    const { data: message, error } = await supabase
      .from('montree_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Fetch message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
