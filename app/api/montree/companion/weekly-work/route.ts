// app/api/montree/companion/weekly-work/route.ts
// GET this week's make-it-at-home DIY work for a child (for the Plan view).
// Curated row wins; otherwise Ivy generates one (tier-aware) and caches it.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { getWeeklyWork } from '@/lib/montree/companion/weekly-work';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const childId = (searchParams.get('child_id') || '').trim();
  if (!childId) return NextResponse.json({ error: 'child_id required' }, { status: 400 });

  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const supabase = getSupabase();

  try {
    const { data: child } = await supabase.from('montree_children').select('name, date_of_birth').eq('id', childId).maybeSingle();
    let ageYears: number | null = null;
    if (child?.date_of_birth) {
      const dob = new Date(child.date_of_birth as string);
      if (!Number.isNaN(dob.getTime())) ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    }
    const { model } = await resolveReportModel(supabase, auth.schoolId);
    const work = await getWeeklyWork(supabase, {
      childId,
      childName: (child?.name as string) || undefined,
      childAgeYears: ageYears,
      model,
    });
    return NextResponse.json({ work }, { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' } });
  } catch (err) {
    console.error('[companion/weekly-work] GET error:', err);
    return NextResponse.json({ work: null });
  }
}
