// app/api/montree/weekly-admin-docs/export/route.ts
//
// ONE BUTTON. GET this route and a .docx comes back, laid out like the
// handed-in samples (docs/samples/), with every cell already filled in from
// the tracking engine — no auto-fill click, no save, no round trip.
//
//   GET /api/montree/weekly-admin-docs/export
//         ?classroom_id=<uuid>&week_start=<Monday>&doc=summary|plan&lang=en|zh
//
// Rules 8/9: every string in the file is DERIVED from the journal and written
// by a TEMPLATE (lib/montree/tracking/weekly-doc.ts). No model is called here
// at all. Anything the teacher has already hand-edited and saved in
// montree_weekly_admin_notes WINS over the engine's suggestion — the teacher
// is the author, the engine only ever fills a blank.
//
// The layout itself is doc-generator.ts, unchanged: the Weekly Plan is a
// 7-column grid (week label + Practical/Sensorial/Math/Language/Science &
// Culture/Notes) with two rows per child, and the Weekly Summary is one row
// per child with the English sentence above the per-area lines.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { sortChildrenByCustomOrder } from '@/lib/montree/weekly-admin/child-order';
import {
  generateWeeklySummary,
  generateWeeklyPlan,
  packDocument,
  type ChildNotes,
} from '@/lib/montree/weekly-admin/doc-generator';
import { loadReaderLedger } from '@/lib/montree/tracking/readers-ledger';
import {
  DOC_AREAS,
  summaryParagraph,
  weeklyDocForChild,
  type DocLang,
  type WeeklyDoc,
} from '@/lib/montree/tracking/weekly-doc';

export const maxDuration = 60;

const PLAN_AREAS = DOC_AREAS;

interface NoteRow {
  child_id: string;
  area: string | null;
  english_text: string | null;
  chinese_text: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!(await isFeatureEnabled(getSupabase(), auth.schoolId, 'weekly_admin_docs'))) {
    return NextResponse.json({ error: 'Weekly admin docs feature is not enabled' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id') || auth.classroomId;
    const weekStart = searchParams.get('week_start') || '';
    const docType = (searchParams.get('doc') || 'summary').toLowerCase();
    const lang: DocLang = (searchParams.get('lang') || 'en').toLowerCase() === 'zh' ? 'zh' : 'en';

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }
    if (!['summary', 'plan'].includes(docType)) {
      return NextResponse.json({ error: 'doc must be "summary" or "plan"' }, { status: 400 });
    }
    const parsed = new Date(`${weekStart}T00:00:00Z`);
    if (!weekStart || isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
      return NextResponse.json({ error: 'week_start must be a valid Monday date' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', classroomId)
      .maybeSingle();
    if (!classroom || (classroom as { school_id: string }).school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const childrenRes = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (childrenRes.error) {
      console.error('weekly-admin-docs/export children error:', childrenRes.error.message);
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }
    const children = sortChildrenByCustomOrder(childrenRes.data || []) as Array<{ id: string; name: string }>;
    const childIds = children.map((c) => c.id);

    // The engine (rule 8) and the teacher's own saved edits, in parallel.
    const [ledger, notesRes] = await Promise.all([
      childIds.length
        ? loadReaderLedger(supabase, { classroomId, childIds, weekStarts: [weekStart] })
        : Promise.resolve(null),
      supabase
        .from('montree_weekly_admin_notes')
        .select('child_id, area, english_text, chinese_text')
        .eq('classroom_id', classroomId)
        .eq('week_start', weekStart)
        .eq('doc_type', docType),
    ]);

    if (notesRes.error) {
      console.error('weekly-admin-docs/export notes error:', notesRes.error.message);
    }
    // child_id → area (null for the overall note) → row
    const saved = new Map<string, Map<string | null, NoteRow>>();
    for (const row of (notesRes.data || []) as NoteRow[]) {
      if (!saved.has(row.child_id)) saved.set(row.child_id, new Map());
      saved.get(row.child_id)!.set(row.area, row);
    }

    const engineFor = (childId: string, l: DocLang): WeeklyDoc | null =>
      ledger && ledger.works.length > 0 ? weeklyDocForChild(ledger, childId, weekStart, { lang: l }) : null;

    const childNotes: ChildNotes[] = children.map((child) => {
      const mine = saved.get(child.id);
      const overall = mine?.get(null);
      const en = engineFor(child.id, 'en');
      const zh = engineFor(child.id, 'zh');

      if (docType === 'summary') {
        // The teacher's saved text wins whole; otherwise the engine writes the
        // sample's shape — English sentence, then one line per remaining area.
        const savedText = (lang === 'zh'
          ? overall?.chinese_text || overall?.english_text
          : overall?.english_text) || '';
        const engineText = en && zh ? summaryParagraph(en, lang === 'zh' ? zh : en).join('\n') : '';
        return {
          childId: child.id,
          childName: child.name,
          englishSummary: savedText || engineText || 'No recorded activities this week.',
          chineseSummary: '',
        };
      }

      const planAreas: ChildNotes['planAreas'] = {};
      for (const area of PLAN_AREAS) {
        const areaNote = mine?.get(area);
        const savedCell = (lang === 'zh'
          ? areaNote?.chinese_text || areaNote?.english_text
          : areaNote?.english_text) || '';
        const engineCell = (lang === 'zh' ? zh : en)?.areas[area]?.planCell || '';
        planAreas[area] = { en: savedCell || engineCell };
      }
      return {
        childId: child.id,
        childName: child.name,
        planAreas,
        chineseNote: overall?.chinese_text || '',
        notesText: mine?.get('notes')?.english_text || '',
      };
    });

    const weekEndForLabel = new Date(parsed.getTime() + 6 * 24 * 60 * 60 * 1000);
    const weekNumber = getWeekNumber(parsed);
    const weekLabel = `W${weekNumber} (${weekStart} – ${weekEndForLabel.toISOString().slice(0, 10)})`;

    const doc = docType === 'summary'
      ? generateWeeklySummary(childNotes, weekLabel)
      : generateWeeklyPlan(childNotes, `W${weekNumber}`);
    const buffer = await packDocument(doc);

    const filename = `${docType === 'summary' ? 'Weekly_Summary' : 'Weekly_Plan'}_${weekStart}_${lang}.docx`;
    // Uint8Array, not Buffer: BodyInit does not accept Node's Buffer type.
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('weekly-admin-docs/export exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** ISO week number — the same helper the generate route prints. */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
