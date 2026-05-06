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

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);

    // Rate limiting
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/auth/unified', 5, 15
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
    // them out of /api/montree/admin/principal-agent (Tracy) and any other
    // principal-only route. Principal first gives them the higher role.
    const principalResult = await tryPrincipalLogin(supabase, normalizedCode);
    if (principalResult) {
      const { principal, school, needsSetup } = principalResult;

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

      // Update usage tracking
      await supabase.from('montree_parent_invites').update({
        use_count: (invite.use_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      }).eq('id', invite.id);

      const sessionToken = await createParentToken({
        sub: child.id,
        childName: child.name || child.nickname,
        classroomId: child.classroom_id,
        inviteId: invite.id,
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

  // Step 1: Legacy SHA-256
  const codeHash = legacySha256(code);
  const { data: hashMatch } = await supabase
    .from('montree_school_admins')
    .select(fields)
    .eq('password_hash', codeHash)
    .eq('role', 'principal')
    .maybeSingle();

  let principal = hashMatch;

  // NOTE: Principals do NOT have a login_code column on montree_school_admins.
  // They authenticate via password_hash lookup only. The Step 2 ILIKE
  // login_code lookup that used to live here was dead code — Postgres returned
  // 42703 (undefined column), the destructured error was discarded, and
  // codeMatch was always undefined. Step 1 (SHA-256 hash) and Step 3 (bcrypt
  // scan) cover all real cases. See app/api/montree/invite-principal/route.ts
  // for the same fix on the write side.

  // Step 3: bcrypt scan fallback
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

  // Get child info
  const { data: child } = await supabase
    .from('montree_children')
    .select('id, name, nickname, classroom_id')
    .eq('id', invite.child_id)
    .maybeSingle();

  if (!child) return null;

  return { invite, child };
}
