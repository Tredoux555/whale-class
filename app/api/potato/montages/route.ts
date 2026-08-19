// GET /api/potato/montages — finished films, newest first.
//
// v1.1: one stream mixing the child's own films and the whole class's films.
//
// Two callers, two very different trust levels:
//   • teacher — her own class. `?childId=` narrows to one child's films (plus
//     the class films); omitted, she sees everything the class has made.
//   • parent  — THEIR child's films plus the class films of THEIR class. Both
//     ids come from the signed cookie; the `childId` query param is ignored
//     outright, so there is nothing to smuggle.
//
// Only `done` jobs with a storage_path are ever returned: a queued or failed
// render must never surface as a broken player in a parent's hand.
//
// 🚨 v1.3 PUBLISH GATE — THE PRODUCT LAW
// A parent sees a film only when status='done' AND sent_at IS NOT NULL. A film
// that has rendered but not been sent is the TEACHER's, and hers alone, until
// she has watched it and tapped Send. Rendering is not publishing.
//
// The teacher's own list is deliberately NOT gated: she must be able to see —
// and preview — exactly the films that are still waiting on her.
//
// 🚨 PRE-MIGRATION: `kind` may not exist yet. This route feature-detects and
// falls back to exactly v1.0 behaviour — child films only, no class films, no
// branding. A parent's feed keeps working through the deploy window.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoParent, UUID_RE } from '@/lib/potato/auth';
import {
  resolvePotatoTeacher,
  withPotatoCors,
  potatoOptionsHandler,
} from '@/lib/potato/app-auth';
import {
  potatoDb,
  loadClass,
  loadOwnedChild,
  potatoCapabilities,
  brandingOf,
  isSetupPending,
  proxyUrl,
} from '@/lib/potato/db';
import { weekLabel } from '@/lib/potato/week';

export const dynamic = 'force-dynamic';

/** Standalone-app preflight. A no-op for the website, which never preflights. */
export const OPTIONS = potatoOptionsHandler;

interface JobRow {
  id: string;
  child_id: string | null;
  sent_at?: string | null;
  week_start: string;
  storage_path: string | null;
  media_ids: string[] | null;
  created_at: string;
  completed_at: string | null;
  kind?: string;
  excused_child_ids?: string[] | null;
}

export async function GET(request: NextRequest) {
  // withPotatoCors is a no-op unless the caller is an allow-listed app origin,
  // so the website's response is byte-identical to before.
  return withPotatoCors(await handleGET(request), request);
}

async function handleGET(request: NextRequest) {
  const supabase = potatoDb();

  let classId: string;
  let childId: string | null = null;
  let childName: string | null = null;
  let isParent = false;

  // 🚨 Teacher: cookie OR app bearer. Parent: COOKIE ONLY, deliberately —
  // v1 of the standalone app is the teacher capture app, so the publish gate
  // below (a parent sees only films with sent_at set) keeps running on exactly
  // the code path it was audited on, reached only by a website cookie.
  const teacher = await resolvePotatoTeacher(request);
  if (teacher) {
    classId = teacher.classId;
    const requested = new URL(request.url).searchParams.get('childId');
    if (requested) {
      if (!UUID_RE.test(requested)) {
        return NextResponse.json({ error: 'Invalid child id' }, { status: 400 });
      }
      try {
        const child = await loadOwnedChild(supabase, teacher.classId, requested);
        if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });
        childId = child.id;
        childName = child.name;
      } catch (error) {
        if (isSetupPending(error)) {
          return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
        }
        console.error('[potato/montages] teacher lookup error:', error);
        return NextResponse.json({ error: 'Could not load films.' }, { status: 500 });
      }
    }
  } else {
    const parent = await verifyPotatoParent(request);
    if (!parent) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    // 🚨 Never from the query string.
    classId = parent.classId;
    childId = parent.childId;
    isParent = true;
  }

  try {
    const caps = await potatoCapabilities(supabase);
    const klass = await loadClass(supabase, classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    if (isParent && childId) {
      const { data: child, error } = await supabase
        .from('tp_children')
        .select('id, name, photo_path, is_active')
        .eq('id', childId)
        .eq('class_id', classId)
        .maybeSingle();
      if (error) throw error;
      if (!child || child.is_active === false) {
        return NextResponse.json({ error: 'That code is no longer active.' }, { status: 401 });
      }
      childName = child.name;
    }

    const columns = [
      'id, child_id, week_start, storage_path, media_ids, created_at, completed_at',
      caps.jobs ? ', kind, excused_child_ids' : '',
      caps.send ? ', sent_at' : '',
    ].join('');

    let query = supabase
      .from('tp_montage_jobs')
      .select(columns)
      .eq('class_id', classId)
      .eq('status', 'done')
      .not('storage_path', 'is', null);

    // 🚨 THE GATE. Parents get published films only. Pre-migration `sent_at`
    // does not exist, so there is nothing to filter on and behaviour falls back
    // to v1.2 — every rendered film visible — rather than hiding the lot.
    if (isParent && caps.send) {
      query = query.not('sent_at', 'is', null);
    }

    if (caps.jobs) {
      // The child's own films OR the class's films. Before migration 319 there
      // is no `kind`, so the filter below collapses to "this child's films",
      // which is precisely v1.0.
      if (childId) query = query.or(`child_id.eq.${childId},kind.eq.class`);
    } else if (childId) {
      query = query.eq('child_id', childId);
    }

    const { data, error } = await query
      .order('week_start', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(120);
    if (error) throw error;

    // Re-runs are allowed, so a week can hold several done jobs of a kind. The
    // newest wins — the ordering above already puts it first.
    const seen = new Set<string>();
    const films = [];
    for (const job of (data ?? []) as JobRow[]) {
      const kind = caps.jobs && job.kind === 'class' ? 'class' : 'child';
      // A teacher browsing the whole class keeps one film per child per week.
      const slot = `${kind}:${kind === 'class' ? 'all' : job.child_id}:${job.week_start}`;
      if (seen.has(slot)) continue;
      seen.add(slot);
      films.push({
        id: job.id,
        kind,
        // Teacher-facing: which films are still waiting on her.
        sentAt: job.sent_at ?? null,
        isSent: caps.send ? !!job.sent_at : true,
        childId: job.child_id,
        weekStart: job.week_start,
        weekLabel: weekLabel(job.week_start),
        videoUrl: proxyUrl(job.storage_path),
        photoCount: job.media_ids?.length ?? 0,
        excusedCount: (job.excused_child_ids ?? []).length,
        completedAt: job.completed_at ?? job.created_at,
      });
    }

    return NextResponse.json({
      ok: true,
      child: childId ? { id: childId, name: childName } : null,
      className: klass.name,
      branding: caps.classes ? brandingOf(klass) : null,
      /** v1.1 flag so a client can tell "no class films yet" from "not migrated" */
      classFilmsAvailable: caps.jobs,
      films,
      // v1.0 clients read `montages`; keep the key alive so an old cached bundle
      // in a parent's PWA does not render an empty feed after this deploy.
      montages: films.filter((f) => f.kind === 'child'),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/montages] error:', error);
    return NextResponse.json({ error: 'Could not load films.' }, { status: 500 });
  }
}
