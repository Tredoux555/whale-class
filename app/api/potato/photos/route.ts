// GET /api/potato/photos?childId=…&week=YYYY-MM-DD — the review strip.
// Teacher only. Lists one child's photos for a week so bad shots can be deleted
// before the montage is made (deleting IS the curation — there is no AI here).

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher, UUID_RE } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  loadOwnedChild,
  loadWeekPhotos,
  isSetupPending,
  proxyUrl,
  MONTAGE_THRESHOLD,
} from '@/lib/potato/db';
import { resolveWeekStart, weekLabel } from '@/lib/potato/week';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const childId = params.get('childId');
  if (!childId || !UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const child = await loadOwnedChild(supabase, session.classId, childId);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    const weekStart = resolveWeekStart(params.get('week'), klass.tz);
    if (!weekStart) {
      return NextResponse.json({ error: 'week must be YYYY-MM-DD' }, { status: 400 });
    }

    const week = await loadWeekPhotos(supabase, session.classId, weekStart, klass.tz);
    const mine = week.byChild.get(child.id) ?? [];

    return NextResponse.json({
      ok: true,
      child: { id: child.id, name: child.name, faceUrl: proxyUrl(child.photo_path) },
      weekStart,
      weekLabel: weekLabel(weekStart),
      threshold: MONTAGE_THRESHOLD,
      photos: mine.map((photo) => ({
        id: photo.id,
        url: proxyUrl(photo.storage_path),
        capturedAt: photo.captured_at,
      })),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/photos] error:', error);
    return NextResponse.json({ error: 'Could not load those photos.' }, { status: 500 });
  }
}
