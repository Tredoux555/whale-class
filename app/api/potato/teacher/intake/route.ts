// GET /api/potato/teacher/intake — the teacher's onboarding list.
//
// Every child in her class with the state of their form beside them, waiting
// submissions first. This is a roster view, not an intake view: a child whose
// family has not started yet still appears, because "nobody has filled this in"
// is the thing a teacher most needs to see.
//
// 🚨 CLASS SCOPE COMES OFF THE COOKIE. There is no classId parameter.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  listChildren,
  isSetupPending,
  proxyUrl,
} from '@/lib/potato/db';
import { INTAKE_TABLE, intakeReady } from '@/lib/potato/intake';
import type { IntakeStatus } from '@/lib/onboarding-core';

export const dynamic = 'force-dynamic';

interface IntakeSummaryRow {
  child_id: string;
  status: IntakeStatus;
  submitted_at: string | null;
  committed_at: string | null;
  updated_at: string | null;
}

/** Submissions first — they are the ones asking for the teacher's attention.
 *  Then drafts in progress, then committed, then untouched. */
const ORDER: Record<string, number> = { submitted: 0, draft: 1, committed: 2, none: 3 };

export async function GET(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const supabase = potatoDb();

    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    if (!(await intakeReady(supabase))) {
      return NextResponse.json({ error: 'migration_pending' }, { status: 503 });
    }

    const children = await listChildren(supabase, session.classId);

    const { data, error } = await supabase
      .from(INTAKE_TABLE)
      .select('child_id, status, submitted_at, committed_at, updated_at')
      .eq('class_id', session.classId);
    if (error) throw error;

    const byChild = new Map<string, IntakeSummaryRow>();
    for (const row of (data ?? []) as IntakeSummaryRow[]) byChild.set(row.child_id, row);

    const rows = children.map((child) => {
      const intake = byChild.get(child.id) ?? null;
      return {
        childId: child.id,
        childName: child.name,
        faceUrl: proxyUrl(child.photo_path),
        status: (intake?.status ?? 'none') as IntakeStatus | 'none',
        submittedAt: intake?.submitted_at ?? null,
        committedAt: intake?.committed_at ?? null,
        updatedAt: intake?.updated_at ?? null,
      };
    });

    rows.sort((a, b) => {
      const rank = (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9);
      return rank !== 0 ? rank : a.childName.localeCompare(b.childName);
    });

    return NextResponse.json({
      className: klass.name,
      children: rows,
      counts: {
        submitted: rows.filter((r) => r.status === 'submitted').length,
        committed: rows.filter((r) => r.status === 'committed').length,
        total: rows.length,
      },
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'migration_pending' }, { status: 503 });
    }
    console.error('[potato/teacher/intake] GET error:', error);
    return NextResponse.json({ error: 'Could not load the forms.' }, { status: 500 });
  }
}
