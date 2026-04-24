// /api/montree/reports/pdf/route.ts
// Generate downloadable PDF report for parents
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { generateReportPDF } from '@/lib/montree/reports/pdf-generator';
import type { PDFReportData } from '@/lib/montree/reports/pdf-types';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';
import { getLocaleFromRequest, getTranslator } from '@/lib/montree/i18n/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const weekStart = searchParams.get('week_start');
    const weekEnd = searchParams.get('week_end');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Verify child belongs to the authenticated user's school
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
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
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }


    // Get progress for this period
    const startDate = weekStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = weekEnd || new Date().toISOString().split('T')[0];

    // Parallel fetch: progress + classroom curriculum (for DB Chinese name fallback)
    const classroomId = (child.classroom as Record<string, unknown>)?.id as string | undefined;
    const [progressResult, currResult] = await Promise.all([
      supabase
        .from('montree_child_progress')
        .select('work_name, area, status, notes, presented_at, mastered_at')
        .eq('child_id', childId)
        .gte('updated_at', startDate)
        .lte('updated_at', endDate + 'T23:59:59'),
      classroomId
        ? supabase
            .from('montree_classroom_curriculum_works')
            .select('name, name_chinese')
            .eq('classroom_id', classroomId)
            .not('name_chinese', 'is', null)
        : Promise.resolve({ data: [] as Array<{ name: string; name_chinese: string | null }> }),
    ]);

    const progress = progressResult.data;

    // Build DB name→chinese map for custom works (not in static JSON)
    // Priority: static JSON (getChineseNameForWork) → DB fallback (dbChineseMap)
    const dbChineseMap = new Map<string, string>();
    for (const w of ((currResult.data as Array<{ name: string; name_chinese: string | null }> | null) || [])) {
      if (w.name_chinese && w.name) {
        dbChineseMap.set(w.name.toLowerCase().trim(), w.name_chinese);
      }
    }

    // Get locale and translator for home extensions
    const locale = getLocaleFromRequest(request.url);
    const t = getTranslator(locale);

    // Build highlights from progress, enriched with Chinese names
    // Status values: not_started, presented, practicing, mastered
    const highlights = (progress || [])
      .filter(p => p.status === 'practicing' || p.status === 'mastered')
      .slice(0, 5)
      .map(p => ({
        workName: p.work_name,
        chineseName: p.work_name
          ? (getChineseNameForWork(p.work_name) || dbChineseMap.get(p.work_name.toLowerCase().trim()) || undefined)
          : undefined,
        workArea: p.area,
        observation: p.notes || (() => { const L: Record<string, string> = { zh: `正在学习${p.work_name}`, es: `Trabajando en ${p.work_name}` }; return L[locale] || `Working on ${p.work_name}`; })(),
        developmentalNote: p.status === 'mastered' ? (() => { const L: Record<string, string> = { zh: '已掌握此技能！', es: '¡Dominó esta habilidad!' }; return L[locale] || 'Mastered this skill!'; })() : undefined,
        homeExtension: getHomeExtension(p.area, t),
      }));

    // Build PDF data
    const classroom = child.classroom as Record<string, unknown>;
    const pdfData: PDFReportData = {
      schoolName: classroom?.school?.name || 'Montree School',
      childName: child.name,
      weekStart: startDate,
      weekEnd: endDate,
      summary: (() => { const L: Record<string, string> = { zh: `${child.name}度过了充实的一周，探索了${highlights.length}个不同课程领域的活动。`, es: `${child.name} tuvo una semana productiva explorando ${highlights.length} actividades diferentes en varias áreas del currículo.` }; return L[locale] || `${child.name} had a productive week exploring ${highlights.length} different activities across various curriculum areas.`; })(),
      highlights,
      parentMessage: (() => { const L: Record<string, string> = { zh: `感谢您参与${child.name}的学习旅程。我们看到了美好的成长！`, es: `Gracias por ser parte del viaje de aprendizaje de ${child.name}. ¡Estamos viendo un crecimiento maravilloso!` }; return L[locale] || `Thank you for being part of ${child.name}'s learning journey. We're seeing wonderful growth!`; })(),
      teacherName: (() => { const L: Record<string, string> = { zh: '您的蒙特梭利团队', es: 'Su equipo Montessori' }; return L[locale] || 'Your Montessori Team'; })(),
      generatedAt: new Date().toISOString(),
    };

    // Generate PDF with locale support
    const pdfBuffer = await generateReportPDF(pdfData, locale);

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

function getHomeExtension(area: string, t: (key: string) => string): string {
  const keyMap: Record<string, string> = {
    practical_life: 'homeExtension.practicalLife',
    sensorial: 'homeExtension.sensorial',
    mathematics: 'homeExtension.mathematics',
    language: 'homeExtension.language',
    cultural: 'homeExtension.cultural',
  };
  const key = keyMap[area] || 'homeExtension.default';
  return t(key);
}
