// Auto-translate work names and descriptions into any target locale
// using Haiku. Fire-and-forget — never blocks the main request.
//
// Generalized from the original Chinese-only function to support N languages.
// Uses LOCALE_AI_CONFIG for locale-specific system prompts and directives.

import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { getSupabase } from '@/lib/supabase-client';
import { MONTESSORI_GLOSSARY_ZH } from '@/lib/montree/classifier/montessori-glossary-zh';
import { logApiUsage } from '@/lib/montree/api-usage';
import { LOCALE_AI_CONFIG, getLanguageName } from '@/lib/montree/i18n/locale-config';
import type { Locale } from '@/lib/montree/i18n/locales';

export interface TranslateInput {
  classroomId: string;
  workName: string;
  parentDescription: string;
  whyItMatters: string;
}

// ---------------------------------------------------------------------------
// Locale-specific glossaries — Chinese has one, others added as needed
// ---------------------------------------------------------------------------

const GLOSSARIES: Partial<Record<Locale, Record<string, string>>> = {
  zh: MONTESSORI_GLOSSARY_ZH,
  // es: MONTESSORI_GLOSSARY_ES,  // Add when available
};

function lookupGlossary(workName: string, locale: Locale): string | null {
  const glossary = GLOSSARIES[locale];
  if (!glossary) return null;
  const direct = glossary[workName];
  if (direct) return direct;
  // Try base name (strip "- suffix")
  const base = workName.replace(/\s*-\s*.+$/, '').trim();
  return glossary[base] || null;
}

// ---------------------------------------------------------------------------
// System prompts per locale (keyed by locale, English is source — never a target)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPTS: Record<string, string> = {
  zh: '你是一位专业的蒙台梭利教育翻译。将英文翻译为简体中文，保持温暖、专业的语气，适合家长阅读。翻译必须自然流畅，不是机械翻译。用"您的孩子"而不是"你的孩子"。',
  es: 'Eres un traductor profesional de educación Montessori. Traduce del inglés al español, manteniendo un tono cálido y profesional, adecuado para que lo lean los padres. La traducción debe ser natural y fluida, no mecánica. Usa "su hijo/a" para "your child".',
};

function getSystemPrompt(locale: Locale): string {
  return SYSTEM_PROMPTS[locale] ||
    `You are a professional Montessori education translator. Translate from English into ${getLanguageName(locale)}. Keep a warm, professional tone suitable for parents. The translation must be natural and fluent, not mechanical.`;
}

// ---------------------------------------------------------------------------
// DB column mapping — Chinese has dual-column legacy, others use _{locale}
// ---------------------------------------------------------------------------

interface ColumnMap {
  name: string[];           // columns to write the translated work name
  parentDescription: string; // column for parent_description translation
  whyItMatters: string;      // column for why_it_matters translation
}

function getColumns(locale: Locale): ColumnMap {
  if (locale === 'zh') {
    // Legacy dual-column: both name_zh AND name_chinese (Session 14 rule)
    return {
      name: ['name_zh', 'name_chinese'],
      parentDescription: 'parent_description_zh',
      whyItMatters: 'why_it_matters_zh',
    };
  }
  // All other locales: single _{locale} column pattern
  return {
    name: [`name_${locale}`],
    parentDescription: `parent_description_${locale}`,
    whyItMatters: `why_it_matters_${locale}`,
  };
}

// ---------------------------------------------------------------------------
// Generalized translate function — works for any target locale
// ---------------------------------------------------------------------------

/**
 * Translate a Montessori work's name and descriptions into any target locale.
 * Runs as fire-and-forget — caller should NOT await this.
 * Uses Haiku for speed and cost (~$0.001 per translation).
 *
 * For 'zh': checks MONTESSORI_GLOSSARY_ZH first (free), writes both
 *           name_zh + name_chinese (dual-column legacy).
 * For other locales: goes straight to Haiku, writes name_{locale} column.
 */
export async function autoTranslateWork(input: TranslateInput, targetLocale: Locale): Promise<void> {
  // English is the source language — never translate TO English
  if (targetLocale === 'en') return;

  if (!anthropic) {
    console.warn('[AutoTranslate] No Anthropic API key, skipping');
    return;
  }
  if (!input.parentDescription && !input.whyItMatters) return;

  const langName = getLanguageName(targetLocale);
  const config = LOCALE_AI_CONFIG[targetLocale];
  const shortDirective = config?.aiShortDirective || `in ${langName}`;

  try {
    // Try glossary for the work name first (free, no API call needed)
    const glossaryName = lookupGlossary(input.workName, targetLocale);

    // Use tool_use for structured output — the API handles JSON serialization,
    // so Haiku never produces raw JSON. Eliminates corruption from non-Latin scripts.
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: getSystemPrompt(targetLocale),
      messages: [
        {
          role: 'user',
          content: `Translate the following Montessori work name and descriptions into ${langName}. Call the submit_translation tool with the three translated fields. Every field must be ${shortDirective}.

Work name (English): ${input.workName}
${glossaryName ? `Known ${langName} name: ${glossaryName} (use this exactly for translated_name)` : ''}

parent_description (English):
${input.parentDescription || '(none)'}

why_it_matters (English):
${input.whyItMatters || '(none)'}`,
        },
      ],
      tools: [{
        name: 'submit_translation',
        description: `Submit the three ${langName} translations.`,
        input_schema: {
          type: 'object' as const,
          properties: {
            translated_name: {
              type: 'string',
              description: `Short ${langName} name for the Montessori work. Empty string if the work name should not be translated.`,
            },
            translated_parent_description: {
              type: 'string',
              description: `${langName} translation of parent_description. Empty string if the input was (none).`,
            },
            translated_why_it_matters: {
              type: 'string',
              description: `${langName} translation of why_it_matters. Empty string if the input was (none).`,
            },
          },
          required: ['translated_name', 'translated_parent_description', 'translated_why_it_matters'],
        },
      }],
      tool_choice: { type: 'tool' as const, name: 'submit_translation' },
    });

    // Log API usage
    if (response.usage) {
      logApiUsage({
        schoolId: input.classroomId.substring(0, 8),
        classroomId: input.classroomId,
        endpoint: `/lib/montree/auto-translate/${targetLocale}`,
        model: HAIKU_MODEL,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }).catch(err => console.error('[AutoTranslate] Failed to log usage:', err));
    }

    // Extract structured data from tool_use response
    const toolBlock = response.content.find(
      (block): block is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
        block.type === 'tool_use' && block.name === 'submit_translation'
    );

    if (!toolBlock?.input) {
      console.warn(`[AutoTranslate] No tool_use block for "${input.workName}" → ${targetLocale}`);
      return;
    }

    const parsed = toolBlock.input as {
      translated_name?: string;
      translated_parent_description?: string;
      translated_why_it_matters?: string;
    };

    const finalName = glossaryName || (parsed.translated_name?.trim() || null);
    const parentDesc = parsed.translated_parent_description?.trim() || null;
    const whyItMatters = parsed.translated_why_it_matters?.trim() || null;

    if (!finalName && !parentDesc && !whyItMatters) {
      console.warn(`[AutoTranslate] Empty translation for "${input.workName}" → ${targetLocale}`);
      return;
    }

    // Save to montree_classroom_curriculum_works using locale-specific columns
    const cols = getColumns(targetLocale);
    const supabase = getSupabase();
    const updateData: Record<string, string> = {};

    if (finalName) {
      for (const col of cols.name) {
        updateData[col] = finalName;
      }
    }
    if (parentDesc) updateData[cols.parentDescription] = parentDesc;
    if (whyItMatters) updateData[cols.whyItMatters] = whyItMatters;

    const { error } = await supabase
      .from('montree_classroom_curriculum_works')
      .update(updateData)
      .eq('classroom_id', input.classroomId)
      .ilike('name', input.workName.replace(/[%_\\]/g, '\\$&'));

    if (error) {
      console.error(`[AutoTranslate] DB update failed for "${input.workName}" → ${targetLocale}:`, error.message);
    } else {
      console.log(`[AutoTranslate] ✓ ${targetLocale} translation saved for "${input.workName}" → ${finalName || '(name skipped)'}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AutoTranslate] Failed for "${input.workName}" → ${targetLocale}:`, msg);
  }
}

// ---------------------------------------------------------------------------
// Backward-compatible wrapper — existing callers don't need to change
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `autoTranslateWork(input, 'zh')` instead.
 * Kept for backward compatibility with 5 existing callers.
 */
export async function autoTranslateToChinese(input: TranslateInput): Promise<void> {
  return autoTranslateWork(input, 'zh');
}
