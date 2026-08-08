// PATCH /api/potato/hq/classes/[id] — HQ edits one class.
//
// Body: { schoolName?, name?, tz? }
//
// The school name is HQ's alone: it is the word a parent reads at the top of
// their feed and at the end of every film, so a teacher can never change it.
// Gated on SUPER_ADMIN_PASSWORD via `x-admin-password`, compared in constant
// time.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoHq, checkPotatoRateLimit, clientKey, UUID_RE } from '@/lib/potato/auth';
import { potatoDb, potatoCapabilities, isSetupPending, proxyUrl } from '@/lib/potato/db';
import { safeTimeZone } from '@/lib/potato/week';

export const dynamic = 'force-dynamic';

const HQ_MAX_CALLS = 120;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkPotatoRateLimit(clientKey(request, 'hq'), HQ_MAX_CALLS)) {
    return NextResponse.json({ error: 'Too many tries.' }, { status: 429 });
  }
  if (!verifyPotatoHq(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid class id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const payload = (body ?? {}) as { schoolName?: unknown; name?: unknown; tz?: unknown };

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);

    const patch: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 80) : '';
      if (!name) return NextResponse.json({ error: 'A class name is needed.' }, { status: 400 });
      patch.name = name;
    }
    if (payload.tz !== undefined) {
      patch.tz = safeTimeZone(payload.tz);
    }
    if (payload.schoolName !== undefined) {
      if (!caps.classes) return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
      const schoolName =
        typeof payload.schoolName === 'string' ? payload.schoolName.trim().slice(0, 120) : '';
      // An empty string clears it back to "no school name", which is a real
      // choice — the class then shows its own name on the parent screens.
      patch.school_name = schoolName || null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });
    }

    const columns = caps.classes
      ? 'id, name, login_code, tz, school_name, school_logo_path, emblem_path'
      : 'id, name, login_code, tz';
    const { data, error } = await supabase
      .from('tp_classes')
      .update(patch)
      .eq('id', id)
      .select(columns)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      class: {
        id: data.id,
        name: data.name,
        loginCode: data.login_code,
        tz: data.tz,
        schoolName: data.school_name ?? null,
        schoolLogoUrl: proxyUrl(data.school_logo_path ?? null),
        emblemUrl: proxyUrl(data.emblem_path ?? null),
      },
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/hq/classes PATCH] error:', error);
    return NextResponse.json({ error: 'Could not save that change.' }, { status: 500 });
  }
}
