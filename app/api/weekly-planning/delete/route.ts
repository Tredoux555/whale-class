// /api/weekly-planning/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { planId, weekNumber, year } = await request.json();

    // Delete by planId or by week/year
    if (planId) {
      // Get week/year first to delete assignments
      const { data: plan } = await supabase
        .from('weekly_plans')
        .select('week_number, year')
        .eq('id', planId)
        .single();

      if (plan) {
        // Delete assignments for this week
        await supabase
          .from('weekly_assignments')
          .delete()
          .eq('week_number', plan.week_number)
          .eq('year', plan.year);
      }

      // Delete the plan
      const { error } = await supabase
        .from('weekly_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

    } else if (weekNumber && year) {
      // Delete by week/year
      await supabase
        .from('weekly_assignments')
        .delete()
        .eq('week_number', weekNumber)
        .eq('year', year);

      await supabase
        .from('weekly_plans')
        .delete()
        .eq('week_number', weekNumber)
        .eq('year', year);
    } else {
      return NextResponse.json({ error: 'planId or weekNumber+year required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
