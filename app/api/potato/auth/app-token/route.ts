// POST /api/potato/auth/app-token — the teacher door, for the STANDALONE APP.
//
// Same door, same keys, no cookie.
//
// app/api/potato/auth/teacher/route.ts validates a login and puts the resulting
// JWT in the httpOnly `potato_teacher` cookie. A packaged app shell cannot hold
// that cookie (it lives on `capacitor://localhost`, not on montree.xyz), so
// this sibling performs the IDENTICAL validation and hands the SAME token back
// in the response body for the app to store and replay as
// `Authorization: Bearer <jwt>`.
//
// Every check below MIRRORS the teacher route (read directly, not guessed):
//   • the same two doors — { name } picker wins whenever `name` is present at
//     all, { code } 6-char class code as the fallback
//   • the same resolveTeamClassId() logic, including the POTATO_TEAM_CLASS_ID
//     pin and the loud 503 when it cannot be resolved
//   • the same createTeacherToken(classId, staffName?) — same signer
//     (ADMIN_SECRET), same aud ('potato-teacher'), same claims, same TTL
//   • the same setup_pending / 500 error shapes
// The ONLY differences are (1) no setTeacherCookie(), (2) the token in the
// body, and (3) its own rate-limit bucket. If the teacher route changes,
// mirror the change here.
//
// 🚨 SEPARATE RATE-LIMIT BUCKET ('app-teacher-login'). App attempts and website
// attempts meter independently, so a teacher hammering one surface can never
// lock herself out of the other — and neither bucket is weakened: both are the
// same 12-per-15-minutes brake on the same IP.
//
// Body: { name: 'Dana' }  or  { code: 'ABC234' }
// 200 → { ok, token, teacher: { classId, staffName, className }, expiresAt }

import { NextRequest, NextResponse } from 'next/server';
import {
  createTeacherToken,
  checkPotatoRateLimit,
  clientKey,
  normalizeStaffName,
  POTATO_TOKEN_TTL_DAYS,
  type StaffName,
} from '@/lib/potato/auth';
import { withPotatoCors, potatoOptionsHandler } from '@/lib/potato/app-auth';
import { normalizeCode, isWellFormedCode } from '@/lib/potato/codes';
import { potatoDb, isSetupPending } from '@/lib/potato/db';

export const dynamic = 'force-dynamic';

/** Preflight for the app shell's cross-origin POST. */
export const OPTIONS = potatoOptionsHandler;

interface ClassRow {
  id: string;
  name: string | null;
  is_active?: boolean;
}

/** TTL parity with the token itself — the app shows/uses this, never guesses. */
function expiresAtIso(): string {
  return new Date(Date.now() + POTATO_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Resolve which class a name-picker login belongs to.
 *
 * MIRRORS resolveTeamClassId() in app/api/potato/auth/teacher/route.ts, with
 * one cosmetic addition: it selects `name` too, so the app can show the class
 * name without a second round trip. POTATO_TEAM_CLASS_ID pins the class when
 * set; without it this falls back to "there is exactly one active class" and
 * fails LOUDLY (null → 503) the moment a second class exists, rather than
 * silently stamping someone else's classroom.
 */
async function resolveTeamClass(
  supabase: ReturnType<typeof potatoDb>,
): Promise<ClassRow | null> {
  const pinned = process.env.POTATO_TEAM_CLASS_ID?.trim();
  if (pinned) {
    const { data, error } = await supabase
      .from('tp_classes')
      .select('id, name, is_active')
      .eq('id', pinned)
      .maybeSingle();
    if (error) throw error;
    const row = data as ClassRow | null;
    if (!row || row.is_active === false) return null;
    return row;
  }

  const { data, error } = await supabase
    .from('tp_classes')
    .select('id, name')
    .eq('is_active', true)
    .limit(2);
  if (error) throw error;
  const rows = (data ?? []) as ClassRow[];
  return rows.length === 1 ? rows[0] : null;
}

async function nameLogin(request: NextRequest, staffName: StaffName): Promise<NextResponse> {
  const json = (body: Record<string, unknown>, status = 200): NextResponse =>
    withPotatoCors(NextResponse.json(body, { status }), request);

  try {
    const supabase = potatoDb();
    const klass = await resolveTeamClass(supabase);
    if (!klass) {
      // Config problem, not something a teacher can fix by retrying — logged
      // for HQ, but she just sees a plain ask. (Same words as the cookie route.)
      console.error(
        '[potato/auth/app-token] could not resolve the team class — set POTATO_TEAM_CLASS_ID',
      );
      return json({ error: 'Ask Tredoux to finish setting this up.' }, 503);
    }

    const token = await createTeacherToken(klass.id, staffName);
    return json({
      ok: true,
      token,
      teacher: { classId: klass.id, staffName, className: klass.name ?? null },
      expiresAt: expiresAtIso(),
    });
  } catch (error) {
    if (isSetupPending(error)) return json({ error: 'setup_pending' }, 503);
    console.error('[potato/auth/app-token] name-login error:', error);
    return json({ error: 'Could not sign you in.' }, 500);
  }
}

async function codeLogin(request: NextRequest, rawCode: unknown): Promise<NextResponse> {
  const json = (body: Record<string, unknown>, status = 200): NextResponse =>
    withPotatoCors(NextResponse.json(body, { status }), request);

  const code = normalizeCode(rawCode);
  if (!isWellFormedCode(code)) {
    return json({ error: 'That code should be 6 characters.' }, 400);
  }

  try {
    const supabase = potatoDb();
    // Exact match on an already-normalised uppercase code — no ilike, so no
    // wildcard-escaping question arises.
    const { data, error } = await supabase
      .from('tp_classes')
      .select('id, name, is_active')
      .eq('login_code', code)
      .maybeSingle();
    if (error) throw error;
    const klass = data as ClassRow | null;

    if (!klass || klass.is_active === false) {
      return json({ error: 'We don’t know that code.' }, 401);
    }

    // The code door has no notion of "who" — staffName is absent from the
    // token, exactly as on the website. The app renders the class name instead.
    const token = await createTeacherToken(klass.id);
    return json({
      ok: true,
      token,
      teacher: { classId: klass.id, staffName: null, className: klass.name ?? null },
      expiresAt: expiresAtIso(),
    });
  } catch (error) {
    if (isSetupPending(error)) return json({ error: 'setup_pending' }, 503);
    console.error('[potato/auth/app-token] code-login error:', error);
    return json({ error: 'Could not sign you in.' }, 500);
  }
}

export async function POST(request: NextRequest) {
  const json = (body: Record<string, unknown>, status = 200): NextResponse =>
    withPotatoCors(NextResponse.json(body, { status }), request);

  // Own bucket — see the header note. Same 12/15min ceiling as the website.
  if (!checkPotatoRateLimit(clientKey(request, 'app-teacher-login'))) {
    return json({ error: 'Too many tries. Wait a few minutes and try again.' }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  // `name` wins whenever it is present AT ALL, even a bad one, so a client that
  // somehow sends both can never fall through to the code door by accident.
  const rawName = (body as { name?: unknown } | null)?.name;
  if (rawName !== undefined) {
    const staffName = normalizeStaffName(rawName);
    if (!staffName) return json({ error: 'Pick your name from the list.' }, 400);
    return nameLogin(request, staffName);
  }

  return codeLogin(request, (body as { code?: unknown } | null)?.code);
}
