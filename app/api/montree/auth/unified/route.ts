// /api/montree/auth/unified/route.ts
// Unified login: one code, try all 3 tables (teacher → principal → parent)
// Returns role + session data + sets appropriate cookie
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { createMontreeToken, setMontreeAuthCookie, createParentToken } from '@/lib/montree/server-auth';
import { verifyPassword, legacySha256 } from '@/lib/montree/password';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';
import { cookies } from 'next/headers';

// SQL injection defense helper for .ilike() queries
function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

// ---- Abuse lock gate ----
// A super-admin can LOCK a school (migration 286: montree_schools.locked_at).
// A locked school's users must not get a session for ANY role — the locked
// screen at /montree/locked is their only surface (they can message Tredoux
// from there). We check AFTER a credential match so we never leak which codes
// exist; a wrong code still 401s "Invalid code". A right code for a locked
// school gets a distinct 403 with the redirect the client honors.
//
// Fails OPEN on a lookup error (locked_at column missing pre-migration, or a
// transient DB blip) — refusing to log a legitimate school in because the lock
// check itself failed would be worse than the (rare) missed lock enforcement,
// and resolve-model already kills AI spend for locked schools independently.
async function blockIfLocked(
  supabase: ReturnType<typeof getSupabase>,
  schoolId: string | null | undefined
): Promise<NextResponse | null> {
  if (!schoolId) return null;
  const { data, error } = await supabase
    .from('montree_schools')
    .select('id, name, locked_at')
    .eq('id', schoolId)
    .maybeSingle();
  if (error || !data) return null; // fail open — see note above
  if (!data.locked_at) return null;
  return NextResponse.json(
    {
      error: 'This account has been locked.',
      locked: true,
      school_name: data.name || null,
      redirectTo: `/montree/locked?school=${encodeURIComponent(String(data.id))}`,
    },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);

    // Rate limiting
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/auth/unified', 5, 15, 'closed'
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const { code } = await request.json();
    // 32-char ceiling accommodates referral codes (<FIRSTNAME>-XXXX) up to a
    // 12-char prefix + dash + 4-char suffix. Direct-signup login codes remain
    // 6 chars; the floor stays at 4.
    if (!code || code.length < 4 || code.length > 32) {
      return NextResponse.json({ error: 'Please enter a valid code' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // ============================================
    // 0. REFERRAL CODE PRECHECK
    // ============================================
    // Phase 2: if the entered code matches a montree_referral_codes row, route
    // appropriately BEFORE attempting principal/teacher/parent login.
    //
    // - status='pending'   → 409 with redirectTo signup (school hasn't redeemed yet)
    // - status='revoked'   → 401 with clear message
    // - status='expired'   → 401 with clear message
    // - status='redeemed'  → return null, fall through (the principal's
    //                        password_hash matches legacySha256(referralCode)
    //                        so tryPrincipalLogin below will find them)
    // - not a referral row → return null, fall through (legacy 6-char codes)
    const referralResponse = await tryReferralPrecheck(supabase, normalizedCode);
    if (referralResponse) return referralResponse;

    // ============================================
    // 1. TRY PRINCIPAL (must run before TEACHER — see below)
    // ============================================
    // ORDER MATTERS. Principal is tried FIRST because someone may exist in
    // BOTH montree_school_admins (as a principal) AND montree_teachers (as a
    // teacher in their own school) with the same login code. The principal
    // role is strictly more privileged — if the same code matches both
    // identities, the principal context is what the user intends. Putting
    // teacher first issued a teacher JWT to a principal, which then 403'd
    // them out of /api/montree/admin/principal-agent (Astra) and any other
    // principal-only route. Principal first gives them the higher role.
    const principalResult = await tryPrincipalLogin(supabase, normalizedCode);
    if (principalResult) {
      const { principal, school, needsSetup } = principalResult;

      // Abuse lock — refuse any role of a locked school (see blockIfLocked).
      const lockedResp = await blockIfLocked(supabase, school.id);
      if (lockedResp) return lockedResp;

      const token = await createMontreeToken({
        sub: principal.id,
        schoolId: school.id,
        role: 'principal',
      });

      logAudit(supabase, {
        adminIdentifier: principal.email || principal.name || 'unknown',
        action: 'login_success',
        resourceType: 'principal',
        resourceId: principal.id,
        resourceDetails: { endpoint: '/api/montree/auth/unified', schoolId: school.id },
        ipAddress: ip,
        userAgent,
      });

      const response = NextResponse.json({
        success: true,
        role: 'principal',
        token,
        needsSetup,
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
        },
        principal: {
          id: principal.id,
          name: principal.name,
          email: principal.email,
          role: 'principal',
        },
        redirect: needsSetup ? '/montree/principal/setup' : '/montree/admin',
      });
      setMontreeAuthCookie(response, token, 'principal');
      return response;
    }

    // ============================================
    // 2. TRY TEACHER / HOMESCHOOL PARENT
    // ============================================
    const teacherResult = await tryTeacherLogin(supabase, normalizedCode);
    if (teacherResult) {
      const { teacher, classroom, school, onboarded } = teacherResult;
      const teacherRole = (teacher.role === 'homeschool_parent' ? 'homeschool_parent' : 'teacher') as 'teacher' | 'homeschool_parent';

      // Abuse lock — refuse any role of a locked school (see blockIfLocked).
      const lockedResp = await blockIfLocked(supabase, school?.id || teacher.school_id);
      if (lockedResp) return lockedResp;

      const token = await createMontreeToken({
        sub: teacher.id,
        schoolId: school?.id || teacher.school_id,
        classroomId: classroom?.id || teacher.classroom_id,
        role: teacherRole,
      });

      // Update last login
      await supabase.from('montree_teachers').update({ last_login_at: new Date().toISOString() }).eq('id', teacher.id);

      logAudit(supabase, {
        adminIdentifier: teacher.email || teacher.name || 'unknown',
        action: 'login_success',
        resourceType: 'teacher',
        resourceId: teacher.id,
        resourceDetails: { endpoint: '/api/montree/auth/unified', schoolId: teacher.school_id },
        ipAddress: ip,
        userAgent,
      });

      const response = NextResponse.json({
        success: true,
        role: teacherRole,
        token,
        teacher: {
          id: teacher.id,
          name: teacher.name,
          role: teacherRole,
          email: teacher.email,
          password_set_at: teacher.password_set_at || null,
        },
        classroom: classroom || null,
        school: school || null,
        onboarded,
        redirect: !onboarded ? '/montree/onboarding' : '/montree/dashboard',
      });
      setMontreeAuthCookie(response, token, teacherRole);
      return response;
    }

    // ============================================
    // 3. TRY AGENT LOGIN (Phase 7b)
    // ============================================
    // Agent dashboard login. Sarah / multiplier partners enter their 6-char
    // agent code → tryAgentLogin returns the agent row → JWT issued with
    // role='agent' → cookie set → redirect to /montree/agent/dashboard.
    //
    // Order: AFTER teacher (so teacher-agents holding both logins get the
    // teacher session for their classroom code, agent session for their
    // agent code — separate hashes ensure no collision). BEFORE parent.
    const agentResult = await tryAgentLogin(supabase, normalizedCode);
    if (agentResult) {
      const { agent } = agentResult;

      // Abuse lock — refuse any role of a locked school (plan: agent login also
      // refuses). agent.school_id is the agent's own teacher-row school.
      const lockedResp = await blockIfLocked(supabase, agent.school_id);
      if (lockedResp) return lockedResp;

      const token = await createMontreeToken({
        sub: agent.id,
        // Agent JWT schoolId is INERT — the agent's montree_teachers row's
        // school_id. Agent routes self-scope via founding_teacher_id, not
        // schoolId. We thread it only because MontreeTokenPayload requires it.
        schoolId: agent.school_id,
        role: 'agent',
      });

      // Stamp last-used timestamp so super admin's "Active" pill is accurate.
      // Fire-and-forget — login must not fail if the timestamp update fails.
      void supabase
        .from('montree_teachers')
        .update({ agent_login_last_used_at: new Date().toISOString() })
        .eq('id', agent.id)
        .then(({ error: stampErr }) => {
          if (stampErr) console.error('[unified login] agent_login_last_used_at update failed:', stampErr.message);
        });

      // Audit success in the agent log + the central security log.
      void logAgentAudit(supabase, {
        agent_id: agent.id,
        agent_display_name: agent.name,
        agent_email: agent.email,
        event_type: 'agent_login_succeeded',
        actor_role: 'agent',
        details: null,
        ip_address: ip,
        user_agent: userAgent,
      });

      logAudit(supabase, {
        adminIdentifier: agent.email || agent.name || 'unknown',
        action: 'login_success',
        resourceType: 'agent',
        resourceId: agent.id,
        resourceDetails: { endpoint: '/api/montree/auth/unified' },
        ipAddress: ip,
        userAgent,
      });

      const response = NextResponse.json({
        success: true,
        role: 'agent',
        token,
        agent: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
        },
        redirect: '/montree/agent/dashboard',
      });
      setMontreeAuthCookie(response, token, 'agent');
      return response;
    }

    // ============================================
    // 4. TRY PARENT INVITE CODE
    // ============================================
    const parentResult = await tryParentLogin(supabase, normalizedCode);
    if (parentResult) {
      const { invite, child } = parentResult;

      // Abuse lock — parents of a locked school shouldn't see reports either.
      // Refuse BEFORE any provisioning writes (see blockIfLocked).
      const lockedResp = await blockIfLocked(supabase, child.school_id);
      if (lockedResp) return lockedResp;

      // Update usage tracking
      await supabase.from('montree_parent_invites').update({
        use_count: (invite.use_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      }).eq('id', invite.id);

      // ── Session 117 continued — Provision a lightweight montree_parents
      // row on first invite redemption. Without this:
      //   - Staff appointment-invite picker can't see the parent
      //   - Parent can't see incoming appointment invitations
      //   - Any route that requires session.parentId returns 403
      //
      // The provisioned row uses placeholders for email/name (the parent
      // hasn't done a full signup yet) but has school_id + is_active=true
      // so it's a first-class queryable entity. Idempotent via
      // UNIQUE(email, school_id) — re-redemption hits the existing row.
      //
      // 🚨 This /auth/unified path is what login-select uses. The
      // dedicated /parent/auth/access-code endpoint has the same logic.
      // BOTH paths must provision identically — login-select is the
      // primary surface for parent login.
      let provisionedParentId: string | undefined;
      try {
        const placeholderEmail = `pending-${invite.id}@parent.montree.local`;
        const childDisplay = (child.name || child.nickname || 'child').trim();
        const placeholderName = `${childDisplay}'s parent`;
        const placeholderHash = `pending:${invite.id}:${Date.now()}`;

        const { data: existingParent } = await supabase
          .from('montree_parents')
          .select('id')
          .eq('email', placeholderEmail)
          .eq('school_id', child.school_id)
          .maybeSingle();

        if (existingParent) {
          provisionedParentId = (existingParent as { id: string }).id;
        } else {
          const { data: newParent, error: parentInsertErr } = await supabase
            .from('montree_parents')
            .insert({
              school_id: child.school_id,
              email: placeholderEmail,
              password_hash: placeholderHash,
              name: placeholderName,
              is_active: true,
            })
            .select('id')
            .single();
          if (parentInsertErr) {
            if (parentInsertErr.code === '23505') {
              const { data: raced } = await supabase
                .from('montree_parents')
                .select('id')
                .eq('email', placeholderEmail)
                .eq('school_id', child.school_id)
                .maybeSingle();
              if (raced) provisionedParentId = (raced as { id: string }).id;
            } else {
              console.error('[auth/unified parent] provision insert failed', parentInsertErr);
            }
          } else if (newParent) {
            provisionedParentId = (newParent as { id: string }).id;
          }
        }

        if (provisionedParentId) {
          const { error: linkErr } = await supabase
            .from('montree_parent_children')
            .insert({
              parent_id: provisionedParentId,
              child_id: child.id,
            });
          if (linkErr && linkErr.code !== '23505') {
            console.error('[auth/unified parent] provision link failed', linkErr);
          }
        }
      } catch (provErr) {
        // Don't block login on provisioning failure — fall through to
        // invite-only behaviour. Surfaces in logs but the parent still
        // gets to the dashboard.
        console.error('[auth/unified parent] provisioning failed (non-fatal)', provErr);
      }

      const sessionToken = await createParentToken({
        sub: child.id,
        childName: child.name || child.nickname,
        classroomId: child.classroom_id,
        inviteId: invite.id,
        // Include parentId when provisioning succeeded — unlocks every
        // route that gates on session.parentId (appointments, messaging).
        ...(provisionedParentId ? { parentId: provisionedParentId } : {}),
      });

      // Set parent cookie
      const cookieStore = await cookies();
      cookieStore.set('montree_parent_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      logAudit(supabase, {
        adminIdentifier: `parent:${invite.id}`,
        action: 'login_success',
        resourceType: 'parent',
        resourceId: invite.id,
        resourceDetails: { endpoint: '/api/montree/auth/unified', childId: child.id },
        ipAddress: ip,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        role: 'parent',
        child: {
          id: child.id,
          name: child.name || child.nickname,
        },
        redirect: '/montree/parent/dashboard',
      });
    }

    // ============================================
    // NO MATCH
    // ============================================
    await logAudit(supabase, {
      adminIdentifier: ip,
      action: 'login_failed',
      resourceType: 'unified_login',
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({ error: 'Invalid code' }, { status: 401 });

  } catch (error) {
    console.error('Unified auth error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ---- Helper: Try teacher/homeschool parent login ----
async function tryTeacherLogin(supabase: ReturnType<typeof getSupabase>, code: string) {
  const fields = 'id, name, email, classroom_id, school_id, is_active, password_hash, password_set_at, role';

  // Step 1: Legacy SHA-256 hash lookup
  const codeHash = legacySha256(code);
  const { data: hashMatch } = await supabase
    .from('montree_teachers')
    .select(fields)
    .eq('password_hash', codeHash)
    .eq('is_active', true)
    .maybeSingle();

  let teacher = hashMatch;

  // Step 2: login_code column lookup
  if (!teacher) {
    const { data: codeMatch } = await supabase
      .from('montree_teachers')
      .select(`${fields}, login_code`)
      .ilike('login_code', escapeIlike(code))
      .eq('is_active', true)
      .maybeSingle();

    if (codeMatch) {
      if (codeMatch.password_hash) {
        const valid = await verifyPassword(code, codeMatch.password_hash)
          || await verifyPassword(code.toLowerCase(), codeMatch.password_hash);
        if (!valid) return null;
      }
      teacher = codeMatch;
    }
  }

  // Step 3: bcrypt scan fallback
  if (!teacher) {
    const { data: candidates } = await supabase
      .from('montree_teachers')
      .select(fields)
      .eq('is_active', true)
      .limit(50);

    for (const t of (candidates || [])) {
      if (t.password_hash?.startsWith('$2')) {
        const valid = await verifyPassword(code, t.password_hash)
          || await verifyPassword(code.toLowerCase(), t.password_hash);
        if (valid) { teacher = t; break; }
      }
    }
  }

  if (!teacher) return null;

  // Fetch classroom + school
  const { data: classroom } = await supabase
    .from('montree_classrooms')
    .select('id, name, icon, color')
    .eq('id', teacher.classroom_id)
    .maybeSingle();

  const { data: school } = await supabase
    .from('montree_schools')
    .select('id, name, slug')
    .eq('id', teacher.school_id)
    .maybeSingle();

  let onboarded = false;
  if (classroom) {
    const { count } = await supabase
      .from('montree_children')
      .select('id', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id);
    onboarded = (count || 0) > 0;
  }

  return { teacher, classroom, school, onboarded };
}

// ---- Helper: Try principal login ----
async function tryPrincipalLogin(supabase: ReturnType<typeof getSupabase>, code: string) {
  const fields = 'id, name, email, school_id, password_hash, role';

  // Step 1: Legacy SHA-256 lookup against password_hash. Covers principals
  // created before migration 194 + everyone whose code is in sync.
  const codeHash = legacySha256(code);
  const { data: hashMatch } = await supabase
    .from('montree_school_admins')
    .select(fields)
    .eq('password_hash', codeHash)
    .eq('role', 'principal')
    .maybeSingle();

  let principal = hashMatch;

  // Step 2: login_code column lookup. Session 98 / migration 194 ADDED the
  // login_code column to montree_school_admins (reversing the Session 84
  // rule). Principals created or reset by paths that wrote login_code but
  // didn't realign password_hash will only match here. We still verify the
  // hash before trusting the row — never auto-login on a column match
  // alone if there's a hash on file.
  if (!principal) {
    // ILIKE is case-insensitive — could match 2 rows ('XVYHHX' + 'xvyhhx')
    // even though the partial UNIQUE index on login_code is case-sensitive.
    // Use .limit(1) explicitly so maybeSingle never throws on duplicates;
    // if there ARE two rows the older one wins (created_at ASC) which is
    // safe (the original principal keeps their code; the duplicate has
    // to reset).
    const { data: codeMatches } = await supabase
      .from('montree_school_admins')
      .select(`${fields}, login_code`)
      .ilike('login_code', escapeIlike(code))
      .eq('role', 'principal')
      .order('created_at', { ascending: true })
      .limit(1);
    const codeMatch = codeMatches?.[0];
    if (codeMatch) {
      // Tighten the guard: empty-string and non-string hashes should NOT
      // fall through to the "no hash on file" branch (which auto-accepts).
      const hasHash =
        typeof codeMatch.password_hash === 'string' &&
        codeMatch.password_hash.length > 0;
      if (hasHash) {
        // If a hash exists, it must match — either legacy SHA256 of the
        // code, or bcrypt verifying the code. If neither matches, the
        // row's hash is desynced from its login_code; refuse rather
        // than silently authenticate.
        const legacyOk = codeMatch.password_hash === codeHash;
        const bcryptOk = codeMatch.password_hash.startsWith('$2')
          ? (await verifyPassword(code, codeMatch.password_hash))
            || (await verifyPassword(code.toLowerCase(), codeMatch.password_hash))
          : false;
        if (legacyOk || bcryptOk) {
          principal = codeMatch;
        } else {
          console.warn(
            `[unified-login] login_code match for principal ${codeMatch.id} but password_hash is desynced — refusing.`
          );
        }
      } else {
        // Truly no hash on file (NULL or '' both fall here) — accept the
        // login_code match as the sole credential.
        principal = codeMatch;
      }
    }
  }

  // Step 3: bcrypt scan fallback (covers principals who set a strong
  // password via setup wizard).
  if (!principal) {
    const { data: candidates } = await supabase
      .from('montree_school_admins')
      .select(fields)
      .eq('role', 'principal')
      .limit(50);

    for (const p of (candidates || [])) {
      if (p.password_hash?.startsWith('$2')) {
        const valid = await verifyPassword(code, p.password_hash)
          || await verifyPassword(code.toLowerCase(), p.password_hash);
        if (valid) { principal = p; break; }
      }
    }
  }

  if (!principal) return null;

  // Fetch school
  const { data: school } = await supabase
    .from('montree_schools')
    .select('id, name, slug')
    .eq('id', principal.school_id)
    .maybeSingle();

  if (!school) return null;

  // Check if needs setup
  const { data: classrooms } = await supabase
    .from('montree_classrooms')
    .select('id')
    .eq('school_id', school.id)
    .limit(1);

  const needsSetup = !classrooms || classrooms.length === 0;

  return { principal, school, needsSetup };
}

// ---- Helper: Try agent login (Phase 7b) ----
// Agent dashboard login. The agent's 6-char code is hashed (legacySha256) and
// stored in montree_teachers.agent_password_hash — separate from password_hash
// so a teacher-agent can hold both a teacher login (their classroom code) and
// an agent login (their referral dashboard code) without collision.
//
// Architectural rule (Phase 7a): is_agent=true is the marker. Even if a hash
// matched without is_agent set, we refuse to authenticate. Same for
// agent_suspended_at — suspended agents can't log in.
async function tryAgentLogin(supabase: ReturnType<typeof getSupabase>, code: string) {
  const fields = 'id, name, email, school_id, is_agent, agent_suspended_at, agent_password_hash';
  const codeHash = legacySha256(code);

  const { data: match, error } = await supabase
    .from('montree_teachers')
    .select(fields)
    .eq('agent_password_hash', codeHash)
    .maybeSingle();

  if (error) {
    // If migration 188 hasn't run yet the agent_password_hash column doesn't
    // exist — Postgres returns 42703. Surface as "no match" so the rest of
    // the unified login chain continues normally (instead of throwing 500).
    return null;
  }
  if (!match) return null;

  // Defensive checks — even if the hash matched, refuse if marker missing
  // or agent suspended. Belt-and-suspenders against future schema bugs.
  if (!match.is_agent) {
    // Hash matched but is_agent=false. This shouldn't happen — POST /agents/
    // [id]/login always sets is_agent=true on issue. Log it loudly and treat
    // as no match.
    console.warn('[tryAgentLogin] hash matched but is_agent=false for id', match.id);
    return null;
  }
  if (match.agent_suspended_at) {
    // Hash matched but agent is suspended. Don't authenticate. We could
    // return a distinct error to surface "you're suspended, contact Tredoux"
    // but for now just refuse silently — same UX as wrong code, prevents
    // information leak.
    void logAgentAudit(supabase, {
      agent_id: match.id,
      agent_display_name: match.name,
      agent_email: match.email,
      event_type: 'agent_login_failed',
      actor_role: 'system',
      details: { reason: 'suspended' },
    });
    return null;
  }

  return {
    agent: {
      id: match.id,
      name: match.name,
      email: match.email,
      school_id: match.school_id,
    },
  };
}

// ---- Helper: Referral code precheck (Phase 2) ----
// Returns a NextResponse if the code maps to a referral row that requires
// special handling (pending → redirect to signup; revoked/expired → reject).
// Returns null if the code is not a referral OR has been redeemed (in which
// case the principal's password_hash matches the redeemed referral code, so
// the existing principal-login flow handles auth).
async function tryReferralPrecheck(
  supabase: ReturnType<typeof getSupabase>,
  code: string
): Promise<NextResponse | null> {
  const { data, error } = await supabase
    .from('montree_referral_codes')
    .select('code, status, expires_at')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    // Table missing or transient DB error — never block login on this.
    // Fall through to the legacy login flow.
    console.error('[unified-auth] referral precheck error:', error.message);
    return null;
  }
  if (!data) return null;

  // Pending: school hasn't redeemed yet. Bounce them to signup with the code
  // pre-populated so they can complete trial signup. The 409 status keeps
  // this distinct from a normal auth failure.
  if (data.status === 'pending') {
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({
        error: 'This referral code has expired. Ask your contact for a fresh one.',
      }, { status: 401 });
    }
    return NextResponse.json({
      error: 'pending_referral',
      pendingReferral: true,
      code: data.code,
      redirectTo: `/montree/try?ref=${encodeURIComponent(data.code)}`,
      message: "You're on the list. Let's get your school set up.",
    }, { status: 409 });
  }

  if (data.status === 'revoked') {
    return NextResponse.json({
      error: 'This referral code has been revoked. Please contact whoever sent it to you.',
    }, { status: 401 });
  }
  if (data.status === 'expired') {
    return NextResponse.json({
      error: 'This referral code has expired. Ask your contact for a fresh one.',
    }, { status: 401 });
  }

  // status === 'redeemed' → fall through to normal login. The principal of
  // the school that redeemed this code has password_hash = legacySha256(code),
  // so tryPrincipalLogin below will find them via Step 1 (SHA-256 lookup).
  return null;
}

// ---- Helper: Try parent invite code ----
async function tryParentLogin(supabase: ReturnType<typeof getSupabase>, code: string) {
  const { data: invite } = await supabase
    .from('montree_parent_invites')
    .select('id, invite_code, child_id, expires_at, is_active, is_reusable, use_count, max_uses')
    .eq('invite_code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (!invite) return null;

  // Check expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null;

  // Check max uses
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) return null;

  // Get child info — school_id needed for provisioning the lightweight
  // parent row inside the calling route (Session 117 continued fix).
  const { data: child } = await supabase
    .from('montree_children')
    .select('id, name, nickname, classroom_id, school_id')
    .eq('id', invite.child_id)
    .maybeSingle();

  if (!child) return null;

  return { invite, child };
}
