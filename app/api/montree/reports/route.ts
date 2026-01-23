// app/api/montree/reports/route.ts
// Reports API - List and Generate weekly reports
// Phase 3 - Session 54

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { generateWeeklyReport } from '@/lib/montree/reports/generator';
import type { ReportType, ReportStatus } from '@/lib/montree/reports/types';

// ============================================
// GET - List reports with filters
// ============================================

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;
    
    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const child_id = searchParams.get('child_id');
    const classroom_id = searchParams.get('classroom_id');
    const week_start = searchParams.get('week_start');
    const status = searchParams.get('status') as ReportStatus | null;
    const report_type = searchParams.get('report_type') as ReportType | null;
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;

    const supabase = await createServerClient();

    // Build query
    let query = supabase
      .from('montree_weekly_reports')
      .select('*', { count: 'exact' })
      .order('week_start', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (child_id) {
      query = query.eq('child_id', child_id);
    }
    
    if (classroom_id) {
      query = query.eq('classroom_id', classroom_id);
    }
    
    if (week_start) {
      query = query.eq('week_start', week_start);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (report_type) {
      query = query.eq('report_type', report_type);
    }

    const { data: reports, error, count } = await query;

    if (error) {
      console.error('Reports list error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reports: reports || [],
      total: count || 0,
      page,
      limit,
    });

  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Generate a new report
// ============================================

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;
    
    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      child_id, 
      week_start, 
      week_end, 
      report_type = 'parent',
      school_id,  // Optional - will use default UUID if not provided
      include_ai_content = false  // AI content is optional for now
    } = body;

    // Validate required fields
    if (!child_id) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    if (!week_start || !week_end) {
      return NextResponse.json(
        { success: false, error: 'week_start and week_end are required (YYYY-MM-DD format)' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(week_start) || !dateRegex.test(week_end)) {
      return NextResponse.json(
        { success: false, error: 'Dates must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Validate report type
    if (!['teacher', 'parent'].includes(report_type)) {
      return NextResponse.json(
        { success: false, error: 'report_type must be "teacher" or "parent"' },
        { status: 400 }
      );
    }

    // Generate the report
    const result = await generateWeeklyReport({
      child_id,
      school_id,
      week_start,
      week_end,
      report_type,
      generated_by: teacherName,
      use_ai: include_ai_content,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Report generation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
