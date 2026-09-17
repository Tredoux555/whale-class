// app/api/montree/feedback/v2/search/route.ts
//
// GET ?q= — the "Is it one of these?" list under the compose sheet's title.
//
// Wide then precise: Postgres does the cheap ILIKE/trigram pass over the
// board, dedup.ts ranks the result with character bigrams and token overlap.
// That second step is why a Chinese title works here at all — pg_trgm on an
// unsegmented CJK string is close to meaningless.
//
// Debounced at 250ms by the client, so this is called roughly once a word.

import { NextRequest, NextResponse } from 'next/server';
import { resolveBoardContext } from '@/lib/montree/feedback/board';
import { db } from '@/lib/montree/feedback/data';
import { rankCandidates } from '@/lib/montree/feedback/dedup';
import { clean } from '@/lib/montree/feedback/validate';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await resolveBoardContext(request);
  if (ctx instanceof NextResponse) return ctx;

  const q = clean(request.nextUrl.searchParams.get('q'), 140);
  if (q.length < 3) return NextResponse.json({ candidates: [] });

  try {
    const candidates = await db.searchCandidates(ctx.board.id, q, 40);
    const ranked = rankCandidates(q, candidates, { now: new Date().toISOString(), limit: 5 });

    // The viewer's own votes ride along so the "Me too" pill in the sheet can
    // render its true state instead of flickering after a second request.
    let voted = new Set<string>();
    if (ctx.viewer.key && ranked.length) {
      voted = await db.viewerVotes(ranked.map((r) => r.candidate.id), ctx.viewer.key);
    }

    return NextResponse.json({
      candidates: ranked.map((r) => ({
        id: r.candidate.id,
        title: r.candidate.title,
        type: r.candidate.type,
        status: r.candidate.status,
        voteCount: r.candidate.voteCount,
        commentCount: r.candidate.commentCount,
        createdAt: r.candidate.createdAt,
        score: Math.round(r.score * 100) / 100,
        viewerHasVoted: voted.has(r.candidate.id),
      })),
    });
  } catch (err) {
    console.error('[feedback/v2/search] GET', err);
    // A failed duplicate check must never block writing a post — the compose
    // sheet simply shows nothing.
    return NextResponse.json({ candidates: [] });
  }
}
