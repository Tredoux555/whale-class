// POST /api/lens/assessment/import — take a session JSON exported by the tablet
//
// THE DIGITAL-OFFLINE PATH. The standalone tablet build (evaluation-kit's
// D2_montree_milestones_app.html) runs with no network and no login and exports
// one JSON file per check-in. The observer uploads that file here and types the
// child's alias — the tablet knows no identity of any kind, and in Lens there is
// no roster for it to have known.
//
// Hard rules, all four carried over from the Montree copy of this route:
//   • Demo-mode exports are REFUSED. Fake data must never reach a real record.
//   • The server re-scores everything from its own bank. Client point totals are
//     kept for audit and decide nothing.
//   • A MAJOR bank-version difference is refused outright — the wording a child
//     was checked against must match the wording the report cites. A checksum
//     difference is a 409 she can override deliberately with acceptBankDrift.
//   • Practice items are dropped before anything is stored.
//
// Idempotent when `session_id` is supplied: re-uploading the same file updates
// that check-in rather than forking a second one.

import { NextResponse, type NextRequest } from 'next/server';
import { ageBandFromMonths, getBankIndex } from '@/lib/montree/evaluation/bank';
import {
  AGE_BANDS, AGE_MONTHS_MAX, AGE_MONTHS_MIN, ALL_MODULE_IDS,
  isDeliveryMode, isWindowCode, schoolYearFor,
} from '@/lib/montree/evaluation/constants';
import { buildMethodStatement } from '@/lib/montree/evaluation/benchmark-map';
import type {
  AgeBand, Band, DeliveryMode, FormCode, RawItemResponse, TabletExportPayload,
} from '@/lib/montree/evaluation/types';
import { loadOwnedSchool } from '@/lib/lens/db';
import { badRequest, lensError, notFound, readJson, requiredText, text, intOrNull } from '@/lib/lens/route-helpers';
import {
  assertAssessmentSchemaReady, loadOwnedSession, openAssessmentRoute, setupPending,
} from '@/lib/lens/assessment/bridge';
import {
  finalizeSession, LensAssessmentServiceError, persistResponses, voidObservationEvidence,
} from '@/lib/lens/assessment/session-service';
import { allowedModules, buildSessionFacts, readSessionFacts } from '@/lib/lens/assessment/session-facts';
import type { LensAssessmentSessionRow } from '@/lib/lens/assessment/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface ImportBody {
  school_id?: string;
  classroom_id?: string | null;
  child_alias?: string;
  child_age_months?: number | null;
  /** Re-import into an existing check-in instead of creating one. */
  session_id?: string | null;
  payload?: TabletExportPayload;
  acceptBankDrift?: boolean;
  school_year?: string;
  /** Was an adult who knows this child rating alongside her? See session-facts.ts. */
  co_rated?: boolean;
  co_rater?: string | null;
}

const major = (v: string): string => String(v ?? '').split('.')[0] ?? '';

export async function POST(request: NextRequest) {
  const opened = await openAssessmentRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const parsed = await readJson(request);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed as unknown as ImportBody;

  const payload = body.payload;
  if (!payload?.session) return badRequest('That file doesn’t look like a check-in export.');
  if (payload.demo === true) {
    return badRequest('That file was produced in Demo mode. Demo data is never imported into a child’s record.');
  }

  const childAlias = requiredText(body.child_alias, 120);
  if (!childAlias) return badRequest('Type a name or alias for the child.');

  const index = getBankIndex();
  const bank = index.bank;
  const bankDrift = {
    clientVersion: payload.bankVersion ?? null,
    clientChecksum: payload.bankChecksum ?? null,
    serverVersion: bank.bankVersion,
    serverChecksum: bank.bankChecksum,
    versionMatches: payload.bankVersion === bank.bankVersion,
    checksumMatches: payload.bankChecksum === bank.bankChecksum,
  };
  if (payload.bankVersion && major(payload.bankVersion) !== major(bank.bankVersion)) {
    return badRequest(
      'That file came from a different major version of the milestone bank. The wording a child was ' +
      'checked against must match the wording the report cites, so this one can’t be imported.',
    );
  }
  if (!bankDrift.checksumMatches && !body.acceptBankDrift) {
    return NextResponse.json({
      error:
        'The tablet’s bank differs from this server’s. Re-export from an up-to-date tablet, or ' +
        'import anyway — both checksums are stored either way.',
      bankDrift,
    }, { status: 409 });
  }

  const s = payload.session;
  if (!isWindowCode(s.windowCode)) return badRequest('That file has no valid check-in window on it.');
  const deliveryMode: DeliveryMode = isDeliveryMode(s.deliveryMode) ? s.deliveryMode : 'tablet';
  const schoolYear = text(body.school_year, 20) ?? (s.schoolYear?.trim() || schoolYearFor());

  const ageMonths = Number(s.ageMonths) || intOrNull(body.child_age_months, AGE_MONTHS_MIN, AGE_MONTHS_MAX) || 0;
  if (ageMonths < AGE_MONTHS_MIN || ageMonths > AGE_MONTHS_MAX) {
    return badRequest(`This check-in covers ${AGE_MONTHS_MIN}–${AGE_MONTHS_MAX} months (the file said ${s.ageMonths}).`);
  }
  const ageBand: AgeBand = (AGE_BANDS as readonly string[]).includes(s.ageBand)
    ? s.ageBand
    : ageBandFromMonths(ageMonths);
  const formCode: FormCode = s.formCode === 'B' ? 'B' : 'A';
  // The tablet has no idea who was in the room, so the co-rating fact comes from
  // the observer uploading the file, not from the export. Absent means not
  // co-rated, and an M-OBS section the tablet recorded without one is dropped
  // rather than trusted — see lib/lens/assessment/session-facts.ts.
  const coRated = body.co_rated === true;
  const coRater = coRated ? text(body.co_rater, 200) : null;
  const requestedModules = (s.modules ?? []).filter((m) => (ALL_MODULE_IDS as readonly string[]).includes(m));
  const modules = allowedModules(requestedModules, coRated);

  try {
    const schemaProblem = await assertAssessmentSchemaReady(ctx.supabase);
    if (schemaProblem) return schemaProblem;

    let session: LensAssessmentSessionRow | null = null;
    // Set when a re-import withdraws a co-rating claim this session already made.
    let coRatingWithdrawn = false;

    const existingId = text(body.session_id, 64);
    if (existingId) {
      session = await loadOwnedSession(ctx.supabase, ctx.observerId, existingId);
      if (!session) return notFound('That check-in isn’t yours.');
      // A re-import must not silently upgrade a snapshot into a co-rated sitting,
      // nor forget a co-rater already recorded: the stored fact stands unless
      // this upload explicitly asserts one, and the module list follows the fact.
      const stored = readSessionFacts(session.summary_json);
      const effectiveCoRated = body.co_rated === undefined ? stored.coRated : coRated;
      const effectiveCoRater = body.co_rated === undefined ? stored.coRater : coRater;
      const effectiveModules = allowedModules(requestedModules, effectiveCoRated);
      // 🚨 A DOWNGRADE MUST TAKE THE EVIDENCE WITH IT. Flipping co_rated true→false
      // changes what this sitting claims about who was in the room; observation
      // rows written while the claim stood are no longer evidence for it, and
      // leaving them in the table would let a re-score band milestones from
      // ratings the session now says nobody qualified gave.
      coRatingWithdrawn = stored.coRated && !effectiveCoRated;
      const { data, error } = await ctx.supabase
        .from('lens_assessment_sessions')
        .update({
          child_alias: childAlias,
          child_age_months: ageMonths,
          school_year: schoolYear,
          window_code: s.windowCode,
          age_band: ageBand,
          form_code: formCode,
          modules: effectiveModules,
          delivery_mode: deliveryMode,
          source: 'tablet_import',
          summary_json: buildSessionFacts(effectiveCoRated, effectiveCoRater),
          bank_version: bank.bankVersion,
          bank_checksum: bank.bankChecksum,
          client_bank_version: payload.bankVersion ?? null,
          client_bank_checksum: payload.bankChecksum ?? null,
          status: 'in_progress',
          started_at: s.startedAt ?? session.started_at,
          duration_seconds: s.durationSeconds ?? null,
        })
        .eq('id', session.id)
        .eq('observer_id', ctx.observerId)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      session = data as unknown as LensAssessmentSessionRow;
    } else {
      const schoolId = requiredText(body.school_id, 64);
      if (!schoolId) return badRequest('Pick the school this check-in belongs to.');
      const school = await loadOwnedSchool(ctx.supabase, ctx.observerId, schoolId);
      if (!school) return notFound('That school isn’t on your list.');

      // Same rule as starting a check-in: a named room is re-proved, never
      // silently dropped.
      let classroomId: string | null = null;
      const requestedRoom = text(body.classroom_id, 64);
      if (requestedRoom) {
        const { data, error } = await ctx.supabase
          .from('lens_classrooms')
          .select('id, school_id')
          .eq('id', requestedRoom)
          .maybeSingle();
        if (error) throw error;
        const room = data as { id: string; school_id: string } | null;
        if (!room || room.school_id !== school.id) return badRequest('That classroom isn’t in that school.');
        classroomId = room.id;
      }

      const { data, error } = await ctx.supabase
        .from('lens_assessment_sessions')
        .insert({
          observer_id: ctx.observerId,
          school_id: school.id,
          classroom_id: classroomId,
          child_alias: childAlias,
          child_age_months: ageMonths,
          school_year: schoolYear,
          window_code: s.windowCode,
          age_band: ageBand,
          form_code: formCode,
          modules,
          delivery_mode: deliveryMode,
          source: 'tablet_import',
          assessment_locale: 'en',
          bank_version: bank.bankVersion,
          bank_checksum: bank.bankChecksum,
          client_bank_version: payload.bankVersion ?? null,
          client_bank_checksum: payload.bankChecksum ?? null,
          status: 'in_progress',
          summary_json: buildSessionFacts(coRated, coRater),
          started_at: s.startedAt ?? new Date().toISOString(),
          duration_seconds: s.durationSeconds ?? null,
          // The tablet's own label for the child is kept as a note, never as an
          // identifier — she typed the alias, the tablet did not.
          notes: s.childRef ? `Tablet label: ${String(s.childRef).slice(0, 120)}` : null,
        })
        .select('*')
        .single();
      if (error) throw error;
      session = data as unknown as LensAssessmentSessionRow;
    }

    if (!session) return lensError('assessment:import', new Error('session row missing after write'));

    // Before anything is stored or re-scored. The score-time gate in
    // finalizeSession would already refuse to read these rows, but leaving live
    // observation rows on a sitting that no longer claims a co-rater would mean
    // the table and the session disagreed about what happened.
    const observationsVoided = coRatingWithdrawn
      ? await voidObservationEvidence(ctx.supabase, {
        sessionId: session.id,
        observerId: ctx.observerId,
      })
      : 0;

    // Flatten the two response shapes the tablet may emit.
    const responses: RawItemResponse[] = (payload.responses ?? []).map((r) => ({
      itemId: r.itemId,
      optionIds: r.response?.optionIds ?? r.optionIds,
      sequence: r.response?.sequence ?? r.sequence,
      rubricScore: r.response?.rubricScore ?? r.rubricScore,
      attempts: r.attempts ?? 1,
      replayCount: r.replayCount ?? 0,
      latencyMs: r.latencyMs ?? null,
      administered: r.administered !== false,
      skippedReason: r.skippedReason ?? null,
      clientPointsAwarded: typeof r.pointsAwarded === 'number' ? r.pointsAwarded : null,
      answeredAt: r.answeredAt,
    })).filter((r) => Boolean(r.itemId));

    // 🚨 A TABLET'S OBSERVATIONS ARE ONLY EVIDENCE IF SOMEBODY WHO KNEW THE CHILD
    // GAVE THEM. The offline build cannot know who was in the room, so on a
    // sitting that was not co-rated they are dropped here rather than stored: the
    // module is not in `modules`, and letting the rows in anyway would band those
    // milestones from a stranger's guess through a side door.
    const sessionIsCoRated = readSessionFacts(session.summary_json).coRated;
    const observationResponses: RawItemResponse[] = [];
    const unknownMilestoneIds: string[] = [];
    const observationsDropped = sessionIsCoRated ? 0 : (payload.observations ?? []).length;
    for (const o of sessionIsCoRated ? (payload.observations ?? []) : []) {
      const item = index.observationItemByMilestoneId.get(o.milestoneId);
      if (!item) { unknownMilestoneIds.push(o.milestoneId); continue; }
      if (!['emerging', 'developing', 'secure'].includes(o.band)) continue;
      observationResponses.push({
        itemId: item.id,
        band: o.band as Band,
        note: o.note ? o.note.slice(0, 300) : undefined,
        administered: true,
      });
    }

    const practiceDropped = responses.filter((r) => index.itemById.get(r.itemId)?.form === 'P').length;
    const storable = [
      ...responses.filter((r) => {
        const item = index.itemById.get(r.itemId);
        if (!item || item.form === 'P') return false;
        // Same rule for a plain response that happens to sit on an observation
        // item: if the module was not run, its rows are not this sitting's.
        return sessionIsCoRated || item.type !== 'observation_checklist';
      }),
      ...observationResponses,
    ];

    const written = await persistResponses({ supabase: ctx.supabase, session, responses: storable });

    const finalized = await finalizeSession({
      supabase: ctx.supabase,
      session,
      overrides: payload.overrides ?? [],
      durationSeconds: s.durationSeconds ?? null,
      status: 'completed',
      overrideById: ctx.observerId,
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      imported: {
        responsesWritten: written.written,
        observationsWritten: observationResponses.length,
        observationsDropped,
        observationsVoided,
        coRated: sessionIsCoRated,
        practiceItemsIgnored: practiceDropped,
        unknownItemIds: written.unknownItemIds,
        unknownMilestoneIds,
        clientScoreDisagreements: written.disagreements,
      },
      bankDrift,
      session: finalized.session,
      summary: finalized.summary,
      warnings: finalized.warnings,
      method: buildMethodStatement({ map: finalized.summary.core, deliveryModes: [deliveryMode] }),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof LensAssessmentServiceError) {
      return error.setupPending ? setupPending(error.message) : lensError(error.message, error.cause);
    }
    return lensError('assessment:import:post', error);
  }
}
