// POST /api/potato/auth/teacher — the teacher door.
// Body: { code: "ABC234" } → sets the potato_teacher cookie.

import { NextRequest, NextResponse } from 'next/server';
import {
  createTeacherToken,
  setTeacherCookie,
  checkPotatoRateLimit,
  clientKey,
} from '@/lib/potato/auth';
import { normalizeCode, isWellFormedCode } from '@/lib/potato/codes';
import { potatoDb, isSetupPending } from '@/lib/potato/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!checkPotatoRateLimit(clientKey(request, 'teacher-login'))) {
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
    // Exact match on an already-normalised uppercase code — no ilike, so no
    // wildcard-escaping question arises.
    const { data: klass, error } = await supabase
      .from('tp_classes')
      .select('id, name, is_active')
      .eq('login_code', code)
      .maybeSingle();
    if (error) throw error;

    if (!klass || klass.is_active === false) {
      return NextResponse.json({ error: 'We don’t know that code.' }, { status: 401 });
    }

    const token = await createTeacherToken(klass.id);
    const response = NextResponse.json({
      ok: true,
      class: { id: klass.id, name: klass.name },
    });
    setTeacherCookie(response, token);
    return response;
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/auth/teacher] error:', error);
    return NextResponse.json({ error: 'Could not sign you in.' }, { status: 500 });
  }
}
