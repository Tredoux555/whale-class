// POST /api/lens/assessment/sessions/[id]/complete
//
// Finalise a check-in: re-score every stored response against the bank, band
// each milestone, write one result row per milestone, and stamp the session
// summary. This is the SINGLE finishing line — the digital runner, the paper
// entry screen and the tablet import all end here, so a band never depends on
// how the evidence arrived.
//
// Idempotent. Calling it again after a late observation or an edited override
// re-scores from the stored raw evidence and rewrites the same rows. It deletes
// nothing, ever.

import { NextResponse, type NextRequest } from 'next/server';
import { buildMethodStatement, renderGrowthSentence, renderMapSentence, WINDOW_LABELS } from '@/lib/montree/evaluation/benchmark-map';
import type { AgeBand, TeacherOverride } from '@/lib/montree/evaluation/types';
import { badRequest, lensError, notFound } from '@/lib/lens/route-helpers';
import {
  assertAssessmentSchemaReady, loadOwnedSession, openAssessmentRoute, setupPending,
} from '@/lib/lens/assessment/bridge';
import { finalizeSession, LensAssessmentServiceError } from '@/lib/lens/assessment/session-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

interface CompleteBody {
  overrides?: TeacherOverride[];
  durationSeconds?: number | null;
  /** 'abandoned' still scores and stores what was gathered — a partial sitting is real data. */
  status?: 'completed' | 'abandoned';
}

export async function POST(request: NextRequest, { params }: Params) {
  const opened = await openAssessmentRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;
  const { id } = await params;

  // A body is optional here — the runner sends one, a "finish" tap may not.
  let body: CompleteBody = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) body = raw as CompleteBody;
  } catch {
    /* no body is fine */
  }

  const overrides = (body.overrides ?? []).filter((o) => o?.milestoneId);
  const missingReason = overrides.filter((o) => !o.reason || !o.reason.trim());
  if (missingReason.length) {
    // An override without a reason is not an override. The DB CHECK says the
    // same thing; saying it here makes it a 400 she can act on.
    return badRequest(`Give a reason for the change to ${missingReason.map((o) => o.milestoneId).join(', ')}.`);
  }

  try {
    // Verify the schema BEFORE writing. This ordering is the whole point.
    const schemaProblem = await assertAssessmentSchemaReady(ctx.supabase);
    if (schemaProblem) return schemaProblem;

    const session = await loadOwnedSession(ctx.supabase, ctx.observerId, id);
    if (!session) return notFound('That check-in isn’t yours.');

    // Double-complete is allowed and is a no-op in effect: it re-scores the same
    // stored evidence and rewrites the same rows. It is reported honestly rather
    // than silently, so the runner can tell "I finished it" from "it was already
    // finished before I got here".
    const alreadyComplete = session.status === 'completed';

    const finalized = await finalizeSession({
      supabase: ctx.supabase,
      session,
      overrides,
      durationSeconds: typeof body.durationSeconds === 'number' ? body.durationSeconds : null,
      status: body.status === 'abandoned' ? 'abandoned' : 'completed',
      overrideById: ctx.observerId,
    });

    const name = session.child_alias || 'This child';
    const ageYears = session.child_age_months ? Math.floor(session.child_age_months / 12) : 0;
    const growth = finalized.growth;
    const fromLabel = growth?.fromWindow ? (WINDOW_LABELS[growth.fromWindow]?.en ?? growth.fromWindow) : null;

    return NextResponse.json({
      ok: true,
      alreadyComplete,
      session: finalized.session,
      summary: finalized.summary,
      results: finalized.results,
      warnings: finalized.warnings,
      narrative: {
        growth: growth && fromLabel
          ? renderGrowthSentence({
            name, fromWindowLabel: fromLabel,
            movedUp: growth.movedUp, steady: growth.steady, watching: growth.watching,
          })
          : null,
        profile: renderMapSentence({
          name, ageYears, map: finalized.summary.core, ageBand: session.age_band as AgeBand,
        }),
        english: finalized.summary.efl.denominator > 0
          ? renderMapSentence({
            name, ageYears, map: finalized.summary.efl, ageBand: session.age_band as AgeBand,
          })
          : null,
      },
      method: buildMethodStatement({
        map: finalized.summary.core,
        deliveryModes: [session.delivery_mode],
      }),
    });
  } catch (error) {
    if (error instanceof LensAssessmentServiceError) {
      return error.setupPending ? setupPending(error.message) : lensError(error.message, error.cause);
    }
    return lensError('assessment:complete:post', error);
  }
}
