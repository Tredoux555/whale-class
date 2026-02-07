// /api/home/children/[childId]/route.ts
// Session 155: Get single child by ID

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params;
    if (!childId) {
      return NextResponse.json({ error: 'childId required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: child, error } = await supabase
      .from('home_children')
      .select('id, name, age, family_id, enrolled_at, created_at')
      .eq('id', childId)
      .single();

    if (error || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    return NextResponse.json({ child });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Child GET error:', err.message);
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
