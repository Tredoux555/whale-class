// /api/montree/try/instant/route.ts
// Zero-friction instant trial - generates account + code in one shot

import { NextRequest, NextResponse } from 'next/server';
import { legacySha256 } from '@/lib/montree/password';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks, loadCurriculumAreas } from '@/lib/montree/curriculum-loader';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { getLocationFromRequest } from '@/lib/ip-geolocation';
import { applyGlobalTranslations } from '@/lib/montree/curriculum/apply-global-translations';
import { isValidLocale, DEFAULT_LOCALE, type Locale } from '@/lib/montree/i18n/locales';

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
    const body = await req.json();
    const { role, name, schoolName, email, locale: bodyLocale, referral_code: rawReferralCode } = body;
    const primaryLocale = resolvePrimaryLocale(req, bodyLocale);
    steps.push(`1-locale:${primaryLocale}`);

    if (!role || !['teacher', 'principal', 'homeschool_parent'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // ── Step 1a: Validate referral code (if provided) BEFORE creating any rows ──
    let referral: ReferralContext | null = null;
    try {
      referral = await resolveReferralCode(supabase, rawReferralCode);
      if (referral) steps.push(`1a-referral-ok:${referral.code}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid referral code';
      steps.push(`1a-referral-fail:${msg}`);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Use provided names or fall back to defaults
    const userName = (name && name.trim()) || (role === 'principal' ? 'Principal' : role === 'homeschool_parent' ? 'Parent' : 'Teacher');
    const userSchoolName = (schoolName && schoolName.trim()) || `Trial ${role === 'principal' ? 'School' : role === 'homeschool_parent' ? 'Homeschool' : 'Classroom'}`;

    const code = generateCode();
    const codeHash = legacySha256(code.toUpperCase());
    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

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

      // ── Stamp the school's referral linkage (homeschool branch) ──
      if (referral) {
        supabase
          .from('montree_schools')
          .update({
            founding_teacher_id: referral.agentId,
            revenue_share_pct: referral.revenueSharePct,
            revenue_share_active: true,
            referral_code_id: referral.codeId,
            referral_code_used: referral.code,
          })
          .eq('id', school.id)
          .then(({ error }) => {
            if (error) console.error('[Trial] referral school update failed (homeschool):', error.message);
          });
        supabase
          .from('montree_referral_codes')
          .update({ status: 'redeemed', redeemed_by_school_id: school.id, redeemed_at: new Date().toISOString() })
          .eq('id', referral.codeId)
          .then(({ error }) => {
            if (error) console.error('[Trial] referral code redeem failed (homeschool):', error.message);
          });
        steps.push(`4a-referral-redeemed:${referral.code}`);
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

      // ── Stamp the school's referral / founding-agent linkage ──
      // If the user signed up with a referral code, the LINKED AGENT (not the
      // new teacher) becomes the school's founding_teacher_id, the agent's
      // negotiated % is locked in, and the code is marked redeemed.
      // Without a code, the new teacher becomes the founding teacher (legacy
      // self-serve flow from Session 72).
      if (referral) {
        supabase
          .from('montree_schools')
          .update({
            founding_teacher_id: referral.agentId,
            revenue_share_pct: referral.revenueSharePct,
            revenue_share_active: true,
            referral_code_id: referral.codeId,
            referral_code_used: referral.code,
          })
          .eq('id', school.id)
          .then(({ error }) => {
            if (error) console.error('[Trial] referral school update failed:', error.message);
          });
        supabase
          .from('montree_referral_codes')
          .update({ status: 'redeemed', redeemed_by_school_id: school.id, redeemed_at: new Date().toISOString() })
          .eq('id', referral.codeId)
          .then(({ error }) => {
            if (error) console.error('[Trial] referral code redeem failed:', error.message);
          });
        steps.push(`4a-referral-redeemed:${referral.code}`);
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

      // ── Stamp the school's referral linkage (principal branch) ──
      // Principals have no auto-set founding agent. If a referral code was
      // used, the agent becomes founding_teacher_id and the school is locked
      // to that revenue share %.
      if (referral) {
        supabase
          .from('montree_schools')
          .update({
            founding_teacher_id: referral.agentId,
            revenue_share_pct: referral.revenueSharePct,
            revenue_share_active: true,
            referral_code_id: referral.codeId,
            referral_code_used: referral.code,
          })
          .eq('id', school.id)
          .then(({ error }) => {
            if (error) console.error('[Trial] referral school update failed (principal):', error.message);
          });
        supabase
          .from('montree_referral_codes')
          .update({ status: 'redeemed', redeemed_by_school_id: school.id, redeemed_at: new Date().toISOString() })
          .eq('id', referral.codeId)
          .then(({ error }) => {
            if (error) console.error('[Trial] referral code redeem failed (principal):', error.message);
          });
        steps.push(`4a-referral-redeemed:${referral.code}`);
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
          trial_ends_at: school.trial_ends_at || trialEndsAt.toISOString(),
        },
        userId: principal.id,
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
