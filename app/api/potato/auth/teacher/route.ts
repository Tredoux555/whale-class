// POST /api/potato/auth/teacher — the teacher door.
//
// v1.4: two ways in.
//   { name: "Dana" }   — the name picker. Wins whenever `name` is present at
//                        all, even a bad one, so a stray client that somehow
//                        sends both `name` and `code` can never slip through
//                        to the code door by accident.
//   { code: "ABC234" } — the original 6-character class-code door. Kept as a
//                        fallback: nothing about the name picker removes it,
//                        it is just no longer what the login page renders.
//
// Both paths set the same potato_teacher cookie; see lib/potato/auth.ts for
// the payload shape (staffName is an EXTRA claim the name door adds — the
// code door never sets it).

import { NextRequest, NextResponse } from 'next/server';
import {
  createTeacherToken,
  setTeacherCookie,
  checkPotatoRateLimit,
  clientKey,
  normalizeStaffName,
  type StaffName,
} from '@/lib/potato/auth';
import { normalizeCode, isWellFormedCode } from '@/lib/potato/codes';
import { potatoDb, isSetupPending } from '@/lib/potato/db';

export const dynamic = 'force-dynamic';

/**
 * Resolve which class a name-picker login belongs to.
 *
 * The team is one small in-house classroom, but tp_classes is a multi-tenant
 * table, so there is no built-in "the" class. POTATO_TEAM_CLASS_ID pins it
 * explicitly when set (preferred — no ambiguity, no extra query). Without it,
 * this falls back to "there is exactly one active class" — true today, but
 * the moment a second class exists this starts failing LOUDLY (503) instead
 * of silently guessing wrong and stamping someone else's classroom.
 */
async function resolveTeamClassId(supabase: ReturnType<typeof potatoDb>): Promise<string | null> {
  const pinned = process.env.POTATO_TEAM_CLASS_ID?.trim();
  if (pinned) {
    const { data, error } = await supabase
      .from('tp_classes')
      .select('id, is_active')
      .eq('id', pinned)
      .maybeSingle();
    if (error) throw error;
    if (!data || (data as { is_active?: boolean }).is_active === false) return null;
    return (data as { id: string }).id;
  }

  const { data, error } = await supabase
    .from('tp_classes')
    .select('id')
    .eq('is_active', true)
    .limit(2);
  if (error) throw error;
  const rows = (data ?? []) as { id: string }[];
  return rows.length === 1 ? rows[0].id : null;
}

async function nameLogin(staffName: StaffName): Promise<NextResponse> {
  try {
    const supabase = potatoDb();
    const classId = await resolveTeamClassId(supabase);
    if (!classId) {
      // Either POTATO_TEAM_CLASS_ID isn't set and tp_classes doesn't have
      // exactly one active class, or the pinned id doesn't resolve. Either
      // way this is a config problem, not something a teacher can fix by
      // retrying — logged for HQ, but the teacher just sees a plain ask.
      console.error(
        '[potato/auth/teacher] could not resolve the team class — set POTATO_TEAM_CLASS_ID',
      );
      return NextResponse.json({ error: 'Ask Tredoux to finish setting this up.' }, { status: 503 });
    }

    const token = await createTeacherToken(classId, staffName);
    const response = NextResponse.json({ ok: true, staffName });
    setTeacherCookie(response, token);
    return response;
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/auth/teacher] name-login error:', error);
    return NextResponse.json({ error: 'Could not sign you in.' }, { status: 500 });
  }
}

async function codeLogin(rawCode: unknown): Promise<NextResponse> {
  const code = normalizeCode(rawCode);
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
    console.error('[potato/auth/teacher] code-login error:', error);
    return NextResponse.json({ error: 'Could not sign you in.' }, { status: 500 });
  }
}

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

  const rawName = (body as { name?: unknown } | null)?.name;
  if (rawName !== undefined) {
    const staffName = normalizeStaffName(rawName);
    if (!staffName) {
      return NextResponse.json({ error: 'Pick your name from the list.' }, { status: 400 });
    }
    return nameLogin(staffName);
  }

  return codeLogin((body as { code?: unknown } | null)?.code);
}
