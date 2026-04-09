// @ts-nocheck
// POST /api/montree/photo-audit/tell-ai
//
// "Tell the AI what it is" — teacher provides freeform context about a photo
// (e.g. "this isn't the hundred board, it's a phonics review game I'm playing
// to review letter recognition") and Sonnet re-examines the image WITH that
// context to produce a proposal for a new custom curriculum work.
//
// This route only PROPOSES. It writes the proposal into montree_media.sonnet_draft
// so the existing /api/montree/photo-audit/resolve `new_custom` path can save
// it — that path already seeds parent_description / why_it_matters / key_materials
// from sonnet_draft, and fires enrichCustomWorkInBackground().
//
// Flow from the client:
//   1. POST /tell-ai {media_id, teacher_context} → returns proposal
//   2. Teacher reviews the proposal in the sheet
//   3. POST /resolve {media_id, resolution: {type: 'new_custom', name, area_key}}

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';

const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'No school' }, { status: 403 });
    }

    const supabase = getSupabase();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rate = await checkRateLimit(supabase, ip, '/api/montree/photo-audit/tell-ai', 30, 60);
    if (!rate.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { media_id, teacher_context } = body as {
      media_id: string;
      teacher_context: string;
    };

    if (!media_id || typeof media_id !== 'string') {
      return NextResponse.json({ success: false, error: 'media_id required' }, { status: 400 });
    }
    const ctx = (teacher_context || '').trim();
    if (!ctx || ctx.length < 5 || ctx.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'teacher_context must be 5-1000 characters' },
        { status: 400 }
      );
    }

    // Look up the media row — we need the photo URL and classroom_id
    const { data: mediaRow, error: mediaErr } = await supabase
      .from('montree_media')
      .select('id, school_id, classroom_id, storage_path, sonnet_draft')
      .eq('id', media_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (mediaErr || !mediaRow) {
      return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });
    }
    if (!mediaRow.storage_path) {
      return NextResponse.json({ success: false, error: 'Media has no photo' }, { status: 400 });
    }

    if (!anthropic) {
      return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 503 });
    }

    const photoUrl = getPublicUrl('montree-media', mediaRow.storage_path as string);

    const systemPrompt = `You are a Montessori curriculum expert helping a teacher document a new custom work. The teacher is telling you what a photo actually shows because our automatic identification got it wrong or it's a novel activity. Trust the teacher's context completely — they know their classroom. Your job is to look at the photo THROUGH the lens of their context and produce a clean curriculum entry.`;

    const userPrompt = `The teacher says about this photo:
"""
${ctx}
"""

Examine the photo with this context in mind. Produce a curriculum entry for this work. Return ONLY valid JSON with exactly these fields:
{
  "proposed_name": "short clear work name (2-6 words, Title Case) — prefer the teacher's own wording if they named it",
  "suggested_area": "one of: practical_life | sensorial | mathematics | language | cultural",
  "visual_description": "2-3 sentences describing what is visible in the photo (materials, child's hands, setup) — used by the AI later to recognize this work again",
  "parent_description": "2-3 warm, concrete sentences for parents describing what the child does with this work",
  "why_it_matters": "2-3 sentences on the developmental purpose — what skill or concept is being built and why it matters at this age",
  "key_materials": ["array", "of", "material", "names"]
}`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: photoUrl } },
            { type: 'text', text: userPrompt },
          ],
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const jsonStr = text
      .replace(/^```json?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed: any = {};
    try {
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      parsed = JSON.parse(start >= 0 && end > start ? jsonStr.slice(start, end + 1) : jsonStr);
    } catch (e) {
      console.error('[TellAI] JSON parse failed:', (e as Error).message, 'raw:', text.slice(0, 300));
      return NextResponse.json(
        { success: false, error: 'AI returned unparseable output — please try rewording your description' },
        { status: 502 }
      );
    }

    const proposed_name = String(parsed.proposed_name || '').trim().slice(0, 80);
    let suggested_area = String(parsed.suggested_area || '').trim().toLowerCase();
    if (!VALID_AREAS.includes(suggested_area)) suggested_area = 'practical_life';
    const visual_description = String(parsed.visual_description || '').trim().slice(0, 1000);
    const parent_description = String(parsed.parent_description || '').trim().slice(0, 1000);
    const why_it_matters = String(parsed.why_it_matters || '').trim().slice(0, 1000);
    const key_materials = Array.isArray(parsed.key_materials)
      ? parsed.key_materials.filter((m: any) => typeof m === 'string' && m.trim()).slice(0, 20)
      : [];

    if (!proposed_name || !parent_description) {
      return NextResponse.json(
        { success: false, error: 'AI returned incomplete proposal — please try again' },
        { status: 502 }
      );
    }

    // Overwrite sonnet_draft on the media row so the existing /resolve new_custom
    // path picks up these fresh fields when the teacher hits Save.
    const newDraft = {
      ...(mediaRow.sonnet_draft as Record<string, any> || {}),
      proposed_name,
      suggested_area,
      visual_description,
      parent_description,
      why_it_matters,
      key_materials,
      confidence: 1.0,
      source: 'tell_ai',
      teacher_context: ctx,
      closest_existing_match: null, // teacher is explicitly overriding any prior match
      generated_at: new Date().toISOString(),
    };

    const { error: updErr } = await supabase
      .from('montree_media')
      .update({ sonnet_draft: newDraft, identification_status: 'sonnet_drafted' })
      .eq('id', media_id)
      .eq('school_id', auth.schoolId);

    if (updErr) {
      console.error('[TellAI] draft update failed:', updErr);
      return NextResponse.json({ success: false, error: 'Failed to save draft' }, { status: 500 });
    }

    console.log(`[TellAI] Proposal for ${media_id}: "${proposed_name}" (${suggested_area})`);

    return NextResponse.json({
      success: true,
      proposal: {
        proposed_name,
        suggested_area,
        visual_description,
        parent_description,
        why_it_matters,
        key_materials,
      },
    });
  } catch (err: any) {
    console.error('[TellAI] Unhandled error:', err?.message, err?.stack);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
