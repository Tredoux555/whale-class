// app/api/montree/feedback/v2/posts/route.ts
//
// GET  — the board list: q / type / status / sort / cursor.
// POST — write a post. Honeypot, rate limit, guest identity minted on the way.
//
// Both resolve the board FIRST (resolveBoardContext), which is where tenancy
// lives: `?board=school:<id>` is checked against the caller's signed session
// before a single row is read.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import {
  clientIp,
  jsonError,
  publicViewer,
  requireIdentity,
  resolveBoardContext,
} from '@/lib/montree/feedback/board';
import { db } from '@/lib/montree/feedback/data';
import { authorFields, GUEST_COOKIE_OPTIONS } from '@/lib/montree/feedback/identity';
import { GUEST_COOKIE, guestKey, hashEmail, hashGuestToken, newGuestToken } from '@/lib/montree/feedback/keys';
import { defaultStatusFor } from '@/lib/montree/feedback/statuses';
import type { Viewer } from '@/lib/montree/feedback/types';
import {
  honeypotTripped,
  parseListParams,
  validateNewPost,
  ValidationError,
} from '@/lib/montree/feedback/validate';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;

  const params = parseListParams(request.nextUrl.searchParams);
  try {
    const result = await db.listPosts(ctx.board.id, params, ctx.viewer.key);
    return NextResponse.json({
      board: { ref: ctx.board.ref, name: ctx.board.name, localeDefault: ctx.board.localeDefault },
      viewer: publicViewer(ctx.viewer),
      ...result,
    });
  } catch (err) {
    console.error('[feedback/v2/posts] GET', err);
    return jsonError('Could not load the board.', 500, 'list_failed');
  }
}

export async function POST(request: NextRequest) {
  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError('Send JSON.', 400, 'bad_json');
  }

  // The honeypot answers 200 with a plausible id. A bot told "rejected" tries
  // again with the field removed; a bot told "posted" goes away.
  if (honeypotTripped(body)) {
    return NextResponse.json({ ok: true, post: { id: '00000000-0000-4000-8000-000000000000' } });
  }

  // Rate limit BEFORE any write, keyed on the identity where there is one and
  // on the IP where there is not, so a guest cannot dodge by clearing cookies.
  const ip = clientIp(request);
  const limitKey = ctx.viewer.key ?? `ip:${ip}`;
  const rl = await checkRateLimit(getSupabase(), limitKey, 'feedback_v2_post', 5, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'That is a lot of posting. Please try again in a little while.', code: 'rate_limited' },
      { status: 429, headers: rl.retryAfterSeconds ? { 'Retry-After': String(rl.retryAfterSeconds) } : undefined },
    );
  }

  // A signed-in viewer already has an identity. A guest or an anon supplies a
  // name and an email, and we mint them an httpOnly token here.
  const needsGuestIdentity = ctx.viewer.kind !== 'user' && !ctx.viewer.displayName;

  let validated;
  try {
    validated = validateNewPost(body, {
      isGuest: ctx.viewer.kind !== 'user',
      needsGuestIdentity,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, code: 'invalid', errors: err.errors }, { status: 400 });
    }
    throw err;
  }

  // Mint or refresh the guest identity.
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

  try {
    const post = await db.createPost(ctx.board.id, {
      type: validated.type,
      title: validated.title,
      body: validated.body,
      template: validated.template,
      status: defaultStatusFor(validated.type),
      authorKind: author.author_kind,
      authorId: author.author_id,
      authorName: author.author_name,
      authorRole: author.author_role,
      authorKey: viewer.key as string,
      guestEmailHash: viewer.email ? hashEmail(viewer.email) : null,
      tags: validated.tags,
      screenshotPath: validated.screenshotPath,
    });

    // The author is subscribed by construction. This is the promise the compose
    // sheet makes ("we'll email you when someone replies"), so it happens here
    // and not as something the client has to remember to call.
    await db.subscribe(post.id, viewer.key as string, viewer.email ?? null);

    const response = NextResponse.json({ ok: true, post }, { status: 201 });
    if (freshGuestToken) {
      response.cookies.set(GUEST_COOKIE, freshGuestToken, GUEST_COOKIE_OPTIONS);
    }
    return response;
  } catch (err) {
    console.error('[feedback/v2/posts] POST', err);
    return jsonError('Could not save that. Please try again.', 500, 'create_failed');
  }
}
