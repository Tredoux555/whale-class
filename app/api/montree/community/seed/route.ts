// /api/montree/community/seed/route.ts
// POST: Pre-seed the community library with all 329 standard curriculum works
// Admin-only, one-time operation (skips existing works by standard_work_id)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';

export async function POST(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password') || '';
    const auth = verifySuperAdminPassword(password);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Load all curriculum works from static JSON
    let curriculumWorks;
    try {
      curriculumWorks = loadAllCurriculumWorks();
    } catch (loadErr: any) {
      return NextResponse.json({
        error: 'Failed to load curriculum works',
        detail: loadErr?.message || String(loadErr),
        stack: loadErr?.stack?.split('\n').slice(0, 5),
      }, { status: 500 });
    }

    if (!curriculumWorks || curriculumWorks.length === 0) {
      return NextResponse.json({
        error: 'No curriculum works loaded',
        count: curriculumWorks?.length ?? 'null',
      }, { status: 500 });
    }

    // Check which standard works already exist
    const { data: existing, error: fetchErr } = await supabase
      .from('montree_community_works')
      .select('standard_work_id')
      .not('standard_work_id', 'is', null);

    if (fetchErr) {
      return NextResponse.json({
        error: 'Failed to check existing works',
        detail: fetchErr.message,
      }, { status: 500 });
    }

    const existingIds = new Set((existing || []).map(e => e.standard_work_id));

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches of 50
    const worksToInsert = [];

    for (const work of curriculumWorks) {
      if (existingIds.has(work.work_key)) {
        skipped++;
        continue;
      }

      const area = work.area_key;

      // Build a detailed description from guide data
      const detailParts: string[] = [];
      if (work.quick_guide) {
        detailParts.push(work.quick_guide);
      }
      if (work.presentation_steps && work.presentation_steps.length > 0) {
        detailParts.push('\n\nPresentation Steps:');
        work.presentation_steps.forEach((step: any, i: number) => {
          const instruction = step.instruction || step.description || step.step || JSON.stringify(step);
          detailParts.push(`${i + 1}. ${instruction}`);
        });
      }
      const poi = Array.isArray(work.points_of_interest) ? work.points_of_interest :
        (typeof work.points_of_interest === 'string' ? [work.points_of_interest] : []);
      if (poi.length > 0) {
        detailParts.push('\n\nPoints of Interest:');
        poi.forEach((p: string) => detailParts.push(`• ${String(p)}`));
      }
      const challenges = Array.isArray(work.common_challenges) ? work.common_challenges :
        (typeof work.common_challenges === 'string' ? [work.common_challenges] : []);
      if (challenges.length > 0) {
        detailParts.push('\n\nCommon Challenges:');
        challenges.forEach((c: string) => detailParts.push(`• ${String(c)}`));
      }

      // Build presentation_steps JSONB
      const presentationSteps = (work.presentation_steps || []).map((step: any, i: number) => ({
        step: i + 1,
        instruction: step.instruction || step.description || step.step || '',
      }));

      worksToInsert.push({
        title: work.name,
        description: work.description || `${work.name} — a ${area.replace('_', ' ')} work in the Montessori curriculum.`,
        detailed_description: detailParts.length > 0 ? detailParts.join('\n') : null,
        area,
        category: work.category_name || null,
        age_range: work.age_range || 'all',
        materials: work.materials || [],
        direct_aims: work.direct_aims || [],
        indirect_aims: work.indirect_aims || [],
        control_of_error: work.control_of_error || null,
        prerequisites: work.prerequisites || [],
        presentation_steps: presentationSteps,
        variations: (Array.isArray(work.variations) ? work.variations : []).map((v: any) => ({ description: String(v) })),
        extensions: (Array.isArray(work.extensions) ? work.extensions : []).map((e: any) => ({ description: String(e) })),
        standard_work_id: work.work_key,
        is_variation: false,
        contributor_name: 'Montree Standard Curriculum',
        contributor_country: 'International',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: 'system-seed',
        photos: [],
        videos: [],
        pdfs: [],
      });
    }

    // Insert in batches of 50
    for (let i = 0; i < worksToInsert.length; i += 50) {
      const batch = worksToInsert.slice(i, i + 50);
      const { error } = await supabase
        .from('montree_community_works')
        .insert(batch);

      if (error) {
        errors.push(`Batch ${Math.floor(i / 50) + 1}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      total_curriculum_works: curriculumWorks.length,
      inserted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({
      error: 'Seed failed',
      detail: error?.message || String(error),
      stack: error?.stack?.split('\n').slice(0, 5),
    }, { status: 500 });
  }
}
