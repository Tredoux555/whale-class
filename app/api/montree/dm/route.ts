// /api/montree/dm/route.ts
// Direct messages between super admin and users (leads/teachers/principals)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// Helper function to verify super-admin access
function verifySuperAdminPassword(req: NextRequest): boolean {
  const passwordHeader = req.headers.get('x-super-admin-password');
  const expectedPassword = process.env.SUPER_ADMIN_PASSWORD || '870602';
  return passwordHeader === expectedPassword;
}

// GET - Fetch messages for a conversation, or global unread summary for admin
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversation_id');
    const readerType = searchParams.get('reader_type');

    // ── Global unread summary for admin (no conversation_id) ──
    if (!conversationId && readerType === 'admin') {
      if (!verifySuperAdminPassword(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Single query: fetch all unread user messages, aggregate in memory
      // This avoids race conditions between separate count + detail queries
      const { data: unreadMessages, error: unreadErr } = await supabase
        .from('montree_dm')
        .select('conversation_id, sender_name')
        .eq('sender_type', 'user')
        .eq('is_read', false)
        .limit(500); // Cap to prevent memory issues at scale

      if (unreadErr) {
        console.error('DM unread summary error:', unreadErr);
        return NextResponse.json({ error: 'Failed to fetch unread summary' }, { status: 500 });
      }

      // Aggregate per conversation — total comes from the same dataset
      const perConversation: Record<string, { count: number; sender_name: string }> = {};
      const messages = unreadMessages || [];
      for (const msg of messages) {
        if (!perConversation[msg.conversation_id]) {
          perConversation[msg.conversation_id] = { count: 0, sender_name: msg.sender_name };
        }
        perConversation[msg.conversation_id].count += 1;
      }

      return NextResponse.json({
        total_unread: messages.length,
        per_conversation: perConversation,
      });
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 });
    }

    // Auth check: either super-admin password OR reader_type=user (user viewing own inbox)
    const isSuperAdmin = verifySuperAdminPassword(req);
    const isUserViewing = readerType === 'user';

    if (!isSuperAdmin && !isUserViewing) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('montree_dm')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('DM fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Unread count with reader_type support
    let unreadQuery = supabase
      .from('montree_dm')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false);

    // Filter by sender_type based on reader_type
    if (readerType === 'user') {
      unreadQuery = unreadQuery.eq('sender_type', 'admin');
    } else if (readerType === 'admin') {
      unreadQuery = unreadQuery.eq('sender_type', 'user');
    }
    // If readerType not provided, count all unread (backward compatible)

    const { count: unreadCount, error: unreadErr } = await unreadQuery;
    if (unreadErr) {
      console.error('DM unread count error:', unreadErr);
    }

    return NextResponse.json({
      messages: data || [],
      unread_count: unreadCount ?? 0
    });

  } catch (error) {
    console.error('DM GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Send a message
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    let { conversation_id, sender_type, sender_name, message } = body;

    if (!conversation_id || !sender_type || !message?.trim()) {
      return NextResponse.json(
        { error: 'conversation_id, sender_type, and message are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'user'].includes(sender_type)) {
      return NextResponse.json({ error: 'Invalid sender_type' }, { status: 400 });
    }

    // Auth: admin messages require super-admin password
    if (sender_type === 'admin' && !verifySuperAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Sanitize message: strip HTML tags to prevent XSS
    message = message.trim().replace(/<[^>]*>/g, '');

    // Enforce max length of 2000 characters
    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message exceeds maximum length of 2000 characters' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message cannot be empty after sanitization' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('montree_dm')
      .insert({
        conversation_id,
        sender_type,
        sender_name: sender_name || (sender_type === 'admin' ? 'Montree' : 'User'),
        message,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('DM insert error:', error);
      return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: data });

  } catch (error) {
    console.error('DM POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Mark messages as read or bridge conversations
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { action } = body;

    // Handle bridge operation
    if (action === 'bridge') {
      const { old_conversation_id, new_conversation_id } = body;

      if (!old_conversation_id || !new_conversation_id) {
        return NextResponse.json(
          { error: 'old_conversation_id and new_conversation_id required for bridge action' },
          { status: 400 }
        );
      }

      // Bridge requires super-admin password
      if (!verifySuperAdminPassword(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const { error } = await supabase
        .from('montree_dm')
        .update({ conversation_id: new_conversation_id })
        .eq('conversation_id', old_conversation_id);

      if (error) {
        console.error('DM bridge error:', error);
        return NextResponse.json({ error: 'Failed to bridge conversations' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'bridge' });
    }

    // Default: Mark messages as read
    const { conversation_id, reader_type } = body;

    if (!conversation_id || !reader_type) {
      return NextResponse.json({ error: 'conversation_id and reader_type required' }, { status: 400 });
    }

    // Mark messages from the OTHER side as read
    const senderToMark = reader_type === 'admin' ? 'user' : 'admin';

    const { error: markErr } = await supabase
      .from('montree_dm')
      .update({ is_read: true })
      .eq('conversation_id', conversation_id)
      .eq('sender_type', senderToMark)
      .eq('is_read', false);

    if (markErr) {
      console.error('DM mark-as-read error:', markErr);
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: 'mark_as_read' });

  } catch (error) {
    console.error('DM PATCH error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
