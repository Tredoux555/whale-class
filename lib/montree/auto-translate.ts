// Auto-translate parent_description and why_it_matters into Chinese
// using Haiku. Fire-and-forget — never blocks the main request.

import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { getSupabase } from '@/lib/supabase-client';
import { MONTESSORI_GLOSSARY_ZH } from '@/lib/montree/classifier/montessori-glossary-zh';
import { logApiUsage } from '@/lib/montree/api-usage';

interface TranslateInput {
  classroomId: string;
  workName: string;
  parentDescription: string;
  whyItMatters: string;
}

/**
 * Translate parent_description and why_it_matters into Chinese,
 * then store in montree_classroom_curriculum_works._zh columns.
 *
 * Runs as fire-and-forget — caller should NOT await this.
 * Uses Haiku for speed and cost (~$0.001 per translation).
 */
export async function autoTranslateToChinese(input: TranslateInput): Promise<void> {
  if (!anthropic) {
    console.warn('[AutoTranslate] No Anthropic API key, skipping');
    return;
  }
  if (!input.parentDescription && !input.whyItMatters) return;

  try {
    // Try glossary for the work name first (free, no API call needed)
    let nameZh: string | null = MONTESSORI_GLOSSARY_ZH[input.workName] || null;
    if (!nameZh) {
      // Try base name (strip "- suffix")
      const base = input.workName.replace(/\s*-\s*.+$/, '').trim();
      nameZh = MONTESSORI_GLOSSARY_ZH[base] || null;
    }

    // Use tool_use for structured output — the API handles JSON serialization,
    // so Haiku never produces raw JSON. This eliminates Chinese JSON corruption
    // (unescaped quotes, fullwidth punctuation, literal newlines in strings).
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: '你是一位专业的蒙台梭利教育翻译。将英文翻译为简体中文，保持温暖、专业的语气，适合家长阅读。翻译必须自然流畅，不是机械翻译。用"您的孩子"而不是"你的孩子"。',
      messages: [
        {
          role: 'user',
          content: `Translate the following Montessori work name and descriptions into Simplified Chinese. Call the submit_translation tool with the three translated fields. Every field must be in Simplified Chinese.

Work name (English): ${input.workName}
${nameZh ? `Known Chinese name: ${nameZh} (use this exactly for name_zh)` : ''}

parent_description (English):
${input.parentDescription || '(none)'}

why_it_matters (English):
${input.whyItMatters || '(none)'}`,
        },
      ],
      tools: [{
        name: 'submit_translation',
        description: 'Submit the three Simplified-Chinese translations.',
        input_schema: {
          type: 'object' as const,
          properties: {
            name_zh: {
              type: 'string',
              description: 'Short Chinese name for the Montessori work (2-6 characters preferred). Empty string if the work name itself should not be translated.',
            },
            parent_description_zh: {
              type: 'string',
              description: 'Chinese translation of parent_description. Empty string if the input was (none).',
            },
            why_it_matters_zh: {
              type: 'string',
              description: 'Chinese translation of why_it_matters. Empty string if the input was (none).',
            },
          },
          required: ['name_zh', 'parent_description_zh', 'why_it_matters_zh'],
        },
      }],
      tool_choice: { type: 'tool' as const, name: 'submit_translation' },
    });

    // Log API usage (fire-and-forget, no schoolId available in library function)
    if (response.usage) {
      logApiUsage({
        schoolId: input.classroomId.substring(0, 8), // Use classroom ID prefix as fallback
        classroomId: input.classroomId,
        endpoint: '/lib/montree/auto-translate',
        model: HAIKU_MODEL,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }).catch(err => console.error('[AutoTranslate] Failed to log usage:', err));
    }

    // Extract the structured data from the tool_use response block
    const toolBlock = response.content.find(
      (block): block is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
        block.type === 'tool_use' && block.name === 'submit_translation'
    );

    if (!toolBlock?.input) {
      console.warn(`[AutoTranslate] No tool_use block for "${input.workName}"`);
      return;
    }

    const parsed = toolBlock.input as { name_zh?: string; parent_description_zh?: string; why_it_matters_zh?: string };
    const finalNameZh = nameZh || (parsed.name_zh && parsed.name_zh.trim() ? parsed.name_zh.trim() : null);
    const parentDescZh = parsed.parent_description_zh && parsed.parent_description_zh.trim() ? parsed.parent_description_zh.trim() : null;
    const whyItMattersZh = parsed.why_it_matters_zh && parsed.why_it_matters_zh.trim() ? parsed.why_it_matters_zh.trim() : null;

    if (!finalNameZh && !parentDescZh && !whyItMattersZh) {
      console.warn(`[AutoTranslate] Empty translation for "${input.workName}"`);
      return;
    }

    // Save to montree_classroom_curriculum_works
    const supabase = getSupabase();
    const updateData: Record<string, string> = {};
    if (finalNameZh) {
      updateData.name_zh = finalNameZh;
      updateData.name_chinese = finalNameZh; // Keep both columns in sync
    }
    if (parentDescZh) updateData.parent_description_zh = parentDescZh;
    if (whyItMattersZh) updateData.why_it_matters_zh = whyItMattersZh;

    const { error } = await supabase
      .from('montree_classroom_curriculum_works')
      .update(updateData)
      .eq('classroom_id', input.classroomId)
      .ilike('name', input.workName.replace(/[%_\\]/g, '\\$&'));

    if (error) {
      console.error(`[AutoTranslate] DB update failed for "${input.workName}":`, error.message);
    } else {
      console.log(`[AutoTranslate] ✓ Chinese translation saved for "${input.workName}" → ${finalNameZh || '(name skipped)'}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AutoTranslate] Failed for "${input.workName}":`, msg);
  }
}
