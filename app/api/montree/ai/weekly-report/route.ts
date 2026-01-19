// app/api/montree/ai/weekly-report/route.ts
// POST /api/montree/ai/weekly-report - AI-powered weekly progress report for parents
// Transforms raw data into warm, specific narrative for parent communication

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { anthropic, AI_ENABLED, AI_MODEL, MAX_TOKENS } from '@/lib/ai/anthropic';
import { isValidUUID, parseDate } from '@/lib/montree/utils/validation';
import { 
  MONTREE_SYSTEM_PROMPT, 
  buildWeeklyReportPrompt,
  transformAssignment,
  transformChildContext
} from '@/lib/montree/ai';
import type { 
  WeeklyReportResponse, 
  ChildContext, 
  AssignmentWithWork,
  AreaWorkSummary,
  WorkSummary
} from '@/lib/montree/types/ai';

// ============================================
// HELPER: Get week boundaries
// ============================================

function getWeekBoundaries(weekStartInput?: string): { start: string; end: string } {
  let startDate: Date;
  
  if (weekStartInput) {
    const parsed = parseDate(weekStartInput);
    if (parsed) {
      startDate = parsed;
    } else {
      startDate = getMonday(new Date());
    }
  } else {
    startDate = getMonday(new Date());
  }
  
  // End date is Sunday (6 days after Monday)
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { child_id, week_start } = body;

    // Validate child_id
    if (!child_id) {
      return NextResponse.json(
        { error: 'child_id is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(child_id)) {
      return NextResponse.json(
        { error: 'Invalid child_id format' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get week boundaries
    const { start: weekStart, end: weekEnd } = getWeekBoundaries(week_start);

    // ========================================
    // STEP 1: Fetch child with classroom info
    // ========================================
    const { data: rawChild, error: childError } = await supabase
      .from('montree_children')
      .select(`
        id,
        name,
        age,
        classroom_id,
        classroom:montree_classrooms(id, name)
      `)
      .eq('id', child_id)
      .single();

    if (childError || !rawChild) {
      return NextResponse.json(
        { error: 'Child not found' },
        { status: 404 }
      );
    }

    const childContext = transformChildContext(rawChild as Parameters<typeof transformChildContext>[0]);
    
    if (!childContext) {
      return NextResponse.json(
        { error: 'Child is not assigned to a classroom' },
        { status: 400 }
      );
    }

    // ========================================
    // STEP 2: Fetch ALL assignments with work details
    // ========================================
    const { data: rawAssignments, error: assignmentsError } = await supabase
      .from('montree_child_assignments')
      .select(`
        id,
        child_id,
        work_id,
        status,
        current_level,
        assigned_at,
        presented_at,
        mastered_at,
        notes,
        updated_at,
        work:montree_classroom_curriculum_works(
          id,
          work_key,
          name,
          name_chinese,
          description,
          age_range,
          materials,
          direct_aims,
          indirect_aims,
          prerequisites,
          category_key,
          category_name,
          area_id,
          area:montree_classroom_curriculum_areas(
            area_key,
            name
          )
        )
      `)
      .eq('child_id', child_id);

    if (assignmentsError) {
      console.error('Fetch assignments error:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    // Transform using shared utility
    const transformedAssignments: AssignmentWithWork[] = (rawAssignments || [])
      .map(a => transformAssignment(a as Parameters<typeof transformAssignment>[0]))
      .filter((a): a is AssignmentWithWork => a !== null);

    // ========================================
    // STEP 3: Filter assignments for this week
    // ========================================
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekEnd);
    weekEndDate.setHours(23, 59, 59, 999);

    const thisWeekAssignments = transformedAssignments.filter(a => {
      const presentedAt = a.presented_at ? new Date(a.presented_at) : null;
      const masteredAt = a.mastered_at ? new Date(a.mastered_at) : null;
      const assignedAt = new Date(a.assigned_at);

      return (
        (presentedAt && presentedAt >= weekStartDate && presentedAt <= weekEndDate) ||
        (masteredAt && masteredAt >= weekStartDate && masteredAt <= weekEndDate) ||
        (assignedAt >= weekStartDate && assignedAt <= weekEndDate)
      );
    });

    // ========================================
    // STEP 4: Calculate area summaries
    // ========================================
    const areaMap = new Map<string, { completed: number; in_progress: number; presented: number; area_name: string }>();

    for (const a of thisWeekAssignments) {
      const areaKey = a.work.area_key;
      if (!areaMap.has(areaKey)) {
        areaMap.set(areaKey, { 
          completed: 0, 
          in_progress: 0, 
          presented: 0,
          area_name: a.work.area_name 
        });
      }
      const stats = areaMap.get(areaKey)!;
      
      if (a.status === 'mastered') {
        stats.completed++;
      } else if (a.status === 'practicing') {
        stats.in_progress++;
      } else if (a.status === 'presented') {
        stats.presented++;
      }
    }

    const areasWorked: AreaWorkSummary[] = Array.from(areaMap.entries()).map(([area, stats]) => ({
      area,
      area_name: stats.area_name,
      works_completed: stats.completed,
      works_in_progress: stats.in_progress,
      works_presented: stats.presented
    }));

    // Build works list for this week
    const worksThisWeek: WorkSummary[] = thisWeekAssignments.map(a => ({
      work_name: a.work.name,
      area: a.work.area_name,
      status: a.status,
      current_level: a.current_level
    }));

    // ========================================
    // STEP 5: Call AI for narrative generation (with fallback)
    // ========================================
    let aiResult: { highlights: string[]; narrative: string; next_steps: string[] };

    const generateFallbackReport = () => {
      const childDisplayName = childContext.name_chinese 
        ? `${childContext.name} (${childContext.name_chinese})`
        : childContext.name;
        
      return {
        highlights: thisWeekAssignments.length > 0 
          ? [`${childDisplayName} engaged with ${thisWeekAssignments.length} activities this week`]
          : [`${childDisplayName} is continuing to explore the classroom environment`],
        narrative: thisWeekAssignments.length > 0
          ? `This week, ${childDisplayName} engaged with ${thisWeekAssignments.length} different works across the Montessori curriculum. ${areasWorked.length > 0 ? `The focus areas included ${areasWorked.map(a => a.area_name).join(', ')}.` : ''} Each activity supports your child's growing independence and concentration. We encourage continued exploration and practice at home with similar activities.`
          : `This week was a time for ${childDisplayName} to observe and explore. In the Montessori approach, children sometimes need time to watch others and absorb the classroom environment before choosing new works. This observation period is a natural and valuable part of the learning process, as it allows children to internalize concepts before hands-on engagement.`,
        next_steps: [
          'Continue to observe your child\'s interests at home',
          'Encourage independence in daily routines like dressing and meal preparation',
          'Provide opportunities for concentration without interruption'
        ]
      };
    };

    if (AI_ENABLED && anthropic) {
      try {
        const prompt = buildWeeklyReportPrompt(
          childContext,
          weekStart,
          weekEnd,
          thisWeekAssignments,
          transformedAssignments
        );

        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: MAX_TOKENS,
          system: MONTREE_SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });

        const textContent = response.content.find(c => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Could not parse AI response as JSON');
        }

        aiResult = JSON.parse(jsonMatch[0]);
      } catch (aiError) {
        console.error('AI report generation error, using fallback:', aiError);
        aiResult = generateFallbackReport();
      }
    } else {
      console.log('AI not enabled, using fallback report');
      aiResult = generateFallbackReport();
    }

    // ========================================
    // STEP 6: Build final response
    // ========================================
    const response: WeeklyReportResponse = {
      child: {
        id: childContext.id,
        name: childContext.name_chinese 
          ? `${childContext.name} (${childContext.name_chinese})`
          : childContext.name
      },
      period: {
        start: weekStart,
        end: weekEnd
      },
      highlights: aiResult.highlights,
      narrative: aiResult.narrative,
      next_steps: aiResult.next_steps,
      areas_worked: areasWorked,
      works_this_week: worksThisWeek,
      generated_at: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Weekly report API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly report' },
      { status: 500 }
    );
  }
}
