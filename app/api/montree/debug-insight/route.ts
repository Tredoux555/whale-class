// Temporary diagnostic route — DELETE after debugging
// Tests the photo-insight pipeline step by step and reports where it fails

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, AI_ENABLED, AI_MODEL, HAIKU_MODEL } from '@/lib/ai/anthropic';

export async function POST(request: NextRequest) {
  const steps: Array<{ step: string; ok: boolean; detail?: string; ms?: number }> = [];
  const t0 = Date.now();

  try {
    // Step 1: Auth
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) {
      steps.push({ step: 'auth', ok: false, detail: 'Auth failed' });
      return NextResponse.json({ steps });
    }
    steps.push({ step: 'auth', ok: true, detail: `schoolId=${auth.schoolId}` });

    const body = await request.json();
    const { child_id, media_id } = body;
    steps.push({ step: 'parse_body', ok: true, detail: `child=${child_id}, media=${media_id}` });

    // Step 2: Fetch media
    const supabase = getSupabase();
    const { data: media, error: mediaErr } = await supabase
      .from('montree_media')
      .select('storage_path, media_type, child_id')
      .eq('id', media_id)
      .maybeSingle();

    if (mediaErr) {
      steps.push({ step: 'fetch_media', ok: false, detail: `DB error: ${mediaErr.message}` });
      return NextResponse.json({ steps });
    }
    if (!media?.storage_path) {
      steps.push({ step: 'fetch_media', ok: false, detail: 'No media found' });
      return NextResponse.json({ steps });
    }
    steps.push({ step: 'fetch_media', ok: true, detail: `path=${media.storage_path}` });

    // Step 3: Build URL
    const photoUrl = getPublicUrl('montree-media', media.storage_path);
    steps.push({ step: 'build_url', ok: true, detail: photoUrl.substring(0, 80) + '...' });

    // Step 4: Check AI
    steps.push({ step: 'ai_enabled', ok: AI_ENABLED, detail: `AI_ENABLED=${AI_ENABLED}, anthropic=${!!anthropic}` });
    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ steps });
    }

    // Step 5: Test Haiku call (simple, no vision)
    const t1 = Date.now();
    try {
      const testMsg = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say ok' }],
      });
      const text = testMsg.content[0]?.type === 'text' ? testMsg.content[0].text : 'no text';
      steps.push({ step: 'haiku_text_test', ok: true, detail: text, ms: Date.now() - t1 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({ step: 'haiku_text_test', ok: false, detail: msg, ms: Date.now() - t1 });
      return NextResponse.json({ steps });
    }

    // Step 6: Test Haiku vision call with the actual photo
    const t2 = Date.now();
    try {
      const visionMsg = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: photoUrl } },
            { type: 'text', text: 'Describe this photo in 10 words.' },
          ],
        }],
      });
      const text = visionMsg.content[0]?.type === 'text' ? visionMsg.content[0].text : 'no text';
      steps.push({ step: 'haiku_vision_test', ok: true, detail: text, ms: Date.now() - t2 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      steps.push({ step: 'haiku_vision_test', ok: false, detail: msg, ms: Date.now() - t2 });
    }

    // Step 7: Test with tool_use (the actual flow)
    const t3 = Date.now();
    try {
      const toolMsg = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 200,
        system: 'You are a photo analyzer. Use the tag_photo tool.',
        tools: [{
          name: 'tag_photo',
          description: 'Tag a photo',
          input_schema: {
            type: 'object',
            properties: {
              work_name: { type: 'string' },
              confidence: { type: 'number' },
            },
            required: ['work_name', 'confidence'],
          },
        }],
        tool_choice: { type: 'tool', name: 'tag_photo' },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: photoUrl } },
            { type: 'text', text: 'What activity is in this photo?' },
          ],
        }],
      });
      const toolBlock = toolMsg.content.find(b => b.type === 'tool_use');
      if (toolBlock && toolBlock.type === 'tool_use') {
        steps.push({ step: 'haiku_tool_test', ok: true, detail: JSON.stringify(toolBlock.input), ms: Date.now() - t3 });
      } else {
        steps.push({ step: 'haiku_tool_test', ok: false, detail: 'No tool_use block returned', ms: Date.now() - t3 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      steps.push({ step: 'haiku_tool_test', ok: false, detail: msg, ms: Date.now() - t3 });
    }

    steps.push({ step: 'total', ok: true, ms: Date.now() - t0 });
    return NextResponse.json({ steps });

  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    steps.push({ step: 'outer_catch', ok: false, detail: msg, ms: Date.now() - t0 });
    return NextResponse.json({ steps });
  }
}
