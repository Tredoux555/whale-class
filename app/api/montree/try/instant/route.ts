// /api/montree/try/instant/route.ts
// Zero-friction instant trial - generates account + code in one shot

import { NextRequest, NextResponse } from 'next/server';
import { legacySha256 } from '@/lib/montree/password';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks, loadCurriculumAreas } from '@/lib/montree/curriculum-loader';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { getLocationFromRequest } from '@/lib/ip-geolocation';
import { stampSchoolAttribution } from '@/lib/montree/outreach/stamp-attribution';
import { applyGlobalTranslations } from '@/lib/montree/curriculum/apply-global-translations';
import { isValidLocale, DEFAULT_LOCALE, type Locale } from '@/lib/montree/i18n/locales';
import { DEFAULTS } from '@/lib/montree/constants';
import { MINIMAL_DEFAULT_MENU } from '@/lib/montree/menu/config';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { applyAiTier } from '@/lib/montree/billing/apply-ai-tier';

/**
 * Resolve the primary locale for a new school at signup.
 * Priority: request body `locale` field → Accept-Language header → 'en'.
 */
function resolvePrimaryLocale(req: NextRequest, bodyLocale: unknown): Locale {
  // 1. Explicit body field — set by the trial signup form from useI18n().locale
  if (typeof bodyLocale === 'string' && isValidLocale(bodyLocale)) {
    return bodyLocale as Locale;
  }
  // 2. Accept-Language header — first valid locale tag
  const accept = req.headers.get('accept-language') || '';
  for (const part of accept.split(',')) {
    const tag = part.split(';')[0].trim().split('-')[0].toLowerCase();
    if (isValidLocale(tag)) return tag as Locale;
  }
  // 3. Default
  return DEFAULT_LOCALE;
}

/**
 * If a referral code was supplied at signup, validate it BEFORE creating any
 * school records. Returns the resolved agent context to stamp on the school
 * once it exists, OR null if no code (clean direct signup), OR throws an
 * Error with a user-safe message if the code is invalid.
 *
 * We treat invalid codes as a hard signup failure so the user sees a clear
 * error rather than silently signing up without referral attribution. The
 * front-end can then prompt them to fix the code or proceed without one.
 */
interface ReferralContext {
  codeId: string;
  code: string;
  agentId: string | null;
  revenueSharePct: number;
}
async function resolveReferralCode(
  supabase: ReturnType<typeof getSupabase>,
  rawCode: unknown
): Promise<ReferralContext | null> {
  if (!rawCode || typeof rawCode !== 'string') return null;
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  const { data, error } = await supabase
    .from('montree_referral_codes')
    .select('id, code, agent_id, revenue_share_pct, status, expires_at')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    console.error('[Trial] referral code lookup failed:', error.message);
    throw new Error('Could not validate referral code. Try again.');
  }
  if (!data) {
    throw new Error(`Referral code "${code}" was not found.`);
  }
  if (data.status !== 'pending') {
    throw new Error(`Referral code "${code}" is no longer valid (status: ${data.status}).`);
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    throw new Error(`Referral code "${code}" has expired.`);
  }

  return {
    codeId: data.id as string,
    code: data.code as string,
    agentId: (data.agent_id as string | null) || null,
    revenueSharePct: Number(data.revenue_share_pct),
  };
}

/**
 * 🚨 Session 113 V2 — Agent dashboard audit CRITICAL fix.
 *
 * Atomically redeem a referral code AND stamp the school's referral
 * linkage, race-guarded against concurrent signups using the same code.
 *
 * The pre-fix pattern had a TOCTOU race: two concurrent /try/instant
 * calls would both pass resolveReferralCode's status='pending' check,
 * both create schools, both stamp founding_teacher_id. Only one of the
 * two .update({status:'redeemed'}) writes would persist (last-writer-
 * wins), leaving the OTHER school as an orphan — revenue share active
 * but no canonical FK back from the code → broken reconciliation +
 * unclear attribution.
 *
 * The new pattern:
 *   1. AWAIT a conditional UPDATE on the code with
 *      `.eq('status', 'pending')` — Postgres-level atomicity. Only the
 *      first signup wins; the second signup's UPDATE matches zero rows.
 *   2. AWAIT (not fire-and-forget) so we know the outcome before
 *      responding to the user. School stamp is gated on race-won.
 *   3. If race lost: log loudly, return false, and let the caller skip
 *      the school stamp. The school still exists but stays as a regular
 *      (non-referral) trial — same outcome as if no code had been used.
 *   4. If school stamp fails AFTER redeem won: try to roll back the code
 *      to 'pending' so the caller can re-issue or another signup can
 *      use it. The roll-back conditional filters on
 *      `.eq('redeemed_by_school_id', schoolId)` so we don't un-redeem
 *      someone else's claim.
 *
 * Slight perf hit (one extra round-trip-await on the redemption path)
 * vs the old fire-and-forget. Acceptable — redemption is the canonical
 * money-flow setup step and correctness matters here.
 */
async function redeemReferralCode(
  supabase: ReturnType<typeof getSupabase>,
  referral: ReferralContext,
  schoolId: string,
  context: string
): Promise<boolean> {
  // Step 1: atomic conditional UPDATE on the code. Returns the updated
  // row if our UPDATE was the first to hit; returns empty if another
  // signup beat us to it.
  const { data: redeemed, error: redeemErr } = await supabase
    .from('montree_referral_codes')
    .update({
      status: 'redeemed',
      redeemed_by_school_id: schoolId,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', referral.codeId)
    .eq('status', 'pending')
    .select('id');

  if (redeemErr) {
    console.error(`[Trial] referral code redeem failed (${context}):`, redeemErr.message);
    return false;
  }

  if (!redeemed || redeemed.length === 0) {
    // Race lost — another concurrent signup redeemed this code first.
    // The school we just created stays as a regular trial (no founding_
    // teacher_id, no revenue share). The user gets a working trial; the
    // agent doesn't get attribution. Acceptable outcome under contention.
    console.warn(
      `[Trial] referral code RACE LOST (${context}) — code ${referral.code} was redeemed by another concurrent signup. School ${schoolId} will NOT carry revenue share.`
    );
    return false;
  }

  // Step 2: race won — stamp the school's referral linkage.
  const { error: schoolErr } = await supabase
    .from('montree_schools')
    .update({
      founding_teacher_id: referral.agentId,
      revenue_share_pct: referral.revenueSharePct,
      revenue_share_active: true,
      referral_code_id: referral.codeId,
      referral_code_used: referral.code,
    })
    .eq('id', schoolId);

  if (schoolErr) {
    // School stamp failed AFTER redeem won — try to roll back the code
    // so the inconsistent state doesn't persist. The conditional
    // .eq('redeemed_by_school_id', schoolId) ensures we don't trample
    // another signup's claim if somehow they got in between.
    console.error(
      `[Trial] school stamp failed AFTER redeem won (${context}):`,
      schoolErr.message,
      '— attempting code roll-back.'
    );
    await supabase
      .from('montree_referral_codes')
      .update({ status: 'pending', redeemed_by_school_id: null, redeemed_at: null })
      .eq('id', referral.codeId)
      .eq('redeemed_by_school_id', schoolId)
      .then(({ error }) => {
        if (error) console.error(`[Trial] code roll-back also failed (${context}):`, error.message);
      });
    return false;
  }

  return true;
}

/**
 * Redeem a founding code AND stamp the new school's founding membership,
 * race-guarded against a double-redemption of the same code.
 *
 * Order (mirrors redeemReferralCode's atomic pattern):
 *   1. Stamp the school first: founding_member=true, billing_override_usd=3,
 *      note, trial_ends_at = now + 30 days (the Premium month).
 *   2. AWAIT a conditional UPDATE on the waitlist row with `.is('redeemed_at',
 *      null)` — Postgres-level atomicity. Only the first signup wins; a second
 *      concurrent signup's UPDATE matches zero rows.
 *   3. If the redeem race is lost, the school stays founding-stamped (it still
 *      exists as a real trial), but we log loudly. This is a benign edge —
 *      each admitted code is meant for one school and Tredoux controls issuance.
 *
 * Returns true if the redeem landed (this signup won the code), false on a
 * race-loss or redeem error. The school stamp already succeeded either way.
 */
async function redeemFoundingCode(
  supabase: ReturnType<typeof getSupabase>,
  founding: FoundingContext,
  schoolId: string,
  foundingTrialEndsAtIso: string,
  // The new school's name + signup email — used only by the universal branch to
  // stamp the fresh admitted waitlist row that makes the cap self-increment.
  signupContext: { schoolName: string; email: string }
): Promise<boolean> {
  const isPartner = founding.grantType === 'partner_free_life';

  // Step 1: stamp the school's founding membership + billing override + the
  // 30-day Premium month (overrides the 7-day default written at insert).
  //   founding_3_life   → $3-for-life  (Founding 100)
  //   partner_free_life → $0 free-for-life (Partner Program)
  const { error: schoolErr } = await supabase
    .from('montree_schools')
    .update({
      founding_member: true,
      billing_override_usd: isPartner ? 0 : 3,
      billing_override_note: isPartner
        ? 'Partner — Premium free for life'
        : 'Founding 100 — Premium at $3 for life',
      trial_ends_at: foundingTrialEndsAtIso,
    })
    .eq('id', schoolId);

  if (schoolErr) {
    console.error('[Trial] founding school stamp failed:', schoolErr.message);
    return false;
  }

  // Partner schools get PERMANENT Premium (Sonnet) via the same feature-flag
  // grant the super-admin schools PATCH applies — so it's real Premium with no
  // Stripe subscription ever (resolve-model's sonnet flag outranks trial state).
  // 🚨 Failure here must NOT fail the signup — log loudly; the school can be
  // fixed via the super-admin schools PATCH (ai_tier: 'sonnet').
  if (isPartner) {
    try {
      const tierResult = await applyAiTier(supabase, schoolId, 'sonnet', 'partner_free_life_redemption');
      if (!tierResult.ok) {
        console.error('[Trial] partner AI-tier grant FAILED (non-fatal) for school', schoolId, ':', tierResult.error);
      }
    } catch (tierErr) {
      console.error('[Trial] partner AI-tier grant THREW (non-fatal) for school', schoolId, ':', tierErr);
    }
  }

  // Step 2 — record the redemption.
  //
  // Universal link (migration 291): there is no pre-existing row to update —
  // INSERT a fresh admitted waitlist row so the admitted count self-increments
  // and the cap burns down automatically. Each redemption also appears as its
  // own row in the Founding tab list. A duplicate-email 23505 (or ANY insert
  // error) must NEVER fail the signup — the $3-for-life grant is already applied
  // above; we simply skip the row (the count just won't tick up for this one).
  if (founding.kind === 'universal') {
    const nowIso = new Date().toISOString();
    const { error: insErr } = await supabase
      .from('montree_founding_waitlist')
      .insert({
        school_name: signupContext.schoolName,
        email: signupContext.email,
        status: 'admitted',
        admitted_at: nowIso,
        source: 'universal_link',
        grant_type: 'founding_3_life',
        redeemed_by_school_id: schoolId,
        redeemed_at: nowIso,
        signup_code: null,
        notes: 'via universal link',
      } as never);
    if (insErr) {
      if (insErr.code === '23505') {
        console.warn(
          `[Trial] universal founding row skipped — duplicate email ${signupContext.email} (grant still applied to school ${schoolId}).`
        );
      } else {
        console.error('[Trial] universal founding row insert failed (non-fatal):', insErr.message);
      }
    }
    // 🚨 Race note: the cap check in resolveFoundingCode and this INSERT are not
    // transactional, so a burst of concurrent universal signups could overshoot
    // the cap by a few. Accepted by design — worst case a couple extra founders.
    return true;
  }

  // Single-use FND- code: atomic conditional redeem of the pre-existing row.
  // `.is('redeemed_at', null)` guards a concurrent double-redeem — first wins.
  const { data: redeemed, error: redeemErr } = await supabase
    .from('montree_founding_waitlist')
    .update({
      redeemed_by_school_id: schoolId,
      redeemed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', founding.waitlistId)
    .is('redeemed_at', null)
    .select('id');

  if (redeemErr) {
    console.error('[Trial] founding code redeem failed:', redeemErr.message);
    return false;
  }
  if (!redeemed || redeemed.length === 0) {
    console.warn(
      `[Trial] founding code RACE LOST — ${founding.code} was redeemed by another concurrent signup. School ${schoolId} is still founding-stamped.`
    );
    return false;
  }
  return true;
}

/**
 * Founding 100 signup code (migration 286).
 *
 * Tredoux admits a waitlist school in super-admin and generates a one-time
 * FND-XXXXXX code. Redeeming it at signup gives the new school a founding
 * membership: Premium locked at $3/student for life (via billing_override_usd)
 * + a 30-day Premium month.
 *
 * Validation mirrors resolveReferralCode: verify the row is admitted + not yet
 * redeemed BEFORE any writes. Returns the waitlist row id + code on success,
 * null for no code (clean direct signup), or throws a user-safe Error for an
 * invalid/already-redeemed code.
 *
 * 🚨 Amendment A6: a valid founding code makes any referral code IGNORED —
 * founding schools are never agent-attributed. An INVALID founding code is a
 * hard 400 (thrown here), never a silent fall-through to referral.
 */
type FoundingGrantType = 'founding_3_life' | 'partner_free_life';
// A founding code is one of two shapes:
//   'single'    — a one-time FND- waitlist code (Founding 100 or Partner). Its
//                 redemption UPDATEs the pre-existing admitted waitlist row.
//   'universal' — the ONE public multi-use link (migration 291, config-stored).
//                 Its redemption INSERTs a fresh admitted row so the cap
//                 self-increments. Always the $3-for-life Founding 100 grant.
interface FoundingSingleContext {
  kind: 'single';
  waitlistId: string;
  code: string;
  // migration 290 — which grant this code confers. 'founding_3_life' = the
  // Founding 100 $3-for-life deal (default); 'partner_free_life' = a Partner
  // Program school (Premium FREE for life). Reads 42703-safe (a missing column
  // behaves exactly as before: everything is 'founding_3_life').
  grantType: FoundingGrantType;
}
interface FoundingUniversalContext {
  kind: 'universal';
  code: string;
  grantType: 'founding_3_life';
}
type FoundingContext = FoundingSingleContext | FoundingUniversalContext;

// resolveFoundingCode result. `universalFull` is set true ONLY when the input
// matched the universal link but the cap is reached / offer closed — the caller
// falls through to a normal trial AND surfaces `founding_full: true` so the UI
// can tell the user the founding spots filled. A plain missing/invalid code
// leaves `universalFull` false (and an INVALID single-use code still throws).
interface ResolveFoundingResult {
  context: FoundingContext | null;
  universalFull: boolean;
}
async function resolveFoundingCode(
  supabase: ReturnType<typeof getSupabase>,
  rawCode: unknown
): Promise<ResolveFoundingResult> {
  if (!rawCode || typeof rawCode !== 'string') return { context: null, universalFull: false };
  const code = rawCode.trim().toUpperCase();
  if (!code) return { context: null, universalFull: false };

  // ── Universal Founding 100 link (migration 291) ──
  // Check the config singleton's universal_signup_code FIRST. 42703-safe: if
  // the column doesn't exist yet (migration 291 lags), skip the universal
  // branch entirely so pre-migration deploys behave byte-identically to today.
  try {
    const cfg = await supabase
      .from('montree_founding_config')
      .select('universal_signup_code, cap, is_closed')
      .eq('id', 1)
      .maybeSingle();
    if (cfg.error) {
      const isMissingColumn =
        cfg.error.code === '42703' || (cfg.error.message || '').includes('universal_signup_code');
      if (!isMissingColumn) {
        // A non-missing-column config error must not block a real FND- code —
        // log and fall through to the single-use lookup below.
        console.error('[Trial] universal founding config lookup failed:', cfg.error.message);
      }
      // missing column → skip the universal branch entirely (pre-291 behaviour)
    } else if (
      cfg.data?.universal_signup_code &&
      String(cfg.data.universal_signup_code).trim().toUpperCase() === code
    ) {
      // This input IS the universal link. Check the cap + closed state live.
      const cap = typeof cfg.data.cap === 'number' ? cfg.data.cap : 100;
      const { count } = await supabase
        .from('montree_founding_waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'admitted');
      const admitted = count ?? 0;
      if (cfg.data.is_closed === true || admitted >= cap) {
        // Cap reached / offer closed → fall through to a normal 7-day trial.
        // Signal `founding_full` so the caller can inform the user.
        return { context: null, universalFull: true };
      }
      return { context: { kind: 'universal', code, grantType: 'founding_3_life' }, universalFull: false };
    }
  } catch (e) {
    console.error('[Trial] universal founding branch threw (non-fatal):', e);
    // fall through to the single-use lookup
  }

  // grant_type only exists after migration 290. Try WITH it; on ANY error
  // (including 42703 undefined-column when the migration lags) fall back to a
  // select without it and treat the code as legacy founding_3_life.
  interface WaitlistLookup {
    id: string;
    signup_code: string;
    status: string;
    redeemed_at: string | null;
    grant_type?: string | null;
  }
  let data: WaitlistLookup | null = null;
  const withGrant = await supabase
    .from('montree_founding_waitlist')
    .select('id, signup_code, status, redeemed_at, grant_type')
    .eq('signup_code', code)
    .maybeSingle();
  if (withGrant.error) {
    // Only fall back for the missing-column case (42703 / grant_type) when
    // migration 290 lags. Any OTHER error propagates as before (thrown → the
    // caller returns a hard 400) rather than being masked by a fallback read.
    const isMissingColumn =
      withGrant.error.code === '42703' || (withGrant.error.message || '').includes('grant_type');
    if (!isMissingColumn) {
      console.error('[Trial] founding code lookup failed:', withGrant.error.message);
      throw new Error('Could not validate your founding code. Try again.');
    }
    const fallback = await supabase
      .from('montree_founding_waitlist')
      .select('id, signup_code, status, redeemed_at')
      .eq('signup_code', code)
      .maybeSingle();
    if (fallback.error) {
      console.error('[Trial] founding code lookup failed:', fallback.error.message);
      throw new Error('Could not validate your founding code. Try again.');
    }
    data = (fallback.data as WaitlistLookup | null) ?? null;
  } else {
    data = (withGrant.data as WaitlistLookup | null) ?? null;
  }

  if (!data) {
    throw new Error(`Founding code "${code}" was not found.`);
  }
  if (data.status !== 'admitted') {
    throw new Error(`Founding code "${code}" is not active.`);
  }
  if (data.redeemed_at) {
    throw new Error(`Founding code "${code}" has already been used.`);
  }

  const grantType: FoundingGrantType =
    data.grant_type === 'partner_free_life' ? 'partner_free_life' : 'founding_3_life';

  return {
    context: { kind: 'single', waitlistId: data.id as string, code: data.signup_code as string, grantType },
    universalFull: false,
  };
}

/**
 * Seed full Montessori curriculum for a new classroom
 * Non-blocking: failures here don't prevent trial creation
 */
async function seedCurriculumForClassroom(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string
): Promise<{ success: boolean; worksCount: number }> {
  try {
    // Create curriculum areas
    const areas = loadCurriculumAreas();
    const areasToInsert = areas.map(area => ({
      classroom_id: classroomId,
      area_key: area.area_key,
      name: area.name,
      icon: area.icon,
      color: area.color,
      sequence: area.sequence,
      is_active: true,
    }));

    const { data: insertedAreas, error: areaError } = await supabase
      .from('montree_classroom_curriculum_areas')
      .insert(areasToInsert)
      .select();

    if (areaError) {
      console.error('[Trial] Area seed error:', areaError.message);
      return { success: false, worksCount: 0 };
    }

    const areaMap: Record<string, string> = {};
    for (const area of insertedAreas || []) {
      areaMap[area.area_key] = area.id;
    }

    // Load and insert all works with descriptions
    const allWorks = loadAllCurriculumWorks();
    const worksToInsert = allWorks.map(work => {
      const areaUuid = areaMap[work.area_key];
      if (!areaUuid) return null;
      return {
        classroom_id: classroomId,
        area_id: areaUuid,
        work_key: work.work_key,
        name: work.name,
        description: work.description || null,
        age_range: work.age_range || '3-6',
        sequence: work.sequence,
        is_active: true,
        materials: work.materials || [],
        direct_aims: work.direct_aims || [],
        indirect_aims: work.indirect_aims || [],
        control_of_error: work.control_of_error || null,
        prerequisites: work.prerequisites || [],
        quick_guide: work.quick_guide || null,
        presentation_steps: work.presentation_steps || [],
        parent_description: work.parent_description || null,
        why_it_matters: work.why_it_matters || null,
      };
    }).filter(Boolean);

    // Insert in batches
    const BATCH_SIZE = 50;
    let count = 0;
    for (let i = 0; i < worksToInsert.length; i += BATCH_SIZE) {
      const batch = worksToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(batch);
      if (!error) count += batch.length;
    }

    return { success: true, worksCount: count };
  } catch (err) {
    console.error('[Trial] Curriculum seed error:', err);
    return { success: false, worksCount: 0 };
  }
}

// Same charset as existing teacher codes - no confusing chars
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function generateSlug(baseName: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomSuffix}`;
}

export async function POST(req: NextRequest) {
  // Diagnostic: track each step
  const steps: string[] = [];

  try {
    steps.push('1-init');
    const supabase = getSupabase();

    // ── Signup abuse backstop (Workstream 2.3) ──
    // 5 school creations per hour per IP. Fail-OPEN: a rate-limiter outage
    // (table unreachable) must NOT brick legitimate signups — the abuse
    // backstop of last resort is the super-admin lock flag, not this limiter.
    // (checkRateLimit's default failMode is 'open', matching that intent.)
    const ip = getClientIP(req.headers);
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/try/instant', 5, 60
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many signups from this connection. Please try again in a little while.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const {
      role,
      name,
      schoolName,
      email,
      locale: bodyLocale,
      referral_code: rawReferralCode,
      founding_code: rawFoundingCode,
      website, // honeypot — real users never fill this hidden field
    } = body;

    // Honeypot — a filled `website` field means a bot. Pretend success, write
    // nothing (mirror of /founding/join). Fake a plausible response shape so a
    // bot can't distinguish this from a real signup by the payload.
    if (website) {
      steps.push('1-honeypot');
      return NextResponse.json({ success: true, code: generateCode(), role: role === 'principal' ? 'principal' : 'teacher', userId: 'honeypot' });
    }

    const primaryLocale = resolvePrimaryLocale(req, bodyLocale);
    steps.push(`1-locale:${primaryLocale}`);

    if (!role || !['teacher', 'principal', 'homeschool_parent'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // ── Step 1a-founding: Validate a Founding 100 code BEFORE any writes ──
    // 🚨 Amendment A6: a VALID founding code wins — referral is ignored entirely
    // (founding schools are never agent-attributed). An INVALID founding code is
    // a hard 400 here; it must NOT silently fall through to referral resolution.
    let founding: FoundingContext | null = null;
    // Set true when the input matched the universal Founding 100 link but the
    // cap is full / offer closed — signup proceeds as a normal trial and the
    // success response carries `founding_full: true` so the client can say so.
    let foundingFull = false;
    try {
      const foundingResult = await resolveFoundingCode(supabase, rawFoundingCode);
      founding = foundingResult.context;
      foundingFull = foundingResult.universalFull;
      if (founding) steps.push(`1a-founding-ok:${founding.code}`);
      else if (foundingFull) steps.push('1a-founding-full');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid founding code';
      steps.push(`1a-founding-fail:${msg}`);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // ── Step 1a: Validate referral code (if provided) BEFORE creating any rows ──
    // Skipped entirely when a valid founding code is present (A6).
    let referral: ReferralContext | null = null;
    if (!founding) {
      try {
        referral = await resolveReferralCode(supabase, rawReferralCode);
        if (referral) steps.push(`1a-referral-ok:${referral.code}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid referral code';
        steps.push(`1a-referral-fail:${msg}`);
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    // Founding schools get a 30-day Premium month (overrides the 7-day default).
    // redeemFoundingCode applies this after the school row exists.
    const foundingTrialEndsAtIso = founding
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Use provided names or fall back to defaults
    const userName = (name && name.trim()) || (role === 'principal' ? 'Principal' : role === 'homeschool_parent' ? 'Parent' : 'Teacher');
    const userSchoolName = (schoolName && schoolName.trim()) || `Trial ${role === 'principal' ? 'School' : role === 'homeschool_parent' ? 'Homeschool' : 'Classroom'}`;

    const code = generateCode();
    const codeHash = legacySha256(code.toUpperCase());
    // CR-1: trial length comes from the single DEFAULTS.TRIAL_DAYS constant.
    const trialEndsAt = new Date(Date.now() + DEFAULTS.TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // Universal founding redemption stamps a fresh admitted waitlist row keyed
    // on the new school's name + signup email. Email falls back to the same
    // synthetic address used for owner_email so the UNIQUE row still inserts
    // even when the signup left email blank.
    const foundingSignupContext = {
      schoolName: userSchoolName,
      email: email?.trim() || `trial-${code.toLowerCase()}@montree.app`,
    };

    // ── Step 1: Create trial school ──
    steps.push('2-school');
    const schoolSlug = generateSlug(`trial-${role}-${code}`);
    const planType = role === 'principal' ? 'school' : role === 'homeschool_parent' ? 'homeschool' : 'personal_classroom';
    const { data: school, error: schoolErr } = await supabase
      .from('montree_schools')
      .insert({
        name: userSchoolName,
        slug: schoolSlug,
        owner_email: email?.trim() || `trial-${code.toLowerCase()}@montree.app`,
        owner_name: userName,
        subscription_status: 'trialing',
        plan_type: planType,
        subscription_tier: 'trial',
        is_active: true,
        trial_ends_at: trialEndsAt.toISOString(),
        max_students: role === 'homeschool_parent' ? 10 : 30,
        primary_locale: primaryLocale,
      })
      .select()
      .single();

    if (schoolErr || !school) {
      console.error('SCHOOL FAIL:', schoolErr?.message, schoolErr?.code, schoolErr?.details);
      return NextResponse.json({
        error: 'School creation failed',
      }, { status: 500 });
    }
    steps.push('2-school-ok:' + school.id);

    // ── Step 1b: Capture signup location (non-blocking analytics) ──
    try {
      steps.push('2b-location');
      const location = await getLocationFromRequest(req);
      if (location.country) {
        await supabase
          .from('montree_schools')
          .update({
            signup_country: location.country,
            signup_country_code: location.countryCode,
            signup_city: location.city,
            signup_region: location.region,
            signup_ip: location.ip,
            signup_timezone: location.timezone,
          })
          .eq('id', school.id);
        steps.push(`2b-location-ok:${location.city || 'unknown'},${location.country}`);
      } else {
        steps.push('2b-location-skip');
      }
    } catch (locErr) {
      // Non-critical: don't fail signup if geolocation fails
      const message = locErr instanceof Error ? locErr.message : String(locErr);
      steps.push('2b-location-fail:' + message);
    }

    // ── Step 1c: Ad-geo attribution stamp (Jul 7 2026, non-blocking) ──
    // First-touch acquisition source from the montree_attrib cookie. Awaited but
    // wrapped — a failure never fails signup (helper swallows all errors).
    await stampSchoolAttribution(supabase, req, school.id);

    // ── Step 2: Create classroom (teachers + homeschool only — principals create their own) ──
    let classroom: Record<string, unknown> | null = null;
    if (role !== 'principal') {
      steps.push('3-classroom');
      const classroomName = role === 'homeschool_parent' ? 'My Home' : 'My Classroom';
      const { data: classroomData, error: classroomErr } = await supabase
        .from('montree_classrooms')
        .insert({ name: classroomName, school_id: school.id })
        .select()
        .single();

      classroom = classroomData;

      if (classroomErr) {
        console.error('CLASSROOM FAIL:', JSON.stringify(classroomErr));
        steps.push('3-classroom-fail:' + classroomErr.message);
      } else {
        steps.push('3-classroom-ok');
      }

      // ── Step 2b: Seed curriculum for classroom (non-blocking) ──
      if (classroom?.id) {
        steps.push('3b-curriculum');
        const seedResult = await seedCurriculumForClassroom(supabase, classroom.id as string);
        if (seedResult.success) {
          steps.push(`3b-curriculum-ok:${seedResult.worksCount}`);
          // ── Step 2c: Copy global translations into the new classroom (free, instant) ──
          // Fire-and-forget so the trial-signup response returns fast. Within ~1s
          // every locale column is populated from the global translation library,
          // so when the teacher switches to their language they see no English.
          applyGlobalTranslations(classroom.id as string)
            .then(updated => steps.push(`3c-translations-ok:${updated}`))
            .catch(err => {
              console.error('[Trial] applyGlobalTranslations failed:', err);
              steps.push('3c-translations-fail');
            });
        } else {
          steps.push('3b-curriculum-fail');
        }
      }
    } else {
      steps.push('3-classroom-skip-principal');
    }

    // ── Step 3: Create user account ──
    if (role === 'homeschool_parent') {
      // ── Homeschool parent flow — identical to teacher, same table, same response ──
      steps.push('4-homeschool-parent');
      const { data: teacher, error: teacherErr } = await supabase
        .from('montree_teachers')
        .insert({
          name: userName,
          school_id: school.id,
          classroom_id: (classroom?.id as string) || null,
          password_hash: codeHash,
          login_code: code.toUpperCase(),
          email: email?.trim() || null,
          role: 'homeschool_parent',
          // Seed the minimal default menu (Jul 3 2026 menu cleanup).
          settings: { menu: MINIMAL_DEFAULT_MENU },
        })
        .select()
        .single();

      if (teacherErr || !teacher) {
        console.error('HOMESCHOOL TEACHER FAIL:', teacherErr?.message, teacherErr?.code, teacherErr?.details);
        await supabase.from('montree_schools').delete().eq('id', school.id);
        return NextResponse.json({
          error: 'Account creation failed',
        }, { status: 500 });
      }
      steps.push('4-homeschool-parent-ok:' + teacher.id);

      // ── Stamp the school's founding OR referral linkage (homeschool branch) ──
      // A6: founding and referral are mutually exclusive (referral is null when
      // a valid founding code was used). Founding stamps $3-for-life + a 30-day
      // Premium month + redeems the waitlist row.
      if (founding && foundingTrialEndsAtIso) {
        const redeemed = await redeemFoundingCode(supabase, founding, school.id, foundingTrialEndsAtIso, foundingSignupContext);
        steps.push(redeemed
          ? `4a-founding-redeemed:${founding.code}`
          : `4a-founding-race-lost:${founding.code}`);
      } else if (referral) {
        // 🚨 Session 113 V2 audit CRITICAL fix: race-guarded redemption.
        // Awaited so we know the outcome before responding. See
        // redeemReferralCode() for the race contract.
        const redeemed = await redeemReferralCode(supabase, referral, school.id, 'homeschool');
        steps.push(redeemed
          ? `4a-referral-redeemed:${referral.code}`
          : `4a-referral-race-lost:${referral.code}`);
      }

      // Lead record (non-blocking)
      try {
        await supabase.from('montree_leads').insert({
          role: 'homeschool_parent',
          interest_type: 'try',
          status: 'new',
          name: userName,
          email: email?.trim() || null,
          school_name: userSchoolName,
          notes: `Homeschool trial - Code: ${code}\nParent: ${userName}\nSchool: ${userSchoolName} (${school.id})`,
        });
        steps.push('5-lead-ok');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        steps.push('5-lead-fail:' + message);
      }

      // Issue signed JWT token — homeschool_parent role, 30-day TTL
      const token = await createMontreeToken({
        sub: teacher.id as string,
        schoolId: (school?.id || teacher.school_id) as string,
        classroomId: (classroom?.id || teacher.classroom_id) as string,
        role: 'homeschool_parent',
      });

      // Same response shape as teacher — dashboard handles the rest
      const response = NextResponse.json({
        success: true,
        code,
        token,
        role: 'homeschool_parent',
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email || null,
          password_set_at: teacher.password_set_at || null,
        },
        classroom: classroom ? {
          id: classroom.id,
          name: classroom.name,
          icon: classroom.icon || null,
          color: classroom.color || null,
        } : null,
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
        },
        onboarded: false, // needs to add children first, same as teacher
        userId: teacher.id as string,
        // Universal founding link matched but the cap was full / offer closed —
        // this signed up on the normal 7-day trial. Present only in that case.
        ...(foundingFull ? { founding_full: true } : {}),
      });
      setMontreeAuthCookie(response, token, 'homeschool_parent');
      return response;

    } else if (role === 'teacher') {
      steps.push('4-teacher');
      const { data: teacher, error: teacherErr } = await supabase
        .from('montree_teachers')
        .insert({
          name: userName,
          school_id: school.id,
          classroom_id: (classroom?.id as string) || null,
          password_hash: codeHash,
          login_code: code.toUpperCase(),
          email: email?.trim() || null,
          // Seed the minimal default menu in the INSERT itself (Jul 3 2026) —
          // the fire-and-forget update below stays as a safety net.
          settings: { menu: MINIMAL_DEFAULT_MENU },
        })
        .select()
        .single();

      if (teacherErr || !teacher) {
        console.error('TEACHER FAIL:', teacherErr?.message, teacherErr?.code, teacherErr?.details);
        await supabase.from('montree_schools').delete().eq('id', school.id);
        return NextResponse.json({
          error: 'Teacher creation failed',
        }, { status: 500 });
      }
      steps.push('4-teacher-ok:' + teacher.id);

      // ── Seed the minimal default dashboard menu for this NEW teacher ──
      // Guru → Curriculum → Manage Students → Parent Manager → Parent Messages
      // → Photo Audit visible; everything else hidden (customizable later via
      // Manage Menu). Existing schools never get a seed → they keep their
      // current menu. Fire-and-forget + graceful: if migration 268 (the
      // settings column) hasn't run yet, this no-ops with a warning and the
      // teacher simply gets the legacy menu until it does.
      supabase
        .from('montree_teachers')
        .update({ settings: { menu: MINIMAL_DEFAULT_MENU } })
        .eq('id', teacher.id)
        .then(({ error }) => {
          if (error) console.warn('[Trial] menu seed skipped:', error.message);
        });

      // ── Stamp the school's founding / referral / self-serve linkage ──
      // A6: founding and referral are mutually exclusive. Priority:
      //   1. Founding 100 code → $3-for-life + 30-day Premium month + redeem
      //      the waitlist row. It's a DIRECT signup (no agent), so the new
      //      teacher is still the self-serve founding_teacher_id below.
      //   2. Referral code → the LINKED AGENT becomes founding_teacher_id, the
      //      agent's % is locked in, and the referral code is marked redeemed.
      //   3. Neither → the new teacher becomes the founding teacher (legacy
      //      self-serve flow from Session 72).
      if (founding && foundingTrialEndsAtIso) {
        const redeemed = await redeemFoundingCode(supabase, founding, school.id, foundingTrialEndsAtIso, foundingSignupContext);
        steps.push(redeemed
          ? `4a-founding-redeemed:${founding.code}`
          : `4a-founding-race-lost:${founding.code}`);
        // Founding schools have no agent — the teacher is the self-serve founder.
        supabase
          .from('montree_schools')
          .update({ founding_teacher_id: teacher.id, revenue_share_active: false })
          .eq('id', school.id)
          .then(({ error }) => {
            if (error) console.error('[Trial] founding_teacher_id update failed:', error.message);
          });
      } else if (referral) {
        // 🚨 Session 113 V2 audit CRITICAL fix: race-guarded redemption.
        const redeemed = await redeemReferralCode(supabase, referral, school.id, 'teacher');
        steps.push(redeemed
          ? `4a-referral-redeemed:${referral.code}`
          : `4a-referral-race-lost:${referral.code}`);
      } else {
        supabase
          .from('montree_schools')
          .update({ founding_teacher_id: teacher.id, revenue_share_active: false })
          .eq('id', school.id)
          .then(({ error }) => {
            if (error) console.error('[Trial] founding_teacher_id update failed:', error.message);
          });
      }

      // Lead record (non-blocking)
      try {
        await supabase.from('montree_leads').insert({
          role,
          interest_type: 'try',
          status: 'new',
          name: userName,
          email: email?.trim() || null,
          school_name: userSchoolName,
          notes: `Instant trial - Code: ${code}\nName: ${userName}\nTeacher ID: ${teacher.id}\nSchool: ${userSchoolName} (${school.id})`,
        });
        steps.push('5-lead-ok');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        steps.push('5-lead-fail:' + message);
      }

      // Issue signed JWT token for instant login
      const token = await createMontreeToken({
        sub: teacher.id,
        schoolId: school.id,
        classroomId: (classroom?.id as string) || undefined,
        role: 'teacher',
      });

      const response = NextResponse.json({
        success: true,
        code,
        token,
        role: 'teacher',
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email || null,
          password_set_at: null,
        },
        classroom: classroom ? {
          id: classroom.id as string,
          name: classroom.name as string,
          icon: classroom.icon as string,
          color: classroom.color as string,
        } : null,
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
        },
        onboarded: false,
        userId: teacher.id,
        // Universal founding link matched but the cap was full / offer closed —
        // this signed up on the normal 7-day trial. Present only in that case.
        ...(foundingFull ? { founding_full: true } : {}),
      });
      setMontreeAuthCookie(response, token);
      return response;

    } else {
      // Principal
      steps.push('4-principal');

      // ── Phase 2: dual-purpose referral code ──
      // When a referral code is present, the SAME code becomes the principal's
      // login. We hash the referral code itself (uppercased) as password_hash
      // — the existing principal-login flow at /api/montree/auth/unified does
      // legacySha256(input) and compares to password_hash, so this just works.
      // The school's principal will type SARAH-K9X7 at the login screen and
      // be in. Without a referral code, we fall back to the auto-generated
      // 6-char code (legacy direct-signup behaviour).
      const principalLoginCode = referral ? referral.code : code;
      const principalPasswordHash = referral ? legacySha256(referral.code.toUpperCase()) : codeHash;
      const emailFallbackSlug = principalLoginCode.toLowerCase().replace(/[^a-z0-9]/g, '-');

      const { data: principal, error: principalErr } = await supabase
        .from('montree_school_admins')
        .insert({
          school_id: school.id,
          email: email?.trim() || `trial-${emailFallbackSlug}@montree.app`,
          // Plain code stored alongside hash (Session 98 migration 194) so
          // super admin can read it back to a principal who forgot theirs.
          login_code: principalLoginCode,
          password_hash: principalPasswordHash,
          name: userName,
          role: 'principal',
        })
        .select()
        .single();

      if (principalErr || !principal) {
        console.error('PRINCIPAL FAIL:', principalErr?.message, principalErr?.code, principalErr?.details);
        await supabase.from('montree_schools').delete().eq('id', school.id);
        return NextResponse.json({
          error: 'Principal creation failed',
        }, { status: 500 });
      }
      steps.push('4-principal-ok:' + principal.id);

      // ── Stamp the school's founding / referral linkage (principal branch) ──
      // A6: founding and referral are mutually exclusive. A founding school is a
      // direct signup (no agent) — its principal login stays the auto-generated
      // 6-char code (principalLoginCode = code, since referral is null).
      if (founding && foundingTrialEndsAtIso) {
        const redeemed = await redeemFoundingCode(supabase, founding, school.id, foundingTrialEndsAtIso, foundingSignupContext);
        steps.push(redeemed
          ? `4a-founding-redeemed:${founding.code}`
          : `4a-founding-race-lost:${founding.code}`);
      } else if (referral) {
        // 🚨 Session 113 V2 audit CRITICAL fix: race-guarded redemption.
        // Principals have no auto-set founding agent. If a referral code was
        // used, the agent becomes founding_teacher_id and the school is locked
        // to that revenue share %.
        const redeemed = await redeemReferralCode(supabase, referral, school.id, 'principal');
        steps.push(redeemed
          ? `4a-referral-redeemed:${referral.code}`
          : `4a-referral-race-lost:${referral.code}`);
      }

      // Lead record (non-blocking)
      try {
        await supabase.from('montree_leads').insert({
          role,
          interest_type: 'try',
          status: 'new',
          name: userName,
          email: email?.trim() || null,
          school_name: userSchoolName,
          notes: `Instant trial - Code: ${code}\nName: ${userName}\nPrincipal ID: ${principal.id}\nSchool: ${userSchoolName} (${school.id})`,
        });
        steps.push('5-lead-ok');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        steps.push('5-lead-fail:' + message);
      }

      // Issue signed JWT token for instant login
      const token = await createMontreeToken({
        sub: principal.id,
        schoolId: school.id,
        role: 'principal',
      });

      const response = NextResponse.json({
        success: true,
        // When redeemed via referral code, return the referral code as the
        // login code — that's what the principal types from now on. Without
        // a referral, return the auto-generated 6-char code as before.
        code: principalLoginCode,
        token,
        role: 'principal',
        principal: {
          id: principal.id,
          name: principal.name,
          email: principal.email,
          role: principal.role,
        },
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
          subscription_status: school.subscription_status || 'trialing',
          plan_type: school.plan_type || 'school',
          // 🚨 REVIEW FIX (Jul 6): `school` was captured from the INSERT (7-day
          // trial), but redeemFoundingCode UPDATEd the DB to 30 days for founding
          // schools without re-reading the row. Echo the founding 30-day date so
          // the response never contradicts the DB. Non-founding: 7-day default.
          trial_ends_at: foundingTrialEndsAtIso || school.trial_ends_at || trialEndsAt.toISOString(),
        },
        userId: principal.id,
        // Universal founding link matched but the cap was full / offer closed —
        // this signed up on the normal 7-day trial. Present only in that case.
        ...(foundingFull ? { founding_full: true } : {}),
      });
      setMontreeAuthCookie(response, token);
      return response;
    }

  } catch (err: unknown) {
    console.error('INSTANT TRIAL CRASH:', err, 'Steps:', steps);
    return NextResponse.json({
      error: 'Unexpected error',
    }, { status: 500 });
  }
}
