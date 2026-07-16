// /api/montree/admin/classrooms/route.ts
// CRUD for classrooms
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { loadAllCurriculumWorks, loadCurriculumAreas } from '@/lib/montree/curriculum-loader';
import { batchTranslateAllLocales } from '@/lib/montree/insert-curriculum-work';
import { buildLocaleInsertFields } from '@/lib/montree/locales-config';
import { applyGlobalTranslations } from '@/lib/montree/curriculum/apply-global-translations';

/**
 * Seed the full static Montessori curriculum for a brand-new classroom.
 *
 * 🚨 Bonus fix (Jul 16 2026): this POST route previously created a bare
 * classroom with NO curriculum — a classroom opened from the super-admin /
 * admin Classrooms page had empty shelves, unlike principal/setup and
 * try/instant which both seed. This mirrors principal/setup's
 * seedCurriculumForClassroom + its fire-and-forget translation follow-ups.
 * Kept local (that helper isn't exported) so the change is self-contained.
 */
async function seedCurriculumForClassroom(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared service-role client
  supabase: any,
  classroomId: string
): Promise<{ success: boolean; worksCount: number; error?: string }> {
  try {
    const areas = loadCurriculumAreas();
    const areasToInsert = areas.map((area) => ({
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
      console.error('[Classrooms] Failed to create areas:', areaError.message, areaError.code);
      return { success: false, worksCount: 0, error: 'Failed to create curriculum areas' };
    }

    const areaMap: Record<string, string> = {};
    for (const area of insertedAreas || []) {
      areaMap[area.area_key] = area.id;
    }

    const allWorks = loadAllCurriculumWorks();
    const worksToInsert = allWorks
      .map((work) => {
        const areaUuid = areaMap[work.area_key];
        if (!areaUuid) return null;
        return {
          classroom_id: classroomId,
          area_id: areaUuid,
          work_key: work.work_key,
          name: work.name,
          ...buildLocaleInsertFields(work.chineseName),
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
      })
      .filter(Boolean);

    const BATCH_SIZE = 50;
    let insertedCount = 0;
    for (let i = 0; i < worksToInsert.length; i += BATCH_SIZE) {
      const batch = worksToInsert.slice(i, i + BATCH_SIZE);
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error: batchError } = await supabase
          .from('montree_classroom_curriculum_works')
          .insert(batch);
        if (!batchError) {
          insertedCount += batch.length;
          break;
        }
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        } else {
          console.error('[Classrooms] Batch insert failed after 3 attempts:', batchError.message);
        }
      }
    }

    return { success: true, worksCount: insertedCount };
  } catch (err) {
    console.error('[Classrooms] Curriculum seed error:', err);
    return { success: false, worksCount: 0, error: String(err) };
  }
}

// List classrooms for the authenticated school.
// Session 140: this GET was missing — callers (e.g. the Teachers page, which
// fetches teachers + classrooms in parallel) got a 405 here. On the Teachers
// page that 405 threw BEFORE setTeachers ran, so the page rendered "No teachers
// yet" even though the teachers API returned 200 with 4 teachers. Adding GET
// fixes both the 405 and the empty-Teachers render.
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { data: classrooms, error } = await supabase
      .from('montree_classrooms')
      .select('id, name, icon, color, age_group, is_active, created_at')
      .eq('school_id', auth.schoolId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { classrooms: classrooms || [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('List classrooms error:', error);
    return NextResponse.json({ error: 'Failed to load classrooms' }, { status: 500 });
  }
}

// Create new classroom
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const schoolId = auth.schoolId;

    const { name, icon, color } = await request.json();

    const { data: classroom, error } = await supabase
      .from('montree_classrooms')
      .insert({
        school_id: schoolId,
        name,
        icon: icon || '🏫',
        color: color || '#10B981',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Seed the full Montessori curriculum onto the new classroom's shelves —
    // mirrors principal/setup + try/instant. Awaited so shelves exist before we
    // return, but a seed failure never fails classroom creation.
    const seedResult = await seedCurriculumForClassroom(supabase, classroom.id);
    if (!seedResult.success) {
      console.error(`[Classrooms] Curriculum seed failed for ${classroom.id}: ${seedResult.error}`);
    }

    // Fire-and-forget: copy global translations, then backfill any locales the
    // global table didn't cover. Free — no AI at this step.
    applyGlobalTranslations(classroom.id).catch((err) =>
      console.error('[Classrooms] applyGlobalTranslations failed:', err instanceof Error ? err.message : err)
    );
    batchTranslateAllLocales(classroom.id).catch((err) =>
      console.error('[Classrooms] Background translation failed:', err instanceof Error ? err.message : err)
    );

    return NextResponse.json({ success: true, classroom });
  } catch (error) {
    console.error('Create classroom error:', error);
    return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });
  }
}

// Update classroom
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const schoolId = auth.schoolId;

    const { id, name, icon, color, is_active } = await request.json();

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data: classroom, error } = await supabase
      .from('montree_classrooms')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, classroom });
  } catch (error) {
    console.error('Update classroom error:', error);
    return NextResponse.json({ error: 'Failed to update classroom' }, { status: 500 });
  }
}

// Delete (soft delete) classroom
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const schoolId = auth.schoolId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Classroom ID required' }, { status: 400 });
    }

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('montree_classrooms')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete classroom error:', error);
    return NextResponse.json({ error: 'Failed to delete classroom' }, { status: 500 });
  }
}
