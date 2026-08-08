// GET /api/potato/board?week=YYYY-MM-DD — the Capture Board.
//
// Returns every child in the class with their photo count for the week and the
// state of their most recent film job for that week. Sorted least-photos
// first, so the children who need attention rise to the top.
//
// v1.1 adds, when migration 319 has run: the class film's state for the week,
// and the class's branding (emblem + school lockup).
//
// 🚨 `week` is the CLIENT's local Monday. If it is absent the server falls back
// to the current week IN THE CLASS TIMEZONE — never the server's UTC clock.
//
// 🚨 PRE-MIGRATION: this route must never die because a v1.1 column is missing.
// It feature-detects and returns exactly the v1.0 payload (no classFilm, no
// branding). The board is a teacher's daily screen; it degrades, it does not
// break.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  listChildren,
  loadWeekPhotos,
  potatoCapabilities,
  brandingOf,
  isSetupPending,
  proxyUrl,
  MONTAGE_THRESHOLD,
} from '@/lib/potato/db';
import { resolveWeekStart, weekLabel, currentWeekStartInZone } from '@/lib/potato/week';
import { CLASS_FILM_MIN, CLASS_FILM_MAX } from '@/lib/potato/classfilm';

export const dynamic = 'force-dynamic';

interface JobRow {
  id: string;
  child_id: string | null;
  status: string;
  storage_path: string | null;
  created_at: string;
  kind?: string;
  media_ids?: string[] | null;
  excused_child_ids?: string[] | null;
}

export async function GET(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);
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

    // Every job for this class this week — one query for the whole board.
    const jobColumns = caps.jobs
      ? 'id, child_id, status, storage_path, created_at, kind, media_ids, excused_child_ids'
      : 'id, child_id, status, storage_path, created_at';
    const { data: jobData, error: jobError } = await supabase
      .from('tp_montage_jobs')
      .select(jobColumns)
      .eq('class_id', session.classId)
      .eq('week_start', weekStart)
      .order('created_at', { ascending: false });
    if (jobError) throw jobError;
    const jobs = (jobData ?? []) as JobRow[];

    const jobsByChild = new Map<string, JobRow>();
    let classJob: JobRow | null = null;
    for (const job of jobs) {
      // Ordered newest-first, so the first sighting of a slot wins.
      if (caps.jobs && job.kind === 'class') {
        if (!classJob) classJob = job;
        continue;
      }
      if (job.child_id && !jobsByChild.has(job.child_id)) jobsByChild.set(job.child_id, job);
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

    const nameOf = new Map(children.map((c) => [c.id, c.name]));

    return NextResponse.json({
      ok: true,
      class: { id: klass.id, name: klass.name, tz: klass.tz },
      // v1.1 — absent before migration 319, and every screen falls back to the
      // Potato Snaps lockup when it is.
      branding: caps.classes ? brandingOf(klass) : null,
      weekStart,
      weekLabel: weekLabel(weekStart),
      isCurrentWeek: weekStart === currentWeekStartInZone(klass.tz),
      threshold: MONTAGE_THRESHOLD,
      children: rows,
      // v1.1 — null pre-migration, and the board simply omits the card.
      classFilm: caps.jobs
        ? {
            available: true,
            min: CLASS_FILM_MIN,
            max: CLASS_FILM_MAX,
            /** how many photos the teacher has to choose from this week */
            poolCount: week.photos.length,
            job: classJob
              ? {
                  id: classJob.id,
                  status: classJob.status,
                  photoCount: classJob.media_ids?.length ?? 0,
                  videoUrl: classJob.status === 'done' ? proxyUrl(classJob.storage_path) : null,
                  excused: (classJob.excused_child_ids ?? [])
                    .map((id) => nameOf.get(id))
                    .filter((n): n is string => !!n),
                }
              : null,
          }
        : null,
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/board] error:', error);
    return NextResponse.json({ error: 'Could not load the board.' }, { status: 500 });
  }
}
