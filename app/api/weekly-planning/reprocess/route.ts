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
    const { planId } = await request.json();

    // Get the plan
    const { data: plan, error: planError } = await supabase
      .from('weekly_plans')
      .select('id, week_number, translated_content')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found', details: planError }, { status: 404 });
    }

    const content = plan.translated_content as any;
    if (!content?.assignments) {
      return NextResponse.json({ error: 'No assignments in plan content' }, { status: 400 });
    }

    // Get all children
    const { data: children, error: childError } = await supabase
      .from('children')
      .select('id, name');

    if (childError) {
      return NextResponse.json({ error: 'Failed to fetch children', details: childError }, { status: 500 });
    }

    console.log('[Reprocess] Children in DB:', children?.map(c => c.name));
    console.log('[Reprocess] Assignments to process:', content.assignments.length);

    // Build assignments
    const assignments = [];
    const matchLog: any[] = [];

    for (const assignment of content.assignments) {
      const childName = assignment.childName;
      const child = children?.find(c => 
        c.name.toLowerCase() === childName.toLowerCase()
      );

      matchLog.push({
        parsed: childName,
        matched: child?.name || 'NOT FOUND',
        childId: child?.id || null
      });

      if (!child) {
        console.log(`[Reprocess] Child not found: "${childName}"`);
        continue;
      }

      for (const work of (assignment.works || [])) {
        // Map area names to match DB constraint (mathematics → math)
        let area = work.area || 'practical_life';
        if (area === 'mathematics') area = 'math';
        
        assignments.push({
          weekly_plan_id: plan.id,
          child_id: child.id,
          work_id: work.matchedWorkId || null,
          work_name: work.workNameEnglish || work.workNameChinese || 'Unknown',
          area: area
        });
      }
    }

    console.log('[Reprocess] Total assignments to insert:', assignments.length);

    if (assignments.length === 0) {
      return NextResponse.json({ 
        error: 'No assignments created - check child name matching',
        matchLog,
        parsedChildren: content.assignments.map((a: any) => a.childName),
        dbChildren: children?.map(c => c.name)
      }, { status: 400 });
    }

    // Delete existing assignments for this plan
    await supabase
      .from('weekly_assignments')
      .delete()
      .eq('weekly_plan_id', plan.id);

    // Insert new assignments
    const { data: inserted, error: insertError } = await supabase
      .from('weekly_assignments')
      .insert(assignments)
      .select();

    if (insertError) {
      return NextResponse.json({ 
        error: 'Failed to insert assignments', 
        details: insertError,
        sampleAssignment: assignments[0]
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      assignmentsCreated: inserted?.length || 0,
      matchLog
    });

  } catch (error: any) {
    console.error('Reprocess error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
