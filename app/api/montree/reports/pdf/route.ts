// /api/montree/reports/pdf/route.ts
// Generate downloadable PDF report for parents
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { generateReportPDF } from '@/lib/montree/reports/pdf-generator';
import type { PDFReportData } from '@/lib/montree/reports/pdf-types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const weekStart = searchParams.get('week_start');
    const weekEnd = searchParams.get('week_end');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Get child info
    const { data: child } = await supabase
      .from('montree_children')
      .select(`
        id, name, date_of_birth,
        classroom:montree_classrooms (
          id, name,
          school:montree_schools ( id, name )
        )
      `)
      .eq('id', childId)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }


    // Get progress for this period
    const startDate = weekStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = weekEnd || new Date().toISOString().split('T')[0];

    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, notes, presented_at, mastered_at')
      .eq('child_id', childId)
      .gte('updated_at', startDate)
      .lte('updated_at', endDate + 'T23:59:59');

    // Build highlights from progress
    // Status values: not_started, presented, practicing, mastered
    const highlights = (progress || [])
      .filter(p => p.status === 'practicing' || p.status === 'mastered')
      .slice(0, 5)
      .map(p => ({
        workName: p.work_name,
        workArea: p.area,
        observation: p.notes || `Working on ${p.work_name}`,
        developmentalNote: p.status === 'mastered' ? 'Mastered this skill!' : undefined,
        homeExtension: getHomeExtension(p.area),
      }));

    // Build PDF data
    const classroom = child.classroom as any;
    const pdfData: PDFReportData = {
      schoolName: classroom?.school?.name || 'Montree School',
      childName: child.name,
      weekStart: startDate,
      weekEnd: endDate,
      summary: `${child.name} had a productive week exploring ${highlights.length} different activities across various curriculum areas.`,
      highlights,
      parentMessage: `Thank you for being part of ${child.name}'s learning journey. We're seeing wonderful growth!`,
      teacherName: 'Your Montessori Team',
      generatedAt: new Date().toISOString(),
    };

    // Generate PDF
    const pdfBuffer = await generateReportPDF(pdfData);

    // Return as downloadable PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${child.name.replace(/\s+/g, '_')}_Report_${startDate}.pdf"`,
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

function getHomeExtension(area: string): string {
  const extensions: Record<string, string> = {
    practical_life: 'Practice pouring water or folding clothes at home',
    sensorial: 'Sort objects by color, size, or shape together',
    mathematics: 'Count items during daily activities like setting the table',
    language: 'Read together and point out letters in books and signs',
    cultural: 'Explore nature walks and discuss plants and animals',
  };
  return extensions[area] || 'Continue exploring and learning together!';
}
