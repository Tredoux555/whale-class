// app/api/montree/feedback/v2/posts/[id]/comments/route.ts
//
// POST a flat comment. Three privileges are decided here, all server-side:
//
//   `official`  — ADMIN ONLY. This is the pinned "Montree team" card; a guest
//                 asking for it gets a 403, not a silently downgraded comment,
//                 because impersonating the team is the one thing on this
//                 board that would actually do damage.
//   `answer`    — the post's AUTHOR or an admin, on a Question only.
//   `quoteOf`   — anyone; the quote must be a comment on this same post.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { clientIp, jsonError, requireIdentity, resolveBoardContext } from '@/lib/montree/feedback/board';
import { db } from '@/lib/montree/feedback/data';
import { authorFields, GUEST_COOKIE_OPTIONS } from '@/lib/montree/feedback/identity';
import { GUEST_COOKIE, guestKey, hashEmail, hashGuestToken, keysEqual, newGuestToken } from '@/lib/montree/feedback/keys';
import { notifySubscribers } from '@/lib/montree/feedback/notify';
import type { Viewer } from '@/lib/montree/feedback/types';
import { honeypotTripped, isUuid, validateComment, ValidationError } from '@/lib/montree/feedback/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  if (!isUuid(postId)) return jsonError('No such post.', 404, 'not_found');

  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('Send JSON.', 400, 'bad_json');
  }
  if (honeypotTripped(body)) return NextResponse.json({ ok: true });

  const post = await db.getPost(ctx.board.id, postId);
  if (!post || (post.hidden && !ctx.viewer.isAdmin)) {
    return jsonError('No such post.', 404, 'not_found');
  }

  const ip = clientIp(request);
  const rl = await checkRateLimit(
    getSupabase(),
    ctx.viewer.key ?? `ip:${ip}`,
    'feedback_v2_comment',
    30,
    60,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'That is a lot of commenting. Please try again shortly.', code: 'rate_limited' },
      { status: 429 },
    );
  }

  const needsGuestIdentity = ctx.viewer.kind !== 'user' && !ctx.viewer.displayName;

  let validated;
  try {
    validated = validateComment(body, {
      isGuest: ctx.viewer.kind !== 'user',
      needsGuestIdentity,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, code: 'invalid', errors: err.errors }, { status: 400 });
    }
    throw err;
  }

  let viewer: Viewer = ctx.viewer;
  let freshGuestToken: string | null = null;
  if (ctx.viewer.kind !== 'user') {
    const token = viewer.kind === 'guest' && viewer.guestTokenHash ? null : newGuestToken();
    if (token) freshGuestToken = token;
    const tokenHash = token ? hashGuestToken(token) : (viewer.guestTokenHash as string);
    const name = validated.guestName ?? viewer.displayName ?? 'Guest';
    const email = validated.guestEmail ?? viewer.email ?? null;
    await db.upsertGuestToken(tokenHash, name, email, email ? hashEmail(email) : null);
    viewer = {
      kind: 'guest',
      key: guestKey(tokenHash),
      displayName: name,
      role: 'guest',
      isAdmin: false,
      guestTokenHash: tokenHash,
      email,
    };
  }

  const identityError = requireIdentity({ board: ctx.board, viewer });
  if (identityError) return identityError;

  const author = authorFields(viewer);
  if (!author) return jsonError('Tell us who you are first.', 401, 'no_identity');

  // `official` is a claim, and it is checked, not believed.
  const wantsOfficial = body.official === true;
  if (wantsOfficial && !viewer.isAdmin) {
    return jsonError('Only the team can post an official reply.', 403, 'not_admin');
  }

  // The quote must belong to this post: quoting across posts would render a
  // stranger's words under a thread they never joined.
  let quoteOf: string | null = null;
  if (validated.quoteOf) {
    const siblings = await db.listComments(ctx.board.id, postId, true);
    quoteOf = siblings.some((c) => c.id === validated.quoteOf) ? validated.quoteOf : null;
  }

  try {
    const comment = await db.createComment(ctx.board.id, postId, {
      body: validated.body,
      authorKind: author.author_kind,
      authorId: author.author_id,
      authorName: author.author_name,
      authorRole: author.author_role,
      authorKey: viewer.key as string,
      isOfficial: wantsOfficial,
      quoteOf,
    });

    // Commenting subscribes you. That is the whole closing-the-loop promise,
    // and it is an upsert, so commenting twice does not mail you twice.
    await db.subscribe(postId, viewer.key as string, viewer.email ?? null);

    // Marking the answer, if asked and allowed.
    let markedAnswer = false;
    if (body.answer === true && post.type === 'question') {
      const authorKey = await db.getPostAuthorKey(ctx.board.id, postId);
      const isPostAuthor = keysEqual(authorKey, viewer.key);
      if (isPostAuthor || viewer.isAdmin) {
        await db.markAnswer(ctx.board.id, postId, comment.id);
        markedAnswer = true;
      }
    }

    const fresh = (await db.getPost(ctx.board.id, postId)) ?? post;
    if (wantsOfficial) {
      void notifySubscribers({
        board: ctx.board,
        post: fresh,
        kind: 'official_reply',
        actorKey: viewer.key,
        authorName: author.author_name,
        body: validated.body,
      });
    } else if (markedAnswer) {
      void notifySubscribers({
        board: ctx.board,
        post: fresh,
        kind: 'answered',
        actorKey: viewer.key,
        body: validated.body,
      });
    }

    const response = NextResponse.json(
      { ok: true, comment: { ...comment, isAnswer: markedAnswer } },
      { status: 201 },
    );
    if (freshGuestToken) response.cookies.set(GUEST_COOKIE, freshGuestToken, GUEST_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error('[feedback/v2/comments] POST', err);
    return jsonError('Could not save that comment.', 500, 'comment_failed');
  }
}

/** PATCH — mark or unmark an existing comment as THE answer. Author or admin. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  if (!isUuid(postId)) return jsonError('No such post.', 404, 'not_found');

  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('Send JSON.', 400, 'bad_json');
  }

  const commentId = body.commentId;
  if (!isUuid(commentId)) return jsonError('Name the comment.', 400, 'bad_comment');

  const post = await db.getPost(ctx.board.id, postId);
  if (!post) return jsonError('No such post.', 404, 'not_found');
  if (post.type !== 'question') {
    return jsonError('Only a question has an answer.', 400, 'not_a_question');
  }

  const authorKey = await db.getPostAuthorKey(ctx.board.id, postId);
  if (!keysEqual(authorKey, ctx.viewer.key) && !ctx.viewer.isAdmin) {
    return jsonError('Only the person who asked, or the team, can accept an answer.', 403, 'not_allowed');
  }

  const comments = await db.listComments(ctx.board.id, postId, true);
  const target = comments.find((c) => c.id === commentId);
  if (!target) return jsonError('No such comment on this post.', 404, 'not_found');

  await db.markAnswer(ctx.board.id, postId, commentId);
  void notifySubscribers({
    board: ctx.board,
    post,
    kind: 'answered',
    actorKey: ctx.viewer.key,
    body: target.body,
  });
  return NextResponse.json({ ok: true });
}
