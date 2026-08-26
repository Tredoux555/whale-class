/**
 * GET /api/montree/evaluation/bank?ageBand=A4&formCode=A&modules=M-LIT,M-MATH
 *
 * The slice of the item bank one sitting needs. The full bank is 1.6 MB and carries
 * item-review notes that must never reach a screen a teacher or child can read
 * (see lib/montree/evaluation/bank-projection.ts) — so the runner asks for a projection
 * instead of importing the bank into the browser bundle.
 *
 * Read-only. Same gate as every other evaluation route: authenticated teacher or
 * principal, `child_evaluation` on for the school.
 */
import { badRequest, json, openRoute, requireCanopyForBand, serverError } from '@/lib/montree/evaluation/route-helpers';
import { isFeatureEnabled } from '@/lib/montree/evaluation/montree-bridge';
import { ENGLISH_MEDIUM_LITERACY_FEATURE_KEY } from '@/lib/montree/evaluation/locale-gate';
import { projectBank } from '@/lib/montree/evaluation/bank-projection';
import { AGE_BANDS, ALL_MODULE_IDS } from '@/lib/montree/evaluation/constants';
import type { AgeBand, FormCode } from '@/lib/montree/evaluation/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const FORMS: readonly string[] = ['A', 'B'];

export async function GET(request: Request): Promise<Response> {
  const opened = await openRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const url = new URL(request.url);
  const ageBand = url.searchParams.get('ageBand') ?? '';
  const formCode = url.searchParams.get('formCode') ?? '';
  const modulesParam = url.searchParams.get('modules') ?? '';
  // Language of assessment. Absent ⇒ English ⇒ the projection is exactly what it always was.
  const assessmentLocale = url.searchParams.get('assessmentLocale') || 'en';

  if (!(AGE_BANDS as readonly string[]).includes(ageBand)) {
    return badRequest('invalid_age_band', 'expected A3, A4, A5 or G1');
  }
  if (!FORMS.includes(formCode)) return badRequest('invalid_form_code', 'expected A or B');

  // Montree Canopy (G1) rides its own flag on top of the Milestones flag openRoute checked.
  const canopyProblem = await requireCanopyForBand(ctx, ageBand);
  if (canopyProblem) return canopyProblem;

  const moduleIds = modulesParam.split(',').map((m) => m.trim()).filter(Boolean);
  if (!moduleIds.length) return badRequest('modules_required', 'expected a comma-separated module list');
  const unknown = moduleIds.filter((m) => !(ALL_MODULE_IDS as readonly string[]).includes(m));
  if (unknown.length) return badRequest('unknown_modules', unknown);

  try {
    // FIX E — the English-medium literacy strands are gated on the school's PROGRAMME, not
    // on the language of the sitting. A bilingual school that teaches English phonics keeps
    // LCL-C / LCL-D in the slice under a `zh` sitting; every other school is unaffected.
    // Fails closed: a flag lookup that blows up leaves the gate exactly as it was.
    let englishMediumLiteracy = false;
    try {
      englishMediumLiteracy = await isFeatureEnabled(ctx.auth.schoolId, ENGLISH_MEDIUM_LITERACY_FEATURE_KEY);
    } catch {
      englishMediumLiteracy = false;
    }

    const bank = projectBank({
      ageBand: ageBand as AgeBand,
      formCode: formCode as FormCode,
      moduleIds,
      assessmentLocale,
      englishMediumLiteracy,
    });
    const response = json({ available: true, bank, englishMediumLiteracy });
    // Private: the projection is identical for every school on a given bank version, but it
    // is only served to an authenticated session, so no shared cache may hold it.
    response.headers.set('cache-control', 'private, max-age=300');
    return response;
  } catch (error) {
    return serverError('bank projection', error);
  }
}
