// /api/home/curriculum/delete/route.ts
// Remove a work from a family's home curriculum
// Audit fix: standardized error response shape

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const { work_id } = await request.json();

    if (!work_id) {
      return errorResponse('work_id required', undefined, 400);
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('home_curriculum')
      .delete()
      .eq('id', work_id);

    if (error) {
      console.error('Curriculum delete error:', error.message, error.code);
      return errorResponse('Failed to delete work');
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Curriculum delete error:', message);
    return errorResponse('Server error');
  }
}
