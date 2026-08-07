// GET /api/potato/board?week=YYYY-MM-DD — the Capture Board.
//
// Returns every child in the class with their photo count for the week and the
// state of their most recent montage job for that week. Sorted least-photos
// first, so the children who need attention rise to the top.
//
// 🚨 `week` is the CLIENT's local Monday. If it is absent the server falls back
// to the current week IN THE CLASS TIMEZONE — never the server's UTC clock.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  listChildren,
  loadWeekPhotos,
  isSetupPending,
  proxyUrl,
  MONTAGE_THRESHOLD,
} from '@/lib/potato/db';
import { resolveWeekStart, weekLabel, currentWeekStartInZone } from '@/lib/potato/week';

export const dynamic = 'force-dynamic';

interface JobRow {
  id: string;
  child_id: string;
  status: string;
  storage_path: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const supabase = potatoDb();
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const raw = new URL(request.url).searchParams.get('week');
    const weekStart = resolveWeekStart(raw, klass.tz);
    if (!weekStart) {
      return NextResponse.json({ error: 'week must be YYYY-MM-DD' }, { status: 400 });
    }

    const [children, week] = await Promise.all([
      listChildren(supabase, session.classId),
      loadWeekPhotos(supabase, session.classId, weekStart, klass.tz),
    ]);

    // Latest job per child for this week — one query for the whole board.
    const jobsByChild = new Map<string, JobRow>();
    if (children.length > 0) {
      const { data, error } = await supabase
        .from('tp_montage_jobs')
        .select('id, child_id, status, storage_path, created_at')
        .eq('class_id', session.classId)
        .eq('week_start', weekStart)
        .order('created_at', { ascending: false });
      if (error) throw error;
      for (const job of (data ?? []) as JobRow[]) {
        // Ordered newest-first, so the first sighting of a child wins.
        if (!jobsByChild.has(job.child_id)) jobsByChild.set(job.child_id, job);
      }
    }

    const rows = children.map((child) => {
      const photoCount = week.byChild.get(child.id)?.length ?? 0;
      const job = jobsByChild.get(child.id);
      return {
        id: child.id,
        name: child.name,
        facePath: child.photo_path,
        faceUrl: proxyUrl(child.photo_path),
        photoCount,
        latestJob: job
          ? {
              id: job.id,
              status: job.status,
              videoUrl: job.status === 'done' ? proxyUrl(job.storage_path) : null,
            }
          : null,
      };
    });

    // Least photos first; ties keep the roster's own order (name).
    rows.sort((a, b) => a.photoCount - b.photoCount || a.name.localeCompare(b.name));

    return NextResponse.json({
      ok: true,
      class: { id: klass.id, name: klass.name, tz: klass.tz },
      weekStart,
      weekLabel: weekLabel(weekStart),
      isCurrentWeek: weekStart === currentWeekStartInZone(klass.tz),
      threshold: MONTAGE_THRESHOLD,
      children: rows,
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/board] error:', error);
    return NextResponse.json({ error: 'Could not load the board.' }, { status: 500 });
  }
}
