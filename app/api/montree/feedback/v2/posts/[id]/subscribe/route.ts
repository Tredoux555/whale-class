// app/api/montree/feedback/v2/posts/[id]/subscribe/route.ts
//
// POST follows a post, DELETE stops. A guest may supply an email here (the one
// case where a subscription is created without a post or a comment); a
// signed-in user's address is not asked for, because their notifications go to
// the account they already have.

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireIdentity, resolveBoardContext } from '@/lib/montree/feedback/board';
import { db } from '@/lib/montree/feedback/data';
import { clean, isUuid, isValidEmail, LIMITS } from '@/lib/montree/feedback/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError('No such post.', 404, 'not_found');

  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireIdentity(ctx);
  if (denied) return denied;

  const post = await db.getPost(ctx.board.id, id);
  if (!post || post.hidden) return jsonError('No such post.', 404, 'not_found');

  let email = ctx.viewer.email ?? null;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const supplied = clean(body?.email, LIMITS.email.max).toLowerCase();
    if (supplied && isValidEmail(supplied)) email = supplied;
  } catch {
    // No body is fine: a signed-in follower supplies nothing.
  }

  if (!email && ctx.viewer.kind === 'guest') {
    return jsonError('We need an address to send replies to.', 400, 'email_required');
  }

  await db.subscribe(id, ctx.viewer.key as string, email);
  return NextResponse.json({ ok: true, subscribed: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError('No such post.', 404, 'not_found');

  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireIdentity(ctx);
  if (denied) return denied;

  await db.unsubscribe(id, ctx.viewer.key as string);
  return NextResponse.json({ ok: true, subscribed: false });
}
