// app/api/montree/paper-scan/sheet/print/route.ts
//
// GET → the Montree Standard Observation Sheet (MT-STD-1) for one classroom
// and one day, as a self-contained A4-landscape HTML page that opens the
// browser's print dialog on load. The teacher prints it in the morning, marks
// it with a pencil during the work cycle, photographs it after class and
// uploads the photo to Paper Scan — the printed template code tells the
// extractor exactly which layout it is looking at (layouts/montree-standard-v1).
//
// Why HTML-and-print rather than a server PDF: same reasoning as
// super-admin/finance/export/print — no headless Chrome on Railway, and the
// browser's print pipeline produces the identical page.
//
// Query:
//   date=YYYY-MM-DD        default: today (server date)
//   classroom_id=<uuid>    default: the session's classroom; must belong to the school
//   works_per_area=1|2     pre-printed works per area cell (default 2 → 7 children/page;
//                          1 → 10 children/page)
//   layout=v1              reserved; only 'v1' exists
//   print=0                skip the auto print dialog (preview)
//
// Auth: verifySchoolRequest (cookie), scoped to auth.schoolId. Feature gate:
// paper_scan, like every other paper-scan route.

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { sortChildrenByCustomOrder } from '@/lib/montree/weekly-admin/child-order';
import { PAPER_SCAN_FEATURE_KEY, type PaperScanArea } from '@/lib/montree/paper-scan/types';
import {
  paginateChildren,
  renderStandardSheetHtml,
  sheetPageCode,
  type SheetChildInput,
} from '@/lib/montree/paper-scan/sheet-template';
import {
  areaKeyOf,
  normaliseSheetArea,
  selectSheetWorks,
  type SheetProgressRow,
} from '@/lib/montree/paper-scan/sheet-works';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Today as YYYY-MM-DD in the server's local time. */
function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function GET(request: NextRequest) {
  try {
    return await renderSheet(request);
  } catch (error) {
    console.error('[PaperScan/sheet/print] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to render the record sheet' }, { status: 500 });
  }
}

async function renderSheet(request: NextRequest): Promise<NextResponse> {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();
  if (!(await isFeatureEnabled(supabase, auth.schoolId, PAPER_SCAN_FEATURE_KEY))) {
    return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const date = sp.get('date') || todayIso();
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ success: false, error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  const layout = sp.get('layout') || 'v1';
  if (layout !== 'v1') {
    return NextResponse.json({ success: false, error: `Unknown layout '${layout}'` }, { status: 400 });
  }
  const worksPerArea: 1 | 2 = sp.get('works_per_area') === '1' ? 1 : 2;
  const autoPrint = sp.get('print') !== '0';

  const classroomId = sp.get('classroom_id') || auth.classroomId || null;
  if (!classroomId || !UUID_RE.test(classroomId)) {
    return NextResponse.json({ success: false, error: 'classroom_id required' }, { status: 400 });
  }

  const { data: classroom } = await supabase
    .from('montree_classrooms')
    .select('id, name, school_id')
    .eq('id', classroomId)
    .maybeSingle();
  if (!classroom) {
    return NextResponse.json({ success: false, error: 'Classroom not found' }, { status: 404 });
  }
  if (classroom.school_id !== auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  const [schoolRes, teacherRes, adminRes, childrenRes, worksRes] = await Promise.all([
    supabase.from('montree_schools').select('name').eq('id', auth.schoolId).maybeSingle(),
    supabase.from('montree_teachers').select('name').eq('id', auth.userId).maybeSingle(),
    supabase.from('montree_school_admins').select('name').eq('id', auth.userId).maybeSingle(),
    supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', classroomId)
      .neq('is_active', false),
    supabase
      .from('montree_classroom_curriculum_works')
      .select('work_key, area:montree_classroom_curriculum_areas!area_id(area_key)')
      .eq('classroom_id', classroomId),
  ]);

  const roster = sortChildrenByCustomOrder(
    ((childrenRes.data ?? []) as Array<{ id: string; name: string }>).filter((c) => c.id && c.name),
  );

  const areaByWorkKey = new Map<string, PaperScanArea>();
  for (const w of (worksRes.data ?? []) as Array<{ work_key: string | null; area: unknown }>) {
    const a = normaliseSheetArea(areaKeyOf(w.area));
    if (w.work_key && a) areaByWorkKey.set(w.work_key, a);
  }

  const byChild = new Map<string, SheetProgressRow[]>();
  if (roster.length > 0) {
    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('child_id, work_name, work_key, area, status, updated_at')
      .in('child_id', roster.map((c) => c.id))
      .in('status', ['practicing', 'presented']);
    for (const r of (progress ?? []) as SheetProgressRow[]) {
      const list = byChild.get(r.child_id) ?? [];
      list.push(r);
      byChild.set(r.child_id, list);
    }
  }

  const children: SheetChildInput[] = roster.map((c) => ({
    id: c.id,
    name: c.name,
    works: selectSheetWorks(byChild.get(c.id) ?? [], areaByWorkKey, worksPerArea),
  }));

  const chunks = paginateChildren(children, worksPerArea);
  const total = Math.max(chunks.length, 1);
  const firstIndex: number[] = [];
  chunks.reduce((acc, chunk) => { firstIndex.push(acc); return acc + chunk.length; }, 1);
  const pages = await Promise.all(
    chunks.map(async (chunk, i) => {
      const code = sheetPageCode(classroomId, date, i + 1, total);
      let qr: string | null = null;
      try {
        qr = await QRCode.toDataURL(code, { errorCorrectionLevel: 'M', margin: 0, width: 256 });
      } catch {
        qr = null; // the printed text code beside it is what the extractor reads anyway
      }
      return { code, qr_data_uri: qr, children: chunk, first_index: firstIndex[i] };
    }),
  );

  const html = renderStandardSheetHtml(
    {
      school_name: schoolRes.data?.name ?? '',
      classroom_name: classroom.name ?? '',
      teacher_name: teacherRes.data?.name ?? adminRes.data?.name ?? '',
      date,
      works_per_area: worksPerArea,
      pages,
    },
    { autoPrint },
  );

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Disposition': `inline; filename="montree-sheet-${date}.html"`,
    },
  });
}
