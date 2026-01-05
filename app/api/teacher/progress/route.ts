import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserSession } from '@/lib/auth-multi';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get progress for a child (optionally filtered by area)
export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Teachers and above can access
    if (!['super_admin', 'school_admin', 'teacher'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const area = searchParams.get('area');

    if (!childId) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 });
    }

    // Get all works with progress status for this child
    let query = supabase
      .from('curriculum_roadmap')
      .select(`
        id,
        name,
        area,
        category,
        subcategory,
        sequence_order,
        age_range,
        description,
        child_work_progress!left (
          status,
          presented_date,
          practicing_date,
          mastered_date,
          notes,
          updated_at
        )
      `)
      .eq('child_work_progress.child_id', childId)
      .order('sequence_order', { ascending: true });

    if (area) {
      query = query.eq('area', area);
    }

    const { data: works, error } = await query;

    if (error) throw error;

    // Transform to flatten progress
    const worksWithProgress = works?.map(work => {
      const progress = Array.isArray(work.child_work_progress) 
        ? work.child_work_progress[0] 
        : work.child_work_progress;
      
      return {
        id: work.id,
        name: work.name,
        area: work.area,
        category: work.category,
        subcategory: work.subcategory,
        sequence_order: work.sequence_order,
        age_range: work.age_range,
        description: work.description,
        status: progress?.status ?? 0,
        presented_date: progress?.presented_date,
        practicing_date: progress?.practicing_date,
        mastered_date: progress?.mastered_date,
        notes: progress?.notes,
        updated_at: progress?.updated_at,
      };
    });

    return NextResponse.json({ works: worksWithProgress });
  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 });
  }
}

// POST - Update progress for a child on a specific work
export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Teachers and above can update
    if (!['super_admin', 'school_admin', 'teacher'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { childId, workId, status, notes } = await request.json();

    if (!childId || !workId || status === undefined) {
      return NextResponse.json(
        { error: 'childId, workId, and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    if (status < 0 || status > 3) {
      return NextResponse.json(
        { error: 'status must be between 0 and 3' },
        { status: 400 }
      );
    }

    // Get current progress for history
    const { data: current } = await supabase
      .from('child_work_progress')
      .select('status')
      .eq('child_id', childId)
      .eq('work_id', workId)
      .single();

    const oldStatus = current?.status ?? null;

    // Upsert progress
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const updateData: Record<string, any> = {
      child_id: childId,
      work_id: workId,
      status,
      recorded_by: session.userId,
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Set date fields based on status
    if (status >= 1 && !current?.status) {
      updateData.presented_date = now;
    }
    if (status >= 2) {
      updateData.practicing_date = now;
    }
    if (status >= 3) {
      updateData.mastered_date = now;
    }

    const { data: progress, error: upsertError } = await supabase
      .from('child_work_progress')
      .upsert(updateData, {
        onConflict: 'child_id,work_id',
      })
      .select()
      .single();

    if (upsertError) throw upsertError;

    // Log to history if status changed
    if (oldStatus !== status) {
      await supabase.from('progress_history').insert({
        child_id: childId,
        work_id: workId,
        old_status: oldStatus,
        new_status: status,
        changed_by: session.userId,
        note: notes,
      });
    }

    return NextResponse.json({ 
      success: true, 
      progress,
      statusName: ['not_started', 'presented', 'practicing', 'mastered'][status]
    });
  } catch (error) {
    console.error('Update progress error:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

// PATCH - Bulk update progress (for quick multi-select)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'school_admin', 'teacher'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { childId, updates } = await request.json();
    // updates: [{ workId, status }]

    if (!childId || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'childId and updates array are required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString().split('T')[0];
    const results = [];

    for (const update of updates) {
      const { workId, status } = update;
      
      if (status < 0 || status > 3) continue;

      const updateData: Record<string, any> = {
        child_id: childId,
        work_id: workId,
        status,
        recorded_by: session.userId,
        updated_at: new Date().toISOString(),
      };

      if (status >= 1) updateData.presented_date = now;
      if (status >= 2) updateData.practicing_date = now;
      if (status >= 3) updateData.mastered_date = now;

      const { data, error } = await supabase
        .from('child_work_progress')
        .upsert(updateData, { onConflict: 'child_id,work_id' })
        .select()
        .single();

      if (!error && data) {
        results.push(data);
      }
    }

    return NextResponse.json({ 
      success: true, 
      updated: results.length,
      results 
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Failed to bulk update' }, { status: 500 });
  }
}
