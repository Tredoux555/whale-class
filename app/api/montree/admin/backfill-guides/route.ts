// /api/montree/admin/backfill-guides/route.ts
// Backfill existing classroom with AMI presentation guides
// Usage: GET /api/montree/admin/backfill-guides?classroom_id=xxx
// Or: GET /api/montree/admin/backfill-guides?all=true (all of YOUR school's classrooms)
//
// 🚨 SECURITY (Sep 2026): `all=true` used to mean literally ALL — the query ran
// against montree_classroom_curriculum_works with NO classroom or school filter
// whatsoever, then UPDATEd every row it found. Any authenticated caller could
// therefore rewrite the curriculum text of every classroom in EVERY school on
// the platform in one request, and the fan-out below re-ran translations across
// all of them too. The single-classroom path was correctly ownership-checked;
// the "all" path simply skipped that check by never naming a classroom.
//
// `all=true` now means "every classroom in the CALLER'S school". A genuine
// platform-wide backfill is still possible, but only for a super-admin, who must
// ask for it explicitly with `scope=platform`.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { requirePrincipalOrSuperAdmin } from '@/lib/montree/security/require-principal';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { applyGlobalTranslations } from '@/lib/montree/curriculum/apply-global-translations';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    const denied = await requirePrincipalOrSuperAdmin(request, auth);
    if (denied) return denied;

    const schoolId = auth.schoolId;

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    const updateAll = searchParams.get('all') === 'true';

    if (!classroomId && !updateAll) {
      return NextResponse.json({
        error: 'Provide classroom_id or all=true',
        usage: '/api/montree/admin/backfill-guides?classroom_id=xxx'
      }, { status: 400 });
    }

    const supabase = getSupabase();
    
    // SECURITY: Verify classroom belongs to authenticated school
    if (classroomId) {
      const { data: classroom } = await supabase
        .from('montree_classrooms')
        .select('school_id')
        .eq('id', classroomId)
        .single();
      
      if (!classroom || classroom.school_id !== schoolId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // ── SECURITY: resolve which classrooms `all=true` is allowed to touch ────
    // A platform-wide run is a deliberate, super-admin-only act. Everyone else
    // gets their own school, which is what the caller of this endpoint has
    // always actually wanted (it is invoked from the principal's setup flow).
    let allowedClassroomIds: string[] | null = null;

    if (updateAll) {
      const wantsPlatformWide = searchParams.get('scope') === 'platform';

      // Check the super-admin credential directly rather than inferring it from
      // the role — a principal may ALSO be operating with super-admin headers,
      // and a platform-wide write is too broad to grant on an inference.
      let isSuperAdmin = false;
      if (wantsPlatformWide) {
        try {
          isSuperAdmin = (await verifySuperAdminAuth(request.headers)).valid;
        } catch (e) {
          console.error('[Backfill] super-admin check failed:', e);
          isSuperAdmin = false;
        }
      }

      if (wantsPlatformWide && !isSuperAdmin) {
        return NextResponse.json(
          {
            error: 'Platform-wide backfill is restricted to super-admins.',
            code: 'platform_scope_forbidden',
          },
          { status: 403 },
        );
      }

      if (!wantsPlatformWide) {
        const { data: schoolClassrooms, error: classroomErr } = await supabase
          .from('montree_classrooms')
          .select('id')
          .eq('school_id', schoolId);

        if (classroomErr) {
          console.error('[Backfill] Classroom scope lookup failed:', classroomErr);
          return NextResponse.json(
            { error: 'Failed to resolve school classrooms' },
            { status: 500 },
          );
        }

        allowedClassroomIds = (schoolClassrooms ?? []).map((c) => c.id as string);

        if (allowedClassroomIds.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No classrooms in this school to backfill',
            updated: 0,
            skipped: 0,
            total: 0,
            classroom_id: 'all',
          });
        }
      }
    }

    // Load curriculum with guides - NO filter on quick_guide
    // Any work with parent_description OR quick_guide should be in the map
    const allWorks = loadAllCurriculumWorks();
    const guideMapByName = new Map<string, any>();
    const guideMapByKey = new Map<string, any>();

    for (const work of allWorks) {
      // Include ALL works that have any guide data (not just quick_guide)
      if (work.quick_guide || work.parent_description || work.why_it_matters) {
        guideMapByName.set(work.name.toLowerCase().trim(), work);
        if (work.work_key) {
          guideMapByKey.set(work.work_key.toLowerCase().trim(), work);
        }
      }
    }

    // Get existing works to update
    let query = supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, work_key, classroom_id');

    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    } else if (allowedClassroomIds) {
      // `all=true` for an ordinary principal — confined to their own school.
      query = query.in('classroom_id', allowedClassroomIds);
    }
    // else: super-admin with scope=platform — deliberately unfiltered.

    const { data: existingWorks, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Backfill] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch existing works' }, { status: 500 });
    }

    if (!existingWorks?.length) {
      return NextResponse.json({
        message: 'No works found to update',
        classroom_id: classroomId
      });
    }

    // Update each work with guide data
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const work of existingWorks) {
      // Try name match first, then work_key match as fallback
      const guide = guideMapByName.get(work.name.toLowerCase().trim())
        || (work.work_key ? guideMapByKey.get(work.work_key.toLowerCase().trim()) : null);

      if (!guide) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('montree_classroom_curriculum_works')
        .update({
          quick_guide: guide.quick_guide,
          presentation_steps: guide.presentation_steps || [],
          control_of_error: guide.control_of_error,
          direct_aims: guide.direct_aims || [],
          materials: guide.materials || [],
          parent_description: guide.parent_description,
          why_it_matters: guide.why_it_matters,
        })
        .eq('id', work.id);

      if (updateError) {
        console.error(`[Backfill] Update error for ${work.name}:`, updateError);
        errors.push(`${work.name}: update failed`);
      } else {
        updated++;
      }
    }

    // Fire-and-forget: also fill any empty locale columns from the global library.
    // COALESCE inside the SQL function preserves any teacher-edited translations.
    // Skips classrooms with all locale columns already populated.
    if (classroomId) {
      applyGlobalTranslations(classroomId).catch(err => {
        console.error('[Backfill-guides] applyGlobalTranslations failed:', err instanceof Error ? err.message : err);
      });
    } else {
      // "all" mode: fan out across every classroom we just touched
      const uniqueClassrooms = Array.from(new Set(existingWorks.map(w => w.classroom_id)));
      for (const cid of uniqueClassrooms) {
        applyGlobalTranslations(cid as string).catch(err => {
          console.error('[Backfill-guides] applyGlobalTranslations failed:', err instanceof Error ? err.message : err);
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${updated} works with AMI presentation guides`,
      updated,
      skipped,
      total: existingWorks.length,
      errors: errors.length > 0 ? errors : undefined,
      classroom_id: classroomId || 'all'
    });

  } catch (error) {
    console.error('Backfill guides error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
