// /api/montree/dashboard/parent-codes/bulk-email/route.ts
// Teacher bulk-sends parent invite codes to multiple parents in one click.
//
// POST body: { sends: [{ child_id, recipient_email, parent_name? }] }
// Returns per-pair success/error so the UI can show "12 of 15 sent".
//
// Auth: teacher (or homeschool_parent) only. Each child_id must be in the
// teacher's classroom (cross-pollination check).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { sendParentInviteEmail } from '@/lib/montree/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

interface SendPair {
  child_id: string;
  recipient_email: string;
  parent_name?: string;
}

interface SendResult {
  child_id: string;
  recipient_email: string;
  ok: boolean;
  message_id?: string;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'teacher' && auth.role !== 'homeschool_parent') {
      return NextResponse.json({ error: 'Teacher access required.' }, { status: 403 });
    }
    if (!auth.classroomId) {
      return NextResponse.json({ error: 'No classroom on session.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as { sends?: SendPair[] } | null;
    if (!body || !Array.isArray(body.sends) || body.sends.length === 0) {
      return NextResponse.json({ error: 'sends array required' }, { status: 400 });
    }
    if (body.sends.length > 200) {
      return NextResponse.json({ error: 'Max 200 sends per request' }, { status: 400 });
    }

    const supabase = getSupabase();

    // ── Pre-validate every pair before sending any email. Bail with 400 if
    // ANY pair has a bad shape — refuse to half-send a batch.
    for (const s of body.sends) {
      if (!s.child_id || !UUID_RE.test(s.child_id)) {
        return NextResponse.json({ error: 'Invalid child_id in batch' }, { status: 400 });
      }
      if (!s.recipient_email || !EMAIL_RE.test(s.recipient_email)) {
        return NextResponse.json(
          { error: `Invalid email for child ${s.child_id}` },
          { status: 400 }
        );
      }
    }

    // ── Cross-pollination check: pull every child + invite code in one query.
    const childIds = Array.from(new Set(body.sends.map((s) => s.child_id)));
    const { data: children } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id, school_id')
      .in('id', childIds);

    const childById = new Map<
      string,
      { id: string; name: string; classroom_id: string; school_id: string }
    >();
    for (const c of (children || []) as Array<{
      id: string;
      name: string;
      classroom_id: string;
      school_id: string;
    }>) {
      // Refuse if child not in this teacher's classroom + school.
      if (c.classroom_id !== auth.classroomId || c.school_id !== auth.schoolId) {
        return NextResponse.json(
          { error: `Child ${c.id} not in your classroom.` },
          { status: 403 }
        );
      }
      childById.set(c.id, c);
    }

    // Verify all requested children resolved (404 if any missing).
    for (const cid of childIds) {
      if (!childById.has(cid)) {
        return NextResponse.json({ error: `Child ${cid} not found` }, { status: 404 });
      }
    }

    // ── Pull active invite code per child.
    const { data: invites } = await supabase
      .from('montree_parent_invites')
      .select('id, child_id, invite_code')
      .in('child_id', childIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const inviteByChild = new Map<string, { id: string; invite_code: string }>();
    for (const i of (invites || []) as Array<{ id: string; child_id: string; invite_code: string }>) {
      if (!inviteByChild.has(i.child_id)) {
        inviteByChild.set(i.child_id, { id: i.id, invite_code: i.invite_code });
      }
    }

    // ── Look up school name once for all emails.
    const { data: schools } = await supabase
      .from('montree_schools')
      .select('name')
      .eq('id', auth.schoolId)
      .limit(1);
    const schoolName =
      ((schools || []) as Array<{ name: string | null }>)[0]?.name || 'School';

    const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://montree.xyz'}/montree/parent/signup`;

    // ── Send in parallel (cap concurrency at 6 to be polite to Resend).
    const results: SendResult[] = [];
    const queue = [...body.sends];

    async function worker() {
      while (queue.length > 0) {
        const pair = queue.shift();
        if (!pair) break;
        const child = childById.get(pair.child_id);
        const invite = inviteByChild.get(pair.child_id);
        if (!child || !invite) {
          results.push({
            child_id: pair.child_id,
            recipient_email: pair.recipient_email,
            ok: false,
            error: 'No active invite code for this child',
          });
          continue;
        }
        try {
          const r = await sendParentInviteEmail(
            pair.recipient_email,
            child.name,
            schoolName,
            invite.invite_code,
            signupUrl
          );
          if (r.success) {
            results.push({
              child_id: pair.child_id,
              recipient_email: pair.recipient_email,
              ok: true,
              message_id: r.messageId,
            });
            // Stamp the parent_email on the invite (existing pattern from invites/send).
            await supabase
              .from('montree_parent_invites')
              .update({ parent_email: pair.recipient_email })
              .eq('id', invite.id);
          } else {
            results.push({
              child_id: pair.child_id,
              recipient_email: pair.recipient_email,
              ok: false,
              error: r.error || 'send failed',
            });
          }
        } catch (err) {
          results.push({
            child_id: pair.child_id,
            recipient_email: pair.recipient_email,
            ok: false,
            error: err instanceof Error ? err.message : 'send failed',
          });
        }
      }
    }

    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);

    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({
      success: true,
      sent: okCount,
      failed: results.length - okCount,
      total: results.length,
      results,
    });
  } catch (err) {
    console.error('[parent-codes bulk-email]', err);
    return NextResponse.json({ error: 'Bulk send failed' }, { status: 500 });
  }
}
