// app/api/montree/companion/weekly-work/route.ts
// GET  — this week's free make-it-at-home DIY work (+ whether the family has the
//        $1 DIY plan). Curated row wins; else Ivy generates one; else a template.
// POST — make an EXTRA DIY work (the $1 "DIY plan"). Gated on the diy_plan
//        entitlement; not entitled → 402 with an upsell.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { getWeeklyWork, generateExtraWork } from '@/lib/montree/companion/weekly-work';

export const maxDuration = 60;

async function childAge(supabase: ReturnType<typeof getSupabase>, childId: string): Promise<{ name?: string; ageYears: number | null }> {
  const { data: child } = await supabase.from('montree_children').select('name, date_of_birth').eq('id', childId).maybeSingle();
  let ageYears: number | null = null;
  if (child?.date_of_birth) {
    const dob = new Date(child.date_of_birth as string);
    if (!Number.isNaN(dob.getTime())) ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }
  return { name: (child?.name as string) || undefined, ageYears };
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const childId = (new URL(request.url).searchParams.get('child_id') || '').trim();
  if (!childId) return NextResponse.json({ error: 'child_id required' }, { status: 400 });

  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const supabase = getSupabase();
  try {
    const [{ name, ageYears }, { model }, diyPlan] = await Promise.all([
      childAge(supabase, childId),
      resolveReportModel(supabase, auth.schoolId),
      isFeatureEnabled(supabase, auth.schoolId, 'diy_plan').catch(() => false),
    ]);
    const work = await getWeeklyWork(supabase, { childId, childName: name, childAgeYears: ageYears, model });
    return NextResponse.json({ work, diy_plan: diyPlan }, { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' } });
  } catch (err) {
    console.error('[companion/weekly-work] GET error:', err);
    return NextResponse.json({ work: null, diy_plan: false });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { child_id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const childId = (body.child_id || '').trim();
  if (!childId) return NextResponse.json({ error: 'child_id required' }, { status: 400 });

  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const supabase = getSupabase();

  // Entitlement gate — one free work a week is the GET above; EXTRA works need the DIY plan.
  const entitled = await isFeatureEnabled(supabase, auth.schoolId, 'diy_plan').catch(() => false);
  if (!entitled) {
    return NextResponse.json({
      requires_upgrade: true,
      upgrade_url: '/montree/admin/billing',
      feature: 'diy_plan',
      price: '$1',
      error: 'You get one make-it-at-home work free each week. The DIY plan unlocks a fresh activity whenever you like — just $1.',
    }, { status: 402 });
  }

  try {
    const [{ name, ageYears }, { model }] = await Promise.all([
      childAge(supabase, childId),
      resolveReportModel(supabase, auth.schoolId),
    ]);
    const work = await generateExtraWork(supabase, { childId, childName: name, childAgeYears: ageYears, model });
    return NextResponse.json({ work }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[companion/weekly-work] POST error:', err);
    return NextResponse.json({ error: 'Could not make another work right now.' }, { status: 500 });
  }
}
