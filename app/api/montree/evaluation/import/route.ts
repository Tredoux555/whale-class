/**
 * POST /api/montree/evaluation/import — take a session JSON exported by the tablet app
 *
 * The standalone tablet build (montree-milestones.html) runs offline on a USB stick and has
 * no login. It exports one JSON file per check-in; a teacher then uploads that file here,
 * choosing the child from their own roster. The tablet never knows a Montree child id, so
 * `childId` is supplied by the caller and `payload.session.childRef` is kept only as a label.
 *
 * Hard rules:
 *   • Demo-mode exports are REFUSED. Fake data must never reach a real child's record.
 *   • The server re-scores everything from its own bank. Client point totals are audit only.
 *   • A bank version mismatch is reported, and a MAJOR mismatch is refused — the wording a
 *     child was checked against must match the wording the report cites.
 *   • Idempotent: re-importing the same file updates the same session instead of forking it.
 */
import {
  ageMonthsFromBirthDate, assertSchemaReady, badRequest, isMigrationPendingError, json,
  migrationPending, openRoute, readJson, requireChild, serverError,
} from '@/lib/montree/evaluation/route-helpers';
import { ageBandFromMonths, getBankIndex } from '@/lib/montree/evaluation/bank';
import {
  AGE_MONTHS_MAX, AGE_MONTHS_MIN, ALL_MODULE_IDS, isDeliveryMode, isWindowCode, schoolYearFor,
} from '@/lib/montree/evaluation/constants';
import {
  ensureBankVersionRow, finalizeSession, persistResponses, ServiceError,
} from '@/lib/montree/evaluation/session-service';
import { buildMethodStatement } from '@/lib/montree/evaluation/benchmark-map';
import type {
  AgeBand, Band, DeliveryMode, EvaluationSessionRow, FormCode, RawItemResponse, TabletExportPayload,
} from '@/lib/montree/evaluation/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface ImportBody {
  childId: string;
  payload: TabletExportPayload;
  /** Set true to accept a minor bank-version difference. Major differences are always refused. */
  acceptBankDrift?: boolean;
  schoolYear?: string;
}

const major = (v: string): string => String(v ?? '').split('.')[0] ?? '';

export async function POST(request: Request): Promise<Response> {
  const opened = await openRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const parsed = await readJson<ImportBody>(request);
  if ('response' in parsed) return parsed.response;
  const { childId, payload, acceptBankDrift } = parsed.body;

  if (!childId) return badRequest('child_id_required', 'Choose the child this check-in belongs to.');
  if (!payload?.session) return badRequest('invalid_payload', 'Expected { childId, payload } with payload.session.');
  if (payload.demo === true) {
    return badRequest('demo_export_refused', 'This file was produced in Demo mode. Demo data is never imported into a child’s record.');
  }

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
    return badRequest('bank_version_mismatch', {
      ...bankDrift,
      message: 'This file was produced by a different major version of the milestone bank. The wording a child was checked against must match the wording the report cites.',
    });
  }
  if (!bankDrift.checksumMatches && !acceptBankDrift) {
    return json({
      error: 'bank_checksum_mismatch',
      detail: {
        ...bankDrift,
        message: 'The tablet’s bank differs from this server’s. Re-export from an up-to-date tablet build, or resend with acceptBankDrift:true to import anyway (both checksums are stored).',
      },
    }, 409);
  }

  const s = payload.session;
  if (!isWindowCode(s.windowCode)) return badRequest('invalid_window_code');
  const deliveryMode: DeliveryMode = isDeliveryMode(s.deliveryMode) ? s.deliveryMode : 'tablet';
  const schoolYear = parsed.body.schoolYear?.trim() || s.schoolYear?.trim() || schoolYearFor();

  const childCheck = await requireChild(ctx, childId);
  if ('response' in childCheck) return childCheck.response;
  const child = childCheck.child;

  const classroomId = child.classroomId ?? ctx.auth.classroomId;
  if (!classroomId) return badRequest('classroom_unresolved', 'This child is not attached to a classroom.');

  const ageMonths = Number(s.ageMonths) || ageMonthsFromBirthDate(child.birthDate) || 0;
  if (ageMonths < AGE_MONTHS_MIN || ageMonths > AGE_MONTHS_MAX) {
    return badRequest('age_out_of_range', `Montree Milestones covers ${AGE_MONTHS_MIN}–${AGE_MONTHS_MAX} months (file said ${s.ageMonths}).`);
  }
  const ageBand: AgeBand = (['A3', 'A4', 'A5'] as const).includes(s.ageBand) ? s.ageBand : ageBandFromMonths(ageMonths);
  const formCode: FormCode = s.formCode === 'B' ? 'B' : 'A';
  const modules = (s.modules ?? []).filter((m) => (ALL_MODULE_IDS as readonly string[]).includes(m));

  const schemaProblem = await assertSchemaReady(ctx.supabase);
  if (schemaProblem) return schemaProblem;

  try {
    const sessionPatch = {
      school_id: ctx.auth.schoolId,
      classroom_id: classroomId,
      child_id: childId,
      administered_by_role: ctx.auth.role === 'principal' ? 'principal' : 'teacher',
      administered_by_id: ctx.auth.userId,
      school_year: schoolYear,
      window_code: s.windowCode,
      age_months: ageMonths,
      age_band: ageBand,
      form_code: formCode,
      modules,
      delivery_mode: deliveryMode,
      assessment_locale: s.assessmentLocale || 'en',
      bank_version: bank.bankVersion,
      bank_checksum: bank.bankChecksum,
      client_bank_version: payload.bankVersion ?? null,
      client_bank_checksum: payload.bankChecksum ?? null,
      source: 'tablet_import',
      status: 'in_progress',
      started_at: s.startedAt ?? new Date().toISOString(),
      duration_seconds: s.durationSeconds ?? null,
      notes: s.childRef ? `Tablet label: ${String(s.childRef).slice(0, 120)}` : null,
    };

    const { data: sessionRow, error: upsertErr } = await ctx.supabase
      .from('montree_evaluation_sessions')
      .upsert(sessionPatch, { onConflict: 'child_id,school_year,window_code,delivery_mode' })
      .select('*')
      .maybeSingle();
    if (upsertErr) {
      if (isMigrationPendingError(upsertErr)) return migrationPending(upsertErr.message);
      return serverError('import session upsert', upsertErr);
    }
    const session = sessionRow as EvaluationSessionRow;

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

    const observationResponses: RawItemResponse[] = [];
    const unknownMilestoneIds: string[] = [];
    for (const o of payload.observations ?? []) {
      const item = index.observationItemByMilestoneId.get(o.milestoneId);
      if (!item) { unknownMilestoneIds.push(o.milestoneId); continue; }
      if (!['emerging', 'developing', 'secure'].includes(o.band)) continue;
      observationResponses.push({
        itemId: item.id,
        band: o.band as Band,
        note: o.note ? o.note.slice(0, 300) : undefined,
        evidenceMediaId: o.evidenceMediaId ?? null,
        administered: true,
      });
    }

    // Practice items must never enter a child's record.
    const practiceDropped = responses.filter((r) => index.itemById.get(r.itemId)?.form === 'P').length;
    const storable = [...responses.filter((r) => index.itemById.get(r.itemId)?.form !== 'P'), ...observationResponses];

    const written = await persistResponses({ ctx, session, responses: storable });

    const finalized = await finalizeSession({
      ctx,
      session,
      overrides: payload.overrides ?? [],
      durationSeconds: s.durationSeconds ?? null,
      status: 'completed',
      overrideByRole: ctx.auth.role === 'principal' ? 'principal' : 'teacher',
      overrideById: ctx.auth.userId,
    });

    await ensureBankVersionRow(ctx.supabase);

    return json({
      ok: true,
      sessionId: session.id,
      imported: {
        responsesWritten: written.written,
        observationsWritten: observationResponses.length,
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
    }, 201);
  } catch (error) {
    if (error instanceof ServiceError) {
      return error.migrationPending
        ? migrationPending(String((error.cause as { message?: string })?.message ?? error.message))
        : serverError(error.message, error.cause);
    }
    return serverError('import POST', error);
  }
}
