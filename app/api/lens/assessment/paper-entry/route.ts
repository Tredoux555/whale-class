// POST /api/lens/assessment/paper-entry — key in a printed scoring sheet
//
// THE PAPER PATH. An observer prints a pack (GET /api/lens/assessment/paper-pack),
// sits with the child and the paper, marks each item on the scoring sheet, then
// keys the sheet in here. Nothing about the RESULT differs from a digital
// sitting: this route turns each mark into the same RawItemResponse shape the
// runner produces, hands it to the same persistResponses(), and finishes through
// the same finalizeSession(). The bands are computed by the same code from the
// same bank.
//
// 🚨 A MARK IS NOT A SCORE. The sheet records "did the child do it", not points.
// So `correct: true` is expanded into the item's own correct answer (the option
// ids or the tap sequence the bank declares) and the SERVER scores that, exactly
// as it scores a real tap. Nothing on the wire carries a point value that the
// server trusts — a client-supplied total would make the paper path a different
// instrument wearing the same name.

import { NextResponse, type NextRequest } from 'next/server';
import { getBankIndex } from '@/lib/montree/evaluation/bank';
import { correctOptionIds, correctSequence } from '@/lib/montree/evaluation/runner-engine';
import type { Band, RawItemResponse } from '@/lib/montree/evaluation/types';
import { badRequest, lensError, notFound, readJson, requiredText } from '@/lib/lens/route-helpers';
import {
  assertAssessmentSchemaReady, loadOwnedSession, openAssessmentRoute, setupPending,
} from '@/lib/lens/assessment/bridge';
import {
  finalizeSession, LensAssessmentServiceError, persistResponses,
} from '@/lib/lens/assessment/session-service';
import { readSessionFacts } from '@/lib/lens/assessment/session-facts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_ENTRIES = 800;
const BANDS: readonly string[] = ['emerging', 'developing', 'secure'];

/**
 * Why an item has no answer. Both mean the same thing to the scorer — absent
 * evidence, never zero evidence — and they are kept apart because they mean very
 * different things to a person reading the record later. 'paper_blank' is an item
 * she never got to; 'did_not_engage' is an item the child was offered and did not
 * take up, which is itself worth knowing and is emphatically not an answer that
 * did not work out.
 */
const SKIP_REASONS: readonly string[] = ['paper_blank', 'did_not_engage'];

interface PaperEntry {
  itemId: string;
  /** Tick / cross on the sheet. Ignored for rubric and observation items. */
  correct?: boolean;
  /** teacher_scored_oral: the rubric level circled on the sheet (0/1/2). */
  rubricScore?: number;
  /** observation_checklist: the band ticked. */
  band?: Band;
  /** Left blank on the sheet, or offered and not taken up — absent evidence, never zero evidence. */
  administered?: boolean;
  /** 'paper_blank' (default) or 'did_not_engage'. Only read when administered is false. */
  skippedReason?: string;
  note?: string;
}

interface PaperBody {
  session_id?: string;
  entries?: PaperEntry[];
  /** Finish the check-in in the same call once the whole sheet is in. */
  complete?: boolean;
  durationSeconds?: number | null;
}

export async function POST(request: NextRequest) {
  const opened = await openAssessmentRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const parsed = await readJson(request);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed as unknown as PaperBody;

  const sessionId = requiredText(body.session_id, 64);
  if (!sessionId) return badRequest('Which check-in is this sheet for?');

  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (!entries.length) return badRequest('Nothing to save yet — record at least one item.');
  if (entries.length > MAX_ENTRIES) return badRequest(`Send at most ${MAX_ENTRIES} entries at a time.`);

  try {
    const schemaProblem = await assertAssessmentSchemaReady(ctx.supabase);
    if (schemaProblem) return schemaProblem;

    const session = await loadOwnedSession(ctx.supabase, ctx.observerId, sessionId);
    if (!session) return notFound('That check-in isn’t yours.');
    if (session.delivery_mode === 'tablet') {
      return badRequest('That check-in was started as a digital sitting. Start a paper one instead.');
    }

    const coRated = readSessionFacts(session.summary_json).coRated;

    const index = getBankIndex();
    const converted: RawItemResponse[] = [];
    const unknownItemIds: string[] = [];
    const answeredAt = new Date().toISOString();

    for (const entry of entries) {
      const item = index.itemById.get(entry?.itemId);
      if (!item) { unknownItemIds.push(entry?.itemId); continue; }

      // Practice items are never part of a child's record, on any path.
      if (item.form === 'P') continue;

      const administered = entry.administered !== false;
      const skippedReason = SKIP_REASONS.includes(String(entry.skippedReason))
        ? String(entry.skippedReason)
        : 'paper_blank';
      const base: RawItemResponse = {
        itemId: item.id,
        administered,
        skippedReason: administered ? null : skippedReason,
        note: entry.note ? String(entry.note).slice(0, 300) : undefined,
        answeredAt,
      };

      if (!administered) { converted.push(base); continue; }

      switch (item.type) {
        case 'observation_checklist': {
          // Same rule as the digital path: an observation rating is only evidence
          // when an adult who knows the child gave it. See session-facts.ts.
          if (!coRated) {
            return badRequest(
              'This check-in was not set up as co-rated, so the observation section is not part of it.',
            );
          }
          if (!entry.band || !BANDS.includes(entry.band)) {
            return badRequest(`${item.id}: tick emerging, developing or secure.`);
          }
          converted.push({ ...base, band: entry.band });
          break;
        }
        case 'teacher_scored_oral': {
          const score = Number(entry.rubricScore);
          if (!Number.isFinite(score) || score < 0 || score > 10) {
            return badRequest(`${item.id}: choose a level from the sheet.`);
          }
          converted.push({ ...base, rubricScore: Math.round(score) });
          break;
        }
        case 'listen_do': {
          // A tick means the child produced the declared sequence; a cross means
          // they did something else, recorded as an empty sequence so the server
          // scores it zero the same way it would score a wrong tap order.
          converted.push({ ...base, sequence: entry.correct ? correctSequence(item) : [] });
          break;
        }
        default: {
          converted.push({ ...base, optionIds: entry.correct ? correctOptionIds(item) : [] });
          break;
        }
      }
    }

    if (!converted.length) {
      return badRequest('None of those items are in this bank version.');
    }

    const written = await persistResponses({ supabase: ctx.supabase, session, responses: converted });

    if (!body.complete) {
      return NextResponse.json({
        ok: true,
        sessionId: session.id,
        written: written.written,
        unknownItemIds,
        completed: false,
      });
    }

    const finalized = await finalizeSession({
      supabase: ctx.supabase,
      session,
      durationSeconds: typeof body.durationSeconds === 'number' ? body.durationSeconds : null,
      status: 'completed',
      overrideById: ctx.observerId,
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      written: written.written,
      unknownItemIds,
      completed: true,
      session: finalized.session,
      summary: finalized.summary,
      warnings: finalized.warnings,
    });
  } catch (error) {
    if (error instanceof LensAssessmentServiceError) {
      return error.setupPending ? setupPending(error.message) : lensError(error.message, error.cause);
    }
    return lensError('assessment:paper-entry:post', error);
  }
}
