// app/api/montree/reports/[id]/pdf/route.ts
// GET - Generate and download PDF for a report
// Phase 4A - Session 55

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { generateReportPDF } from '@/lib/montree/reports/pdf-generator';
import type { PDFReportData, PDFHighlight } from '@/lib/montree/reports/pdf-types';
import type { ReportContent, ReportHighlight } from '@/lib/montree/reports/types';

// ============================================
// GET - Generate PDF
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Auth check
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
    const { data: report, error: reportError } = await supabase
      .from('montree_weekly_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Fetch child (from montree_children table)
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, gender')
      .eq('id', report.child_id)
      .single();

    if (childError || !child) {
      return NextResponse.json(
        { success: false, error: 'Child not found' },
        { status: 404 }
      );
    }

    // Fetch school info (using teacher's cookie for now)
    // In production, this would come from actual school table
    const schoolName = 'Whale Montessori';

    // Transform report content to PDF format
    const content = report.content as ReportContent;
    
    const pdfHighlights: PDFHighlight[] = (content.highlights || []).map(
      (h: ReportHighlight) => ({
        workName: h.work_name || 'Activity',
        workArea: h.area || 'general',
        observation: h.observation || '',
        developmentalNote: h.developmental_note,
        homeExtension: h.home_extension,
      })
    );

    const pdfData: PDFReportData = {
      childName: child.name,
      childGender: (child.gender as 'he' | 'she' | 'they') || 'they',
      weekStart: report.week_start,
      weekEnd: report.week_end,
      generatedAt: new Date().toISOString(),
      summary: content.summary || '',
      parentMessage: content.parent_message,
      highlights: pdfHighlights,
      schoolName,
      teacherName,
    };

    // Generate PDF
    const pdfBuffer = await generateReportPDF(pdfData);

    // Create filename
    const weekDate = new Date(report.week_start);
    const weekStr = weekDate.toISOString().split('T')[0];
    const safeName = child.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeName}_Report_${weekStr}.pdf`;

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
