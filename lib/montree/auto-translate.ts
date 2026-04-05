// Auto-translate parent_description and why_it_matters into Chinese
// using Haiku. Fire-and-forget — never blocks the main request.

import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { getSupabase } from '@/lib/supabase-client';

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
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: '你是一位专业的蒙台梭利教育翻译。将英文翻译为简体中文，保持温暖、专业的语气，适合家长阅读。翻译必须自然流畅，不是机械翻译。用"您的孩子"而不是"你的孩子"。',
      messages: [
        {
          role: 'user',
          content: `Translate the following Montessori work descriptions into Chinese (Simplified). Return ONLY valid JSON with exactly two fields: "parent_description_zh" and "why_it_matters_zh". Do not include any other text.

parent_description (English):
${input.parentDescription || '(none)'}

why_it_matters (English):
${input.whyItMatters || '(none)'}

Return JSON:`,
        },
      ],
    });

    // Parse the response
    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    // Extract JSON — handle cases where Haiku wraps in markdown code blocks
    const jsonStr = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(jsonStr);

    const parentDescZh = parsed.parent_description_zh || null;
    const whyItMattersZh = parsed.why_it_matters_zh || null;

    if (!parentDescZh && !whyItMattersZh) {
      console.warn(`[AutoTranslate] Empty translation for "${input.workName}"`);
      return;
    }

    // Save to montree_classroom_curriculum_works
    const supabase = getSupabase();
    const updateData: Record<string, string> = {};
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
      console.log(`[AutoTranslate] ✓ Chinese translation saved for "${input.workName}"`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AutoTranslate] Failed for "${input.workName}":`, msg);
  }
}
