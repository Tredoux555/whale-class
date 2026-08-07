// POST /api/potato/auth/parent — the parent door.
// Body: { code: "K7M2QX" } → sets the potato_parent cookie, stamps last_used_at.

import { NextRequest, NextResponse } from 'next/server';
import {
  createParentToken,
  setParentCookie,
  checkPotatoRateLimit,
  clientKey,
} from '@/lib/potato/auth';
import { normalizeCode, isWellFormedCode } from '@/lib/potato/codes';
import { potatoDb, isSetupPending } from '@/lib/potato/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!checkPotatoRateLimit(clientKey(request, 'parent-login'))) {
    return NextResponse.json(
      { error: 'Too many tries. Wait a few minutes and try again.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const code = normalizeCode((body as { code?: unknown } | null)?.code);
  if (!isWellFormedCode(code)) {
    return NextResponse.json({ error: 'That code should be 6 characters.' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();
    const { data: row, error } = await supabase
      .from('tp_parent_codes')
      .select('id, class_id, child_id')
      .eq('code', code)
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      return NextResponse.json({ error: 'We don’t know that code.' }, { status: 401 });
    }

    // A code outlives its child only until the cascade fires, but a deactivated
    // child (or class) must not open a door.
    const { data: child, error: childError } = await supabase
      .from('tp_children')
      .select('id, name, class_id, is_active, tp_classes!inner(id, name, is_active)')
      .eq('id', row.child_id)
      .maybeSingle();
    if (childError) throw childError;

    const klass = (child as { tp_classes?: { id: string; name: string; is_active: boolean } } | null)
      ?.tp_classes;
    if (!child || child.is_active === false || !klass || klass.is_active === false) {
      return NextResponse.json({ error: 'That code is no longer active.' }, { status: 401 });
    }

    const token = await createParentToken(child.id, child.class_id);
    const response = NextResponse.json({
      ok: true,
      child: { id: child.id, name: child.name },
      className: klass.name,
    });
    setParentCookie(response, token);

    // Fire-and-forget: a failed stamp must never cost a parent their login.
    supabase
      .from('tp_parent_codes')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', row.id)
      .then(
        ({ error: stampError }: { error: unknown }) => {
          if (stampError) console.error('[potato/auth/parent] last_used_at stamp failed:', stampError);
        },
        (err: unknown) => console.error('[potato/auth/parent] last_used_at stamp threw:', err),
      );

    return response;
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/auth/parent] error:', error);
    return NextResponse.json({ error: 'Could not sign you in.' }, { status: 500 });
  }
}
