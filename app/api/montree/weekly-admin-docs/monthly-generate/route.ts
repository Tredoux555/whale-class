// app/api/montree/weekly-admin-docs/monthly-generate/route.ts
//
// POST: Generate Language Monthly Summary .docx for a classroom + month.
// Pulls saved notes from `montree_weekly_admin_notes` (doc_type='monthly').
// Children with no saved note get an empty paragraph — teacher must Auto-fill
// + Save first to populate the docx.
//
// Returns a Buffer with the proper Content-Disposition header so the
// browser saves it as `<ClassroomName>_<Month>_Language_Summary.docx`.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { sortChildrenByCustomOrder } from '@/lib/montree/weekly-admin/child-order';
import {
  generateMonthlySummaryDoc,
  type MonthlyDocChild,
} from '@/lib/montree/weekly-admin/monthly-doc-generator';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseMonthStart(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  if (d.getUTCDate() !== 1) return null;
  return d;
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!await isFeatureEnabled(getSupabase(), auth.schoolId, 'weekly_admin_docs')) {
    return NextResponse.json({ error: 'Weekly admin docs feature is not enabled' }, { status: 403 });
  }

  let body: { classroom_id?: string; month_start?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const classroomId = body.classroom_id || auth.classroomId;
  const monthStart = parseMonthStart(body.month_start || null);
  if (!classroomId) {
    return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
  }
  if (!monthStart) {
    return NextResponse.json({ error: 'month_start required (YYYY-MM-01)' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: classroom } = await supabase
    .from('montree_classrooms')
    .select('id, name, school_id')
    .eq('id', classroomId)
    .maybeSingle();
  if (!classroom || classroom.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const monthName = MONTH_NAMES[monthStart.getUTCMonth()];
  const monthLabel = `${monthName} ${monthStart.getUTCFullYear()}`;
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [childrenRes, notesRes] = await Promise.all([
    supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('montree_weekly_admin_notes')
      .select('child_id, english_text')
      .eq('classroom_id', classroomId)
      .eq('week_start', monthStartStr)
      .eq('doc_type', 'monthly')
      .is('area', null),
  ]);

  if (childrenRes.error) {
    console.error('monthly-generate children error:', childrenRes.error.message);
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }
  if (notesRes.error) {
    console.error('monthly-generate notes error:', notesRes.error.message);
    const msg = notesRes.error.message || '';
    if (msg.includes('doc_type_check') || msg.includes('week_start_monday')) {
      return NextResponse.json({
        error: 'Migration 238 has not been run yet',
        migration_pending: true,
      }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }

  const children = sortChildrenByCustomOrder(childrenRes.data || []);
  const notesByChild = new Map<string, string>();
  for (const n of (notesRes.data || []) as Array<{ child_id: string; english_text: string | null }>) {
    if (n.english_text) notesByChild.set(n.child_id, n.english_text);
  }

  const docChildren: MonthlyDocChild[] = children.map(c => ({
    childName: c.name,
    body: notesByChild.get(c.id) || '',
  }));

  const buffer = await generateMonthlySummaryDoc({
    classroomName: classroom.name || 'Classroom',
    monthLabel,
    children: docChildren,
  });

  const filename = `${sanitizeFilename(classroom.name || 'Classroom')}_${monthName}_Language_Summary.docx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
