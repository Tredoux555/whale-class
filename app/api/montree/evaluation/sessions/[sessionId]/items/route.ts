/**
 * POST /api/montree/evaluation/sessions/[sessionId]/items — submit a batch of responses
 * GET  /api/montree/evaluation/sessions/[sessionId]/items — read what has been stored
 *
 * Batch by design: the tablet posts every few items, and the whole sitting on finish. Writes
 * are idempotent on (session_id, item_id), so a retry after a dropped connection is safe.
 *
 * The server re-scores every response from item-bank.json. The client's own point total is
 * stored in `client_points_awarded` for audit and is never used to decide anything.
 */
import {
  assertSchemaReady, badRequest, isMigrationPendingError, json, migrationPending, openRoute,
  readJson, serverError,
} from '@/lib/montree/evaluation/route-helpers';
import { getBankIndex } from '@/lib/montree/evaluation/bank';
import { loadSession, persistResponses, ServiceError } from '@/lib/montree/evaluation/session-service';
import type { Band, RawItemResponse } from '@/lib/montree/evaluation/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BATCH = 500;

interface ItemsBody {
  responses?: RawItemResponse[];
  /** Observation checklist ratings — teacher best-fit judgement, rated over the window. */
  observations?: Array<{ milestoneId: string; band: Band; note?: string; evidenceMediaId?: string | null }>;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const opened = await openRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const { sessionId } = await params;
  if (!sessionId) return badRequest('session_id_required');

  const parsed = await readJson<ItemsBody>(request);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;

  const responses = body.responses ?? [];
  const observations = body.observations ?? [];
  if (!responses.length && !observations.length) return badRequest('empty_batch', 'Send at least one response or observation.');
  if (responses.length + observations.length > MAX_BATCH) {
    return badRequest('batch_too_large', `Send at most ${MAX_BATCH} records per request.`);
  }

  const schemaProblem = await assertSchemaReady(ctx.supabase);
  if (schemaProblem) return schemaProblem;

  try {
    const session = await loadSession(ctx.supabase, sessionId, ctx.auth.schoolId);
    if (!session) return json({ error: 'session_not_found' }, 404);
    if (session.status === 'completed') {
      // Not an error: a teacher may add a late observation. It is re-scored on the next complete.
      console.warn(`[montree-milestones] late write to completed session ${sessionId}`);
    }

    const index = getBankIndex();

    // Observations arrive as their own array; convert them into responses on their 1:1 items.
    const converted: RawItemResponse[] = [];
    const unknownMilestones: string[] = [];
    for (const o of observations) {
      const item = index.observationItemByMilestoneId.get(o.milestoneId);
      if (!item) { unknownMilestones.push(o.milestoneId); continue; }
      if (!['emerging', 'developing', 'secure'].includes(o.band)) {
        return badRequest('invalid_band', `${o.milestoneId}: expected emerging, developing or secure`);
      }
      converted.push({
        itemId: item.id,
        band: o.band,
        note: o.note ? o.note.slice(0, 300) : undefined,
        evidenceMediaId: o.evidenceMediaId ?? null,
        administered: true,
      });
    }

    const written = await persistResponses({ ctx, session, responses: [...responses, ...converted] });

    return json({
      ok: true,
      sessionId,
      written: written.written,
      unknownItemIds: written.unknownItemIds,
      unknownMilestoneIds: unknownMilestones,
      clientScoreDisagreements: written.disagreements,
      note: 'Bands are not computed here. Call /complete when the sitting ends.',
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return error.migrationPending
        ? migrationPending(String((error.cause as { message?: string })?.message ?? error.message))
        : serverError(error.message, error.cause);
    }
    return serverError('items POST', error);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const opened = await openRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const { sessionId } = await params;
  if (!sessionId) return badRequest('session_id_required');

  try {
    const session = await loadSession(ctx.supabase, sessionId, ctx.auth.schoolId);
    if (!session) return json({ error: 'session_not_found' }, 404);

    const { data, error } = await ctx.supabase
      .from('montree_evaluation_item_responses')
      .select('item_id, milestone_id, strand_id, module_id, item_type, response, points_awarded, points_possible, is_correct, observed_band, administered, skipped_reason, replay_count, latency_ms, answered_at')
      .eq('session_id', sessionId)
      .eq('school_id', ctx.auth.schoolId)
      .order('answered_at', { ascending: true })
      .limit(1000);
    if (error) {
      if (isMigrationPendingError(error)) return migrationPending(error.message);
      return serverError('read responses', error);
    }
    return json({ sessionId, responses: data ?? [], count: (data ?? []).length });
  } catch (error) {
    return serverError('items GET', error);
  }
}
