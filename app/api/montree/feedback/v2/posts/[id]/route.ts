// app/api/montree/feedback/v2/posts/[id]/route.ts
//
// GET   — one post, its comments and its status history.
// PATCH — ADMIN ONLY: status (transition-checked), tags, pin, hide/restore.
// POST  — ADMIN ONLY: merge this post's duplicate into it.
//
// The admin gate is requireAdmin(ctx), and ctx.viewer.isAdmin was computed in
// identity.ts from cookies and headers only. Nothing in the body can reach it.

import { NextRequest, NextResponse } from 'next/server';
import {
  jsonError,
  publicViewer,
  requireAdmin,
  resolveBoardContext,
} from '@/lib/montree/feedback/board';
import { db } from '@/lib/montree/feedback/data';
import { notifySubscribers } from '@/lib/montree/feedback/notify';
import { canTransition, typeSupportsStatus } from '@/lib/montree/feedback/statuses';
import { isPostStatus } from '@/lib/montree/feedback/types';
import { clean, isUuid } from '@/lib/montree/feedback/validate';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError('No such post.', 404, 'not_found');

  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const post = await db.getPost(ctx.board.id, id);
    if (!post) return jsonError('No such post.', 404, 'not_found');

    // A hidden post is visible to an admin (that is the review queue) and to
    // nobody else. A merged one answers with its survivor so the client can
    // redirect rather than show a dead end.
    if (post.hidden && !ctx.viewer.isAdmin) {
      if (post.mergedInto) {
        return NextResponse.json({ mergedInto: post.mergedInto, code: 'merged' }, { status: 410 });
      }
      return jsonError('This post is under review.', 404, 'hidden');
    }

    const [comments, history, subscriberCount] = await Promise.all([
      db.listComments(ctx.board.id, id, ctx.viewer.isAdmin),
      db.listStatusHistory(ctx.board.id, id),
      db.countSubscribers(id),
    ]);

    if (ctx.viewer.key) {
      const voted = await db.viewerVotes([post.id], ctx.viewer.key);
      post.viewerHasVoted = voted.has(post.id);
      post.viewerSubscribed = await db.isSubscribed(post.id, ctx.viewer.key);
    }

    return NextResponse.json({
      board: { ref: ctx.board.ref, name: ctx.board.name },
      viewer: publicViewer(ctx.viewer),
      post,
      comments,
      history,
      subscriberCount,
    });
  } catch (err) {
    console.error('[feedback/v2/posts/:id] GET', err);
    return jsonError('Could not load that post.', 500, 'read_failed');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError('No such post.', 404, 'not_found');

  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireAdmin(ctx);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('Send JSON.', 400, 'bad_json');
  }

  const post = await db.getPost(ctx.board.id, id);
  if (!post) return jsonError('No such post.', 404, 'not_found');

  const patch: {
    status?: typeof post.status;
    tags?: string[];
    pinned?: boolean;
    hidden?: boolean;
    hiddenReason?: string | null;
    note?: string | null;
  } = {};

  if (body.status !== undefined) {
    if (!isPostStatus(body.status)) return jsonError('Unknown status.', 400, 'bad_status');
    if (!typeSupportsStatus(post.type)) {
      return jsonError('A discussion has no status.', 400, 'no_status_for_type');
    }
    // The transition table, not a free assignment. A Problem cannot become
    // "Shipped" and nothing can move to where the dropdown never offered.
    if (!canTransition(post.type, post.status, body.status)) {
      return jsonError(
        `Cannot move a ${post.type} from ${post.status} to ${body.status}.`,
        400,
        'bad_transition',
      );
    }
    patch.status = body.status;
    patch.note = clean(body.note, 500) || null;
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) return jsonError('tags must be a list.', 400, 'bad_tags');
    patch.tags = (body.tags as unknown[])
      .map((t) => clean(t, 40).toLowerCase())
      .filter((t) => /^[a-z0-9-]{2,40}$/.test(t))
      .slice(0, 8);
  }

  if (body.pinned !== undefined) patch.pinned = body.pinned === true;

  if (body.hidden !== undefined) {
    patch.hidden = body.hidden === true;
    patch.hiddenReason = patch.hidden ? clean(body.hiddenReason, 100) || 'admin' : null;
    // Restoring a post clears the flags that hid it, or the next reader's
    // flag would push it straight back over the threshold.
    if (!patch.hidden && ctx.viewer.key) {
      await db.resolveFlags(ctx.board.id, id, ctx.viewer.key);
    }
  }

  if (!Object.keys(patch).length) return jsonError('Nothing to change.', 400, 'empty_patch');

  try {
    const updated = await db.updatePost(
      ctx.board.id,
      id,
      patch,
      { key: ctx.viewer.key, name: ctx.viewer.displayName },
      post.status,
    );

    if (patch.status && patch.status !== post.status) {
      // Not awaited: a status change must not wait on a mailer. The outbox row
      // is written inside, so nothing is lost if this process dies now.
      void notifySubscribers({
        board: ctx.board,
        post: updated,
        kind: 'status_change',
        actorKey: ctx.viewer.key,
        fromStatus: post.status,
        toStatus: patch.status,
        note: patch.note ?? null,
      });
    }

    return NextResponse.json({ ok: true, post: updated });
  } catch (err) {
    console.error('[feedback/v2/posts/:id] PATCH', err);
    return jsonError('Could not save that change.', 500, 'update_failed');
  }
}

/** Merge: this post is the SURVIVOR, `duplicateId` in the body closes into it. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError('No such post.', 404, 'not_found');

  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireAdmin(ctx);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('Send JSON.', 400, 'bad_json');
  }

  const duplicateId = body.duplicateId;
  if (!isUuid(duplicateId)) return jsonError('Name the duplicate.', 400, 'bad_duplicate');
  if (duplicateId === id) return jsonError('A post cannot merge into itself.', 400, 'self_merge');

  try {
    await db.mergePosts(ctx.board.id, duplicateId, id, {
      key: ctx.viewer.key,
      name: ctx.viewer.displayName,
    });
    const survivor = await db.getPost(ctx.board.id, id);
    return NextResponse.json({ ok: true, post: survivor });
  } catch (err) {
    console.error('[feedback/v2/posts/:id] merge', err);
    return jsonError('Could not merge those.', 400, 'merge_failed');
  }
}
