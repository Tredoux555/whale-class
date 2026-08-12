// app/api/cms/auth/signup/route.ts
// PARENT SIGNUP — and the one place a cms_guardians row is born.
//
// A family account is three rows, and all three are written here or none are:
//   cms_users        the credential
//   cms_guardians    the PERSON, in one school — this is what the child's
//                    record will link to, and what every parent-side RLS
//                    policy resolves through
//   cms_memberships  the authority: role='parent', pointing at that guardian
//
// Staff accounts are NOT created here. A teacher, a school admin and an org
// director are provisioned by someone who already has authority (SQL for the
// first one — see APPLY_CMS_PHASE2.md — an admin screen later). Self-service
// signup that could mint a teacher would be a self-elevation hole, and the
// database refuses it too (migration 329: cms_memberships writes are
// admin-only under RLS).

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { hashPassword } from '@/lib/montree/password';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { safeErrorLog } from '@/lib/api-error';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { homePathForRole, mintCmsSession } from '@/lib/cms/auth/session';
import { setCmsSessionCookie } from '@/lib/cms/auth/server';
import { findCmsUserByEmail } from '@/lib/cms/db/queries';
import { clean, isBlank, validateSignup } from '@/lib/cms/validation';

export const dynamic = 'force-dynamic';

/**
 * Which school is this family joining?
 *
 * By school code (the school's slug) when given. When it is not given and the
 * project holds exactly ONE school, that school — which is the founder's first
 * run, where asking a parent to type a code they were never given would be
 * theatre. Ambiguity is an error, never a guess.
 */
async function resolveSchool(
  supabase: ReturnType<typeof getSupabase>,
  schoolCode: string
): Promise<{ id: string; organisation_id: string } | null> {
  if (schoolCode) {
    const { data } = await supabase
      .from('cms_schools')
      .select('id, organisation_id')
      .eq('slug', schoolCode.toLowerCase())
      .maybeSingle();
    return data ?? null;
  }
  const { data } = await supabase.from('cms_schools').select('id, organisation_id').limit(2);
  const rows = data ?? [];
  return rows.length === 1 ? rows[0] : null;
}

export async function POST(request: NextRequest) {
  if (!isCmsLive()) {
    return NextResponse.json({ error: 'demo_mode' }, { status: 503 });
  }

  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/cms/auth/signup', 5, 60, 'closed', 'cms_rate_limit_logs'
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds ?? 3600) } }
      );
    }

    const body = await request.json().catch(() => null);
    // Honeypot, same as Montree's try/instant: a real browser leaves it empty.
    if (!isBlank(body?.website)) return NextResponse.json({ ok: true });

    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const fullName = clean(body?.fullName);
    const schoolCode = clean(body?.schoolCode, 80);

    const check = validateSignup({ email, password, fullName });
    if (!check.ok) {
      return NextResponse.json({ error: 'invalid', fields: check.errors }, { status: 400 });
    }

    if (await findCmsUserByEmail(email)) {
      // Deliberately explicit: this is a school portal a parent was invited to,
      // not a consumer product where address enumeration is the threat. Telling
      // them the account exists is what stops them creating a second one and
      // losing their child's file.
      return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    }

    const school = await resolveSchool(supabase, schoolCode);
    if (!school) {
      return NextResponse.json({ error: 'school_not_found' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const { data: user, error: userError } = await supabase
      .from('cms_users')
      .insert({
        email,
        password_hash: passwordHash,
        display_name: fullName,
        preferred_locale: clean(body?.locale, 8) || 'en',
      })
      .select('id, email, display_name')
      .single();
    if (userError || !user) throw userError ?? new Error('user_insert_failed');

    const { data: guardian, error: guardianError } = await supabase
      .from('cms_guardians')
      .insert({
        school_id: school.id,
        full_name: fullName,
        relationship: 'guardian',
        email,
        preferred_locale: clean(body?.locale, 8) || 'en',
        can_collect: true,
        contact_priority: 1,
      })
      .select('id')
      .single();
    if (guardianError || !guardian) {
      // Roll the credential back by hand — there is no transaction across
      // PostgREST calls, and a user row with no guardian is an account that
      // can sign in and see nothing, forever.
      await supabase.from('cms_users').delete().eq('id', user.id);
      throw guardianError ?? new Error('guardian_insert_failed');
    }

    const { data: membership, error: membershipError } = await supabase
      .from('cms_memberships')
      .insert({
        user_id: user.id,
        role: 'parent',
        organisation_id: school.organisation_id,
        school_id: school.id,
        guardian_id: guardian.id,
        email,
        display_name: fullName,
      })
      .select('id')
      .single();
    if (membershipError || !membership) {
      await supabase.from('cms_guardians').delete().eq('id', guardian.id);
      await supabase.from('cms_users').delete().eq('id', user.id);
      throw membershipError ?? new Error('membership_insert_failed');
    }

    const token = await mintCmsSession({
      userId: user.id,
      membershipId: membership.id,
      email,
      displayName: fullName,
      role: 'parent',
      organisationId: school.organisation_id,
      schoolId: school.id,
      guardianId: guardian.id,
    });
    await setCmsSessionCookie(token);

    return NextResponse.json({
      ok: true,
      role: 'parent',
      redirectTo: homePathForRole('parent'),
    });
  } catch (error) {
    safeErrorLog('api/cms/auth/signup', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
