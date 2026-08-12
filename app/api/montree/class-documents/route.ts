// app/api/montree/class-documents/route.ts
// ============================================================================
// The read behind Class Documents. CMS phase 6 — the bridge.
// ============================================================================
// GET ?classroomId=  → everything the six CMS document generators need, built
// out of MONTREE's own tables: `montree_children` (active only) and the
// COMMITTED `montree_child_intake` rows.
//
// Read-only. This route writes nothing, ever — a document is a view of the
// record, and the record is edited where it has always been edited (Students,
// Child Onboarding).
//
// 🚨 TENANCY COMES FROM THE SESSION. `verifySchoolRequest` gives the school;
// every query is `.eq('school_id', auth.schoolId)`. A client-supplied
// `classroomId` is only ever a NARROWING filter, re-checked against the
// school's own classroom list before it is used — the Jul-3 cross-tenant
// lesson: existence is not ownership.
//
// 🚨 NO FEATURE FLAG. This surface reads tables every Montree school already
// has, adds no migration, and is useful with zero intake rows (a class list and
// a sheet of labels need names and birthdays, nothing more). Gating it behind
// `child_onboarding` would hide the class list from a school that never turns
// intake on, which is backwards.
//
// 🚨 MIGRATION-PENDING SAFE. `montree_child_intake` (migration 326) may not
// exist yet on a given project. The intake read fails SOFT: the route returns
// the roster with no health data and `intakeAvailable: false`, and the page
// says so. It never 500s because a table is missing.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSchoolTimezone } from '@/lib/montree/school-time';
import {
  buildDocumentSource,
  summariseIntakeCoverage,
  type DocumentSourceInput,
  type MontreeChildRow,
  type MontreeIntakeRow,
} from '@/lib/montree/cms-bridge/document-source';

export const dynamic = 'force-dynamic';

/** A class of 500 is not a class. The cap is a guard, not a page size. */
const MAX_CHILDREN = 500;

interface ClassroomRow {
  id: string;
  name: string | null;
  age_group: string | null;
  school_id: string;
}

/** Today in the SCHOOL's zone, never the server's — a register is cut on the
 *  day the room is living in. `en-CA` because it formats as YYYY-MM-DD. */
function schoolToday(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA').format(new Date());
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const requestedId =
      searchParams.get('classroomId') || searchParams.get('classroom_id') || '';

    // ── the rooms this school actually has ─────────────────────────────────
    const { data: classroomData, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, name, age_group, school_id')
      .eq('school_id', auth.schoolId)
      .neq('is_active', false)
      .order('name', { ascending: true });

    if (classroomError) {
      console.error('[class-documents] classrooms failed:', classroomError.message);
      return NextResponse.json(
        { success: false, error: 'Could not load classrooms' },
        { status: 500 }
      );
    }

    const classrooms = (classroomData || []) as ClassroomRow[];
    if (classrooms.length === 0) {
      return NextResponse.json({
        success: true,
        classroom: null,
        classrooms: [],
        source: null,
        coverage: null,
        intakeAvailable: true,
      });
    }

    // The requested room only counts if it is one of THIS school's rooms;
    // otherwise fall back to the session's own classroom, then to the first.
    const classroom =
      classrooms.find((c) => c.id === requestedId) ||
      classrooms.find((c) => c.id === auth.classroomId) ||
      classrooms[0];

    // ── school + timezone ──────────────────────────────────────────────────
    const [{ data: schoolRow }, timezone] = await Promise.all([
      supabase
        .from('montree_schools')
        .select('id, name, slug')
        .eq('id', auth.schoolId)
        .maybeSingle(),
      getSchoolTimezone(auth.schoolId),
    ]);

    // ── the roster (active only — the Aug-10 rule) ─────────────────────────
    const { data: childData, error: childError } = await supabase
      .from('montree_children')
      .select(
        'id, name, nickname, date_of_birth, age, notes, photo_url, classroom_id, school_id, is_active, created_at'
      )
      .eq('school_id', auth.schoolId)
      .eq('classroom_id', classroom.id)
      .neq('is_active', false)
      .limit(MAX_CHILDREN);

    if (childError) {
      console.error('[class-documents] children failed:', childError.message);
      return NextResponse.json(
        { success: false, error: 'Could not load children' },
        { status: 500 }
      );
    }

    const children = (childData || []) as MontreeChildRow[];
    const childIds = children.map((c) => c.id).filter(Boolean);

    // ── committed intake ONLY (review-gated; drafts never print) ───────────
    let intakes: MontreeIntakeRow[] = [];
    let intakeAvailable = true;
    if (childIds.length > 0) {
      const { data: intakeData, error: intakeError } = await supabase
        .from('montree_child_intake')
        .select('child_id, status, data, committed_at')
        .eq('school_id', auth.schoolId)
        .eq('status', 'committed')
        .in('child_id', childIds)
        .limit(MAX_CHILDREN);

      if (intakeError) {
        // 42P01 = table does not exist (migration 326 not run on this project).
        // Anything else here is equally non-fatal: a roster without health data
        // still prints a class list, and half a document beats an error page.
        console.warn('[class-documents] intake read soft-failed:', intakeError.message);
        intakeAvailable = false;
      } else {
        intakes = (intakeData || []) as MontreeIntakeRow[];
      }
    }

    const input: DocumentSourceInput = {
      school: {
        id: auth.schoolId,
        name: (schoolRow as { name?: string | null } | null)?.name ?? null,
        slug: (schoolRow as { slug?: string | null } | null)?.slug ?? null,
        timezone,
      },
      classroom: {
        id: classroom.id,
        school_id: classroom.school_id,
        name: classroom.name,
        age_group: classroom.age_group,
      },
      children,
      intakes,
      date: schoolToday(timezone),
    };

    return NextResponse.json({
      success: true,
      classroom: { id: classroom.id, name: classroom.name || '' },
      classrooms: classrooms.map((c) => ({ id: c.id, name: c.name || '' })),
      source: buildDocumentSource(input),
      coverage: summariseIntakeCoverage(input),
      intakeAvailable,
    });
  } catch (error) {
    console.error('[class-documents] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server error',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
