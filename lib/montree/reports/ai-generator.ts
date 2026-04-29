// lib/montree/reports/ai-generator.ts
// AI-powered content generation for Weekly Reports
// Phase 5 - Session 56 (Audited)
// 
// Uses Claude API to transform raw activity data into
// warm, observational Montessori parent reports

import Anthropic from '@anthropic-ai/sdk';
import type {
  ReportContent,
  ReportHighlight,
  CurriculumArea
} from './types';
import { getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

// ============================================
// TYPES
// ============================================

export interface WorkTranslation {
  work_id: string;
  display_name: string;
  area: CurriculumArea;
  developmental_context: string;
  home_extension: string | null;
  photo_caption_template: string | null;
}

export interface EnhanceInput {
  report: ReportContent;
  child: {
    name: string;
    gender: 'he' | 'she' | 'they';
  };
  week_start: string;
  week_end: string;
  translations: Record<string, WorkTranslation>;
  locale?: string;
  /**
   * Optional model override. When the caller has resolved the school's AI tier
   * (Free/Core/Premium), pass `aiTier.model` here so Core schools use Haiku
   * instead of Sonnet. If omitted, falls back to AI_MODEL (Sonnet) for
   * backward compatibility.
   */
  model?: string;
}

export interface EnhanceResult {
  success: boolean;
  content?: ReportContent;
  error?: string;
  timing_ms?: number;
  warnings?: string[];
}

interface AIOutputStructure {
  summary: string;
  highlights: {
    media_id: string;
    observation: string;
    developmental_note: string;
    home_extension: string | null;
  }[];
  parent_message: string;
  milestones: string[];
}

interface ParseResult {
  success: boolean;
  data?: AIOutputStructure;
  error?: string;
}

// ============================================
// CONSTANTS
// ============================================

// Use claude-sonnet-4-5 for best quality/speed balance
const AI_MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 3000;
const API_TIMEOUT_MS = 30000; // 30 second timeout

// ============================================
// MAIN ENHANCE FUNCTION
// ============================================

export async function enhanceReportWithAI(input: EnhanceInput): Promise<EnhanceResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  
  // Validate API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'ANTHROPIC_API_KEY not configured. Please add it to your environment variables.',
    };
  }

  // Validate input
  if (!input.report || !input.child?.name) {
    return {
      success: false,
      error: 'Invalid input: report and child name are required.',
    };
  }

  // Handle empty highlights gracefully
  if (!input.report.highlights || input.report.highlights.length === 0) {
    return generateSummaryOnlyReport(input);
  }

  try {
    const anthropic = new Anthropic({
      apiKey,
      timeout: API_TIMEOUT_MS,
    });

    // Build prompts
    const systemPrompt = buildSystemPrompt(input.locale);
    const userPrompt = buildUserPrompt(input);

    // Call Claude API. Model is tier-aware when the caller passes one in.
    const effectiveModel = input.model || AI_MODEL;
    const response = await anthropic.messages.create({
      model: effectiveModel,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse AI response
    const parseResult = parseAIResponse(textContent.text, input.child.name);
    
    if (!parseResult.success || !parseResult.data) {
      // If parse failed, return error instead of silent fallback
      return {
        success: false,
        error: parseResult.error || 'Failed to parse AI response. Please try again.',
        timing_ms: Date.now() - startTime,
      };
    }

    // Check if AI returned fewer highlights than expected
    if (parseResult.data.highlights.length < input.report.highlights.length) {
      warnings.push(`AI enhanced ${parseResult.data.highlights.length} of ${input.report.highlights.length} activities`);
    }

    // Merge AI content with existing report. Pass through the effective model
    // so the report's `ai_model` metadata reflects the actual model used.
    const enhancedContent = mergeWithOriginal(input.report, parseResult.data, effectiveModel);

    const timing = Date.now() - startTime;

    return {
      success: true,
      content: enhancedContent,
      timing_ms: timing,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

  } catch (error) {
    console.error('AI enhancement error:', error);
    
    // Handle specific error types
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return { success: false, error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.' };
      }
      if (error.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please wait a moment and try again.' };
      }
      if (error.status === 500 || error.status === 502 || error.status === 503) {
        return { success: false, error: 'AI service temporarily unavailable. Please try again in a few moments.' };
      }
      if (error.status === 408 || error.message?.includes('timeout')) {
        return { success: false, error: 'AI request timed out. Please try again.' };
      }
      return { success: false, error: `API error: ${error.message}` };
    }

    // Handle timeout errors
    if (error instanceof Error && error.message?.includes('timeout')) {
      return { success: false, error: 'AI request timed out. Please try again.' };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during AI enhancement',
    };
  }
}

// ============================================
// PROMPT BUILDERS
// ============================================

function buildSystemPrompt(locale?: string): string {
  const langInstruction = getAILanguageInstruction(locale || 'en');
  const isNonEnglish = locale && locale !== 'en';

  // Locale-keyed JSON schema descriptions
  const schemaDescriptions: Record<string, { summary: string; observation: string; developmental_note: string; home_extension: string; parent_message: string; milestones: string }> = {
    zh: { summary: '2-3句温馨的本周概述', observation: '用温暖的观察性语言描述孩子做了什么', developmental_note: '这在发展方面为什么重要', home_extension: '家长可以在家尝试的简单活动', parent_message: '温暖的致谢家长的结束语', milestones: '本周观察到的显著里程碑' },
    es: { summary: 'Un resumen cálido de 2-3 oraciones de la semana del niño', observation: 'Lo que hizo el niño, en un lenguaje observacional cálido', developmental_note: 'Por qué esto importa en el desarrollo', home_extension: 'Una actividad sencilla que los padres pueden probar en casa', parent_message: 'Un mensaje cálido de cierre agradeciendo a los padres', milestones: 'Hitos notables observados esta semana' },
  };
  const defaultDesc = { summary: "A 2-3 sentence warm overview of the child's week", observation: 'What the child did, in warm observational language', developmental_note: 'Why this matters developmentally', home_extension: 'A simple activity parents can try at home', parent_message: 'A warm closing message thanking parents', milestones: 'Any notable milestones observed this week' };
  const desc = schemaDescriptions[locale || 'en'] || defaultDesc;

  const styleLanguageLine = isNonEnglish
    ? `\n- Write your ENTIRE response in the target language. All field values in the JSON must be in the target language.`
    : '';

  return `You are a warm, observant Montessori teacher writing a weekly report for parents.

Your writing style is:
- Warm and personal, using the child's name naturally
- Observational, describing what you actually SAW the child do
- Positive but authentic (not generic praise)
- Educational but accessible (no jargon)
- Encouraging for parents to extend learning at home${styleLanguageLine}

IMPORTANT GUIDELINES:
1. Focus on OBSERVABLE actions ("carefully placed", "showed concentration", "chose to work with")
2. Use developmental language ("developing", "exploring", "strengthening") not achievement language ("mastered", "perfected")
3. Connect activities to underlying skills being developed
4. Provide practical, simple home extension ideas parents can actually do
5. Avoid comparisons to other children
6. Keep the parent message warm and personal, mentioning something specific

OUTPUT FORMAT:
You must respond with valid JSON only, no additional text or markdown formatting. Use this exact structure:
{
  "summary": "${desc.summary}",
  "highlights": [
    {
      "media_id": "COPY THE EXACT media_id from the input",
      "observation": "${desc.observation}",
      "developmental_note": "${desc.developmental_note}",
      "home_extension": "${desc.home_extension}"
    }
  ],
  "parent_message": "${desc.parent_message}",
  "milestones": ["${desc.milestones}"]
}

CRITICAL:
- Return ONLY the JSON object, no markdown code blocks
- Include ALL activities from the input in your highlights array
- Copy media_id values EXACTLY as provided${langInstruction ? '\n- ALL text content MUST be in the target language' : ''}`
  + langInstruction;
}

function buildUserPrompt(input: EnhanceInput): string {
  const { report, child, week_start, week_end, translations } = input;
  
  // Format pronouns
  const pronouns = {
    he: { subject: 'he', possessive: 'his', object: 'him' },
    she: { subject: 'she', possessive: 'her', object: 'her' },
    they: { subject: 'they', possessive: 'their', object: 'them' },
  };
  const p = pronouns[child.gender];

  // Format week dates nicely
  const dateLoc = getIntlLocale(input.locale || 'en');
  const weekStart = new Date(week_start).toLocaleDateString(dateLoc, {
    month: 'long', day: 'numeric'
  });
  const weekEnd = new Date(week_end).toLocaleDateString(dateLoc, {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  // Build activity list with context
  const activitiesList = report.highlights.map((h, index) => {
    const translation = h.work_id ? translations[h.work_id] : null;
    
    return `
Activity ${index + 1}:
- Media ID: ${h.media_id}
- Work: ${h.work_name || 'General classroom activity'}
- Area: ${h.area || 'Mixed'}
- Caption: ${h.caption || 'No caption'}
- Developmental Context: ${translation?.developmental_context || h.developmental_note || 'General exploration'}
- Home Extension Template: ${translation?.home_extension || 'Explore similar activities together'}`;
  }).join('\n');

  return `Please write a weekly report for:

CHILD: ${child.name}
PRONOUNS: ${p.subject}/${p.possessive}/${p.object}
WEEK: ${weekStart} - ${weekEnd}

ACTIVITIES THIS WEEK (${report.highlights.length} total):
${activitiesList}

AREAS EXPLORED: ${report.areas_explored?.join(', ') || 'Various areas'}

Remember to:
1. Keep the summary warm and specific to ${child.name}
2. Write observations that paint a picture of what ${p.subject} actually did
3. Make developmental notes parent-friendly
4. Suggest home extensions that are practical
5. Write a personal parent message that feels genuine
6. Include ALL ${report.highlights.length} activities in your highlights array

Respond with JSON only, no markdown.`;
}

// ============================================
// RESPONSE PARSER (with explicit success/failure)
// ============================================

function parseAIResponse(responseText: string, childName: string): ParseResult {
  // Try to extract JSON from the response
  let jsonText = responseText.trim();
  
  // Handle markdown code blocks (shouldn't happen but defensive)
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  // Remove any leading/trailing non-JSON characters
  const jsonStart = jsonText.indexOf('{');
  const jsonEnd = jsonText.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
  }

  try {
    const parsed = JSON.parse(jsonText) as AIOutputStructure;
    
    // Validate required fields
    if (!parsed.summary || typeof parsed.summary !== 'string') {
      return { success: false, error: 'AI response missing summary' };
    }
    if (!Array.isArray(parsed.highlights)) {
      return { success: false, error: 'AI response missing highlights array' };
    }
    if (!parsed.parent_message || typeof parsed.parent_message !== 'string') {
      return { success: false, error: 'AI response missing parent message' };
    }

    // Validate each highlight has required fields
    for (let i = 0; i < parsed.highlights.length; i++) {
      const h = parsed.highlights[i];
      if (!h.media_id) {
        return { success: false, error: `Highlight ${i + 1} missing media_id` };
      }
      if (!h.observation) {
        return { success: false, error: `Highlight ${i + 1} missing observation` };
      }
    }

    return {
      success: true,
      data: {
        summary: parsed.summary,
        highlights: parsed.highlights,
        parent_message: parsed.parent_message,
        milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
      },
    };
    
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    console.error('Response text (first 500 chars):', responseText.substring(0, 500));
    
    return {
      success: false,
      error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
    };
  }
}

// ============================================
// MERGE FUNCTION
// ============================================

function mergeWithOriginal(
  original: ReportContent,
  aiOutput: AIOutputStructure,
  modelUsed: string = AI_MODEL
): ReportContent {
  // Create a map of AI highlights by media_id
  const aiHighlightsMap = new Map(
    aiOutput.highlights.map(h => [h.media_id, h])
  );

  // Merge highlights - keep original structure, update AI fields
  const enhancedHighlights: ReportHighlight[] = original.highlights.map(originalH => {
    const aiH = aiHighlightsMap.get(originalH.media_id);
    
    if (aiH) {
      return {
        ...originalH,
        observation: aiH.observation || originalH.observation,
        developmental_note: aiH.developmental_note || originalH.developmental_note,
        home_extension: aiH.home_extension || originalH.home_extension,
      };
    }
    
    // No AI content for this highlight - keep original
    return originalH;
  });

  return {
    ...original,
    summary: aiOutput.summary,
    highlights: enhancedHighlights,
    parent_message: aiOutput.parent_message,
    milestones: aiOutput.milestones.length > 0 ? aiOutput.milestones : original.milestones,
    generated_with_ai: true,
    ai_model: modelUsed,
    generation_timestamp: new Date().toISOString(),
  };
}

// ============================================
// FALLBACK FOR EMPTY REPORTS
// ============================================

function generateSummaryOnlyReport(input: EnhanceInput): EnhanceResult {
  const { child, locale } = input;
  const p = child.gender === 'they' ? 'their' : child.gender === 'he' ? 'his' : 'her';

  // Locale-keyed fallback content
  const fallbackSummary: Record<string, string> = {
    zh: `这一周，${child.name}在教室里继续探索各种活动，充满好奇心和专注力。`,
    es: `Esta semana, ${child.name} continuó su viaje de aprendizaje en el aula, explorando diversas actividades con curiosidad y concentración.`,
  };
  const fallbackMessage: Record<string, string> = {
    zh: `感谢您参与${child.name}的蒙特梭利学习之旅。我们期待下周与您分享更多进步！`,
    es: `Gracias por ser parte de la experiencia Montessori de ${child.name}. ¡Esperamos compartir más de su progreso la próxima semana!`,
  };

  return {
    success: true,
    content: {
      ...input.report,
      summary: (locale && fallbackSummary[locale])
        || `This week, ${child.name} continued ${p} learning journey in the classroom, exploring various activities with curiosity and focus.`,
      parent_message: (locale && fallbackMessage[locale])
        || `Thank you for being part of ${child.name}'s Montessori experience. We look forward to sharing more of ${p} progress next week!`,
      generated_with_ai: true,
      ai_model: 'fallback-no-highlights',
      generation_timestamp: new Date().toISOString(),
    },
    timing_ms: 0,
    warnings: ['No photos/activities to enhance - using basic summary'],
  };
}

// ============================================
// UTILITY EXPORTS
// ============================================

export { buildSystemPrompt, buildUserPrompt, parseAIResponse };
