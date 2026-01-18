// app/api/montree/reports/[id]/enhance/route.ts
// POST endpoint to enhance a report with AI-generated content
// Phase 5 - Session 56

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { 
  enhanceReportWithAI, 
  type WorkTranslation,
  type EnhanceInput 
} from '@/lib/montree/reports/ai-generator';
import type { MontreeWeeklyReport, CurriculumArea } from '@/lib/montree/reports/types';

// ============================================
// POST /api/montree/reports/[id]/enhance
// ============================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================
    // 0. Authentication check
    // ============================================
    
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;
    
    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { id: reportId } = await params;

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // ============================================
    // 1. Fetch the report
    // ============================================

    const { data: report, error: reportError } = await supabase
      .from('montree_weekly_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      console.error('Report fetch error:', reportError);
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    const typedReport = report as MontreeWeeklyReport;

    // Check if report is in draft status (can't enhance approved/sent reports)
    if (typedReport.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Only draft reports can be enhanced' },
        { status: 400 }
      );
    }

    // ============================================
    // 2. Fetch the child (from montree_children table)
    // ============================================

    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, gender')
      .eq('id', typedReport.child_id)
      .single();

    if (childError || !child) {
      console.error('Child fetch error:', childError);
      return NextResponse.json(
        { success: false, error: 'Child not found' },
        { status: 404 }
      );
    }

    // Map gender to expected format
    const genderMap: Record<string, 'he' | 'she' | 'they'> = {
      'male': 'he',
      'female': 'she',
      'boy': 'he',
      'girl': 'she',
      'he': 'he',
      'she': 'she',
      'they': 'they',
      'other': 'they',
    };
    const normalizedGender = genderMap[child.gender?.toLowerCase()] || 'they';

    // ============================================
    // 3. Fetch work translations
    // ============================================

    // Get unique work_ids from highlights (filter out nulls, then dedupe)
    const workIds = [...new Set(
      typedReport.content.highlights
        .map(h => h.work_id)
        .filter((id): id is string => id !== null && id !== undefined)
    )];

    let translations: Record<string, WorkTranslation> = {};

    if (workIds.length > 0) {
      const { data: translationsData } = await supabase
        .from('montree_work_translations')
        .select('work_id, display_name, area, developmental_context, home_extension, photo_caption_template')
        .in('work_id', workIds);

      if (translationsData) {
        translationsData.forEach(t => {
          translations[t.work_id] = {
            work_id: t.work_id,
            display_name: t.display_name,
            area: t.area as CurriculumArea,
            developmental_context: t.developmental_context,
            home_extension: t.home_extension,
            photo_caption_template: t.photo_caption_template,
          };
        });
      }
    }

    // ============================================
    // 4. Call AI generator
    // ============================================

    const enhanceInput: EnhanceInput = {
      report: typedReport.content,
      child: {
        name: child.name,
        gender: normalizedGender,
      },
      week_start: typedReport.week_start,
      week_end: typedReport.week_end,
      translations,
    };

    const aiResult = await enhanceReportWithAI(enhanceInput);

    if (!aiResult.success || !aiResult.content) {
      return NextResponse.json(
        { 
          success: false, 
          error: aiResult.error || 'AI enhancement failed' 
        },
        { status: 500 }
      );
    }

    // ============================================
    // 5. Update report in database
    // ============================================

    const { data: updatedReport, error: updateError } = await supabase
      .from('montree_weekly_reports')
      .update({
        content: aiResult.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save enhanced content' },
        { status: 500 }
      );
    }

    // ============================================
    // 6. Return success response
    // ============================================

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      report: updatedReport as MontreeWeeklyReport,
      stats: {
        ai_generation_time_ms: aiResult.timing_ms,
        total_time_ms: totalTime,
        highlights_enhanced: aiResult.content.highlights.length,
      },
    });

  } catch (error) {
    console.error('Enhance endpoint error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
