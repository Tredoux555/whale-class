// /api/montree/curriculum/delete/route.ts
// Delete a work from curriculum

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { work_id } = body;

    if (!work_id) {
      return NextResponse.json({ error: 'work_id required' }, { status: 400 });
    }

    // Delete the work
    const { error } = await supabase
      .from('montree_classroom_curriculum_works')
      .delete()
      .eq('id', work_id);

    if (error) {
      console.error('Delete work error:', error);
      return NextResponse.json({ error: 'Failed to delete work' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
