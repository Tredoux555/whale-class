// lib/montree/reports/generator.ts
// Report generation logic - aggregates weekly work and photos
// Session 58 - FIXED to use correct tables (weekly_assignments, child_work_media)
// Session 59 - UPGRADED to use rich work-specific definitions from work-definitions.ts
//              No more generic "Practical Life develops concentration" - each work gets
//              its own parent-friendly explanation of WHAT the child is doing, WHY it matters,
//              and HOW it connects to home.

import { getSupabase } from '@/lib/supabase-client';
import { getWorkDefinition, generateReportSummary } from './work-definitions';
import type { 
  MontreeWeeklyReport, 
  ReportContent, 
  ReportHighlight,
  ReportType,
  CurriculumArea,
  GenerateReportResponse 
} from './types';

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

export async function generateWeeklyReport(params: {
  child_id: string;
  school_id?: string;
  week_start: string;
  week_end: string;
  report_type: ReportType;
  generated_by: string;
  use_ai?: boolean;
}): Promise<GenerateReportResponse> {
  const { 
    child_id, 
    week_start, 
    week_end, 
    report_type, 
    generated_by,
  } = params;

  const DEFAULT_SCHOOL_UUID = '00000000-0000-0000-0000-000000000001';
  const school_id = params.school_id || DEFAULT_SCHOOL_UUID;

  try {
    const supabase = getSupabase();

    // 1. Get child info
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, photo_url')
      .eq('id', child_id)
      .single();

    if (childError || !child) {
      console.error('Child lookup error:', childError?.message);
      return { success: false, error: 'Child not found' };
    }

    // 2. Check if report already exists for this week
    const { data: existingReport } = await supabase
      .from('montree_weekly_reports')
      .select('id')
      .eq('child_id', child_id)
      .eq('week_start', week_start)
      .eq('report_type', report_type)
      .single();

    if (existingReport) {
      return { 
        success: false, 
        error: `A ${report_type} report already exists for this week. Delete it first to regenerate.` 
      };
    }

    // 3. Get the latest weekly plan (same logic as /api/classroom/child/[id]/week)
    const { data: plans } = await supabase
      .from('weekly_plans')
      .select('id, week_number, year')
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(1);

    const latestPlan = plans?.[0];
    
    if (!latestPlan) {
      return { success: false, error: 'No weekly plans found. Please create a weekly plan first.' };
    }

    const weekNumber = latestPlan.week_number;
    const year = latestPlan.year;
    
    console.log('🔍 Report generator debug:', {
      child_id,
      week_start,
      week_end,
      usingPlanWeek: weekNumber,
      usingPlanYear: year
    });

    // 4. Fetch assignments for this child this week - THE CORRECT TABLE!
    const { data: assignments, error: assignError } = await supabase
      .from('weekly_assignments')
      .select('id, work_name, work_id, area, progress_status, notes, presented_at, practicing_at, mastered_at')
      .eq('child_id', child_id)
      .eq('week_number', weekNumber)
      .eq('year', year);

    console.log('🔍 Assignments query result:', {
      error: assignError?.message,
      count: assignments?.length || 0,
      assignments: assignments?.slice(0, 3) // First 3 for brevity
    });

    if (assignError) {
      console.error('Assignments fetch error:', assignError);
      return { success: false, error: 'Failed to fetch work assignments' };
    }

    const allAssignments = assignments || [];

    // 5. Get photos for these assignments - THE CORRECT TABLE!
    const assignmentIds = allAssignments.map(a => a.id);
    let allMedia: any[] = [];

    if (assignmentIds.length > 0) {
      const { data: mediaData, error: mediaError } = await supabase
        .from('child_work_media')
        .select('id, assignment_id, media_url, notes, taken_at')
        .in('assignment_id', assignmentIds)
        .order('taken_at', { ascending: true });

      console.log('🔍 Media query result:', {
        error: mediaError?.message,
        count: mediaData?.length || 0,
        media: mediaData?.slice(0, 3)
      });

      allMedia = mediaData || [];
    }

    // Group media by assignment
    const mediaByAssignment: Record<string, any[]> = {};
    allMedia.forEach(m => {
      if (!mediaByAssignment[m.assignment_id]) {
        mediaByAssignment[m.assignment_id] = [];
      }
      mediaByAssignment[m.assignment_id].push(m);
    });

    // 6. Build highlights - one per assignment with work done
    const childName = child.name;
    const highlights: ReportHighlight[] = [];

    for (const assignment of allAssignments) {
      // Skip works that weren't started
      if (assignment.progress_status === 'not_started') continue;

      const photos = mediaByAssignment[assignment.id] || [];
      const area = mapAreaToEnum(assignment.area);

      // Get status text
      const statusText = getStatusText(assignment.progress_status);

      // Build observation text
      let observation = '';
      if (assignment.notes) {
        observation = assignment.notes;
      } else {
        observation = `${childName} worked on ${assignment.work_name}. Status: ${statusText}.`;
      }

      // Get rich, work-specific developmental content
      const workDefinition = getWorkDefinition(assignment.work_id, assignment.work_name, area);

      // Create highlight for the assignment
      // Use media_url directly (it's already a full public URL)
      const highlight: ReportHighlight = {
        media_id: photos[0]?.id || null,
        storage_path: photos[0]?.media_url || null,  // This is now a full URL
        work_id: assignment.work_id,
        work_name: assignment.work_name,
        area,
        observation,
        developmental_note: workDefinition.developmental_note,
        home_extension: workDefinition.home_extension,
        captured_at: photos[0]?.taken_at || assignment.presented_at || new Date().toISOString(),
        status: assignment.progress_status,
        photo_count: photos.length,
        all_photos: photos.map(p => p.media_url),
      };

      highlights.push(highlight);
    }

    // 7. Calculate areas explored
    const areasSet = new Set<CurriculumArea>();
    highlights.forEach(h => {
      if (h.area) areasSet.add(h.area);
    });
    const areas_explored = Array.from(areasSet);

    // 8. Build summary using rich definitions
    const summary = generateReportSummary(childName, highlights, areas_explored);

    // 9. Build content
    const content: ReportContent = {
      summary,
      highlights,
      areas_explored,
      total_activities: highlights.length,
      total_photos: allMedia.length,
      milestones: highlights.filter(h => h.status === 'mastered').map(h => h.work_name || 'Activity'),
      parent_message: `Thank you for being part of ${childName}'s learning journey!`,
      generated_with_ai: false,
      generation_timestamp: new Date().toISOString(),
    };

    // 10. Create report record
    const { data: report, error: insertError } = await supabase
      .from('montree_weekly_reports')
      .insert({
        school_id,
        child_id,
        week_start,
        week_end,
        report_type,
        status: 'draft',
        content,
        generated_at: new Date().toISOString(),
        generated_by,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Report insert error:', insertError);
      return { success: false, error: `Failed to create report: ${insertError.message}` };
    }

    return {
      success: true,
      report: report as MontreeWeeklyReport,
      stats: {
        photos_included: allMedia.length,
        activities_detected: highlights.length,
      },
    };

  } catch (error) {
    console.error('Report generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function mapAreaToEnum(area: string): CurriculumArea {
  const areaMap: Record<string, CurriculumArea> = {
    'practical_life': 'practical_life',
    'sensorial': 'sensorial',
    'language': 'language',
    'mathematics': 'mathematics',
    'math': 'mathematics',
    'cultural': 'cultural',
    'culture': 'cultural',
  };
  return areaMap[area?.toLowerCase()] || 'practical_life';
}

function getStatusText(status: string): string {
  switch (status) {
    case 'presented': return 'Introduced this week';
    case 'practicing': return 'Actively practicing';
    case 'mastered': return 'Mastered! 🌟';
    default: return 'In progress';
  }
}

// NOTE: Old generic getDevelopmentalNote, getHomeExtension, and generateSummary functions
// have been removed. Now using work-specific definitions from ./work-definitions.ts
// Session 59 - Rich parent-friendly definitions for every Montessori work

export async function regenerateReportContent(
  report_id: string,
  new_content: Partial<ReportContent>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('montree_weekly_reports')
      .select('content')
      .eq('id', report_id)
      .single();

    if (!existing) {
      return { success: false, error: 'Report not found' };
    }

    const { error } = await supabase
      .from('montree_weekly_reports')
      .update({ 
        content: { ...existing.content, ...new_content },
        updated_at: new Date().toISOString(),
      })
      .eq('id', report_id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
