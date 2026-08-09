/**
 * POST /api/montree/evaluation/sessions   — start (or resume) a check-in
 * GET  /api/montree/evaluation/sessions   — list check-ins, school-scoped
 *
 * A check-in is one child sitting with one teacher. Starting one twice for the same child,
 * school year, window and delivery mode returns the SAME row — a teacher who taps start
 * again after a dropped connection resumes rather than forking the record.
 */
import {
  ageMonthsFromBirthDate, assertSchemaReady, badRequest, canopyMigrationPending,
  isCheckConstraintViolation, isMigrationPendingError, json,
  migrationPending, openRoute, readJson, requireCanopyForBand, requireChild, serverError,
} from '@/lib/montree/evaluation/route-helpers';
import { ageBandFromMonths, defaultFormForWindow, getBankIndex } from '@/lib/montree/evaluation/bank';
import {
  AGE_MONTHS_MAX, AGE_MONTHS_MIN, ALL_MODULE_IDS, CANOPY_BAND, CORE_MODULE_IDS, isAgeBand,
  isDeliveryMode, isWindowCode, schoolYearFor,
} from '@/lib/montree/evaluation/constants';
import { ensureBankVersionRow } from '@/lib/montree/evaluation/session-service';
import type { AgeBand, DeliveryMode, FormCode, WindowCode } from '@/lib/montree/evaluation/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface StartBody {
  childId: string;
  schoolYear?: string;
  windowCode: WindowCode;
  ageMonths?: number;
  ageBand?: AgeBand;
  formCode?: FormCode;
  modules?: string[];
  deliveryMode?: DeliveryMode;
  assessmentLocale?: string;
  termId?: string | null;
  notes?: string | null;
}

export async function POST(request: Request): Promise<Response> {
  const opened = await openRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const parsed = await readJson<StartBody>(request);
  if ('response' in parsed) return parsed.response;
  const body = parsed.body;

  if (!body.childId) return badRequest('child_id_required');
  if (!isWindowCode(body.windowCode)) return badRequest('invalid_window_code', 'expected autumn, winter or spring');

  const deliveryMode: DeliveryMode = isDeliveryMode(body.deliveryMode) ? body.deliveryMode : 'tablet';
  const schoolYear = body.schoolYear?.trim() || schoolYearFor();

  const childCheck = await requireChild(ctx, body.childId);
  if ('response' in childCheck) return childCheck.response;
  const child = childCheck.child;

  const classroomId = child.classroomId ?? ctx.auth.classroomId;
  if (!classroomId) {
    return badRequest('classroom_unresolved', 'This child is not attached to a classroom, so the check-in cannot be filed.');
  }

  const ageMonths = body.ageMonths ?? ageMonthsFromBirthDate(child.birthDate);
  if (typeof ageMonths !== 'number' || Number.isNaN(ageMonths)) {
    return badRequest('age_months_required', 'Supply ageMonths, or set the child’s date of birth first.');
  }
  if (ageMonths < AGE_MONTHS_MIN || ageMonths > AGE_MONTHS_MAX) {
    return badRequest('age_out_of_range', `Montree Milestones covers ${AGE_MONTHS_MIN}–${AGE_MONTHS_MAX} months.`);
  }

  // Chronological band by default; a teacher may override it deliberately.
  if (body.ageBand !== undefined && !isAgeBand(body.ageBand)) {
    return badRequest('invalid_age_band', 'expected A3, A4, A5 or G1');
  }
  const ageBand: AgeBand = body.ageBand ?? ageBandFromMonths(ageMonths);
  const formCode: FormCode = body.formCode ?? defaultFormForWindow(body.windowCode);

  // Montree Canopy (G1) rides its own flag on top of the Milestones flag openRoute checked.
  const canopyProblem = await requireCanopyForBand(ctx, ageBand);
  if (canopyProblem) return canopyProblem;

  const requested = body.modules?.length ? body.modules : [...CORE_MODULE_IDS];
  const unknownModules = requested.filter((m) => !(ALL_MODULE_IDS as readonly string[]).includes(m));
  if (unknownModules.length) return badRequest('unknown_modules', unknownModules);

  const schemaProblem = await assertSchemaReady(ctx.supabase);
  if (schemaProblem) return schemaProblem;

  const { bank } = getBankIndex();

  try {
    // Resume rather than fork.
    const { data: existing, error: findErr } = await ctx.supabase
      .from('montree_evaluation_sessions')
      .select('*')
      .eq('school_id', ctx.auth.schoolId)
      .eq('child_id', body.childId)
      .eq('school_year', schoolYear)
      .eq('window_code', body.windowCode)
      .eq('delivery_mode', deliveryMode)
      .maybeSingle();
    if (findErr) {
      if (isMigrationPendingError(findErr)) return migrationPending(findErr.message);
      return serverError('find existing session', findErr);
    }
    if (existing) {
      return json({ session: existing, resumed: true, bankVersion: bank.bankVersion, bankChecksum: bank.bankChecksum });
    }

    const { data, error } = await ctx.supabase
      .from('montree_evaluation_sessions')
      .insert({
        school_id: ctx.auth.schoolId,
        classroom_id: classroomId,
        child_id: body.childId,
        administered_by_role: ctx.auth.role === 'principal' ? 'principal' : 'teacher',
        administered_by_id: ctx.auth.userId,
        school_year: schoolYear,
        window_code: body.windowCode,
        term_id: body.termId ?? null,
        age_months: ageMonths,
        age_band: ageBand,
        form_code: formCode,
        modules: requested,
        delivery_mode: deliveryMode,
        assessment_locale: body.assessmentLocale || 'en',
        bank_version: bank.bankVersion,
        bank_checksum: bank.bankChecksum,
        source: deliveryMode === 'paper' ? 'paper_entry' : 'montree_ui',
        status: 'in_progress',
        notes: body.notes ?? null,
      })
      .select('*')
      .maybeSingle();
    if (error) {
      if (isMigrationPendingError(error)) return migrationPending(error.message);
      // Pre-migration safety: on a database whose age_band CHECK has not been widened yet,
      // a G1 insert is a 23514, not a bug. A3/A4/A5 satisfy both the old and the new
      // constraint, so this branch is unreachable for a kindergarten check-in.
      if (ageBand === CANOPY_BAND && isCheckConstraintViolation(error)) {
        return canopyMigrationPending(error.message);
      }
      return serverError('create session', error);
    }

    await ensureBankVersionRow(ctx.supabase);
    return json({ session: data, resumed: false, bankVersion: bank.bankVersion, bankChecksum: bank.bankChecksum }, 201);
  } catch (error) {
    return serverError('sessions POST', error);
  }
}

export async function GET(request: Request): Promise<Response> {
  const opened = await openRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const url = new URL(request.url);
  const childId = url.searchParams.get('childId');
  const schoolYear = url.searchParams.get('schoolYear');
  const windowCode = url.searchParams.get('windowCode');
  const status = url.searchParams.get('status');
  const classroomId = url.searchParams.get('classroomId');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100) || 100, 500);

  if (childId) {
    const childCheck = await requireChild(ctx, childId);
    if ('response' in childCheck) return childCheck.response;
  }

  try {
    let query = ctx.supabase
      .from('montree_evaluation_sessions')
      .select('id, child_id, classroom_id, school_year, window_code, age_band, form_code, modules, delivery_mode, status, started_at, completed_at, map_percent, map_denominator, map_suppressed, efl_map_percent, efl_map_denominator, efl_map_suppressed, milestones_secure, milestones_developing, milestones_emerging, milestones_unassessed, milestones_exceeded, override_count, bank_version')
      .eq('school_id', ctx.auth.schoolId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (childId) query = query.eq('child_id', childId);
    if (schoolYear) query = query.eq('school_year', schoolYear);
    if (windowCode && isWindowCode(windowCode)) query = query.eq('window_code', windowCode);
    if (status) query = query.eq('status', status);
    if (classroomId) query = query.eq('classroom_id', classroomId);

    const { data, error } = await query;
    if (error) {
      if (isMigrationPendingError(error)) return migrationPending(error.message);
      return serverError('list sessions', error);
    }
    return json({ sessions: data ?? [], count: (data ?? []).length });
  } catch (error) {
    return serverError('sessions GET', error);
  }
}
