// GET /api/lens/assessment/bank?ageBand=A4&formCode=A&modules=M-LIT,M-MATH
//
// The slice of the item bank one check-in needs. The full bank is 3.5 MB and
// carries item-review notes that must never reach a screen a child can read
// (bank-projection.ts strips them), so the runner asks for a projection rather
// than importing the bank into the browser bundle.
//
// Read-only, and the same gate as every other Lens route: a signed-in observer.

import { NextResponse, type NextRequest } from 'next/server';
import { projectBank } from '@/lib/montree/evaluation/bank-projection';
import { AGE_BANDS, ALL_MODULE_IDS } from '@/lib/montree/evaluation/constants';
import type { AgeBand, FormCode } from '@/lib/montree/evaluation/types';
import { openAssessmentRoute } from '@/lib/lens/assessment/bridge';
import { badRequest, lensError } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const FORMS: readonly string[] = ['A', 'B'];

export async function GET(request: NextRequest) {
  const opened = await openAssessmentRoute(request);
  if ('response' in opened) return opened.response;

  const params = request.nextUrl.searchParams;
  const ageBand = params.get('ageBand') ?? '';
  const formCode = params.get('formCode') ?? '';
  const modulesParam = params.get('modules') ?? '';

  if (!(AGE_BANDS as readonly string[]).includes(ageBand)) {
    return badRequest('Pick an age band (A3, A4, A5 or G1).');
  }
  if (!FORMS.includes(formCode)) return badRequest('Pick form A or B.');

  const moduleIds = modulesParam.split(',').map((m) => m.trim()).filter(Boolean);
  if (!moduleIds.length) return badRequest('Pick at least one module.');
  const unknown = moduleIds.filter((m) => !(ALL_MODULE_IDS as readonly string[]).includes(m));
  if (unknown.length) return badRequest(`I don’t know these modules: ${unknown.join(', ')}.`);

  try {
    // English only. Lens's chrome is hardcoded English (see app/lens/layout.tsx),
    // and the language-of-assessment gate exists for schools teaching in another
    // medium — which is a Montree-side concern, not a visiting observer's.
    const bank = projectBank({
      ageBand: ageBand as AgeBand,
      formCode: formCode as FormCode,
      moduleIds,
      assessmentLocale: 'en',
    });
    const response = NextResponse.json({ bank });
    // Private: identical for every observer on a given bank version, but only
    // ever served to an authenticated session, so no shared cache may hold it.
    response.headers.set('cache-control', 'private, max-age=300');
    return response;
  } catch (error) {
    return lensError('assessment:bank', error);
  }
}
