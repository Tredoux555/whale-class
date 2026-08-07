// GET /api/potato/montages — finished films, newest first.
//
// Two callers, two very different trust levels:
//   • teacher — may ask for any child in her own class (?childId=…)
//   • parent  — gets THEIR child and only their child. The childId comes from
//               the signed cookie and the `childId` query param is ignored
//               outright, so there is nothing to smuggle.
//
// Only `done` jobs with a storage_path are ever returned: a queued or failed
// render must never surface as a broken player in a parent's hand.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher, verifyPotatoParent, UUID_RE } from '@/lib/potato/auth';
import { potatoDb, loadOwnedChild, isSetupPending, proxyUrl } from '@/lib/potato/db';
import { weekLabel } from '@/lib/potato/week';

export const dynamic = 'force-dynamic';

interface JobRow {
  id: string;
  child_id: string;
  week_start: string;
  storage_path: string | null;
  media_ids: string[] | null;
  created_at: string;
  completed_at: string | null;
}

export async function GET(request: NextRequest) {
  const supabase = potatoDb();

  let classId: string;
  let childId: string;
  let childName: string | null = null;
  let className: string | null = null;

  const teacher = await verifyPotatoTeacher(request);
  if (teacher) {
    const requested = new URL(request.url).searchParams.get('childId');
    if (!requested || !UUID_RE.test(requested)) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 });
    }
    try {
      const child = await loadOwnedChild(supabase, teacher.classId, requested);
      if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });
      classId = teacher.classId;
      childId = child.id;
      // 🚨 childName is deliberately left null here (not `child.name`) so the
      // shared active-status check below always runs for the teacher path
      // too — deactivating a class is the only revocation lever for a
      // 10-year teacher cookie, and this route must honor it exactly like
      // every other route, not just the parent branch.
    } catch (error) {
      if (isSetupPending(error)) {
        return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
      }
      console.error('[potato/montages] teacher lookup error:', error);
      return NextResponse.json({ error: 'Could not load films.' }, { status: 500 });
    }
  } else {
    const parent = await verifyPotatoParent(request);
    if (!parent) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    // 🚨 Never from the query string.
    classId = parent.classId;
    childId = parent.childId;
  }

  try {
    if (childName === null) {
      const { data: child, error } = await supabase
        .from('tp_children')
        .select('id, name, is_active, tp_classes!inner(name, is_active)')
        .eq('id', childId)
        .eq('class_id', classId)
        .maybeSingle();
      if (error) throw error;
      const klass = (child as { tp_classes?: { name: string; is_active: boolean } } | null)?.tp_classes;
      if (!child || child.is_active === false || !klass || klass.is_active === false) {
        return NextResponse.json({ error: 'That code is no longer active.' }, { status: 401 });
      }
      childName = child.name;
      className = klass.name;
    }

    const { data, error } = await supabase
      .from('tp_montage_jobs')
      .select('id, child_id, week_start, storage_path, media_ids, created_at, completed_at')
      .eq('class_id', classId)
      .eq('child_id', childId)
      .eq('status', 'done')
      .not('storage_path', 'is', null)
      .order('week_start', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;

    // Re-runs are allowed, so a week can hold several done jobs. The newest
    // wins — the ordering above already puts it first.
    const seen = new Set<string>();
    const montages = [];
    for (const job of (data ?? []) as JobRow[]) {
      if (seen.has(job.week_start)) continue;
      seen.add(job.week_start);
      montages.push({
        id: job.id,
        weekStart: job.week_start,
        weekLabel: weekLabel(job.week_start),
        videoUrl: proxyUrl(job.storage_path),
        photoCount: job.media_ids?.length ?? 0,
        completedAt: job.completed_at ?? job.created_at,
      });
    }

    return NextResponse.json({
      ok: true,
      child: { id: childId, name: childName },
      className,
      montages,
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/montages] error:', error);
    return NextResponse.json({ error: 'Could not load films.' }, { status: 500 });
  }
}
