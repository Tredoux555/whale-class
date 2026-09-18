// lib/montree/feedback/board.ts
//
// Board resolution and the tenancy gate, in one place so that no route can
// remember half of it.
//
// A request names its board with `?board=public` (the default) or
// `?board=school:<uuid>`. Those are two very different promises:
//
//   PUBLIC — anyone may read; anyone with an identity may write. Admin is the
//     super-admin token or the FEEDBACK_ADMIN_USER_IDS allow-list.
//   PRODUCT ('product:<slug>', 2026-09-17) — the SAME promises as PUBLIC, on a
//     separate wall. It is not a tenancy boundary and must never be treated as
//     one: it is how a second product surface (the Dark Phonics hub) gets its
//     own conversation. The row is seeded by a migration, never created here,
//     so a typo in a slug is "not set up yet" rather than a brand-new empty
//     board that nobody will ever find again.
//   SCHOOL — a private board inside one school's dashboard. The caller must
//     hold a Montree session for THAT school; a perfectly valid session for
//     another school is a 403, not a quiet fallback to the public board.
//     Admin is that school's principal.
//
// Every route calls resolveBoardContext() first, and every repo call
// downstream is scoped to the board id it returns.

import { NextResponse, type NextRequest } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { parseBoardRef, type Board, type Viewer } from './types';
import { resolveViewer } from './identity';
import { BoardNotReadyError, db } from './data';

export interface BoardContext {
  board: Board;
  viewer: Viewer;
}

export function jsonError(message: string, status: number, code?: string): NextResponse {
  return NextResponse.json({ error: message, code: code ?? 'error' }, { status });
}

export function boardNotReady(): NextResponse {
  return NextResponse.json(
    { error: 'The feedback board is not set up on this database yet.', code: 'board_not_ready' },
    { status: 503 },
  );
}

/**
 * Resolve board + viewer, or return the NextResponse the route should send.
 * The `instanceof NextResponse` idiom matches verifySchoolRequest, so the two
 * guards read identically at the top of every handler.
 */
export async function resolveBoardContext(
  request: NextRequest,
): Promise<BoardContext | NextResponse> {
  const raw = request.nextUrl.searchParams.get('board') ?? 'public';
  const parsed = parseBoardRef(raw);
  if (!parsed) return jsonError('Unknown board.', 400, 'bad_board');

  let board: Board | null = null;

  if (parsed.scope === 'school') {
    // Tenancy FIRST. The board row is not even looked up until we know the
    // caller belongs to that school — so a probe for `school:<someone else's
    // uuid>` cannot even confirm the board exists.
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.schoolId !== parsed.schoolId) {
      return jsonError('This board belongs to another school.', 403, 'wrong_school');
    }
    try {
      board = await db.ensureBoard(parsed.ref, 'school', parsed.schoolId, 'School feedback');
    } catch (err) {
      if (err instanceof BoardNotReadyError) return boardNotReady();
      throw err;
    }
  } else {
    // Public and product are the same code path: look the row up, never create
    // it. `parsed.ref` is the canonical spelling, so 'public' stays 'public'
    // and 'PRODUCT:Dark-Phonics' has already become 'product:dark-phonics'.
    try {
      board = await db.getBoard(parsed.ref);
    } catch (err) {
      if (err instanceof BoardNotReadyError) return boardNotReady();
      throw err;
    }
  }

  if (!board) return boardNotReady();

  const viewer = await resolveViewer(request, board);
  return { board, viewer };
}

/** For routes that must be an admin of THIS board. */
export function requireAdmin(ctx: BoardContext): NextResponse | null {
  if (!ctx.viewer.isAdmin) {
    return jsonError('Only the team can do that.', 403, 'not_admin');
  }
  return null;
}

/** For routes that need SOME identity: vote, subscribe, flag, comment, post. */
export function requireIdentity(ctx: BoardContext): NextResponse | null {
  if (ctx.viewer.kind === 'anon' || !ctx.viewer.key) {
    return jsonError('Tell us who you are first.', 401, 'no_identity');
  }
  return null;
}

/** The client IP for rate-limit bucketing, behind Railway's proxy. */
export function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/** A viewer trimmed to what a browser may see. Never the email, never the key's
 *  raw guest hash — the board is public and this object is serialised into it. */
export function publicViewer(viewer: Viewer): {
  kind: Viewer['kind'];
  displayName: string | null;
  role: string | null;
  isAdmin: boolean;
} {
  return {
    kind: viewer.kind,
    displayName: viewer.displayName,
    role: viewer.role,
    isAdmin: viewer.isAdmin,
  };
}
