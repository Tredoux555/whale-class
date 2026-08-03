/**
 * POST /api/montree/evaluation/sessions/[sessionId]/complete
 *
 * Finalise a check-in: re-score every stored response against the bank, band each milestone,
 * write one result row per milestone, and stamp the session summary (MAP for both tracks,
 * suppression reasons, per-domain roll-ups, growth against the previous window).
 *
 * Two rules this route exists to honour:
 *   • It VERIFIES its target columns exist before writing anything (the migration-311 lesson).
 *   • It DELETES NOTHING. This module stores no raw media, so the delete-after-commit hazard
 *     that caused silent, unrecoverable data loss elsewhere cannot recur here.
 *
 * Idempotent — call it again after a teacher edits an override or adds a late observation.
 */
import {
  assertSchemaReady, badRequest, json, migrationPending, openRoute, readJson, serverError,
} from '@/lib/montree/evaluation/route-helpers';
import { finalizeSession, loadSession, ServiceError } from '@/lib/montree/evaluation/session-service';
import { buildMethodStatement, renderGrowthSentence, renderMapSentence, WINDOW_LABELS } from '@/lib/montree/evaluation/benchmark-map';
import { ageYearsFromMonths } from '@/lib/montree/evaluation/route-helpers';
import type { TeacherOverride } from '@/lib/montree/evaluation/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface CompleteBody {
  /** Teacher overrides. A reason is required — an override without one is rejected, not ignored. */
  overrides?: TeacherOverride[];
  durationSeconds?: number | null;
  /** 'abandoned' still scores and stores what was gathered — partial sittings are valid data. */
  status?: 'completed' | 'abandoned';
  childName?: string;
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

  const parsed = await readJson<CompleteBody>(request).catch(() => ({ body: {} as CompleteBody }));
  const body = 'body' in parsed ? parsed.body : ({} as CompleteBody);

  const overrides = (body.overrides ?? []).filter((o) => o?.milestoneId);
  const missingReason = overrides.filter((o) => !o.reason || !o.reason.trim());
  if (missingReason.length) {
    return badRequest('override_reason_required', missingReason.map((o) => o.milestoneId));
  }

  // Verify the schema BEFORE writing. This ordering is the whole point of the route.
  const schemaProblem = await assertSchemaReady(ctx.supabase);
  if (schemaProblem) return schemaProblem;

  try {
    const session = await loadSession(ctx.supabase, sessionId, ctx.auth.schoolId);
    if (!session) return json({ error: 'session_not_found' }, 404);

    const finalized = await finalizeSession({
      ctx,
      session,
      overrides,
      durationSeconds: body.durationSeconds ?? null,
      status: body.status ?? 'completed',
      overrideByRole: ctx.auth.role === 'principal' ? 'principal' : 'teacher',
      overrideById: ctx.auth.userId,
    });

    const name = body.childName?.trim() || 'This child';
    const ageYears = ageYearsFromMonths(session.age_months);
    const growth = finalized.growth;
    const fromLabel = growth?.fromWindow ? (WINDOW_LABELS[growth.fromWindow]?.en ?? growth.fromWindow) : null;

    return json({
      ok: true,
      session: finalized.session,
      summary: finalized.summary,
      results: finalized.results,
      warnings: finalized.warnings,
      narrative: {
        // Growth is the headline; the profile figure is secondary context.
        growth: growth && fromLabel
          ? renderGrowthSentence({ name, fromWindowLabel: fromLabel, movedUp: growth.movedUp, steady: growth.steady, watching: growth.watching })
          : null,
        profile: renderMapSentence({ name, ageYears, map: finalized.summary.core }),
        english: finalized.summary.efl.denominator > 0
          ? renderMapSentence({ name, ageYears, map: finalized.summary.efl })
          : null,
      },
      method: buildMethodStatement({
        map: finalized.summary.core,
        deliveryModes: [session.delivery_mode],
      }),
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return error.migrationPending
        ? migrationPending(String((error.cause as { message?: string })?.message ?? error.message))
        : serverError(error.message, error.cause);
    }
    return serverError('complete POST', error);
  }
}
