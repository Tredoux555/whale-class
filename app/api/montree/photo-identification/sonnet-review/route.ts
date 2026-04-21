// app/api/montree/photo-identification/sonnet-review/route.ts
//
// Teacher-triggered Sonnet enrichment endpoint.
// Called when teacher clicks "Ask Sonnet" button on a haiku_drafted photo card.
//
// Flow:
//   1. Teacher sees a haiku_drafted card in Photo Audit
//   2. Clicks "Ask Sonnet" → this endpoint fires
//   3. Loads Pass 1 visual description from sonnet_draft._source='haiku_pass2'
//   4. Calls generateSonnetDraft() with full context
//   5. Stores result in sonnet_draft (overwrites the partial Haiku draft)
//   6. Updates identification_status → 'sonnet_drafted'
//   7. Returns the draft for UI refresh
//
// No daily cap — teacher controls when Sonnet is called, not background process.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';
import {
  generateSonnetDraft,
} from '@/lib/montree/photo-identification/sonnet-draft';
import {
  loadIdentificationContext,
} from '@/lib/montree/photo-identification/context-loader';

export const maxDuration = 60;

const MEDIA_BUCKET = 'montree-media';

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { media_id?: string; locale?: 'en' | 'zh' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const mediaId = body.media_id;
  const locale: 'en' | 'zh' = body.locale === 'zh' ? 'zh' : 'en';
  if (!mediaId || typeof mediaId !== 'string') {
    return NextResponse.json({ error: 'media_id is required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // ----- Load media row + verify access -----
  const { data: media, error: mediaErr } = await supabase
    .from('montree_media')
    .select('id, school_id, classroom_id, child_id, storage_path, identification_status, identification_confidence, sonnet_draft')
    .eq('id', mediaId)
    .maybeSingle();

  if (mediaErr || !media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }
  if (media.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load child for context (name + age)
  let childName = 'the child';
  let childAge: number | string = 0;
  if (media.child_id) {
    const { data: child } = await supabase
      .from('montree_children')
      .select('name, birthdate')
      .eq('id', media.child_id)
      .maybeSingle();
    if (child) {
      childName = child.name || childName;
      if (child.birthdate) {
        const t = Date.parse(child.birthdate);
        if (!isNaN(t)) {
          childAge = Math.max(0, Math.floor((Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000)));
        }
      }
    }
  }

  // Build photo URL (Anthropic needs a publicly fetchable URL)
  const photoUrl = getPublicUrl(MEDIA_BUCKET, media.storage_path);

  // Load curriculum + identification context
  const curriculum = loadAllCurriculumWorks();
  const context = await loadIdentificationContext(supabase, { classroomId: media.classroom_id });

  // Extract Pass 1 visual description from the partial Haiku draft (stored by process route)
  const existingDraft = media.sonnet_draft as Record<string, unknown> | null;
  const pass1Description = typeof existingDraft?.visual_description === 'string'
    ? existingDraft.visual_description
    : '';

  // Extract Haiku's guess for context (Sonnet can agree or disagree)
  const haikuGuess = existingDraft?.proposed_name
    ? {
        workName: existingDraft.proposed_name as string,
        confidence: typeof existingDraft.confidence === 'number' ? existingDraft.confidence : 0.5,
      }
    : null;

  try {
    console.log(`[SonnetReview] Teacher-triggered Sonnet for media=${mediaId}, child=${childName}, classroom=${media.classroom_id}`);

    const sonnetResult = await generateSonnetDraft({
      photoUrl,
      childName,
      childAge,
      curriculum,
      pass1Description,
      haikuGuess,
      context,
      locale,
    });

    if (!sonnetResult.success || !sonnetResult.draft) {
      console.error('[SonnetReview] Sonnet generation failed:', sonnetResult.errors);
      return NextResponse.json({
        success: false,
        errors: sonnetResult.errors,
      }, { status: 500 });
    }

    // Update the media row — overwrite the partial Haiku draft with full Sonnet draft
    const { error: updateErr } = await supabase
      .from('montree_media')
      .update({
        sonnet_draft: sonnetResult.draft,
        identification_status: 'sonnet_drafted',
      })
      .eq('id', mediaId);

    if (updateErr) {
      console.error('[SonnetReview] Failed to update sonnet_draft:', updateErr);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }

    console.log(
      `[SonnetReview] Complete: proposed="${sonnetResult.draft.proposed_name}" confidence=${sonnetResult.draft.confidence}`
    );

    return NextResponse.json({
      success: true,
      media_id: mediaId,
      draft: sonnetResult.draft,
    });
  } catch (ex) {
    console.error('[SonnetReview] Exception:', ex);
    return NextResponse.json({
      success: false,
      errors: [`Sonnet review failed: ${ex instanceof Error ? ex.message : String(ex)}`],
    }, { status: 500 });
  }
}
