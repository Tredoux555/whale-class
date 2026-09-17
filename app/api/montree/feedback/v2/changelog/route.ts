// app/api/montree/feedback/v2/changelog/route.ts
//
// GET — "You asked, we built": every post that reached Shipped or Fixed,
// newest first, built from montree_fb_status_history rather than from the
// posts table. The history is what carries the DATE something shipped; the
// post's updated_at would move again the next time anyone edited a tag.

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, resolveBoardContext } from '@/lib/montree/feedback/board';
import { db } from '@/lib/montree/feedback/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;

  const limitRaw = Number(request.nextUrl.searchParams.get('limit'));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(100, Math.floor(limitRaw)) : 40;

  try {
    const entries = await db.listChangelog(ctx.board.id, limit);
    return NextResponse.json({
      board: { ref: ctx.board.ref, name: ctx.board.name },
      entries,
    });
  } catch (err) {
    console.error('[feedback/v2/changelog] GET', err);
    return jsonError('Could not load the changelog.', 500, 'changelog_failed');
  }
}
