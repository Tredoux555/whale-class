// lib/montree/reports/generator.ts
// Report generation logic - aggregates photos and creates report
// Phase 3 - Session 54

import { createServerClient } from '@/lib/supabase/server';
import type { 
  MontreeWeeklyReport, 
  ReportContent, 
  ReportHighlight,
  ReportType,
  CurriculumArea,
  GenerateReportResponse 
} from './types';

// ============================================
// TYPES FOR INTERNAL USE
// ============================================

interface MediaWithWork {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  child_id: string | null;
  work_id: string | null;
  caption: string | null;
  tags: string[];
  captured_at: string;
  
  // Joined from work_translations
  work_name?: string;
  area?: CurriculumArea;
  developmental_context?: string;
  home_extension?: string;
  photo_caption_template?: string;
}

interface ChildInfo {
  id: string;
  name: string;
  gender: 'he' | 'she' | 'they';
}

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

export async function generateWeeklyReport(params: {
  child_id: string;
  school_id: string;
  week_start: string;  // YYYY-MM-DD
  week_end: string;    // YYYY-MM-DD
  report_type: ReportType;
  generated_by: string;
  use_ai?: boolean;
}): Promise<GenerateReportResponse> {
  const { 
    child_id, 
    school_id, 
    week_start, 
    week_end, 
    report_type, 
    generated_by,
    use_ai = true 
  } = params;

  const startTime = Date.now();

  try {
    const supabase = await createServerClient();

    // 1. Get child info (from montree_children table)
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, gender')
      .eq('id', child_id)
      .single();

    if (childError || !child) {
      return { success: false, error: 'Child not found' };
    }

    // 2. Check if report already exists
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
        error: `A ${report_type} report already exists for this week. Edit the existing report instead.` 
      };
    }

    // 3. Fetch media for this child during this week
    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(week_end);
    weekEndDate.setHours(23, 59, 59, 999);

    const { data: mediaItems, error: mediaError } = await supabase
      .from('montree_media')
      .select(`
        id,
        storage_path,
        thumbnail_path,
        child_id,
        work_id,
        caption,
        tags,
        captured_at
      `)
      .eq('child_id', child_id)
      .gte('captured_at', weekStartDate.toISOString())
      .lte('captured_at', weekEndDate.toISOString())
      .order('captured_at', { ascending: true });

    if (mediaError) {
      console.error('Media fetch error:', mediaError);
      return { success: false, error: 'Failed to fetch media' };
    }

    // Initialize as empty array if null
    const allMedia = mediaItems || [];

    // Also check for group photos that include this child
    const { data: groupMediaLinks } = await supabase
      .from('montree_media_children')
      .select('media_id')
      .eq('child_id', child_id);

    if (groupMediaLinks && groupMediaLinks.length > 0) {
      const groupMediaIds = groupMediaLinks.map(l => l.media_id);
      
      // Fetch group photos within date range
      const { data: groupMedia } = await supabase
        .from('montree_media')
        .select(`
          id,
          storage_path,
          thumbnail_path,
          child_id,
          work_id,
          caption,
          tags,
          captured_at
        `)
        .in('id', groupMediaIds)
        .gte('captured_at', weekStartDate.toISOString())
        .lte('captured_at', weekEndDate.toISOString());

      if (groupMedia) {
        // Add group photos that aren't already in the list
        const existingIds = new Set(allMedia.map(m => m.id));
        groupMedia.forEach(gm => {
          if (!existingIds.has(gm.id)) {
            allMedia.push(gm);
          }
        });
      }
    }

    // 4. Get work translations for any tagged works
    const workIds = [...new Set(allMedia.filter(m => m.work_id).map(m => m.work_id))];
    let workTranslations: Record<string, {
      display_name: string;
      area: CurriculumArea;
      developmental_context: string;
      home_extension: string | null;
      photo_caption_template: string | null;
    }> = {};

    if (workIds.length > 0) {
      const { data: translations } = await supabase
        .from('montree_work_translations')
        .select('work_id, display_name, area, developmental_context, home_extension, photo_caption_template')
        .in('work_id', workIds);

      if (translations) {
        translations.forEach(t => {
          workTranslations[t.work_id] = {
            display_name: t.display_name,
            area: t.area as CurriculumArea,
            developmental_context: t.developmental_context,
            home_extension: t.home_extension,
            photo_caption_template: t.photo_caption_template,
          };
        });
      }
    }

    // 5. Build highlights from media
    const highlights: ReportHighlight[] = allMedia.map(media => {
      const work = media.work_id ? workTranslations[media.work_id] : null;
      
      return {
        media_id: media.id,
        storage_path: media.storage_path,
        thumbnail_path: media.thumbnail_path,
        work_id: media.work_id,
        work_name: work?.display_name || null,
        area: work?.area || null,
        observation: media.caption || 'Working with concentration.',
        developmental_note: work?.developmental_context || 'Developing independence and focus.',
        home_extension: work?.home_extension || null,
        captured_at: media.captured_at,
        caption: media.caption,
      };
    });

    // 6. Calculate areas explored
    const areasSet = new Set<CurriculumArea>();
    highlights.forEach(h => {
      if (h.area) areasSet.add(h.area);
    });
    const areas_explored = Array.from(areasSet);

    // 7. Build initial content
    const childName = child.name;
    const content: ReportContent = {
      summary: generateBasicSummary(childName, child.gender, highlights, areas_explored),
      highlights,
      areas_explored,
      total_activities: highlights.length,
      total_photos: allMedia.length,
      milestones: [],
      teacher_notes: report_type === 'teacher' ? '' : undefined,
      parent_message: report_type === 'parent' 
        ? `Thank you for being part of ${childName}'s learning journey!` 
        : undefined,
      generated_with_ai: false,
      generation_timestamp: new Date().toISOString(),
    };

    // 8. Create report record
    const reportRecord = {
      school_id,
      classroom_id: null,  // Could be added later
      child_id,
      week_start,
      week_end,
      report_type,
      status: 'draft' as const,
      content,
      generated_at: new Date().toISOString(),
      generated_by,
    };

    const { data: report, error: insertError } = await supabase
      .from('montree_weekly_reports')
      .insert(reportRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Report insert error:', insertError);
      return { success: false, error: `Failed to create report: ${insertError.message}` };
    }

    // 9. Link media to report
    if (allMedia.length > 0) {
      const mediaLinks = allMedia.map((m, index) => ({
        report_id: report.id,
        media_id: m.id,
        display_order: index,
        caption: m.caption,
      }));

      const { error: linkError } = await supabase
        .from('montree_report_media')
        .insert(mediaLinks);

      if (linkError) {
        console.error('Report media link error:', linkError);
        // Don't fail the whole operation, just log it
      }
    }

    const generationTime = Date.now() - startTime;

    return {
      success: true,
      report: report as MontreeWeeklyReport,
      stats: {
        photos_included: allMedia.length,
        activities_detected: highlights.length,
        ai_generation_time_ms: use_ai ? generationTime : undefined,
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

function generateBasicSummary(
  name: string, 
  gender: 'he' | 'she' | 'they',
  highlights: ReportHighlight[],
  areas: CurriculumArea[]
): string {
  const pronoun = gender === 'they' ? 'they' : gender;
  const verb = gender === 'they' ? 'were' : 'was';
  const possessive = gender === 'he' ? 'his' : gender === 'she' ? 'her' : 'their';
  
  if (highlights.length === 0) {
    return `This week, ${name} continued ${possessive} learning journey in the classroom.`;
  }

  const areaNames = areas.map(a => {
    switch (a) {
      case 'practical_life': return 'Practical Life';
      case 'sensorial': return 'Sensorial';
      case 'language': return 'Language';
      case 'mathematics': return 'Mathematics';
      case 'cultural': return 'Cultural';
      default: return a;
    }
  });

  const areaText = areaNames.length === 1 
    ? areaNames[0]
    : areaNames.length === 2
      ? `${areaNames[0]} and ${areaNames[1]}`
      : `${areaNames.slice(0, -1).join(', ')}, and ${areaNames[areaNames.length - 1]}`;

  return `This week, ${name} ${verb} actively engaged in ${possessive} learning, exploring ${highlights.length} ${highlights.length === 1 ? 'activity' : 'activities'} across ${areaText}. ${pronoun === 'they' ? 'They showed' : pronoun === 'he' ? 'He showed' : 'She showed'} wonderful focus and curiosity throughout the week.`;
}

/**
 * Regenerate content for an existing report (e.g., after adding AI content)
 */
export async function regenerateReportContent(
  report_id: string,
  new_content: Partial<ReportContent>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();

    const { data: existing } = await supabase
      .from('montree_weekly_reports')
      .select('content')
      .eq('id', report_id)
      .single();

    if (!existing) {
      return { success: false, error: 'Report not found' };
    }

    const mergedContent = {
      ...existing.content,
      ...new_content,
    };

    const { error } = await supabase
      .from('montree_weekly_reports')
      .update({ 
        content: mergedContent,
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
