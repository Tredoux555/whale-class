// /api/home/children/route.ts
// Session 155: List + create children for a family
// Audit fix: standardized error response shapes

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const familyId = request.nextUrl.searchParams.get('family_id');
    if (!familyId) {
      return errorResponse('family_id required', undefined, 400);
    }

    const supabase = getSupabase();
    const { data: children, error } = await supabase
      .from('home_children')
      .select('id, name, age, enrolled_at, created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch children:', error.message, error.code);
      return errorResponse('Failed to load children');
    }

    return NextResponse.json({ success: true, children: children || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Children GET error:', message);
    return errorResponse('Server error', { message });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { family_id, name, age } = await request.json();

    if (!family_id || !name?.trim()) {
      return errorResponse('family_id and name required', undefined, 400);
    }

    const rawAge = typeof age === 'number' ? age : Number(age);
    if (isNaN(rawAge)) {
      return errorResponse('Age must be a valid number', undefined, 400);
    }
    const childAge = Math.round(rawAge);
    if (childAge < 0 || childAge > 12) {
      return errorResponse('Age must be between 0 and 12', undefined, 400);
    }

    const supabase = getSupabase();

    // Create the child
    const { data: child, error: childError } = await supabase
      .from('home_children')
      .insert({
        family_id,
        name: name.trim(),
        age: childAge,
      })
      .select()
      .single();

    if (childError) {
      console.error('Failed to create child:', childError.message, childError.code, childError.details, childError.hint);
      return errorResponse('Failed to create child');
    }

    // Initialize progress records from family curriculum
    const { data: curriculum, error: currError } = await supabase
      .from('home_curriculum')
      .select('work_name, area')
      .eq('family_id', family_id);

    if (currError) {
      console.error('Failed to fetch curriculum for progress init:', currError.message);
    }

    let progressCount = 0;
    if (curriculum && curriculum.length > 0) {
      const progressRecords = curriculum.map((work) => ({
        child_id: child.id,
        work_name: work.work_name,
        area: work.area,
        status: 'not_started',
      }));

      const { error: progressError } = await supabase
        .from('home_progress')
        .insert(progressRecords);

      if (progressError) {
        console.error('Failed to initialize progress:', progressError.message);
        // Non-fatal — child is created, progress can be seeded later
      } else {
        progressCount = progressRecords.length;
      }
    }

    return NextResponse.json({ success: true, child, progressCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Children POST error:', message);
    return errorResponse('Server error');
  }
}
