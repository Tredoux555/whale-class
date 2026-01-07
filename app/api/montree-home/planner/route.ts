import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get('family_id');
  const week = searchParams.get('week');

  if (!familyId || !week) {
    return NextResponse.json({ error: 'family_id and week required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('home_families')
      .select('weekly_plans')
      .eq('id', familyId)
      .single();

    if (error) throw error;

    const plans = data?.weekly_plans || {};
    return NextResponse.json({ 
      planned: plans[week] || [] 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching planner:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const body = await request.json();
    const { family_id, week, planned } = body;

    if (!family_id || !week) {
      return NextResponse.json({ error: 'family_id and week required' }, { status: 400 });
    }

    // Get current plans
    const { data: current } = await supabase
      .from('home_families')
      .select('weekly_plans')
      .eq('id', family_id)
      .single();

    const plans = current?.weekly_plans || {};
    plans[week] = planned || [];

    // Keep only last 12 weeks of plans to prevent bloat
    const weekKeys = Object.keys(plans).sort().reverse();
    if (weekKeys.length > 12) {
      weekKeys.slice(12).forEach(k => delete plans[k]);
    }

    const { error } = await supabase
      .from('home_families')
      .update({ 
        weekly_plans: plans,
        updated_at: new Date().toISOString()
      })
      .eq('id', family_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving planner:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
