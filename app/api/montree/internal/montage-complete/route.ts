// /api/montree/internal/montage-complete
//
// Callback the Railway montage worker hits once it has uploaded a rendered
// montage MP4 and set montree_weekly_reports.montage_path. This route only
// PUSH-NOTIFIES the parents — it does NOT write montage_path (the worker owns
// that). Server-to-server; authenticated by a shared secret header.
//
// Middleware note: /api/* routes are never redirected by middleware (the
// `pathname.startsWith('/api/')` branch returns NextResponse.next()), and this
// path is NOT in the admin-JWT allowlist, so anonymous POSTs reach the handler.
// A worker call carries no Origin header, so the CSRF same-origin check passes
// too. Auth is enforced here via x-worker-secret.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  // --- Auth: shared worker secret ---
  const secret = process.env.MONTAGE_WORKER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }
  const provided = request.headers.get('x-worker-secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // --- Body ---
  let body: { report_id?: unknown; child_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const reportId = body?.report_id;
  const childId = body?.child_id;
  if (typeof reportId !== 'string' || !reportId || typeof childId !== 'string' || !childId) {
    return NextResponse.json({ error: 'report_id and child_id are required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Load the report — must exist, must have a montage_path, must match child.
    const { data: report } = await supabase
      .from('montree_weekly_reports')
      .select('id, child_id, school_id, montage_path')
      .eq('id', reportId)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ error: 'report not found' }, { status: 404 });
    }
    if (report.child_id !== childId) {
      return NextResponse.json({ error: 'child mismatch' }, { status: 400 });
    }
    if (!report.montage_path) {
      return NextResponse.json({ error: 'montage_path not set' }, { status: 409 });
    }

    // Child display name for the push copy.
    const { data: child } = await supabase
      .from('montree_children')
      .select('name')
      .eq('id', childId)
      .maybeSingle();
    const childName = (child as { name?: string } | null)?.name || 'Your child';

    // Notify parents. Push failure must NOT make the worker retry — it already
    // did its job (render + upload + montage_path). Return 200 either way.
    try {
      const { pushToParentsOfChildren } = await import('@/lib/montree/push/sender');
      const result = await pushToParentsOfChildren(
        supabase,
        [childId],
        {
          title: '✨ A little film of the week',
          body: `${childName}'s week in film is ready to watch.`,
          data: { url: `/montree/parent/report/${reportId}`, type: 'report' },
        },
        { requireViewReports: true }
      );
      return NextResponse.json({ ok: true, push: 'sent', sent: result.sent });
    } catch (e) {
      console.error('[montage-complete] push dispatch error:', e);
      return NextResponse.json({ ok: true, push: 'failed' });
    }
  } catch (error) {
    console.error('[montage-complete] error:', error);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}
