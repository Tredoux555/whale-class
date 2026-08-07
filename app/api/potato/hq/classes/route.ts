// /api/potato/hq/classes — Tredoux only.
//   GET  → every class with its teacher code and a few counts
//   POST { name, tz? } → create a class, mint its teacher code
//
// Gated on SUPER_ADMIN_PASSWORD via an `x-admin-password` header, compared in
// constant time. No cookie is minted here: HQ re-sends the header each call.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoHq, checkPotatoRateLimit, clientKey } from '@/lib/potato/auth';
import { potatoDb, isSetupPending } from '@/lib/potato/db';
import { mintUniqueCode } from '@/lib/potato/codes';
import { safeTimeZone } from '@/lib/potato/week';

export const dynamic = 'force-dynamic';

interface ClassRow {
  id: string;
  name: string;
  login_code: string;
  tz: string;
  is_active: boolean;
  created_at: string;
}

// HQ is a legitimate rapid-fire caller (unlock, then a list refresh after every
// class created), so its ceiling is well above the login doors' 12.
const HQ_MAX_CALLS = 120;

function gate(request: NextRequest): NextResponse | null {
  if (!checkPotatoRateLimit(clientKey(request, 'hq'), HQ_MAX_CALLS)) {
    return NextResponse.json({ error: 'Too many tries.' }, { status: 429 });
  }
  if (!verifyPotatoHq(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = gate(request);
  if (denied) return denied;

  try {
    const supabase = potatoDb();
    const { data, error } = await supabase
      .from('tp_classes')
      .select('id, name, login_code, tz, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    const classes = (data ?? []) as ClassRow[];

    // Counts, one query each across all classes — cheap at this scale.
    const childCount = new Map<string, number>();
    const photoCount = new Map<string, number>();
    const jobCount = new Map<string, number>();

    if (classes.length > 0) {
      const ids = classes.map((c) => c.id);
      const [children, photos, jobs] = await Promise.all([
        supabase.from('tp_children').select('class_id').eq('is_active', true).in('class_id', ids),
        supabase.from('tp_photos').select('class_id').in('class_id', ids),
        supabase.from('tp_montage_jobs').select('class_id').in('class_id', ids),
      ]);
      if (children.error) throw children.error;
      if (photos.error) throw photos.error;
      if (jobs.error) throw jobs.error;
      for (const row of (children.data ?? []) as { class_id: string }[]) {
        childCount.set(row.class_id, (childCount.get(row.class_id) ?? 0) + 1);
      }
      for (const row of (photos.data ?? []) as { class_id: string }[]) {
        photoCount.set(row.class_id, (photoCount.get(row.class_id) ?? 0) + 1);
      }
      for (const row of (jobs.data ?? []) as { class_id: string }[]) {
        jobCount.set(row.class_id, (jobCount.get(row.class_id) ?? 0) + 1);
      }
    }

    return NextResponse.json({
      ok: true,
      classes: classes.map((klass) => ({
        id: klass.id,
        name: klass.name,
        loginCode: klass.login_code,
        tz: klass.tz,
        isActive: klass.is_active !== false,
        createdAt: klass.created_at,
        children: childCount.get(klass.id) ?? 0,
        photos: photoCount.get(klass.id) ?? 0,
        montages: jobCount.get(klass.id) ?? 0,
      })),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/hq/classes GET] error:', error);
    return NextResponse.json({ error: 'Could not load classes.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = gate(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const payload = (body ?? {}) as { name?: unknown; tz?: unknown };
  const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 80) : '';
  if (!name) return NextResponse.json({ error: 'A class name is needed.' }, { status: 400 });
  const tz = payload.tz === undefined ? 'Asia/Shanghai' : safeTimeZone(payload.tz);

  try {
    const supabase = potatoDb();

    const codeExists = async (candidate: string): Promise<boolean> => {
      const { data, error } = await supabase
        .from('tp_classes')
        .select('id')
        .eq('login_code', candidate)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      const loginCode = await mintUniqueCode(codeExists);
      const { data, error } = await supabase
        .from('tp_classes')
        .insert({ name, login_code: loginCode, tz })
        .select('id, name, login_code, tz')
        .maybeSingle();
      if (error) {
        if (error.code === '23505') continue; // code collided — mint another
        throw error;
      }
      if (!data) throw new Error('Class row was not returned after insert');
      return NextResponse.json({
        ok: true,
        class: { id: data.id, name: data.name, loginCode: data.login_code, tz: data.tz },
      });
    }

    return NextResponse.json({ error: 'Could not mint a code. Try again.' }, { status: 503 });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/hq/classes POST] error:', error);
    return NextResponse.json({ error: 'Could not create that class.' }, { status: 500 });
  }
}
