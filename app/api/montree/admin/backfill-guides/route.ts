// /api/montree/admin/backfill-guides/route.ts
// Backfill existing classroom with AMI presentation guides
// Usage: POST /api/montree/admin/backfill-guides?classroom_id=xxx
// Or: POST /api/montree/admin/backfill-guides?all=true (all classrooms — SUPER-ADMIN only)
//
// 🚨 audit fix (findings 3 + 7, Sep 2026). Two holes, both closed here:
//
//   1. `?all=true` skipped the classroom_id filter, so the UPDATE loop below rewrote
//      montree_classroom_curriculum_works for EVERY classroom on the platform — a
//      cross-tenant write reachable by any authenticated session. That branch now
//      requires super-admin (verifySuperAdminAuth), the same door every other
//      platform-wide tool uses.
//   2. It was a GET with cookie auth and no CSRF token, so a mere
//      `<img src=".../backfill-guides?all=true">` on any page a logged-in user visited
//      fired the write. It is POST-only now. There is no frontend caller to update
//      (grepped app/, components/, lib/ — zero hits); it is an operator tool run by hand.
//
// The classroom-scoped branch additionally requires a PRINCIPAL session (finding 7).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';
import { verifyPrincipalRequest } from '@/lib/montree/verify-request';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { applyGlobalTranslations } from '@/lib/montree/curriculum/apply-global-translations';

export async function POST(request: NextRequest) {
  try {
    const { searchParams: preSearchParams } = new URL(request.url);
    const wantsAll = preSearchParams.get('all') === 'true';

    // Platform-wide mode is a SUPER-ADMIN tool: it writes into every tenant, so a school
    // session — principal or not — must never reach it.
    if (wantsAll) {
      const superAdminCheck = await verifySuperAdminAuth(request.headers);
      if (!superAdminCheck.valid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // A school session still has to be a principal for the classroom-scoped branch. The
    // super-admin path above has no Montree school session at all, so skip it there.
    const auth = wantsAll ? null : await verifyPrincipalRequest(request);
    if (auth instanceof NextResponse) return auth;

    const schoolId = auth?.schoolId;

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    const updateAll = wantsAll;

    if (!classroomId && !updateAll) {
      return NextResponse.json({
        error: 'Provide classroom_id or all=true',
        usage: '/api/montree/admin/backfill-guides?classroom_id=xxx'
      }, { status: 400 });
    }

    const supabase = getSupabase();

    // SECURITY: Verify classroom belongs to authenticated school. `auth` is null only on
    // the super-admin (all=true) path, which is not school-scoped by design.
    if (classroomId && auth) {
      const { data: classroom } = await supabase
        .from('montree_classrooms')
        .select('school_id')
        .eq('id', classroomId)
        .single();
      
      if (!classroom || classroom.school_id !== schoolId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    }

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
