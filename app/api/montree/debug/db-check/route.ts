// Debug endpoint to check Supabase connection
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    // Check if we can query the database
    const { data: children, error: childError } = await supabase
      .from('montree_children')
      .select('id, name')
      .limit(3);

    const { data: links, error: linkError } = await supabase
      .from('montree_parent_children')
      .select('*')
      .limit(3);

    // Check column existence
    const { data: colCheck, error: colError } = await supabase
      .from('montree_children')
      .select('id, name, nickname')
      .limit(1);

    // Check reports for a specific child
    let reportsCheck = null;
    if (childId) {
      const { data: reports, error: reportError } = await supabase
        .from('montree_weekly_reports')
        .select('id, week_number, report_year, child_id, parent_summary, is_published, created_at')
        .eq('child_id', childId)
        .limit(5);
      reportsCheck = {
        success: !reportError,
        count: reports?.length,
        data: reports,
        error: reportError?.message
      };
    }

    // Get all reports regardless of child
    const { data: allReports, error: allReportsError } = await supabase
      .from('montree_weekly_reports')
      .select('id, week_number, report_year, child_id, is_published')
      .limit(10);

    return NextResponse.json({
      supabase_url: supabaseUrl?.substring(0, 40) + '...',
      children_query: {
        success: !childError,
        count: children?.length,
        data: children,
        error: childError?.message
      },
      links_query: {
        success: !linkError,
        count: links?.length,
        data: links,
        error: linkError?.message
      },
      nickname_column: {
        success: !colError,
        error: colError?.message
      },
      reports_for_child: reportsCheck,
      all_reports: {
        success: !allReportsError,
        count: allReports?.length,
        data: allReports,
        error: allReportsError?.message
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack?.substring(0, 500)
    }, { status: 500 });
  }
}
