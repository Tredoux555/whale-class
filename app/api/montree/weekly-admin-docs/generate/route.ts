// app/api/montree/weekly-admin-docs/generate/route.ts
// POST: Generate Weekly Summary or Weekly Plan .docx from saved notes + progress data

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import {
  generateWeeklySummary,
  generateWeeklyPlan,
  packDocument,
  type ChildNotes,
} from '@/lib/montree/weekly-admin/doc-generator';

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const classroomId: string = body.classroom_id || auth.classroomId;
    const weekStart: string = body.week_start;
    const docType: string = body.doc_type; // 'summary' or 'plan'

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }
    if (!weekStart) {
      return NextResponse.json({ error: 'week_start required' }, { status: 400 });
    }
    if (!['summary', 'plan'].includes(docType)) {
      return NextResponse.json({ error: 'doc_type must be "summary" or "plan"' }, { status: 400 });
    }

    // Validate weekStart is a Monday
    const parsed = new Date(`${weekStart}T00:00:00Z`);
    if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
      return NextResponse.json({ error: 'week_start must be a valid Monday date' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify classroom belongs to teacher's school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Step 1: Fetch children + notes + progress in parallel
    const [childrenRes, notesRes, progressRes] = await Promise.all([
      // 1. All children in classroom
      supabase
        .from('montree_children')
        .select('id, name')
        .eq('classroom_id', classroomId)
        .order('name', { ascending: true }),

      // 2. All saved notes for this week + doc type
      supabase
        .from('montree_weekly_admin_notes')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('week_start', weekStart)
        .eq('doc_type', docType),

      // 3. Progress data for auto-generation (summary only)
      docType === 'summary'
        ? supabase.rpc('get_weekly_progress', {
            p_classroom_id: classroomId,
            p_week_start: weekStart,
          }).then((res: { data: unknown; error: unknown }) => res)
          .catch((err: unknown) => {
            console.error('weekly-admin-docs/generate progress RPC error:', err);
            return { data: null, error: null };
          })
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (childrenRes.error) {
      console.error('weekly-admin-docs/generate children error:', childrenRes.error.message);
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }

    if (notesRes.error) {
      console.error('weekly-admin-docs/generate notes error:', notesRes.error.message);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    const children = childrenRes.data || [];
    const notes = notesRes.data || [];
    const childIds = children.map((c: { id: string; name: string }) => c.id);

    // Step 2: Fetch focus works using child IDs (table has no classroom_id column)
    let focusWorksRes: { data: unknown; error: unknown } = { data: null, error: null };
    if (childIds.length > 0) {
      try {
        focusWorksRes = await supabase
          .from('montree_child_focus_works')
          .select('child_id, area, work_name')
          .in('child_id', childIds);
      } catch (err) {
        console.error('weekly-admin-docs/generate focus works error:', err);
        focusWorksRes = { data: null, error: null };
      }
    }

    // Build notes lookup: child_id -> { area -> note }
    const notesMap = new Map<string, Map<string | null, typeof notes[0]>>();
    for (const note of notes) {
      if (!notesMap.has(note.child_id)) {
        notesMap.set(note.child_id, new Map());
      }
      notesMap.get(note.child_id)!.set(note.area, note);
    }

    // Build progress lookup for auto-generated English text
    const progressMap = new Map<string, Array<{ work_name: string; area: string; status: string }>>();
    if (progressRes.data && Array.isArray(progressRes.data)) {
      for (const row of progressRes.data) {
        if (!progressMap.has(row.child_id)) {
          progressMap.set(row.child_id, []);
        }
        progressMap.get(row.child_id)!.push(row);
      }
    }

    // Build focus works lookup: childId -> area -> work_name (for "next week" in Summary)
    const focusMap = new Map<string, Map<string, string>>();
    if (focusWorksRes.data && Array.isArray(focusWorksRes.data)) {
      for (const fw of focusWorksRes.data) {
        if (!focusMap.has(fw.child_id)) {
          focusMap.set(fw.child_id, new Map());
        }
        focusMap.get(fw.child_id)!.set(fw.area, fw.work_name);
      }
    }

    // Assemble ChildNotes for the doc generator
    const childNotes: ChildNotes[] = children.map((child: { id: string; name: string }) => {
      const childNotesMap = notesMap.get(child.id);

      if (docType === 'summary') {
        // Summary: overall English + Chinese notes (area=null)
        const summaryNote = childNotesMap?.get(null);

        // Auto-generate English from progress + focus works if not manually overridden
        let englishSummary = summaryNote?.english_text || '';
        if (!englishSummary) {
          const progItems = progressMap.get(child.id);
          if (progItems && progItems.length > 0) {
            const workNames = progItems.map((p) => p.work_name).slice(0, 5);
            const worksStr = workNames.length === 1
              ? workNames[0]
              : workNames.length === 2
                ? `${workNames[0]} and ${workNames[1]}`
                : `${workNames.slice(0, -1).join(', ')}, and ${workNames[workNames.length - 1]}`;
            englishSummary = `did ${worksStr} this week.`;

            // Add "Next week" from focus works
            const childFocus = focusMap.get(child.id);
            if (childFocus) {
              const nextWork = childFocus.get('language')
                || childFocus.get('mathematics')
                || childFocus.get('sensorial')
                || childFocus.get('practical_life')
                || childFocus.get('cultural');
              if (nextWork) {
                englishSummary += ` Next week: ${nextWork}.`;
              }
            }
          } else {
            englishSummary = "didn't complete any recorded activities this week.";
          }
        }

        return {
          childId: child.id,
          childName: child.name,
          englishSummary,
          chineseSummary: summaryNote?.chinese_text || '',
        };
      } else {
        // Plan: per-area English + Chinese notes
        const areas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
        const planAreas: ChildNotes['planAreas'] = {};

        for (const area of areas) {
          const areaNote = childNotesMap?.get(area);
          planAreas[area] = {
            en: areaNote?.english_text || '',
            zh: areaNote?.chinese_text || '',
          };
        }

        return {
          childId: child.id,
          childName: child.name,
          planAreas,
        };
      }
    });

    // Generate document
    const weekEnd = new Date(parsed.getTime() + 6 * 24 * 60 * 60 * 1000);
    const weekLabel = `W${getWeekNumber(parsed)} (${weekStart} \u2013 ${weekEnd.toISOString().slice(0, 10)})`;

    const doc = docType === 'summary'
      ? generateWeeklySummary(childNotes, weekLabel)
      : generateWeeklyPlan(childNotes, weekLabel);

    const buffer = await packDocument(doc);

    // Return as downloadable .docx
    const filename = docType === 'summary'
      ? `Weekly_Summary_${weekStart}.docx`
      : `Weekly_Plan_${weekStart}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('weekly-admin-docs/generate exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────

/** Get ISO week number from a date. */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
