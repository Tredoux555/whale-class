// GET /api/potato/teacher/intake/print-data — everything the paper needs.
//
// One row per child with a COMMITTED intake, shaped exactly as
// lib/onboarding-core/print/PickupSheets wants it (and, as a subset, what
// LabelSheets wants). Photo URLs are resolved to proxy URLs here, because the
// core print components never build a URL — each product proxies its own
// bucket.
//
// Committed only. An unread submission is not something a school should be
// printing a door sheet from.
//
// 🚨 CLASS SCOPE COMES OFF THE COOKIE. There is no classId parameter.
//
// (Route note: this static segment sits beside the dynamic `[childId]` route
// in the same folder. Next.js resolves static before dynamic, so `print-data`
// can never be read as a child id.)

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher } from '@/lib/potato/auth';
import { potatoDb, loadClass, listChildren, isSetupPending } from '@/lib/potato/db';
import { INTAKE_TABLE, intakeReady, toPrintChild } from '@/lib/potato/intake';

export const dynamic = 'force-dynamic';

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

    // The roster is the source of the NAME and the fallback face, so a child
    // who was archived after committing never reaches the paper.
    const children = await listChildren(supabase, session.classId);
    const roster = new Map(children.map((c) => [c.id, c]));

    const { data, error } = await supabase
      .from(INTAKE_TABLE)
      .select('child_id, data')
      .eq('class_id', session.classId)
      .eq('status', 'committed')
      .limit(500);
    if (error) throw error;

    const rows = ((data ?? []) as { child_id: string; data: unknown }[])
      .filter((r) => roster.has(r.child_id))
      .map((r) => {
        const child = roster.get(r.child_id)!;
        return toPrintChild(r.child_id, child.name, child.photo_path, r.data);
      })
      .sort((a, b) => a.childName.localeCompare(b.childName));

    return NextResponse.json({ className: klass.name, children: rows });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'migration_pending' }, { status: 503 });
    }
    console.error('[potato/teacher/intake/print-data] error:', error);
    return NextResponse.json({ error: 'Could not load the print data.' }, { status: 500 });
  }
}
