// app/api/montree/feedback/v2/flags/route.ts
//
// POST a flag on a post or a comment.
//
// Three DISTINCT flaggers auto-hide the thing, pending admin review. Distinct
// is the (target_kind, target_id, flagger_key) unique index — one angry
// visitor cannot reach the threshold alone by tapping three times, and cannot
// reach it by clearing cookies either, because minting a new guest token takes
// a POST to /posts and the rate limiter meters that.
//
// The response never says how many flags a thing has: that number is a lever
// for anyone trying to work out how many more they need.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { clientIp, jsonError, requireIdentity, resolveBoardContext } from '@/lib/montree/feedback/board';
import { db } from '@/lib/montree/feedback/data';
import { isFlagReason, isUuid, clean } from '@/lib/montree/feedback/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireIdentity(ctx);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('Send JSON.', 400, 'bad_json');
  }

  const targetKind = body.targetKind === 'comment' ? 'comment' : 'post';
  const targetId = body.targetId;
  if (!isUuid(targetId)) return jsonError('Name what you are reporting.', 400, 'bad_target');
  if (!isFlagReason(body.reason)) return jsonError('Pick a reason.', 400, 'bad_reason');

  // Board scope: the target must live on THIS board before a flag can touch it.
  if (targetKind === 'post') {
    const post = await db.getPost(ctx.board.id, targetId);
    if (!post) return jsonError('No such post.', 404, 'not_found');
  }

  const rl = await checkRateLimit(
    getSupabase(),
    ctx.viewer.key ?? `ip:${clientIp(request)}`,
    'feedback_v2_flag',
    20,
    60,
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many reports.', code: 'rate_limited' }, { status: 429 });
  }

  try {
    const result = await db.addFlag(
      ctx.board.id,
      targetKind,
      targetId,
      ctx.viewer.key as string,
      body.reason,
      clean(body.note, 300) || null,
    );
    // `hidden` is safe to return — it is visible on the page anyway — but the
    // count is not.
    return NextResponse.json({ ok: true, hidden: result.hidden });
  } catch (err) {
    console.error('[feedback/v2/flags] POST', err);
    return jsonError('Could not record that report.', 500, 'flag_failed');
  }
}
