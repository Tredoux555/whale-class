// POST /api/montree/curriculum/batch-translate
// Batch-translates all works missing name_zh in a classroom.
// Uses Haiku for speed/cost. Processes in batches of 5 with delays.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { MONTESSORI_GLOSSARY_ZH } from '@/lib/montree/classifier/montessori-glossary-zh';

export const maxDuration = 300; // 5 min — batch job

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const classroomId = body.classroom_id || auth.classroomId;
    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Load all works for this classroom
    const { data: works, error: worksErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, name_zh, parent_description, why_it_matters, parent_description_zh, why_it_matters_zh')
      .eq('classroom_id', classroomId)
      .order('name');

    if (worksErr) {
      return NextResponse.json({ error: worksErr.message }, { status: 500 });
    }

    if (!works || works.length === 0) {
      return NextResponse.json({ message: 'No works found', translated: 0 });
    }

    // Filter to works missing name_zh
    const needsTranslation = works.filter((w: Record<string, unknown>) => !w.name_zh);
    const alreadyDone = works.length - needsTranslation.length;

    if (needsTranslation.length === 0) {
      return NextResponse.json({ message: 'All works already have name_zh', total: works.length, alreadyDone });
    }

    // Process in batches of 5
    const BATCH_SIZE = 5;
    const results: Array<{ name: string; name_zh: string | null; status: string }> = [];
    let translated = 0;
    let failed = 0;

    for (let i = 0; i < needsTranslation.length; i += BATCH_SIZE) {
      const batch = needsTranslation.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (work: Record<string, unknown>) => {
        const workName = String(work.name);
        try {
          // 1. Check glossary first (free)
          let nameZh: string | null = MONTESSORI_GLOSSARY_ZH[workName] || null;
          if (!nameZh) {
            const base = workName.replace(/\s*-\s*.+$/, '').trim();
            nameZh = MONTESSORI_GLOSSARY_ZH[base] || null;
          }

          // 2. If not in glossary, use Haiku
          if (!nameZh) {
            if (!anthropic) {
              return { name: workName, name_zh: null, status: 'no_api_key' };
            }

            // Use tool_use for structured output — the API handles JSON
            // serialization, so Haiku never produces raw JSON. Eliminates
            // Chinese JSON corruption (unescaped quotes, fullwidth punctuation).
            const resp = await anthropic.messages.create({
              model: HAIKU_MODEL,
              max_tokens: 512,
              system: '你是蒙台梭利教育翻译专家。翻译工作名称为简体中文，保持简洁准确。参考以下术语：\n' +
                Object.entries(MONTESSORI_GLOSSARY_ZH).slice(0, 80).map(([e, c]) => `${e}=${c}`).join(', '),
              messages: [{
                role: 'user',
                content: `Translate this Montessori work into Simplified Chinese. Call submit_translation with three Chinese fields. Keep name_zh short (2-6 Chinese characters preferred).

Work name: ${workName}
${work.parent_description ? `Description: ${String(work.parent_description).slice(0, 200)}` : ''}
${work.why_it_matters ? `Why it matters: ${String(work.why_it_matters).slice(0, 200)}` : ''}`,
              }],
              tools: [{
                name: 'submit_translation',
                description: 'Submit the three Simplified-Chinese translations.',
                input_schema: {
                  type: 'object' as const,
                  properties: {
                    name_zh: {
                      type: 'string',
                      description: 'Short Chinese name for the Montessori work (2-6 characters preferred).',
                    },
                    parent_description_zh: {
                      type: 'string',
                      description: 'Chinese translation of parent_description. Empty string if no input description.',
                    },
                    why_it_matters_zh: {
                      type: 'string',
                      description: 'Chinese translation of why_it_matters. Empty string if no input.',
                    },
                  },
                  required: ['name_zh', 'parent_description_zh', 'why_it_matters_zh'],
                },
              }],
              tool_choice: { type: 'tool' as const, name: 'submit_translation' },
            });

            const toolBlock = resp.content.find(
              (block): block is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
                block.type === 'tool_use' && block.name === 'submit_translation'
            );

            if (!toolBlock?.input) {
              return { name: workName, name_zh: null, status: 'no_tool_use' };
            }

            const parsed = toolBlock.input as { name_zh?: string; parent_description_zh?: string; why_it_matters_zh?: string };
            nameZh = parsed.name_zh && parsed.name_zh.trim() ? parsed.name_zh.trim() : null;

            // Also update descriptions if they were translated and currently missing
            const updateData: Record<string, string> = {};
            if (nameZh) {
              updateData.name_zh = nameZh;
              updateData.name_chinese = nameZh; // Keep both columns in sync
            }
            if (parsed.parent_description_zh && !work.parent_description_zh) {
              updateData.parent_description_zh = parsed.parent_description_zh;
            }
            if (parsed.why_it_matters_zh && !work.why_it_matters_zh) {
              updateData.why_it_matters_zh = parsed.why_it_matters_zh;
            }

            if (Object.keys(updateData).length > 0) {
              await supabase
                .from('montree_classroom_curriculum_works')
                .update(updateData as Record<string, unknown>)
                .eq('id', work.id as string);
            }

            return { name: workName, name_zh: nameZh, status: 'haiku' };
          }

          // 3. Glossary match — just save the name
          const updateData: Record<string, string> = { name_zh: nameZh, name_chinese: nameZh };
          await supabase
            .from('montree_classroom_curriculum_works')
            .update(updateData as Record<string, unknown>)
            .eq('id', work.id as string);

          return { name: workName, name_zh: nameZh, status: 'glossary' };
        } catch (err) {
          console.error(`[BatchTranslate] Failed for "${workName}":`, err instanceof Error ? err.message : err);
          return { name: workName, name_zh: null, status: 'error' };
        }
      });

      const batchResults = await Promise.all(promises);
      for (const r of batchResults) {
        results.push(r);
        if (r.name_zh) translated++;
        else failed++;
      }

      // Brief delay between batches to avoid rate limits
      if (i + BATCH_SIZE < needsTranslation.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[BatchTranslate] Done: ${translated} translated, ${failed} failed, ${alreadyDone} already had name_zh`);

    return NextResponse.json({
      total: works.length,
      alreadyDone,
      translated,
      failed,
      results,
    });
  } catch (err) {
    console.error('[BatchTranslate] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
