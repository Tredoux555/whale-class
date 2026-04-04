// lib/montree/reports/narrative-generator.ts
// Sonnet-powered narrative generator for weekly parent updates
// Takes weekly analysis + photo data + curriculum descriptions
// Returns a personalized narrative summary for parents

import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
import type { WeeklyAnalysisResult } from '@/lib/montree/ai/weekly-analyzer';

// ── Types ──

export interface NarrativeInput {
  child: {
    name: string;
    age: number;
    classroom_name?: string;
  };
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;
  locale: 'en' | 'zh';

  // From weekly-analyzer.ts
  analysis: WeeklyAnalysisResult;

  // Photos with matched work data
  photos: Array<{
    work_name: string;
    area: string;
    status: string;
    parent_description: string | null;
    why_it_matters: string | null;
    caption: string | null;
  }>;

  // Previous report narrative for continuity (optional)
  previousNarrative?: string | null;
}

export interface NarrativeOutput {
  success: boolean;
  narrative: string; // The main 3-5 sentence summary
  model?: string;
  generatedAt?: string;
  tokensUsed?: { input: number; output: number };
  error?: string;
}

// ── Prompt Builder ──

function buildNarrativePrompt(input: NarrativeInput): string {
  const { child, analysis, photos, locale, previousNarrative } = input;
  const firstName = child.name.split(' ')[0];
  const lang = locale === 'zh' ? 'Chinese (Mandarin)' : 'English';

  // Gather key data points for the narrative
  const masteredWorks = photos.filter(p => p.status === 'mastered');
  const practicingWorks = photos.filter(p => p.status === 'practicing');
  const presentedWorks = photos.filter(p => p.status === 'presented');

  // Build area summary
  const areaSet = new Set(photos.map(p => p.area).filter(Boolean));
  const areas = Array.from(areaSet);

  // Get sensitive periods
  const activePeriods = analysis.detected_sensitive_periods
    .filter(p => p.status === 'active')
    .map(p => p.period_name);

  // Build work list with descriptions
  const workLines = photos.map(p => {
    const parts = [`- ${p.work_name} (${p.area}, ${p.status})`];
    if (p.caption) parts.push(`  Teacher note: ${p.caption}`);
    return parts.join('\n');
  }).join('\n');

  // Flags summary
  const concerns = [
    ...analysis.red_flags.map(f => `RED: ${f.issue}`),
    ...analysis.yellow_flags.map(f => `YELLOW: ${f.issue}`),
  ];

  return `You are writing a warm, personal weekly update introduction for a parent about their child's Montessori week.

OUTPUT LANGUAGE: ${lang}
CHILD: ${firstName}, age ${child.age}
WEEK: ${input.weekStart} to ${input.weekEnd}

WEEK SUMMARY:
- Total activities documented: ${photos.length}
- Mastered: ${masteredWorks.length} | Practicing: ${practicingWorks.length} | Introduced: ${presentedWorks.length}
- Areas explored: ${areas.length > 0 ? areas.join(', ') : 'various'}
- Concentration: ${analysis.concentration_assessment}
${activePeriods.length > 0 ? `- Active sensitive periods: ${activePeriods.join(', ')}` : ''}
${analysis.repetition_highlights.length > 0 ? `- Deep focus works: ${analysis.repetition_highlights.map(h => `${h.work} (${h.count}x)`).join(', ')}` : ''}
${concerns.length > 0 ? `- Notes: ${concerns.join('; ')}` : ''}

DOCUMENTED WORKS:
${workLines}

${previousNarrative ? `PREVIOUS WEEK'S SUMMARY (for continuity):\n${previousNarrative}\n` : ''}
TASK:
Write a 3-5 sentence introduction paragraph for a parent who may not know anything about Montessori education. This paragraph opens their weekly photo update.

Rules:
- Address the parent warmly but don't be saccharine
- Mention ${firstName} by name
- Highlight 1-2 specific works or moments that stood out
- Connect the activities to real developmental skills the parent will understand (e.g., "building concentration", "developing fine motor control", "learning to read")
- If there's a sensitive period detected, weave it in naturally without jargon
- If the child mastered something, celebrate it specifically
- End with something forward-looking or encouraging
- Keep it under 100 words
- No emojis, no headers, no bullet points — just warm prose
- Write it as if you are the teacher who watched these moments happen

Return ONLY the paragraph, nothing else.`;
}

// ── Fallback (template-based, no API needed) ──

function generateTemplateFallback(input: NarrativeInput): string {
  const firstName = input.child.name.split(' ')[0];
  const photoCount = input.photos.length;
  const masteredCount = input.photos.filter(p => p.status === 'mastered').length;
  const areaSet = new Set(input.photos.map(p => p.area).filter(Boolean));
  const areas = Array.from(areaSet);

  if (input.locale === 'zh') {
    const parts: string[] = [];
    parts.push(`${firstName}度过了充实的一周！`);
    if (photoCount > 0) {
      parts.push(`我们记录了${photoCount}项活动。`);
    }
    if (masteredCount > 0) {
      parts.push(`特别值得庆祝的是，${firstName}掌握了${masteredCount}项新技能。`);
    }
    if (areas.length >= 2) {
      parts.push(`${firstName}在多个领域都有探索，展现了强烈的学习热情。`);
    }
    parts.push('请浏览以下照片，了解详细情况。');
    return parts.join('');
  }

  const parts: string[] = [];
  parts.push(`${firstName} had a wonderful week in the classroom!`);
  if (photoCount > 0) {
    parts.push(`We captured ${photoCount} moments of focused learning.`);
  }
  if (masteredCount > 0) {
    parts.push(`${firstName} mastered ${masteredCount} new ${masteredCount === 1 ? 'skill' : 'skills'} — a real accomplishment.`);
  }
  if (areas.length >= 2) {
    parts.push(`${firstName} explored activities across ${areas.length} different areas, showing a healthy curiosity.`);
  }
  parts.push('Scroll through the photos below to see the details.');
  return parts.join(' ');
}

// ── Main Generator ──

export async function generateWeeklyNarrative(
  input: NarrativeInput
): Promise<NarrativeOutput> {
  // If no photos, skip narrative
  if (input.photos.length === 0) {
    return {
      success: true,
      narrative: input.locale === 'zh'
        ? `${input.child.name.split(' ')[0]}本周没有拍摄到照片记录。`
        : `We didn't capture any photo moments for ${input.child.name.split(' ')[0]} this week.`,
      generatedAt: new Date().toISOString(),
    };
  }

  // If AI not available, use template
  if (!AI_ENABLED || !anthropic) {
    return {
      success: true,
      narrative: generateTemplateFallback(input),
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    const prompt = buildNarrativePrompt(input);

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const narrative = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('')
      .trim();

    return {
      success: true,
      narrative: narrative || generateTemplateFallback(input),
      model: AI_MODEL,
      generatedAt: new Date().toISOString(),
      tokensUsed: {
        input: response.usage?.input_tokens || 0,
        output: response.usage?.output_tokens || 0,
      },
    };
  } catch (err) {
    console.error('Narrative generation failed, using fallback:', err);
    return {
      success: true,
      narrative: generateTemplateFallback(input),
      generatedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
