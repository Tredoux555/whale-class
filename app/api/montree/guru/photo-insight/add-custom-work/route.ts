// POST /api/montree/guru/photo-insight/add-custom-work
// Atomic endpoint: creates a custom work in classroom curriculum + re-tags photo + fire-and-forget visual memory
// Called when teacher taps "Add as New Work" on the amber proposal card (Scenario A)

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    // Rate limit: 10 per minute per school (not IP — school ID from JWT is authentic)
    const rateKey = `add-custom-work:${auth.schoolId}`;
    const rateResult = await checkRateLimit(supabase, rateKey, '/api/montree/guru/photo-insight/add-custom-work', 10, 60);
    if (!rateResult.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const {
      media_id,
      child_id,
      name,
      area,
      description,
      materials,
      why_it_matters,
    } = body;

    // Validate required fields
    if (!media_id || typeof media_id !== 'string') {
      return NextResponse.json({ success: false, error: 'media_id is required' }, { status: 400 });
    }
    if (!child_id || typeof child_id !== 'string') {
      return NextResponse.json({ success: false, error: 'child_id is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 60) {
      return NextResponse.json({ success: false, error: 'Name must be 3-60 characters' }, { status: 400 });
    }
    const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    if (!area || !validAreas.includes(area)) {
      return NextResponse.json({ success: false, error: 'Invalid area' }, { status: 400 });
    }
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }
    if (!materials || !Array.isArray(materials) || materials.length < 1) {
      return NextResponse.json({ success: false, error: 'At least one material is required' }, { status: 400 });
    }

    // Security: verify child belongs to school — fail fast if schoolId missing
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get child's classroom for work creation
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', child_id)
      .maybeSingle();

    if (childError || !child?.classroom_id) {
      return NextResponse.json({ success: false, error: 'Child not found or no classroom' }, { status: 404 });
    }

    // Validate classroom belongs to teacher's school
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', child.classroom_id)
      .maybeSingle();

    if (classroomError || !classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Classroom validation failed' }, { status: 403 });
    }

    // Block re-tagging already-tagged photos
    const { data: existingMedia } = await supabase
      .from('montree_media')
      .select('work_id')
      .eq('id', media_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (existingMedia?.work_id) {
      return NextResponse.json({ success: false, error: 'Photo is already tagged' }, { status: 409 });
    }

    const trimmedName = name.trim();
    const workKey = `custom_${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${randomUUID().slice(0, 8)}`;

    // Step 1: Create the custom work in classroom curriculum
    let workId: string;
    let deduplicated = false;

    try {
      const { data: newWork, error: insertError } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert({
          classroom_id: child.classroom_id,
          name: trimmedName,
          work_key: workKey,
          area_key: area,
          description: description.trim().slice(0, 500),
          materials: materials.map((m: string) => m.trim()).filter(Boolean).slice(0, 10).join(', '),
          is_custom: true,
          source: 'auto_propose',
          teacher_notes: why_it_matters ? why_it_matters.trim().slice(0, 500) : null,
        })
        .select('id')
        .single();

      if (insertError) {
        // Handle 23505 duplicate constraint violation (partial unique index on custom work names)
        if (insertError.code === '23505') {
          console.log(`[AddCustomWork] Duplicate custom work "${trimmedName}" — fetching existing`);
          const { data: existing } = await supabase
            .from('montree_classroom_curriculum_works')
            .select('id')
            .eq('classroom_id', child.classroom_id)
            .ilike('name', trimmedName)
            .eq('is_custom', true)
            .maybeSingle();

          if (!existing) {
            return NextResponse.json({ success: false, error: 'Failed to create or find work' }, { status: 500 });
          }
          workId = existing.id;
          deduplicated = true;
        } else {
          console.error('[AddCustomWork] Insert error:', insertError);
          return NextResponse.json({ success: false, error: 'Failed to create work' }, { status: 500 });
        }
      } else {
        workId = newWork.id;
      }
    } catch (err) {
      console.error('[AddCustomWork] Insert exception:', err);
      return NextResponse.json({ success: false, error: 'Failed to create work' }, { status: 500 });
    }

    // Step 2: Re-tag the photo (update media.work_id) — scoped by school_id for security
    const { error: mediaError } = await supabase
      .from('montree_media')
      .update({ work_id: workId })
      .eq('id', media_id)
      .eq('school_id', auth.schoolId);

    if (mediaError) {
      console.error('[AddCustomWork] Media update failed:', mediaError);
      // ROLLBACK: Delete the orphaned work record if we just created it (not deduplicated)
      if (!deduplicated) {
        await supabase
          .from('montree_classroom_curriculum_works')
          .delete()
          .eq('id', workId)
          .then(({ error }) => {
            if (error) console.error('[AddCustomWork] Rollback delete failed:', error);
            else console.log(`[AddCustomWork] Rolled back orphaned work ${workId}`);
          });
      }
      return NextResponse.json({ success: false, error: 'Failed to tag photo' }, { status: 500 });
    }

    console.log(`[AddCustomWork] Created work "${trimmedName}" (${workKey}), tagged media ${media_id}, deduplicated=${deduplicated}`);

    // Step 3: Fire-and-forget — generate visual memory + enrich work
    // These happen AFTER the success response is sent to avoid blocking the teacher
    const classroomId = child.classroom_id;

    // 3a: Visual memory — so the system recognizes this activity next time
    if (anthropic) {
      // Fetch the actual storage_path for this media
      supabase
        .from('montree_media')
        .select('storage_path')
        .eq('id', media_id)
        .maybeSingle()
        .then(({ data: mediaData }) => {
          if (!mediaData?.storage_path) return;
          const fullPhotoUrl = getPublicUrl('montree-media', mediaData.storage_path);
          if (!fullPhotoUrl.startsWith('http')) return;

          const vmAbort = new AbortController();
          const vmTimeout = setTimeout(() => vmAbort.abort(), 30000);

          return anthropic!.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 150,
            system: `You are a Montessori classroom material describer. Given a photo of a child working with materials, describe ONLY the physical materials/objects visible — NOT the child, NOT the activity, NOT the room. Focus on: shape, color, size, material (wood/metal/fabric/plastic), arrangement, and any distinctive visual features. Keep it to 1-2 sentences, max 120 words.`,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'url', url: fullPhotoUrl } },
                { type: 'text', text: `This is the custom Montessori work "${trimmedName}" (area: ${area}). Describe the physical materials visible.` },
              ],
            }],
          }, { signal: vmAbort.signal }).then((msg) => {
            let desc = '';
            for (const block of msg.content) {
              if (block.type === 'text') { desc = block.text.trim().slice(0, 500); break; }
            }
            if (desc.length >= 10) {
              return supabase
                .from('montree_visual_memory')
                .upsert({
                  classroom_id: classroomId,
                  work_name: trimmedName,
                  work_key: workKey,
                  area: area,
                  is_custom: true,
                  visual_description: desc,
                  source: 'auto_propose',
                  source_media_id: media_id,
                  photo_url: fullPhotoUrl,
                  description_confidence: 0.7,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'classroom_id,work_name' })
                .then(({ error }) => {
                  if (error) console.error('[AddCustomWork] Visual memory upsert error:', error);
                  else console.log(`[AddCustomWork] Visual memory stored for "${trimmedName}"`);
                });
            }
          }).catch((err) => {
            console.error('[AddCustomWork] Visual memory generation failed (non-fatal):', err);
          }).finally(() => {
            clearTimeout(vmTimeout);
          });
        })
        .catch((err) => {
          console.error('[AddCustomWork] Visual memory media lookup failed (non-fatal):', err);
        });
    }

    return NextResponse.json({
      success: true,
      work_id: workId,
      work_key: workKey,
      deduplicated,
    });

  } catch (error) {
    console.error('[AddCustomWork] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
