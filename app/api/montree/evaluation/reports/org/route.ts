/**
 * GET /api/montree/evaluation/reports/org — the PLATFORM-WIDE multi-school view.
 *
 *   ?schoolYear=2026-2027&windowCode=winter
 *
 * Gated on super-admin (`openOrgReport()` in ../_shared.ts): every school on the platform
 * that has opted into `child_evaluation`, side by side.
 *
 * Phase 6 note: a real organisation role now exists (`org_admin`, migration 315), and it has
 * its own scoped home at GET /api/montree/org/reports/milestones. That route and this one
 * share ONE implementation — `buildOrgReport()` in ./aggregate.ts — differing only in which
 * schools are in scope. This route is unchanged in behaviour: it stays platform-wide, it
 * stays super-admin gated, and it stays the view Tredoux uses.
 *
 * Aggregate only, one row per school, and every row obeys the same suppression rules as the
 * single-school view: a school with fewer than 12 reportable children shows its participation
 * and its band picture, never a percentage. No child ids, no child names, and no classroom
 * breakdown — an org leader who needs that detail asks the principal, who has the school view.
 */
import { type NextRequest } from 'next/server';
import { schoolYearFor } from '@/lib/montree/evaluation/constants';
import { openOrgReport } from '../_shared';
import { buildOrgReport } from './aggregate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<Response> {
  const opened = await openOrgReport(request);
  if ('response' in opened) return opened.response;
  const { supabase } = opened;

  const url = new URL(request.url);
  return buildOrgReport(supabase, {
    schoolYear: url.searchParams.get('schoolYear') || schoolYearFor(),
    windowParam: url.searchParams.get('windowCode'),
    restrictToSchoolIds: null,
  });
}
