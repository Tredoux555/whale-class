import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — campaign dashboard: stats + contacts by status
export async function GET(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const url = new URL(req.url);
  const view = url.searchParams.get('view') || 'dashboard';

  try {
    if (view === 'dashboard') {
      // Get all contacts with counts by status
      const { data: contacts, error } = await supabase
        .from('montree_outreach_contacts')
        .select('id, org_name, contact_person, email, status, contact_type, priority, email_status, source, notes, sent_date, reply_date, draft_date, follow_up_count, next_follow_up, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const all = contacts || [];
      const stats = {
        total: all.length,
        with_email: all.filter(c => c.email).length,
        new: all.filter(c => c.status === 'new').length,
        drafted: all.filter(c => c.status === 'drafted').length,
        sent: all.filter(c => c.status === 'sent').length,
        replied: all.filter(c => c.status === 'replied').length,
        bounced: all.filter(c => c.status === 'bounced').length,
        converted: all.filter(c => c.status === 'converted').length,
        dead: all.filter(c => c.status === 'dead').length,
        demo_requested: all.filter(c => c.status === 'demo_requested').length,
        contacted: all.filter(c => c.status === 'contacted').length,
        follow_up: all.filter(c => c.status === 'follow_up').length,
      };

      // Today's batch: contacts with status 'drafted' (ready for user to send from Gmail)
      const drafted = all.filter(c => c.status === 'drafted');

      // Needs follow-up: sent but no reply, past follow-up date
      const needsFollowUp = all.filter(c =>
        c.status === 'sent' && c.next_follow_up && new Date(c.next_follow_up) <= new Date()
      );

      // Queue: contacts with email, status 'new', not bounced
      const queue = all.filter(c =>
        c.email && c.status === 'new' && c.email_status !== 'bounced' && c.email_status !== 'invalid'
      );

      // Recent activity: last 20 sent or replied
      const recentActivity = all
        .filter(c => c.status === 'sent' || c.status === 'replied' || c.status === 'drafted')
        .slice(0, 20);

      // Replies
      const replies = all.filter(c => c.status === 'replied');

      return NextResponse.json({
        stats,
        drafted,
        needsFollowUp,
        queue: queue.slice(0, 50),
        queueTotal: queue.length,
        recentActivity,
        replies,
      }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return NextResponse.json({ error: 'Unknown view' }, { status: 400 });
  } catch (err) {
    console.error('[CampaignManager] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH — update contact status (after user sends from Gmail, marks reply, etc.)
export async function PATCH(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ids, status, notes, next_follow_up } = await req.json();

  if (!status) {
    return NextResponse.json({ error: 'status required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Support bulk update via ids array
  const targetIds = ids || (id ? [id] : []);
  if (targetIds.length === 0) {
    return NextResponse.json({ error: 'id or ids required' }, { status: 400 });
  }

  // 🚨 Session 113 V2 Outreach audit HIGH F-4.1 — capture previous_status
  // BEFORE the UPDATE so the audit log actually records the transition.
  // The legacy code wrote 'unknown' for every row, making the audit trail
  // useless. SELECT-then-UPDATE is racey under contention (two PATCH calls
  // could both read the original status and both report it as previous);
  // for outreach status changes this is acceptable because the operator
  // is single-threaded (Tredoux) and the audit log is for forensic
  // reconstruction, not concurrency control.
  const { data: priorRows } = await supabase
    .from('montree_outreach_contacts')
    .select('id, status')
    .in('id', targetIds);
  const priorStatusById = new Map<string, string>();
  for (const row of (priorRows || []) as Array<{ id: string; status: string | null }>) {
    priorStatusById.set(row.id, row.status || 'null');
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'sent') {
    updateData.sent_date = new Date().toISOString();
    // Set follow-up for 5 days later
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 5);
    updateData.next_follow_up = followUp.toISOString();
  }
  if (status === 'replied') {
    updateData.reply_date = new Date().toISOString();
    updateData.next_follow_up = null;
  }
  if (status === 'drafted') {
    updateData.draft_date = new Date().toISOString();
  }
  if (notes !== undefined) {
    updateData.notes = notes;
  }
  if (next_follow_up !== undefined) {
    updateData.next_follow_up = next_follow_up;
  }

  const { error } = await supabase
    .from('montree_outreach_contacts')
    .update(updateData)
    .in('id', targetIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log the action — now with the REAL previous_status per contact.
  for (const contactId of targetIds) {
    await supabase.from('montree_outreach_log').insert({
      contact_id: contactId,
      action: `status_${status}`,
      details: {
        notes,
        previous_status: priorStatusById.get(contactId) || 'unknown',
        new_status: status,
      },
    }).catch(err => console.error('[campaign-manager] Failed to log action:', err));
  }

  return NextResponse.json({ success: true, updated: targetIds.length });
}
