// /api/montree/messages/route.ts
// Teacher-Parent messaging endpoints
// GET: List messages (filtered by role)
// POST: Send message

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

// GET: List messages for a classroom or parent
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    const childId = searchParams.get('child_id');
    const parentId = searchParams.get('parent_id');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    // Build query based on filters
    let query = supabase
      .from('montree_messages')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by child if provided
    if (childId) {
      query = query.eq('child_id', childId);
    }

    // Filter by unread if requested
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    // For parent requests, filter to only their children's messages
    if (parentId && !classroomId) {
      // Get parent's children first
      const { data: children } = await supabase
        .from('montree_parent_children')
        .select('child_id')
        .eq('parent_id', parentId);

      if (children && children.length > 0) {
        const childIds = children.map(c => c.child_id);
        query = query.in('child_id', childIds);
      } else {
        return NextResponse.json({ messages: [] });
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: data || [] });
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
    const supabase = getSupabase();
    const body = await request.json();
    const { childId, senderType, senderId, senderName, subject, messageText } = body;

    // Validate required fields
    if (!childId || !senderType || !senderId || !senderName || !messageText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['teacher', 'parent'].includes(senderType)) {
      return NextResponse.json(
        { error: 'Invalid sender type' },
        { status: 400 }
      );
    }

    // Verify child exists
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json(
        { error: 'Child not found' },
        { status: 404 }
      );
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from('montree_messages')
      .insert({
        child_id: childId,
        sender_type: senderType,
        sender_id: senderId,
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
