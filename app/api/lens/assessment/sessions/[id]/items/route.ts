// POST /api/lens/assessment/sessions/[id]/items — submit a batch of responses
// GET  /api/lens/assessment/sessions/[id]/items — read what has been stored
//
// Batch by design: the runner posts every few items and the rest at the close.
// Writes are idempotent on (session_id, item_id), so a retry after a dropped
// connection is safe and keying the same paper sheet in twice corrects rather
// than duplicates.
//
// The server re-scores every response from item-bank.json. The client's own
// point total is stored in `client_points_awarded` for audit and never decides
// anything.

import { NextResponse, type NextRequest } from 'next/server';
import { getBankIndex } from '@/lib/montree/evaluation/bank';
import type { Band, RawItemResponse } from '@/lib/montree/evaluation/types';
import { badRequest, lensError, notFound, readJson } from '@/lib/lens/route-helpers';
import {
  assertAssessmentSchemaReady, loadOwnedSession, openAssessmentRoute, setupPending,
} from '@/lib/lens/assessment/bridge';
import { LensAssessmentServiceError, persistResponses } from '@/lib/lens/assessment/session-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BATCH = 500;
const BANDS: readonly string[] = ['emerging', 'developing', 'secure'];

type Params = { params: Promise<{ id: string }> };

interface ItemsBody {
  responses?: RawItemResponse[];
  observations?: Array<{ milestoneId: string; band: Band; note?: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const opened = await openAssessmentRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;
  const { id } = await params;

  const parsed = await readJson(request);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed as unknown as ItemsBody;

  const responses = Array.isArray(body.responses) ? body.responses : [];
  const observations = Array.isArray(body.observations) ? body.observations : [];
  if (!responses.length && !observations.length) {
    return badRequest('Send at least one response or observation.');
  }
  if (responses.length + observations.length > MAX_BATCH) {
    return badRequest(`Send at most ${MAX_BATCH} records at a time.`);
  }

  try {
    const schemaProblem = await assertAssessmentSchemaReady(ctx.supabase);
    if (schemaProblem) return schemaProblem;

    const session = await loadOwnedSession(ctx.supabase, ctx.observerId, id);
    if (!session) return notFound('That check-in isn’t yours.');
    if (session.status === 'completed') {
      // Not an error: a late observation is legitimate and is re-scored on the
      // next complete. Logged so a runner that keeps posting after finishing is
      // visible rather than invisible.
      console.warn(`[lens/assessment] late write to completed session ${session.id}`);
    }

    const index = getBankIndex();

    // Observations arrive as their own array; convert them onto their 1:1 items
    // so there is exactly one storage shape and one scorer.
    const converted: RawItemResponse[] = [];
    const unknownMilestoneIds: string[] = [];
    for (const o of observations) {
      const item = index.observationItemByMilestoneId.get(o?.milestoneId);
      if (!item) { unknownMilestoneIds.push(o?.milestoneId); continue; }
      if (!BANDS.includes(o.band)) {
        return badRequest(`${o.milestoneId}: pick emerging, developing or secure.`);
      }
      converted.push({
        itemId: item.id,
        band: o.band,
        note: o.note ? String(o.note).slice(0, 300) : undefined,
        administered: true,
      });
    }

    const written = await persistResponses({
      supabase: ctx.supabase,
      session,
      responses: [...responses, ...converted],
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      written: written.written,
      unknownItemIds: written.unknownItemIds,
      unknownMilestoneIds,
      clientScoreDisagreements: written.disagreements,
      note: 'Bands are not computed here. Call /complete when the sitting ends.',
    });
  } catch (error) {
    if (error instanceof LensAssessmentServiceError) {
      return error.setupPending ? setupPending(error.message) : lensError(error.message, error.cause);
    }
    return lensError('assessment:items:post', error);
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  const opened = await openAssessmentRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;
  const { id } = await params;

  try {
    const session = await loadOwnedSession(ctx.supabase, ctx.observerId, id);
    if (!session) return notFound('That check-in isn’t yours.');

    const { data, error } = await ctx.supabase
      .from('lens_assessment_item_responses')
      .select('item_id, milestone_id, strand_id, module_id, item_type, response, points_awarded, points_possible, is_correct, observed_band, administered, skipped_reason, answered_at')
      .eq('session_id', session.id)
      .eq('observer_id', ctx.observerId)
      .order('answered_at', { ascending: true })
      .limit(1000);
    if (error) throw error;

    return NextResponse.json({
      sessionId: session.id,
      responses: data ?? [],
      count: (data ?? []).length,
    });
  } catch (error) {
    return lensError('assessment:items:get', error);
  }
}
