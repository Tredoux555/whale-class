// @ts-nocheck
// POST /api/montree/photo-audit/resolve
//
// Single endpoint that resolves a photo in the Photo Audit queue. Called
// by the "This is…" bottom sheet. Three paths — all end identically:
// montree_media.teacher_confirmed = true, photo removed from queue.
//
//   existing    — teacher picked an existing curriculum work
//   new_custom  — teacher typed a new work name (+ area)
//   confirm_ai  — teacher confirmed the AI's existing guess
//
// Paths A (existing) and C (confirm_ai) delegate to the well-tested
// /api/montree/guru/corrections route via internal fetch (cookie-forwarded)
// so we inherit its self-learning loop (visual memory + negative examples
// + EMA + brain learning + cache invalidation + teacher_confirmed).
//
// Path B (new_custom) is inlined here because:
//   (1) add-custom-work requires description + materials, which the
//       teacher hasn't provided at this UX moment.
//   (2) add-custom-work 409-rejects photos that already have a work_id,
//       which happens when Gate A silently auto-tagged the photo before
//       the teacher overrode it with a new custom work.
//
// Path B seeds visual memory directly from the cached sonnet_draft
// (already paid for, richer than a fresh Haiku call) and fires off
// enrichCustomWorkInBackground() for Sonnet-grade parent_description /
// why_it_matters / key_materials enrichment.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { randomUUID } from 'crypto';
import { enrichCustomWorkInBackground } from '@/lib/montree/photo-identification/enrich-custom-work';
import { POST as correctionsPost } from '@/app/api/montree/guru/corrections/route';
import { advanceProgressOnConfirm } from '@/lib/montree/progress/advance-on-confirm';

const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// Confirmed-photo progress write — delegates to the SINGLE shared advance
// function so custom-work confirms advance the shelf status the same way as
// every other confirm path (see advance-on-confirm.ts).
async function upsertProgressObservation({
  childId, classroomId: _classroomId, workName, area,
}: {
  childId: string;
  classroomId: string;
  workName: string | null;
  area: string | null;
}) {
  await advanceProgressOnConfirm({ supabase: getSupabase(), childId, workName, area });
}

type Resolution =
  | { type: 'existing'; work_id: string; work_name: string; area_key: string }
  // new_custom optionally carries the teacher-reviewed work definition from
  // the addMode review screen. When `reviewed` is true these values are
  // written verbatim onto the new curriculum row and the background
  // enrichment translates-only (it never re-generates over the teacher's
  // text). When absent, the route seeds from the cached sonnet_draft.
  | {
      type: 'new_custom';
      name: string;
      area_key: string;
      parent_description?: string;
      why_it_matters?: string;
      materials?: string[];
      // Full teacher-reviewed guide fields, present when the teacher used
      // the "Generate full teaching guide" step in the addMode review screen.
      description?: string;
      quick_guide?: string;
      direct_aims?: string[];
      presentation_steps?: string[];
      reviewed?: boolean;
    }
  | { type: 'confirm_ai'; work_id?: string; work_name: string; area_key: string }
  // Session 113: "Other" bucket — photos worth keeping (snack time, art
  // moments, group activity, parent pickup, etc.) but NOT pedagogically
  // tagged against the Montessori curriculum. Result: photo is removed
  // from the audit queue (teacher_confirmed=true), work_id stays null,
  // sonnet_draft.is_other = true acts as the discriminator for filtering
  // gallery/report queries. No curriculum row is created. No visual
  // memory / negative example / brain learning fires (Other photos
  // shouldn't pollute the moat).
  //
  // Session 117+: optional `category` narrows what kind of moment it is —
  // 'behavioral_observation' | 'outdoor_play' | 'special_event'. Stored
  // on sonnet_draft.other_category so reports / galleries can group.
  | { type: 'other'; category?: 'behavioral_observation' | 'outdoor_play' | 'special_event'; note?: string };

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'No school' }, { status: 403 });
    }

    const supabase = getSupabase();

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rate = await checkRateLimit(supabase, ip, '/api/montree/photo-audit/resolve', 200, 60);
    if (!rate.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { media_id, resolution } = body as {
      media_id: string;
      resolution: Resolution;
    };

    if (!media_id || typeof media_id !== 'string') {
      return NextResponse.json({ success: false, error: 'media_id required' }, { status: 400 });
    }
    if (!resolution || typeof resolution !== 'object') {
      return NextResponse.json({ success: false, error: 'resolution required' }, { status: 400 });
    }

    // Look up the media row — needed for child_id, current work_id, sonnet_draft, classroom_id
    const { data: mediaRow, error: mediaErr } = await supabase
      .from('montree_media')
      .select('id, school_id, classroom_id, child_id, work_id, sonnet_draft')
      .eq('id', media_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (mediaErr || !mediaRow) {
      return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });
    }

    const classroomId = (mediaRow.classroom_id as string) || auth.classroomId;
    const childId = mediaRow.child_id as string | null;
    if (!classroomId) {
      return NextResponse.json({ success: false, error: 'Media has no classroom' }, { status: 400 });
    }
    if (!childId) {
      return NextResponse.json({ success: false, error: 'Media has no child' }, { status: 400 });
    }

    // 🚨 Perf Tier 3.4 (PERF_HEALTH_CHECK.md) — parallelize the two reads that
    // happen after the mediaRow fetch. They're independent: child-access check
    // hits montree_children, original-work lookup hits curriculum_works.
    // Previously sequential they cost ~300-400ms. Now ~150-200ms.
    //
    // The denial branch costs an extra (cheap) curriculum lookup we don't end
    // up using — fine, denial is rare and the success path is the common one.
    const originalWorkId: string | null = (mediaRow.work_id as string) || null;
    let originalWorkName: string | null = null;
    let originalArea: string | null = null;

    const [childAccess, originalWorkRes] = await Promise.all([
      verifyChildBelongsToSchool(childId, auth.schoolId),
      originalWorkId
        ? supabase
            .from('montree_classroom_curriculum_works')
            .select('id, name, area_id, montree_classroom_curriculum_areas!inner(area_key)')
            .eq('id', originalWorkId)
            .maybeSingle()
        : Promise.resolve({ data: null as null | { name: string; montree_classroom_curriculum_areas: unknown } }),
    ]);

    if (!childAccess.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Resolve current work for the "original_*" fields when delegating to
    // corrections. If the media already has a work_id, look up its name/area.
    // Otherwise fall back to the Sonnet draft's closest_existing_match or
    // proposed_name.
    if (originalWorkId && originalWorkRes.data) {
      const wRow = originalWorkRes.data;
      originalWorkName = (wRow.name as string) || null;
      const areasRel = (wRow as { montree_classroom_curriculum_areas?: unknown }).montree_classroom_curriculum_areas;
      originalArea = Array.isArray(areasRel)
        ? (areasRel[0] as { area_key?: string })?.area_key || null
        : (areasRel as { area_key?: string } | null)?.area_key || null;
    }
    if (!originalWorkName) {
      const draft = (mediaRow.sonnet_draft as Record<string, unknown>) || null;
      originalWorkName =
        ((draft?.closest_existing_match as { work_name?: string } | undefined)?.work_name) ||
        ((draft?.proposed_name as string | undefined)) ||
        null;
      originalArea = originalArea || ((draft?.suggested_area as string | undefined) || null);
    }

    // ========== Path C: confirm_ai ==========
    if (resolution.type === 'confirm_ai') {
      return await delegateToCorrections(request, {
        action: 'confirm',
        media_id,
        child_id: childId,
        original_work_name: resolution.work_name,
        original_work_id: resolution.work_id || originalWorkId,
        original_area: resolution.area_key,
      }, startedAt, 'confirm_ai');
    }

    // ========== Path A: existing ==========
    if (resolution.type === 'existing') {
      if (!resolution.work_id || !resolution.work_name) {
        return NextResponse.json({ success: false, error: 'work_id and work_name required' }, { status: 400 });
      }
      return await delegateToCorrections(request, {
        media_id,
        child_id: childId,
        original_work_name: originalWorkName || resolution.work_name,
        original_work_id: originalWorkId,
        original_area: originalArea,
        corrected_work_name: resolution.work_name,
        corrected_work_id: resolution.work_id,
        corrected_area: resolution.area_key,
        correction_type: 'work_mismatch',
      }, startedAt, 'existing');
    }

    // ========== Path B: new_custom ==========
    if (resolution.type === 'new_custom') {
      const name = (resolution.name || '').trim();
      const areaKey = resolution.area_key;
      if (!name || name.length < 2 || name.length > 80) {
        return NextResponse.json({ success: false, error: 'Name must be 2-80 characters' }, { status: 400 });
      }
      if (!VALID_AREAS.includes(areaKey)) {
        return NextResponse.json({ success: false, error: 'Invalid area_key' }, { status: 400 });
      }

      // Resolve area_key -> area_id
      const { data: areaRow, error: areaErr } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('area_key', areaKey)
        .maybeSingle();
      if (areaErr || !areaRow?.id) {
        return NextResponse.json({ success: false, error: `Curriculum area "${areaKey}" not found` }, { status: 500 });
      }
      const areaId = areaRow.id as string;

      // Deduplicate — if a work with this exact name already exists in the
      // classroom, treat this as Path A instead of creating a duplicate.
      const { data: dup } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name')
        .eq('classroom_id', classroomId)
        .ilike('name', name.replace(/[%_\\]/g, '\\$&'))
        .limit(1)
        .maybeSingle();

      if (dup?.id) {
        console.log(`[PhotoAuditResolve] new_custom → dedup → existing work ${dup.id}`);
        return await delegateToCorrections(request, {
          media_id,
          child_id: childId,
          original_work_name: originalWorkName || name,
          original_work_id: originalWorkId,
          original_area: originalArea,
          corrected_work_name: dup.name || name,
          corrected_work_id: dup.id,
          corrected_area: areaKey,
          correction_type: 'work_mismatch',
        }, startedAt, 'new_custom_dedup');
      }

      // Compute next sequence at end of area
      const { data: seqRows } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('sequence')
        .eq('classroom_id', classroomId)
        .eq('area_id', areaId)
        .order('sequence', { ascending: false })
        .limit(1);
      const nextSequence = ((seqRows?.[0]?.sequence as number) || 0) + 1;

      const workKey = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${randomUUID().slice(0, 8)}`;

      // Seed rich description fields directly from the cached Sonnet draft
      // that's already sitting on the media row. The draft describes THIS
      // photo, which is the archetype for the new work, so its
      // parent_description / why_it_matters / key_materials are exactly
      // what the teacher expects to see on the new curriculum entry
      // immediately — no waiting for background re-enrichment.
      const draft = (mediaRow.sonnet_draft as Record<string, any>) || {};
      // Teacher-reviewed values from the addMode form take precedence over
      // the cached AI draft. Each field falls back to the draft only when
      // the teacher left it blank.
      const teacherParent = typeof resolution.parent_description === 'string' ? resolution.parent_description.trim().slice(0, 2000) : '';
      const teacherWhy = typeof resolution.why_it_matters === 'string' ? resolution.why_it_matters.trim().slice(0, 2000) : '';
      const teacherMaterials = Array.isArray(resolution.materials)
        ? resolution.materials.filter((m) => typeof m === 'string' && m.trim()).map((m) => m.trim()).slice(0, 20)
        : [];
      const draftParent = typeof draft.parent_description === 'string' ? draft.parent_description.trim().slice(0, 1000) : '';
      const draftWhy = typeof draft.why_it_matters === 'string' ? draft.why_it_matters.trim().slice(0, 1000) : '';
      const draftMaterials = Array.isArray(draft.key_materials)
        ? draft.key_materials.filter((m: any) => typeof m === 'string' && m.trim()).slice(0, 20)
        : [];
      const finalParent = teacherParent || draftParent;
      const finalWhy = teacherWhy || draftWhy;
      const finalMaterials = teacherMaterials.length ? teacherMaterials : draftMaterials;

      // Full guide fields — present only when the teacher used the
      // "Generate full teaching guide" step. No sonnet_draft fallback
      // exists for these (the photo draft never carries a teaching guide),
      // so they come straight from the teacher-reviewed resolution.
      const teacherDescription = typeof resolution.description === 'string' ? resolution.description.trim().slice(0, 2000) : '';
      const teacherQuickGuide = typeof resolution.quick_guide === 'string' ? resolution.quick_guide.trim().slice(0, 4000) : '';
      const teacherDirectAims = Array.isArray(resolution.direct_aims)
        ? resolution.direct_aims.filter((a) => typeof a === 'string' && a.trim()).map((a) => a.trim()).slice(0, 12)
        : [];
      const teacherPresentationSteps = Array.isArray(resolution.presentation_steps)
        ? resolution.presentation_steps.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()).slice(0, 20)
        : [];

      const insertPayload: Record<string, unknown> = {
        classroom_id: classroomId,
        name,
        work_key: workKey,
        area_id: areaId,
        sequence: nextSequence,
        is_custom: true,
        is_active: true,
        source: 'photo_audit_resolve',
      };
      if (finalParent) insertPayload.parent_description = finalParent;
      if (finalWhy) insertPayload.why_it_matters = finalWhy;
      if (finalMaterials.length) insertPayload.materials = finalMaterials;
      if (teacherDescription) insertPayload.description = teacherDescription;
      if (teacherQuickGuide) insertPayload.quick_guide = teacherQuickGuide;
      if (teacherDirectAims.length) insertPayload.direct_aims = teacherDirectAims;
      if (teacherPresentationSteps.length) insertPayload.presentation_steps = teacherPresentationSteps;

      // Insert the custom work pre-seeded with the AI draft's rich fields.
      const { data: newWork, error: insErr } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insErr || !newWork?.id) {
        // Duplicate constraint 23505 — refetch
        if ((insErr as any)?.code === '23505') {
          const { data: existing } = await supabase
            .from('montree_classroom_curriculum_works')
            .select('id, name')
            .eq('classroom_id', classroomId)
            .ilike('name', name.replace(/[%_\\]/g, '\\$&'))
            .limit(1)
            .maybeSingle();
          if (existing?.id) {
            return await delegateToCorrections(request, {
              media_id,
              child_id: childId,
              original_work_name: originalWorkName || name,
              original_work_id: originalWorkId,
              original_area: originalArea,
              corrected_work_name: existing.name || name,
              corrected_work_id: existing.id,
              corrected_area: areaKey,
              correction_type: 'work_mismatch',
            }, startedAt, 'new_custom_race_dedup');
          }
        }
        console.error('[PhotoAuditResolve] new_custom insert failed:', insErr);
        return NextResponse.json({ success: false, error: 'Failed to create work' }, { status: 500 });
      }

      const newWorkId = newWork.id as string;

      // Attach the photo to the new work AND mark teacher_confirmed in one update
      const { error: mediaUpdErr } = await supabase
        .from('montree_media')
        .update({ work_id: newWorkId, teacher_confirmed: true })
        .eq('id', media_id)
        .eq('school_id', auth.schoolId);

      if (mediaUpdErr) {
        console.error('[PhotoAuditResolve] new_custom media update failed:', mediaUpdErr);
        // Rollback the work we just created — don't leave orphan curriculum rows
        await supabase
          .from('montree_classroom_curriculum_works')
          .delete()
          .eq('id', newWorkId)
          .then(({ error }) => {
            if (error) console.error('[PhotoAuditResolve] Rollback failed:', error);
          });
        return NextResponse.json({ success: false, error: 'Failed to attach photo' }, { status: 500 });
      }

      // Fire-and-forget progress observation — new custom work confirmation registers immediately
      upsertProgressObservation({ childId, classroomId, workName: name, area: areaKey })
        .catch(err => console.error('[PhotoAuditResolve] Progress upsert (new_custom) failed (non-fatal):', err));

      // Fire-and-forget Sonnet enrichment (uses cached sonnet_draft.visual_description as seed).
      // When the teacher reviewed + edited the definition on the addMode screen,
      // skipSonnetEnrichment keeps their text — enrichment seeds visual memory
      // and translates, but does NOT re-generate the description.
      enrichCustomWorkInBackground({
        classroomId,
        workId: newWorkId,
        workName: name,
        workKey,
        areaKey,
        mediaId: media_id,
        skipSonnetEnrichment: resolution.reviewed === true,
      }).catch(err => {
        console.error('[PhotoAuditResolve] Background enrichment failed (non-fatal):', err);
      });

      const elapsed = Date.now() - startedAt;
      console.log(`[PhotoAuditResolve] new_custom OK: "${name}" → ${newWorkId} (${elapsed}ms)`);
      return NextResponse.json({
        success: true,
        path: 'new_custom',
        work: { id: newWorkId, name, area_key: areaKey },
      });
    }

    // ========== Path D: other ==========
    //
    // Session 113 carry-over from Session 111. The teacher takes a photo
    // worth keeping but it's NOT a Montessori work — snack time, art,
    // group photo, parent pickup, classroom event. The audit queue is
    // for curriculum decisions; this bucket handles the rest.
    //
    // Implementation: no curriculum row, no progress observation, no
    // visual memory write, no negative example. Just clear work_id, set
    // teacher_confirmed=true, set sonnet_draft.is_other=true as the
    // filter discriminator. Optional note stored on sonnet_draft.other_note.
    //
    // Photo flows naturally into the child gallery (which filters on
    // teacher_confirmed=true). Pedagogical report queries filter on
    // work_id IS NOT NULL and skip these. Weekly Wrap doesn't see them.
    if (resolution.type === 'other') {
      const note = typeof resolution.note === 'string' ? resolution.note.trim().slice(0, 200) : '';
      // Session 117+: optional category. Whitelist-validate against the
      // three accepted values; anything else is silently dropped.
      const ALLOWED_OTHER_CATEGORIES = ['behavioral_observation', 'outdoor_play', 'special_event'];
      const category =
        typeof resolution.category === 'string' && ALLOWED_OTHER_CATEGORIES.includes(resolution.category)
          ? resolution.category
          : null;
      // Preserve any existing sonnet_draft fields the pipeline wrote — we
      // don't want to lose visual_description / proposed_name / etc.
      // Just merge the is_other flag (+ optional note + category) on top.
      const existingDraft = (mediaRow.sonnet_draft as Record<string, unknown>) || {};
      const newDraft = {
        ...existingDraft,
        is_other: true,
        other_note: note || null,
        other_category: category, // 'behavioral_observation' | 'outdoor_play' | 'special_event' | null
        other_classified_at: new Date().toISOString(),
      };

      const { error: otherUpdErr } = await supabase
        .from('montree_media')
        .update({
          work_id: null,
          teacher_confirmed: true,
          identification_status: 'confirmed',
          sonnet_draft: newDraft,
        })
        .eq('id', media_id)
        .eq('school_id', auth.schoolId);

      if (otherUpdErr) {
        console.error('[PhotoAuditResolve] other update failed:', otherUpdErr);
        return NextResponse.json({ success: false, error: 'Failed to save as Other' }, { status: 500 });
      }

      const elapsed = Date.now() - startedAt;
      console.log(`[PhotoAuditResolve] other OK: media=${media_id} (${elapsed}ms)`);
      return NextResponse.json({
        success: true,
        path: 'other',
        media_id,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown resolution type' }, { status: 400 });
  } catch (err) {
    console.error('[PhotoAuditResolve] Unhandled error:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// Delegate to /api/montree/guru/corrections via internal fetch.
// Forwards cookies so verifySchoolRequest() works on the target route.
// ------------------------------------------------------------
async function delegateToCorrections(
  request: NextRequest,
  body: Record<string, unknown>,
  startedAt: number,
  pathLabel: string
): Promise<NextResponse> {
  // In-process invocation — avoids flaky internal HTTP fetches on Railway/serverless.
  // Build a synthetic NextRequest that mirrors the incoming cookies + headers so
  // verifySchoolRequest() works inside the corrections route.
  try {
    const cookie = request.headers.get('cookie') || '';
    const xff = request.headers.get('x-forwarded-for') || '';
    const ua = request.headers.get('user-agent') || '';
    const url = new URL('/api/montree/guru/corrections', request.nextUrl.origin);
    const synthetic = new NextRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie,
        'x-forwarded-for': xff,
        'user-agent': ua,
      },
      body: JSON.stringify(body),
    });
    const res = await correctionsPost(synthetic as any);
    const json: any = await res.json().catch(() => ({}));
    const elapsed = Date.now() - startedAt;
    if (!res.ok || !json?.success) {
      console.error(`[PhotoAuditResolve] ${pathLabel} delegation failed (${elapsed}ms):`, res.status, json);
      return NextResponse.json(
        { success: false, error: json?.error || `Corrections route returned ${res.status}` },
        { status: res.status || 500 }
      );
    }
    console.log(`[PhotoAuditResolve] ${pathLabel} OK (${elapsed}ms)`);
    return NextResponse.json({ success: true, path: pathLabel, corrections: json });
  } catch (err: any) {
    console.error(`[PhotoAuditResolve] ${pathLabel} delegation exception:`, err?.message, err?.stack);
    return NextResponse.json({ success: false, error: `Delegation failed: ${err?.message || 'unknown'}` }, { status: 500 });
  }
}
