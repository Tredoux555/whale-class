// app/api/montree/feedback/v2/posts/[id]/vote/route.ts
//
// POST toggles this viewer's vote. One per identity — enforced by the
// (post_id, voter_key) primary key, so a double-tap on a slow phone cannot
// produce two votes and a retry cannot produce a third.
//
// Questions and Discussions do not carry votes. Asking to vote on one is a
// 400, not a no-op: the client should never have offered the control.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { clientIp, jsonError, requireIdentity, resolveBoardContext } from '@/lib/montree/feedback/board';
import { db } from '@/lib/montree/feedback/data';
import { typeSupportsVoting } from '@/lib/montree/feedback/statuses';
import { isUuid } from '@/lib/montree/feedback/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError('No such post.', 404, 'not_found');

  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = requireIdentity(ctx);
  if (denied) return denied;

  const rl = await checkRateLimit(
    getSupabase(),
    ctx.viewer.key ?? `ip:${clientIp(request)}`,
    'feedback_v2_vote',
    60,
    60,
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Slow down a moment.', code: 'rate_limited' }, { status: 429 });
  }

  const post = await db.getPost(ctx.board.id, id);
  if (!post || post.hidden) return jsonError('No such post.', 404, 'not_found');
  if (!typeSupportsVoting(post.type)) {
    return jsonError('This kind of post does not take votes.', 400, 'no_voting_for_type');
  }

  try {
    const result = await db.toggleVote(ctx.board.id, id, ctx.viewer.key as string);
    // Voting subscribes you; un-voting deliberately does NOT unsubscribe. You
    // changed your mind about the vote, not about wanting to hear the outcome.
    if (result.voted) {
      await db.subscribe(id, ctx.viewer.key as string, ctx.viewer.email ?? null);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[feedback/v2/vote] POST', err);
    return jsonError('Could not record that.', 500, 'vote_failed');
  }
}
