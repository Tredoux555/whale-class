/**
 * GET /api/montree/org/reports/milestones — Montree Milestones, scoped to ONE organisation.
 *
 *   ?schoolYear=2026-2027&windowCode=winter
 *
 * The org-level Milestones report finally gets a real home. Until Phase 6 it existed only as
 * a super-admin surface standing in for a tier that did not exist; now an organisation leader
 * sees exactly the same view of exactly their own schools, and nobody else's.
 *
 * Scope is taken from the caller's JWT (`organizationId`), re-checked against the admin row
 * by verifyOrgRequest(), and turned into a school-id list here. It is never accepted from the
 * request. The platform-wide route (/api/montree/evaluation/reports/org) is untouched and
 * still super-admin gated; both call the same buildOrgReport().
 *
 * Suppression is identical to every other Milestones surface: fewer than 12 reportable
 * children in a school and its percentage is withheld with the reason printed. An
 * organisation of three small schools will see participation and no percentages, which is
 * the correct and intended outcome.
 */
import { type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { schoolYearFor } from '@/lib/montree/evaluation/constants';
import type { SupabaseLike } from '@/lib/montree/evaluation/montree-bridge';
import { buildOrgReport } from '@/app/api/montree/evaluation/reports/org/aggregate';
import {
  isOrgMigrationPending, orgMigrationPending, verifyOrgRequest,
} from '@/lib/montree/org/verify-org-request';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<Response> {
  const opened = await verifyOrgRequest(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('montree_schools')
    .select('id')
    .eq('organization_id', ctx.organizationId);

  if (error) {
    if (isOrgMigrationPending(error)) return orgMigrationPending(error.message);
    console.error('[montree-org] milestones report school scope failed:', error);
    return Response.json({ available: false, error: 'Could not load your schools.' }, { status: 500 });
  }

  const schoolIds = ((data ?? []) as Array<{ id: string }>).map((s) => s.id);

  const url = new URL(request.url);
  return buildOrgReport(supabase as unknown as SupabaseLike, {
    schoolYear: url.searchParams.get('schoolYear') || schoolYearFor(),
    windowParam: url.searchParams.get('windowCode'),
    restrictToSchoolIds: schoolIds,
    emptyMessage: schoolIds.length
      ? 'None of your schools has switched Montree Milestones on yet.'
      : 'No school has joined this organization yet.',
  });
}
