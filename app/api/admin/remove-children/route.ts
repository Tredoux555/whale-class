import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

// Remove children from classroom
export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdmin();

  try {
    const { child_ids } = await request.json();
    
    if (!child_ids || !Array.isArray(child_ids)) {
      return NextResponse.json({ error: 'child_ids array required' }, { status: 400 });
    }

    // Remove from classroom_children
    const { error: unlinkError } = await supabase
      .from('classroom_children')
      .delete()
      .in('child_id', child_ids);

    if (unlinkError) throw unlinkError;

    return NextResponse.json({ 
      success: true, 
      removed: child_ids.length,
      message: `Removed ${child_ids.length} children from classrooms`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
