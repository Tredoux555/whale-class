// /api/montree/agent/snapshot/route.ts
// Mira's proactive snapshot for the agent dashboard.
//
// Returns per-school activity signals so the agent can see at a glance which
// schools are growing / quiet / need outreach. Powers the proactive card.
//
// Signals per school:
//   - Active student count (now)
//   - Students added in last 7 days (growth signal)
//   - Photos uploaded in last 30 days (engagement signal)
//   - Last guru interaction (warmth signal)
//
// Cross-pollination: filter by founding_teacher_id = auth.userId.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

interface SchoolSnapshot {
  school_id: string;
  school_name: string | null;
  active_students: number;
  students_added_7d: number;
  photos_30d: number;
  last_guru_interaction: string | null;
  last_photo_at: string | null;
  signal: 'growing' | 'active' | 'quiet' | 'silent';
  // Suggested action — i18n key + params so client renders in user's locale.
  // English text retained as `suggested_action` for back-compat fallback.
  suggested_action: string | null;
  suggested_action_key: string | null;
  suggested_action_params: Record<string, number> | null;
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const supabase = getSupabase();

  // 🚨 Session 113 V2 — Defense in depth: verify the JWT subject is still
  // an active, non-suspended agent at the DB layer. A token issued before
  // suspension would otherwise pass role check at JWT level. Mirrors the
  // pattern from /agent/me + /agent/codes.
  const { data: agentRow } = await supabase
    .from('montree_teachers')
    .select('id, is_agent, agent_suspended_at')
    .eq('id', auth.userId)
    .maybeSingle();
  if (!agentRow || !agentRow.is_agent) {
    return NextResponse.json({ error: 'Forbidden — not an agent' }, { status: 403 });
  }
  if (agentRow.agent_suspended_at) {
    return NextResponse.json({ error: 'Agent suspended' }, { status: 403 });
  }

  // Schools founded by this agent.
  const { data: schoolsRaw } = await supabase
    .from('montree_schools')
    .select('id, name')
    .eq('founding_teacher_id', auth.userId);

  const schools = (schoolsRaw || []) as Array<{ id: string; name: string | null }>;
  if (schools.length === 0) {
    return NextResponse.json({
      snapshots: [],
      summary: { total_schools: 0, total_active_students: 0, total_growth_7d: 0 },
    });
  }
  const schoolIds = schools.map((s) => s.id);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Active students by school.
  const { data: childrenRows } = await supabase
    .from('montree_children')
    .select('school_id, enrolled_at, is_active')
    .in('school_id', schoolIds);

  const activeCounts: Record<string, number> = {};
  const recentAddCounts: Record<string, number> = {};
  for (const row of (childrenRows || []) as Array<{ school_id: string; enrolled_at: string | null; is_active: boolean }>) {
    if (!row.is_active) continue;
    activeCounts[row.school_id] = (activeCounts[row.school_id] || 0) + 1;
    if (row.enrolled_at && row.enrolled_at >= sevenDaysAgo) {
      recentAddCounts[row.school_id] = (recentAddCounts[row.school_id] || 0) + 1;
    }
  }

  // Recent media — last 30 days per school.
  const { data: mediaRows } = await supabase
    .from('montree_media')
    .select('school_id, created_at')
    .in('school_id', schoolIds)
    .gte('created_at', thirtyDaysAgo);

  const photoCounts: Record<string, number> = {};
  const lastPhotoAt: Record<string, string> = {};
  for (const row of (mediaRows || []) as Array<{ school_id: string; created_at: string }>) {
    photoCounts[row.school_id] = (photoCounts[row.school_id] || 0) + 1;
    if (!lastPhotoAt[row.school_id] || row.created_at > lastPhotoAt[row.school_id]) {
      lastPhotoAt[row.school_id] = row.created_at;
    }
  }

  // Last guru interaction per school (proxy for principal engagement).
  // Join via children → school.
  const childToSchool: Record<string, string> = {};
  for (const row of (childrenRows || []) as Array<{ school_id: string; id?: string }>) {
    if ((row as { id?: string }).id) childToSchool[(row as { id: string }).id] = row.school_id;
  }
  // We need child IDs — refetch with id.
  const { data: childrenWithId } = await supabase
    .from('montree_children')
    .select('id, school_id')
    .in('school_id', schoolIds);
  const c2s: Record<string, string> = {};
  for (const r of (childrenWithId || []) as Array<{ id: string; school_id: string }>) {
    c2s[r.id] = r.school_id;
  }

  const childIds = Object.keys(c2s);
  const lastGuruAt: Record<string, string> = {};
  if (childIds.length > 0) {
    const { data: guruRows } = await supabase
      .from('montree_guru_interactions')
      .select('child_id, asked_at')
      .in('child_id', childIds)
      .order('asked_at', { ascending: false })
      .limit(500);
    for (const row of (guruRows || []) as Array<{ child_id: string; asked_at: string }>) {
      const sid = c2s[row.child_id];
      if (!sid) continue;
      if (!lastGuruAt[sid] || row.asked_at > lastGuruAt[sid]) {
        lastGuruAt[sid] = row.asked_at;
      }
    }
  }

  // Compose snapshots.
  const now = Date.now();
  const snapshots: SchoolSnapshot[] = schools.map((s) => {
    const activeStudents = activeCounts[s.id] || 0;
    const added7d = recentAddCounts[s.id] || 0;
    const photos30d = photoCounts[s.id] || 0;
    const lastGuru = lastGuruAt[s.id] || null;
    const lastPhoto = lastPhotoAt[s.id] || null;

    const lastAnyActivity = [lastGuru, lastPhoto].filter(Boolean).sort().pop() || null;
    const daysSinceActivity = lastAnyActivity
      ? Math.floor((now - new Date(lastAnyActivity).getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    let signal: SchoolSnapshot['signal'];
    let suggested_action: string | null = null;
    let suggested_action_key: string | null = null;
    let suggested_action_params: Record<string, number> | null = null;
    if (added7d >= 2) {
      signal = 'growing';
      suggested_action = `${added7d} new students added this week — message the principal to celebrate.`;
      suggested_action_key = 'mira.action.growing';
      suggested_action_params = { count: added7d };
    } else if (photos30d >= 20 || daysSinceActivity < 3) {
      signal = 'active';
      suggested_action = null;
    } else if (daysSinceActivity < 14) {
      signal = 'quiet';
      suggested_action = `Last activity ${daysSinceActivity}d ago — gentle check-in if the school feels stalled.`;
      suggested_action_key = 'mira.action.quiet';
      suggested_action_params = { days: daysSinceActivity };
    } else {
      signal = 'silent';
      if (daysSinceActivity === Infinity) {
        suggested_action = 'No activity captured yet — message the principal about onboarding their first photo.';
        suggested_action_key = 'mira.action.silentNever';
      } else {
        suggested_action = `Silent for ${daysSinceActivity}d. Reach out before they churn.`;
        suggested_action_key = 'mira.action.silentDays';
        suggested_action_params = { days: daysSinceActivity };
      }
    }

    return {
      school_id: s.id,
      school_name: s.name,
      active_students: activeStudents,
      students_added_7d: added7d,
      photos_30d: photos30d,
      last_guru_interaction: lastGuru,
      last_photo_at: lastPhoto,
      signal,
      suggested_action,
      suggested_action_key,
      suggested_action_params,
    };
  });

  // Sort: growing first, then silent (needs attention), then quiet, then active.
  const order: Record<SchoolSnapshot['signal'], number> = { growing: 0, silent: 1, quiet: 2, active: 3 };
  snapshots.sort((a, b) => order[a.signal] - order[b.signal]);

  const totalActive = snapshots.reduce((acc, s) => acc + s.active_students, 0);
  const totalGrowth = snapshots.reduce((acc, s) => acc + s.students_added_7d, 0);

  return NextResponse.json({
    snapshots,
    summary: {
      total_schools: schools.length,
      total_active_students: totalActive,
      total_growth_7d: totalGrowth,
    },
  });
}
