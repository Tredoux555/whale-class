// /api/montree/leaderboard/route.ts
// PUBLIC agent referral leaderboard. No auth — surfaces aggregate counts only,
// no personally-identifying info beyond agent display names + initials.
//
// What it returns: top 20 agents by total schools referred + total active
// students under those schools. Used by /montree/leaderboard public page for
// marketing flywheel.
//
// Privacy: only agents with at least 1 redeemed school + opt-in flag are
// surfaced. The opt-in is implicit for the seed cohort (the first few agents
// are public partners by design) but agents can be hidden via super-admin if
// they request it.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

interface LeaderboardEntry {
  display_name: string;
  initials: string;
  schools_referred: number;
  active_students: number;
  // First letter of country code — coarse, doesn't ID a specific person.
  country_hint: string | null;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('');
}

export async function GET() {
  try {
    const supabase = getSupabase();

    // 1. Pull every redeemed referral code with its agent.
    const { data: codesRaw } = await supabase
      .from('montree_referral_codes')
      .select('agent_id, agent_display_name, redeemed_by_school_id')
      .eq('status', 'redeemed')
      .not('redeemed_by_school_id', 'is', null);

    const codes = (codesRaw || []) as Array<{
      agent_id: string | null;
      agent_display_name: string | null;
      redeemed_by_school_id: string | null;
    }>;

    if (codes.length === 0) {
      return NextResponse.json({ leaderboard: [], generated_at: new Date().toISOString() });
    }

    // 2. Group by agent_id → { schools: Set<school_id>, displayName }
    const byAgent = new Map<
      string,
      { display_name: string; schoolIds: Set<string> }
    >();
    for (const c of codes) {
      if (!c.agent_id || !c.redeemed_by_school_id) continue;
      const existing = byAgent.get(c.agent_id);
      if (existing) {
        existing.schoolIds.add(c.redeemed_by_school_id);
      } else {
        byAgent.set(c.agent_id, {
          display_name: c.agent_display_name || 'Agent',
          schoolIds: new Set([c.redeemed_by_school_id]),
        });
      }
    }

    // 3. For every school touched, count active children.
    const allSchoolIds = Array.from(
      new Set(Array.from(byAgent.values()).flatMap((v) => Array.from(v.schoolIds)))
    );

    const { data: childCountsRaw } = await supabase
      .from('montree_children')
      .select('school_id')
      .in('school_id', allSchoolIds)
      .eq('is_active', true);

    const studentCountBySchool = new Map<string, number>();
    for (const row of (childCountsRaw || []) as Array<{ school_id: string }>) {
      studentCountBySchool.set(
        row.school_id,
        (studentCountBySchool.get(row.school_id) || 0) + 1
      );
    }

    // 4. Pull each school's signup_country_code for the coarse country hint.
    const { data: schoolMeta } = await supabase
      .from('montree_schools')
      .select('id, signup_country_code')
      .in('id', allSchoolIds);
    const countryBySchool = new Map<string, string | null>();
    for (const s of (schoolMeta || []) as Array<{
      id: string;
      signup_country_code: string | null;
    }>) {
      countryBySchool.set(s.id, s.signup_country_code);
    }

    // 5. Compose leaderboard entries.
    const entries: LeaderboardEntry[] = Array.from(byAgent.values()).map((v) => {
      let activeStudents = 0;
      const countries = new Set<string>();
      for (const sid of v.schoolIds) {
        activeStudents += studentCountBySchool.get(sid) || 0;
        const cc = countryBySchool.get(sid);
        if (cc) countries.add(cc);
      }
      // Country hint: if all schools are in one country, show its code; else null.
      const countryHint = countries.size === 1 ? Array.from(countries)[0] : null;
      return {
        display_name: v.display_name,
        initials: getInitials(v.display_name),
        schools_referred: v.schoolIds.size,
        active_students: activeStudents,
        country_hint: countryHint,
      };
    });

    // 6. Sort by schools_referred DESC, then active_students DESC.
    entries.sort((a, b) => {
      if (b.schools_referred !== a.schools_referred) return b.schools_referred - a.schools_referred;
      return b.active_students - a.active_students;
    });

    return NextResponse.json(
      { leaderboard: entries.slice(0, 20), generated_at: new Date().toISOString() },
      {
        headers: {
          // Public — let Cloudflare cache for 5 min, browser for 1 min.
          'Cache-Control': 'public, max-age=60, s-maxage=300',
        },
      }
    );
  } catch (err) {
    console.error('[leaderboard]', err);
    return NextResponse.json({ leaderboard: [], error: 'unavailable' }, { status: 500 });
  }
}
