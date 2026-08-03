// app/api/montree/org/schools/route.ts
//
// GET — the organisation's schools, with the handful of numbers an org leader actually
// asks about: how many children, how many teachers, and whether Montree Milestones is
// switched on there yet.
//
// Deliberately NOT here: anything about an individual child, classroom or teacher. An org
// leader who needs that detail asks the principal, who has the school view. The same line
// the Milestones reflection reports draw is drawn here.
//
// Also returns the organisation itself, so the dashboard can render its header from one
// request instead of two.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import {
  isOrgMigrationPending, orgMigrationPending, verifyOrgRequest,
} from '@/lib/montree/org/verify-org-request';
import { loadFeatureScope, schoolHasFeature } from '@/app/api/montree/evaluation/reports/_shared';
import type { SupabaseLike } from '@/lib/montree/evaluation/montree-bridge';

export const dynamic = 'force-dynamic';

interface SchoolRow {
  id: string;
  name: string | null;
  slug: string | null;
  created_at: string | null;
  owner_name: string | null;
  owner_email: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
}

export async function GET(request: NextRequest) {
  const opened = await verifyOrgRequest(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const supabase = getSupabase();

  const { data: schoolData, error: schoolErr } = await supabase
    .from('montree_schools')
    .select('id, name, slug, created_at, owner_name, owner_email, subscription_status, trial_ends_at')
    .eq('organization_id', ctx.organizationId)
    .order('name', { ascending: true });

  if (schoolErr) {
    if (isOrgMigrationPending(schoolErr)) return orgMigrationPending(schoolErr.message);
    console.error('[montree-org] schools list failed:', schoolErr);
    return NextResponse.json({ error: 'Could not load your schools.' }, { status: 500 });
  }

  const schools = (schoolData ?? []) as SchoolRow[];
  const ids = schools.map((s) => s.id);

  // Counts are done as three bulk reads and tallied in memory rather than N queries per
  // school — an organisation with forty schools should still be one round trip each.
  const tally = async (table: string): Promise<Map<string, number>> => {
    const out = new Map<string, number>();
    if (!ids.length) return out;
    const { data, error } = await supabase.from(table).select('school_id').in('school_id', ids);
    if (error) {
      // A missing count is a dash in the UI, never a failed page.
      console.error(`[montree-org] count failed for ${table}:`, error);
      return out;
    }
    for (const row of (data ?? []) as Array<{ school_id: string }>) {
      out.set(row.school_id, (out.get(row.school_id) ?? 0) + 1);
    }
    return out;
  };

  const [children, teachers] = await Promise.all([
    tally('montree_children'),
    tally('montree_teachers'),
  ]);

  // Milestones participation: is the flag on, and has anyone finished a check-in? Both are
  // best-effort — an organisation dashboard must render even on a database where migration
  // 314 was never run.
  const milestonesOn = new Set<string>();
  const completedSessions = new Map<string, number>();
  try {
    const { scope } = await loadFeatureScope(supabase as unknown as SupabaseLike);
    if (scope) {
      for (const id of ids) if (schoolHasFeature(scope, id)) milestonesOn.add(id);
    }
    if (ids.length) {
      const { data: sessions } = await supabase
        .from('montree_evaluation_sessions')
        .select('school_id, status')
        .in('school_id', ids)
        .eq('status', 'completed');
      for (const row of (sessions ?? []) as Array<{ school_id: string }>) {
        completedSessions.set(row.school_id, (completedSessions.get(row.school_id) ?? 0) + 1);
      }
    }
  } catch (error) {
    console.error('[montree-org] milestones participation lookup failed:', error);
  }

  return NextResponse.json(
    {
      available: true,
      organization: {
        id: ctx.organizationId,
        name: ctx.organizationName,
        slug: ctx.organizationSlug,
      },
      admin: { id: ctx.adminId, name: ctx.adminName, email: ctx.adminEmail },
      schools: schools.map((s) => ({
        id: s.id,
        name: s.name ?? 'School',
        slug: s.slug,
        createdAt: s.created_at,
        principalName: s.owner_name,
        principalEmail: s.owner_email,
        subscriptionStatus: s.subscription_status,
        trialEndsAt: s.trial_ends_at,
        childCount: children.get(s.id) ?? 0,
        teacherCount: teachers.get(s.id) ?? 0,
        milestonesEnabled: milestonesOn.has(s.id),
        milestonesCheckIns: completedSessions.get(s.id) ?? 0,
      })),
      totals: {
        schools: schools.length,
        children: [...children.values()].reduce((a, b) => a + b, 0),
        teachers: [...teachers.values()].reduce((a, b) => a + b, 0),
        milestonesSchools: milestonesOn.size,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
