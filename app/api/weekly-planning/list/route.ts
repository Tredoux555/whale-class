import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: plans, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ plans: plans || [] });
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return NextResponse.json({ plans: [] });
  }
}
