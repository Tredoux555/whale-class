// app/api/montree/reports/[id]/route.ts
// Single report operations - GET, PATCH, DELETE
// Phase 3 - Session 54

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import type { ReportStatus, UpdateReportRequest } from '@/lib/montree/reports/types';

// ============================================
// GET - Fetch single report by ID
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;
    
    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createServerClient();

    // Fetch report
    const { data: report, error } = await supabase
      .from('montree_weekly_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Also fetch linked media
    const { data: linkedMedia } = await supabase
      .from('montree_report_media')
      .select(`
        media_id,
        display_order,
        caption,
        montree_media (
          id,
          storage_path,
          thumbnail_path,
          captured_at,
          work_id
        )
      `)
      .eq('report_id', id)
      .order('display_order', { ascending: true });

    // Fetch child info (from children table - same as generator uses)
    const { data: child } = await supabase
      .from('children')
      .select('id, name, gender, photo_url')
      .eq('id', report.child_id)
      .single();

    return NextResponse.json({
      success: true,
      report,
      linked_media: linkedMedia || [],
      child: child || null,
    });

  } catch (error) {
    console.error('Report GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH - Update report (content, status, etc.)
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;
    
    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: UpdateReportRequest = await request.json();
    const { content, status } = body;

    const supabase = await createServerClient();

    // Fetch existing report
    const { data: existing, error: fetchError } = await supabase
      .from('montree_weekly_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Prevent editing sent reports
    if (existing.status === 'sent' && status !== 'sent') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify a report that has been sent' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Merge content if provided
    if (content) {
      updates.content = {
        ...existing.content,
        ...content,
      };
    }

    // Update status if provided
    if (status) {
      const validStatuses: ReportStatus[] = ['draft', 'pending_review', 'approved', 'sent'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }

      updates.status = status;

      // Set audit timestamps based on status change
      if (status === 'approved' && existing.status !== 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = teacherName;
      }
    }

    // Perform update
    const { data: updated, error: updateError } = await supabase
      .from('montree_weekly_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Report update error:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      report: updated,
    });

  } catch (error) {
    console.error('Report PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Remove a report (only drafts)
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;
    
    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createServerClient();

    // Fetch report to check status
    const { data: existing, error: fetchError } = await supabase
      .from('montree_weekly_reports')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Only allow deleting drafts
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Only draft reports can be deleted' },
        { status: 400 }
      );
    }

    // Delete report (cascades to montree_report_media)
    const { error: deleteError } = await supabase
      .from('montree_weekly_reports')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Report delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Report deleted',
    });

  } catch (error) {
    console.error('Report DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
