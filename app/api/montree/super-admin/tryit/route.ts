import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

// Super-admin read/write for the landing-page "Try it" gate.
//
//   GET   → recent clicks (+ counts) and every message, newest first.
//   PATCH → flip one message between 'new' and 'replied'.
//
// Both tables come from migration 316. If that hasn't been run the route
// answers 200 with { pending: true } rather than 500 — an unrun migration is a
// setup state, not an incident, and the tab renders a "not set up yet" card
// (same posture as CreatorInboxTab's 503 branch).

const CLICKS_LIMIT = 100;
const MESSAGES_LIMIT = 300;
const UNDEFINED_TABLE = '42P01';

interface ClickRow {
  id: string;
  created_at: string;
  ip: string | null;
  user_agent: string | null;
  referrer: string | null;
  locale: string | null;
}

interface MessageRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  organisation: string;
  message: string;
  ip: string | null;
  user_agent: string | null;
  status: string;
  replied_at: string | null;
}

export async function GET(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [clicksRes, clickTotalRes, click7dRes, messagesRes] = await Promise.all([
    supabase
      .from('montree_tryit_clicks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(CLICKS_LIMIT),
    supabase
      .from('montree_tryit_clicks')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('montree_tryit_clicks')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since7d),
    supabase
      .from('montree_tryit_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MESSAGES_LIMIT),
  ]);

  // Migration 316 not run yet → tell the tab, don't alarm anyone.
  if (
    clicksRes.error?.code === UNDEFINED_TABLE ||
    messagesRes.error?.code === UNDEFINED_TABLE
  ) {
    return NextResponse.json(
      { pending: true, clicks: [], messages: [], clickTotal: 0, click7d: 0, newCount: 0 },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (clicksRes.error || messagesRes.error) {
    console.error(
      '[super-admin/tryit GET] failed:',
      clicksRes.error?.code || messagesRes.error?.code
    );
    return NextResponse.json({ error: 'Failed to load try-it data' }, { status: 500 });
  }

  const messages = (messagesRes.data || []) as MessageRow[];

  return NextResponse.json(
    {
      pending: false,
      clicks: (clicksRes.data || []) as ClickRow[],
      clickTotal: clickTotalRes.count || 0,
      click7d: click7dRes.count || 0,
      messages,
      newCount: messages.filter(m => m.status === 'new').length,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PATCH(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || (status !== 'new' && status !== 'replied')) {
    return NextResponse.json({ error: 'id and status (new|replied) required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('montree_tryit_messages')
    .update({
      status,
      // Clearing back to 'new' clears the stamp too, so the timestamp can
      // never claim a reply that was undone.
      replied_at: status === 'replied' ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) {
    console.error('[super-admin/tryit PATCH] failed:', error.code);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
