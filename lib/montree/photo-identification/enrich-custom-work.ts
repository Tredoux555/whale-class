// @ts-nocheck
// Enrich a freshly-created custom work (from Photo Audit "This is..." Path B)
// with a rich Sonnet-generated description and seed visual memory.
//
// Fire-and-forget — the resolve route does NOT await this. Any failure is
// logged but never thrown. The teacher's photo is already attached and
// teacher_confirmed=true by the time this runs.

import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { getSupabase } from '@/lib/supabase-client';
import { autoTranslateToChinese } from '@/lib/montree/auto-translate';

interface EnrichInput {
  classroomId: string;
  workId: string;
  workName: string;
  workKey: string;
  areaKey: string;
  mediaId: string;
  // When true, the teacher reviewed + edited the work definition on the
  // Photo Audit addMode screen and the resolve route already wrote their
  // text verbatim. Enrichment then seeds visual memory and translates the
  // teacher's text but MUST NOT re-generate the description over it.
  skipSonnetEnrichment?: boolean;
}

/**
 * Seed visual memory + generate rich Sonnet description for a new custom work.
 * Caller MUST NOT await — call with .catch(err => console.error(...)).
 */
export async function enrichCustomWorkInBackground(input: EnrichInput): Promise<void> {
  const { classroomId, workId, workName, areaKey, mediaId, skipSonnetEnrichment } = input;

  try {
    const supabase = getSupabase();

    // 1. Read the cached sonnet_draft from the photo that triggered this.
    //    This gives us a free, rich visual_description without another Haiku call.
    const { data: mediaRow } = await supabase
      .from('montree_media')
      .select('sonnet_draft, storage_path')
      .eq('id', mediaId)
      .maybeSingle();

    const cachedDraft = (mediaRow?.sonnet_draft || {}) as Record<string, unknown>;
    const seedVisual =
      (typeof cachedDraft.visual_description === 'string' && cachedDraft.visual_description) ||
      '';
    const seedMaterials = Array.isArray(cachedDraft.key_materials)
      ? (cachedDraft.key_materials as string[])
      : [];

    // 2. Seed montree_visual_memory immediately so the next photo of this
    //    work gets injected into Pass 2 right away.
    //
    // 🚨 Session 113 V2 photo AI quality audit Q-8 — lowered seed from
    // 0.85 → 0.80. The previous 0.85 value collided with
    // HAIKU_TRUST_CONFIDENCE = 0.85 (Pass 2 trusts a Haiku match when
    // confidence >= 0.85). For custom works specifically, this meant
    // Haiku's typical 0.6-0.85 self-reported confidence on a second
    // photo of the work fell exactly into the haiku_drafted fall-through
    // — every Path B custom work was permanently in the audit queue.
    //
    // 0.80 gives Pass 2 inject-headroom (memory enrichment still applies
    // because is_custom=true is whitelisted regardless of confidence)
    // while letting subsequent teacher corrections lift the canonical
    // confidence toward 1.0 as the moat matures across photos. Future
    // corrections via enrichVisualMemoryFromCorrection use 0.95.
    //
    // The original Q-8 finding from the photo pipeline audit
    // (recommendation #8: lower from 1.0 → 0.85) is preserved: a single
    // archetype shouldn't anchor canonical at 1.0. We're just adjusting
    // the seed value to clear the threshold collision.
    if (seedVisual) {
      await supabase
        .from('montree_visual_memory')
        .upsert(
          {
            classroom_id: classroomId,
            work_name: workName,
            visual_description: seedVisual,
            key_materials: seedMaterials,
            description_confidence: 0.80,
            source: 'teacher_new_work',
            source_media_id: mediaId,
            is_custom: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'classroom_id,work_name' }
        )
        .then(({ error }) => {
          if (error) {
            console.error(
              `[EnrichCustomWork] visual_memory upsert failed for "${workName}":`,
              error.message
            );
          }
        });
    }

    // 2a. Teacher-reviewed work: the resolve route already wrote the
    //     teacher's exact text. Translate whatever is on the row and
    //     return — never call Sonnet, which would overwrite their edits.
    if (skipSonnetEnrichment) {
      const { data: reviewedRow } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('parent_description, why_it_matters')
        .eq('id', workId)
        .maybeSingle();
      if (reviewedRow?.parent_description || reviewedRow?.why_it_matters) {
        // The teacher saved real text — translate it, and never let Sonnet
        // overwrite it.
        autoTranslateToChinese({
          classroomId,
          workName,
          parentDescription: (reviewedRow.parent_description as string) || '',
          whyItMatters: (reviewedRow.why_it_matters as string) || '',
        }).catch((err) =>
          console.error(
            `[EnrichCustomWork] autoTranslate failed for "${workName}":`,
            err?.message || err
          )
        );
        console.log(`[EnrichCustomWork] "${workName}" teacher-reviewed — translate only, no Sonnet`);
        return;
      }
      // Reviewed, but the teacher saved no description text at all (e.g. the
      // photo had no AI draft to pre-fill the fields). There's nothing to
      // protect — fall through so Sonnet writes a description, instead of
      // leaving the curriculum work permanently blank.
      console.log(`[EnrichCustomWork] "${workName}" teacher-reviewed but empty — letting Sonnet enrich`);
    }

    // 2b. Check whether the curriculum work row already has a
    //     parent_description seeded (e.g. by the resolve route copying
    //     the cached sonnet_draft fields into the insert). If so, skip
    //     the expensive Sonnet re-call and jump straight to Chinese
    //     translation of the existing content.
    const { data: existingWorkRow } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('parent_description, why_it_matters, materials')
      .eq('id', workId)
      .maybeSingle();

    if (existingWorkRow?.parent_description && existingWorkRow?.why_it_matters) {
      console.log(`[EnrichCustomWork] "${workName}" already seeded — translating only`);
      autoTranslateToChinese({
        classroomId,
        workName,
        parentDescription: existingWorkRow.parent_description as string,
        whyItMatters: (existingWorkRow.why_it_matters as string) || '',
      }).catch((err) =>
        console.error(
          `[EnrichCustomWork] autoTranslate failed for "${workName}":`,
          err?.message || err
        )
      );
      return;
    }

    // 3. Call Sonnet to generate the rich parent-facing description.
    if (!anthropic) {
      console.warn('[EnrichCustomWork] No Anthropic key — skipping Sonnet enrichment');
      return;
    }

    const prompt = `You are a Montessori curriculum expert. A teacher has just created a new custom work in their classroom.

Work name: "${workName}"
Curriculum area: ${areaKey.replace(/_/g, ' ')}
${seedVisual ? `Observed visual (from a real photo in the classroom):\n${seedVisual}` : ''}
${seedMaterials.length ? `Key materials observed: ${seedMaterials.join(', ')}` : ''}

Write a warm, educational description for parents explaining what this work is and why it matters developmentally. Return ONLY valid JSON with exactly these fields:
{
  "parent_description": "2-3 sentences describing what the child does with this work, warm and concrete",
  "why_it_matters": "2-3 sentences on the developmental purpose — what skill/concept is being built and why it matters at this age",
  "key_materials": ["array", "of", "material names"]
}`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : '';
    const jsonStr = text
      .replace(/^```json?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed: {
      parent_description?: string;
      why_it_matters?: string;
      key_materials?: string[];
    } = {};
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error(
        `[EnrichCustomWork] Sonnet JSON parse failed for "${workName}"`,
        (e as Error).message
      );
      return;
    }

    const parentDescription = (parsed.parent_description || '').trim();
    const whyItMatters = (parsed.why_it_matters || '').trim();
    const keyMaterials = Array.isArray(parsed.key_materials)
      ? parsed.key_materials.filter((m) => typeof m === 'string' && m.trim())
      : seedMaterials;

    if (!parentDescription && !whyItMatters) {
      console.warn(`[EnrichCustomWork] Empty Sonnet output for "${workName}"`);
      return;
    }

    // 4. Update the curriculum work row with the rich description.
    const updatePayload: Record<string, unknown> = {};
    if (parentDescription) updatePayload.parent_description = parentDescription;
    if (whyItMatters) updatePayload.why_it_matters = whyItMatters;
    if (keyMaterials.length) updatePayload.materials = keyMaterials;

    if (Object.keys(updatePayload).length) {
      const { error: updateErr } = await supabase
        .from('montree_classroom_curriculum_works')
        .update(updatePayload)
        .eq('id', workId);

      if (updateErr) {
        console.error(
          `[EnrichCustomWork] curriculum_works update failed for "${workName}":`,
          updateErr.message
        );
      } else {
        console.log(`[EnrichCustomWork] ✓ Enriched "${workName}"`);
      }
    }

    // 5. Fire-and-forget Chinese translation (mirrors add-custom-work pattern).
    if (parentDescription || whyItMatters) {
      autoTranslateToChinese({
        classroomId,
        workName,
        parentDescription,
        whyItMatters,
      }).catch((err) =>
        console.error(
          `[EnrichCustomWork] autoTranslate failed for "${workName}":`,
          err?.message || err
        )
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[EnrichCustomWork] Failed for "${input.workName}":`, msg);
  }
}
