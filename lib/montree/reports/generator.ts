// lib/montree/reports/generator.ts
// Report generation logic - aggregates photos and creates report
// Phase 3 - Session 54 | Updated Session 55 for parent descriptions

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

interface WorkTranslation {
  display_name: string;
  area: CurriculumArea;
  developmental_context: string;
  home_extension: string | null;
  photo_caption_template: string | null;
  // Session 55: Parent-friendly descriptions
  parent_description: string | null;
  why_it_matters: string | null;
  home_connection: string | null;
}

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

export async function generateWeeklyReport(params: {
  child_id: string;
  school_id: string;
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
    use_ai = true 
  } = params;

  // Use a deterministic UUID for default school
  // This is a fixed UUID that represents "default school" in our system
  const DEFAULT_SCHOOL_UUID = '00000000-0000-0000-0000-000000000001';
  const school_id = params.school_id || DEFAULT_SCHOOL_UUID;

  const startTime = Date.now();

  try {
    const supabase = await createServerClient();

    // 1. Get child info
    // FIX Session 56: Use 'children' table not 'montree_children' - they have different IDs!
    // Note: 'children' table doesn't have gender column, so we default to 'they'
    const { data: childData, error: childError } = await supabase
      .from('children')
      .select('id, name')
      .eq('id', child_id)
      .single();

    if (childError || !childData) {
      console.error('Child lookup error:', childError?.message, 'for child_id:', child_id);
      return { success: false, error: 'Child not found' };
    }

    // Add gender as 'they' since the children table doesn't have it
    const child = { ...childData, gender: 'they' as const };

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
        error: `A ${report_type} report already exists for this week.` 
      };
    }

    // 3. Fetch media for this child during this week
    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(week_end);
    weekEndDate.setHours(23, 59, 59, 999);

    const { data: mediaItems, error: mediaError } = await supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path, child_id, work_id, caption, tags, captured_at')
      .eq('child_id', child_id)
      .gte('captured_at', weekStartDate.toISOString())
      .lte('captured_at', weekEndDate.toISOString())
      .order('captured_at', { ascending: true });

    if (mediaError) {
      console.error('Media fetch error:', mediaError);
      return { success: false, error: 'Failed to fetch media' };
    }

    const allMedia = mediaItems || [];

    // Also check for group photos
    const { data: groupMediaLinks } = await supabase
      .from('montree_media_children')
      .select('media_id')
      .eq('child_id', child_id);

    if (groupMediaLinks && groupMediaLinks.length > 0) {
      const groupMediaIds = groupMediaLinks.map(l => l.media_id);
      
      const { data: groupMedia } = await supabase
        .from('montree_media')
        .select('id, storage_path, thumbnail_path, child_id, work_id, caption, tags, captured_at')
        .in('id', groupMediaIds)
        .gte('captured_at', weekStartDate.toISOString())
        .lte('captured_at', weekEndDate.toISOString());

      if (groupMedia) {
        const existingIds = new Set(allMedia.map(m => m.id));
        groupMedia.forEach(gm => {
          if (!existingIds.has(gm.id)) {
            allMedia.push(gm);
          }
        });
      }
    }

    // 4. Get work translations INCLUDING new parent description fields
    const workIds = [...new Set(allMedia.filter(m => m.work_id).map(m => m.work_id))];
    let workTranslations: Record<string, WorkTranslation> = {};

    if (workIds.length > 0) {
      const { data: translations } = await supabase
        .from('montree_work_translations')
        .select('work_id, display_name, area, developmental_context, home_extension, photo_caption_template, parent_description, why_it_matters, home_connection')
        .in('work_id', workIds);

      if (translations) {
        translations.forEach(t => {
          workTranslations[t.work_id] = {
            display_name: t.display_name,
            area: t.area as CurriculumArea,
            developmental_context: t.developmental_context,
            home_extension: t.home_extension,
            photo_caption_template: t.photo_caption_template,
            parent_description: t.parent_description,
            why_it_matters: t.why_it_matters,
            home_connection: t.home_connection,
          };
        });
      }
    }

    // 4b. Fetch work sessions for this week
    const { data: sessions } = await supabase
      .from('montree_work_sessions')
      .select('*')
      .eq('child_id', child_id)
      .gte('observed_at', weekStartDate.toISOString())
      .lte('observed_at', weekEndDate.toISOString());

    const workRepetitions: Record<string, number> = {};
    const sessionNotes: Record<string, string[]> = {};
    
    if (sessions && sessions.length > 0) {
      sessions.forEach(s => {
        if (s.work_id) {
          workRepetitions[s.work_id] = (workRepetitions[s.work_id] || 0) + 1;
          if (s.notes && s.notes.trim()) {
            if (!sessionNotes[s.work_id]) sessionNotes[s.work_id] = [];
            sessionNotes[s.work_id].push(s.notes);
          }
        }
      });
      
      // Fetch translations for session works not in media
      const sessionWorkIds = Object.keys(workRepetitions);
      const newWorkIds = sessionWorkIds.filter(id => !workIds.includes(id));
      
      if (newWorkIds.length > 0) {
        const { data: moreTranslations } = await supabase
          .from('montree_work_translations')
          .select('work_id, display_name, area, developmental_context, home_extension, photo_caption_template, parent_description, why_it_matters, home_connection')
          .in('work_id', newWorkIds);
          
        if (moreTranslations) {
          moreTranslations.forEach(t => {
            workTranslations[t.work_id] = {
              display_name: t.display_name,
              area: t.area as CurriculumArea,
              developmental_context: t.developmental_context,
              home_extension: t.home_extension,
              photo_caption_template: t.photo_caption_template,
              parent_description: t.parent_description,
              why_it_matters: t.why_it_matters,
              home_connection: t.home_connection,
            };
          });
        }
      }
    }

    // 5. Build highlights - NOW USING PARENT DESCRIPTIONS
    const childName = child.name;
    const highlights: ReportHighlight[] = allMedia.map(media => {
      const work = media.work_id ? workTranslations[media.work_id] : null;
      const repetitions = media.work_id ? (workRepetitions[media.work_id] || 1) : 1;
      const notes = media.work_id ? (sessionNotes[media.work_id] || []) : [];
      
      // Session 55: Use parent_description if available, personalize with child name
      let observation = media.caption || notes[0] || 'Working with concentration.';
      if (work?.parent_description) {
        // Replace "Your child" with actual name
        observation = work.parent_description.replace(/Your child/g, childName);
      }
      
      // Use why_it_matters for developmental note
      const developmental_note = work?.why_it_matters || work?.developmental_context || 'Developing independence and focus.';
      
      // Use home_connection for home extension
      const home_ext = work?.home_connection || work?.home_extension || null;
      
      return {
        media_id: media.id,
        storage_path: media.storage_path,
        thumbnail_path: media.thumbnail_path,
        work_id: media.work_id,
        work_name: work?.display_name || null,
        area: work?.area || null,
        observation,
        developmental_note,
        home_extension: home_ext,
        captured_at: media.captured_at,
        caption: media.caption,
        repetitions,
        session_notes: notes.length > 0 ? notes : undefined,
      };
    });

    // 6. Calculate areas explored
    const areasSet = new Set<CurriculumArea>();
    highlights.forEach(h => {
      if (h.area) areasSet.add(h.area);
    });
    const areas_explored = Array.from(areasSet);

    // 7. Build content
    const totalSessions = sessions?.length || 0;
    const uniqueWorksThisWeek = Object.keys(workRepetitions).length;
    
    const content: ReportContent = {
      summary: generateBasicSummary(childName, child.gender, highlights, areas_explored, totalSessions, uniqueWorksThisWeek),
      highlights,
      areas_explored,
      total_activities: highlights.length,
      total_photos: allMedia.length,
      total_sessions: totalSessions,
      unique_works: uniqueWorksThisWeek,
      work_repetitions: workRepetitions,
      milestones: [],
      teacher_notes: report_type === 'teacher' ? '' : undefined,
      parent_message: report_type === 'parent' 
        ? `Thank you for being part of ${childName}'s learning journey!` 
        : undefined,
      generated_with_ai: false,
      generation_timestamp: new Date().toISOString(),
    };

    // 8. Create report record
    const { data: report, error: insertError } = await supabase
      .from('montree_weekly_reports')
      .insert({
        school_id,
        classroom_id: null,
        child_id,
        week_start,
        week_end,
        report_type,
        status: 'draft' as const,
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

    // 9. Link media to report
    if (allMedia.length > 0) {
      const mediaLinks = allMedia.map((m, index) => ({
        report_id: report.id,
        media_id: m.id,
        display_order: index,
        caption: m.caption,
      }));

      await supabase.from('montree_report_media').insert(mediaLinks);
    }

    // 10. Auto-generate share token
    const shareToken = generateShareToken();
    const shareExpiresAt = new Date();
    shareExpiresAt.setDate(shareExpiresAt.getDate() + 90);

    await supabase.from('report_share_tokens').insert({
      report_id: report.id,
      token: shareToken,
      expires_at: shareExpiresAt.toISOString(),
      revoked: false,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teacherpotato.xyz';
    const shareUrl = `${baseUrl}/montree/report/${shareToken}`;

    return {
      success: true,
      report: report as MontreeWeeklyReport,
      share_url: shareUrl,
      share_token: shareToken,
      stats: {
        photos_included: allMedia.length,
        activities_detected: highlights.length,
        ai_generation_time_ms: use_ai ? Date.now() - startTime : undefined,
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

function generateShareToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function generateBasicSummary(
  name: string, 
  gender: 'he' | 'she' | 'they',
  highlights: ReportHighlight[],
  areas: CurriculumArea[],
  totalSessions: number,
  uniqueWorks: number
): string {
  const verb = gender === 'they' ? 'were' : 'was';
  const possessive = gender === 'he' ? 'his' : gender === 'she' ? 'her' : 'their';
  const showedVerb = gender === 'they' ? 'They showed' : gender === 'he' ? 'He showed' : 'She showed';
  
  if (highlights.length === 0 && totalSessions === 0) {
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

  const areaText = areaNames.length === 0 
    ? 'various activities'
    : areaNames.length === 1 
      ? areaNames[0]
      : areaNames.length === 2
        ? `${areaNames[0]} and ${areaNames[1]}`
        : `${areaNames.slice(0, -1).join(', ')}, and ${areaNames[areaNames.length - 1]}`;

  const activityCount = uniqueWorks || highlights.length;
  const sessionNote = totalSessions > activityCount 
    ? `, returning to favorite works ${totalSessions - activityCount} times` 
    : '';

  return `This week, ${name} ${verb} actively engaged in ${possessive} learning, exploring ${activityCount} ${activityCount === 1 ? 'activity' : 'activities'} across ${areaText}${sessionNote}. ${showedVerb} wonderful focus and curiosity throughout the week.`;
}

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
