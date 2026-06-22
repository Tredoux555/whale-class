// app/api/montree/teacher/menu/route.ts
// Per-teacher customizable dashboard menu config.
//   GET   → { menu: MenuConfig | null }   (null = no custom config → legacy menu)
//   PATCH → { menu }  body: { menu: MenuConfig }  (saves order + visibility)
//
// Degrades gracefully if migration 268 (montree_teachers.settings) hasn't run:
// GET returns null, PATCH returns a clear 500. Read-merge-write preserves any
// other settings keys.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { sanitizeMenuConfig } from '@/lib/montree/menu/config';

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_teachers')
      .select('settings')
      .eq('id', auth.userId)
      .maybeSingle();

    if (error) {
      // 42703 = column missing (migration 268 not run yet) → behave as no config.
      return NextResponse.json({ menu: null });
    }
    const rawMenu = (data?.settings as { menu?: unknown } | null)?.menu ?? null;
    return NextResponse.json({ menu: sanitizeMenuConfig(rawMenu) });
  } catch {
    return NextResponse.json({ menu: null });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const menu = sanitizeMenuConfig((body as { menu?: unknown })?.menu);
  if (!menu) {
    return NextResponse.json({ error: 'Invalid menu config' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    // Read-merge-write — don't clobber other settings keys.
    const { data: row } = await supabase
      .from('montree_teachers')
      .select('settings')
      .eq('id', auth.userId)
      .maybeSingle();

    const settings: Record<string, unknown> =
      row?.settings && typeof row.settings === 'object' ? { ...(row.settings as Record<string, unknown>) } : {};
    settings.menu = menu;

    const { error } = await supabase
      .from('montree_teachers')
      .update({ settings })
      .eq('id', auth.userId);

    if (error) {
      console.error('[teacher/menu] save failed:', error.message);
      const hint = error.code === '42703' ? ' (migration 268 not run yet)' : '';
      return NextResponse.json({ error: `Could not save menu${hint}` }, { status: 500 });
    }
    return NextResponse.json({ menu });
  } catch (e) {
    console.error('[teacher/menu] unexpected:', e);
    return NextResponse.json({ error: 'Could not save menu' }, { status: 500 });
  }
}
