// lib/montree/reports/narrative-generator.ts
// Sonnet-powered narrative generator for weekly parent updates
// Takes weekly analysis + photo data + curriculum descriptions
// Returns a personalized narrative summary for parents

import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';
import type { WeeklyAnalysisResult } from '@/lib/montree/ai/weekly-analyzer';
import { getLanguageName, getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';
import type { Locale } from '@/lib/montree/i18n/locales';

// Parent narratives are plain warm prose — the prompt forbids markdown, but
// LLMs slip. Strip any stray markdown tokens and collapse consecutive
// duplicate paragraphs (a doubled-merge artifact) BEFORE the text is stored,
// so every downstream consumer (parent viewer, PDF, principal preview) gets
// clean text. Handoff bug #5.
export function sanitizeNarrative(raw: string): string {
  let s = raw
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\s)[*_](\S.*?\S|\S)[*_](\s|$)/g, '$1$2$3')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*(?:&gt;|>)\s?/gm, '');
  const paras = s.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const deduped: string[] = [];
  for (const p of paras) {
    if (deduped[deduped.length - 1] !== p) deduped.push(p);
  }
  s = deduped.join('\n\n');
  return s.trim();
}

// ── Types ──

export interface NarrativeInput {
  child: {
    name: string;
    age: number;
    classroom_name?: string;
  };
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;
  locale: Locale;

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

  /**
   * Optional reading-sequence position (montree_child_english_progress).
   * When present, the narrative weaves ONE natural sentence about where the
   * child stands in the structured Pink → Blue → Green reading progression.
   * Null/omitted for children the teacher hasn't placed on the sequence —
   * the prompt then says nothing about reading position, so no misleading
   * "Lesson 1" ever appears for an untracked child.
   */
  englishProgress?: {
    current_lesson: number;
    total_lessons: number;
    phase: 'pink' | 'blue' | 'green';
    lesson_label: string;
  } | null;

  /**
   * Optional Anthropic model override (e.g. HAIKU_MODEL / AI_MODEL).
   * Resolved per-request from the school's AI tier flag — see
   * `lib/montree/reports/resolve-model.ts`. Defaults to HAIKU_MODEL when
   * unspecified (cheap tier wins by default).
   */
  model?: string;
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
  const { child, analysis, photos, locale, previousNarrative, englishProgress } = input;
  const firstName = child.name.split(' ')[0];
  const lang = getLanguageName(locale);

  // Reading-progression context — only built when the teacher has placed
  // this child on the sequence. Empty string otherwise (prompt stays silent).
  const readingBlock = englishProgress
    ? `\nREADING PROGRESSION (structured Pink → Blue → Green reading sequence):
${firstName} is on lesson ${englishProgress.current_lesson} of ${englishProgress.total_lessons} — currently working on "${englishProgress.lesson_label}" (${englishProgress.phase.charAt(0).toUpperCase() + englishProgress.phase.slice(1)} phase).\n`
    : '';

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

  // Build rich work list with parent descriptions and why_it_matters
  const workLines = photos.map(p => {
    const parts = [`- ${p.work_name} (${p.area}, ${p.status})`];
    if (p.parent_description) parts.push(`  What this work is: ${p.parent_description}`);
    if (p.why_it_matters) parts.push(`  Why it matters: ${p.why_it_matters}`);
    if (p.caption) parts.push(`  Teacher note: ${p.caption}`);
    return parts.join('\n');
  }).join('\n');

  // Flags summary
  const concerns = [
    ...analysis.red_flags.map(f => `RED: ${f.issue}`),
    ...analysis.yellow_flags.map(f => `YELLOW: ${f.issue}`),
  ];

  return `You are ${firstName}'s Montessori teacher writing a personal weekly letter to their parent. You watched these moments happen. You know what they mean developmentally. Your job is to help this parent — who may know nothing about Montessori — truly understand what their child is learning and WHY it matters for their growth.

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

DOCUMENTED WORKS (with educational context):
${workLines}
${readingBlock}
${previousNarrative ? `PREVIOUS WEEK'S LETTER (for continuity — reference or build on it naturally):\n${previousNarrative}\n` : ''}
TASK:
Write a warm, personal narrative letter (3-4 short paragraphs, roughly 200-300 words) that this parent will read alongside their child's weekly photos.

STRUCTURE:
1. Opening (2-3 sentences): A warm, specific observation about ${firstName}'s week. Don't say "this week" generically — lead with a moment that captures who this child was this week. What stood out? What would make a parent smile?

2. The Learning Story (4-6 sentences): Pick 2-3 of the most meaningful works and explain what ${firstName} was actually doing and WHY it matters. Use the "What this work is" and "Why it matters" data provided above — weave it into your own words naturally. Help the parent see that when their child pours water between jugs, they're building the precise hand control they'll need to write. When they trace sandpaper letters, they're training muscle memory that makes reading feel natural. Connect the classroom to real development the parent can observe at home.

3. The Bigger Picture (2-3 sentences): Step back and paint the developmental arc. ${activePeriods.length > 0 ? `Weave in the sensitive period(s) naturally — explain what it means that ${firstName} is drawn to certain kinds of work right now, and that this window won't last forever.` : 'Connect the week\'s work to the bigger developmental journey.'} If the child mastered something, help the parent feel the significance. If they repeated something many times, explain why repetition is the sign of deep learning, not boredom.${englishProgress ? ` Weave in ONE warm, natural sentence about where ${firstName} stands in their reading — they are steadily moving through a structured reading sequence and are currently working on "${englishProgress.lesson_label}". Frame it as part of the growth story in plain parent language; do NOT quote lesson numbers or say "Lesson X of Y".` : ''}

4. Closing (1-2 sentences): Forward-looking, encouraging, warm. Leave the parent feeling connected to their child's classroom life and excited about what's coming next.

VOICE & TONE RULES:
- Write as if you're a thoughtful teacher who genuinely loves this child, talking to the parent over coffee
- Be warm but never saccharine — no "little one" or "precious moments" or empty superlatives
- Never use the word "journey" — find fresher language
- Use ${firstName}'s name 2-3 times naturally, not in every sentence
- No emojis, no headers, no bullet points, no bold text — just flowing prose paragraphs
- Don't list works mechanically ("${firstName} did X, Y, and Z") — weave them into a story
- Every work you mention should connect to WHY it matters — if you can't explain why, don't mention it
- If there are concerns/flags, acknowledge growth areas gently and constructively
- Don't use Montessori jargon (no "normalization", "sensitive period", "absorbent mind" etc.) — translate everything into parent language
- This should read like a letter from someone who knows and cares about this specific child, not a generated report

Return ONLY the narrative text, nothing else. No subject line, no greeting like "Dear Parent", no sign-off — just the body paragraphs.
${getAILanguageInstruction(locale)}`;
}

// ── Fallback (template-based, no API needed) ──

function generateTemplateFallback(input: NarrativeInput): string {
  const firstName = input.child.name.split(' ')[0];
  const photoCount = input.photos.length;
  const masteredCount = input.photos.filter(p => p.status === 'mastered').length;
  const practicingCount = input.photos.filter(p => p.status === 'practicing').length;
  const areaSet = new Set(input.photos.map(p => p.area).filter(Boolean));
  const areas = Array.from(areaSet);

  // Pick a highlighted work to feature
  const featured = input.photos.find(p => p.parent_description) || input.photos[0];

  // Locale-keyed template builders — each returns the full narrative string
  const locale = input.locale;
  const featuredName = featured?.work_name || '';
  const featuredDesc = featured?.parent_description || '';
  const featuredWhy = featured?.why_it_matters || '';

  const TEMPLATES: Record<string, () => string> = {
    zh: () => {
      const p: string[] = [];
      p.push(`${firstName}这周在教室里度过了充实而有意义的一周。`);
      if (photoCount > 0) p.push(`我们记录了${photoCount}个专注学习的瞬间。`);
      if (featuredDesc) {
        p.push(`\n\n其中特别值得一提的是${featuredName}——${featuredDesc}`);
        if (featuredWhy) p.push(featuredWhy);
      }
      if (masteredCount > 0) p.push(`\n\n${firstName}这周掌握了${masteredCount}项新技能，这代表着真正的成长和进步。`);
      if (practicingCount > 0) p.push(`还有${practicingCount}项活动正在反复练习中——这种重复不是无聊，而是深度学习的标志。`);
      if (areas.length >= 2) p.push(`${firstName}在${areas.length}个不同领域都有探索，展现了旺盛的求知欲和学习热情。`);
      p.push('\n\n请浏览下面的照片，感受这些珍贵的学习时刻。');
      return p.join('');
    },
    es: () => {
      const p: string[] = [];
      p.push(`${firstName} tuvo una semana significativa en el salón.`);
      if (photoCount > 0) p.push(`Capturamos ${photoCount} momentos de trabajo concentrado y con propósito.`);
      if (featuredDesc) {
        p.push(`\n\nUn momento destacado fue ${featuredName} — ${featuredDesc}`);
        if (featuredWhy) p.push(featuredWhy);
      }
      if (masteredCount > 0) p.push(`\n\n${firstName} dominó ${masteredCount} ${masteredCount === 1 ? 'habilidad nueva' : 'habilidades nuevas'} esta semana, lo que representa un verdadero crecimiento.`);
      if (practicingCount > 0) p.push(`También está practicando ${practicingCount} ${practicingCount === 1 ? 'otra actividad' : 'otras actividades'} — este tipo de repetición es señal de un aprendizaje genuino.`);
      if (areas.length >= 2) p.push(`A través de ${areas.length} áreas diferentes del salón, ${firstName} mostró una curiosidad saludable y disposición para explorar.`);
      p.push('\n\nDesplácese por las fotos a continuación para ver estos momentos.');
      return p.join(' ');
    },
  };

  if (TEMPLATES[locale]) return TEMPLATES[locale]();

  // English default
  const parts: string[] = [];
  parts.push(`${firstName} had a meaningful week in the classroom.`);
  if (photoCount > 0) {
    parts.push(`We captured ${photoCount} moments of focused, purposeful work.`);
  }
  if (featuredDesc) {
    parts.push(`\n\nOne highlight was ${featuredName} — ${featuredDesc}`);
    if (featuredWhy) parts.push(featuredWhy);
  }
  if (masteredCount > 0) {
    parts.push(`\n\n${firstName} mastered ${masteredCount} new ${masteredCount === 1 ? 'skill' : 'skills'} this week, which represents real growth and accomplishment.`);
  }
  if (practicingCount > 0) {
    parts.push(`${firstName} is also deep in practice with ${practicingCount} other ${practicingCount === 1 ? 'activity' : 'activities'} — this kind of repetition is the hallmark of genuine learning taking root.`);
  }
  if (areas.length >= 2) {
    parts.push(`Across ${areas.length} different areas of the classroom, ${firstName} showed a healthy curiosity and willingness to explore.`);
  }
  parts.push('\n\nScroll through the photos below to see these moments for yourself.');
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
      narrative: (() => {
        const fn = input.child.name.split(' ')[0];
        // Localized for every supported locale — the parent-facing report
        // is written in the school's language, so the empty-state line must
        // be too (an incomplete map silently fell back to English).
        const NO_PHOTOS: Record<string, string> = {
          zh: `${fn}本周没有拍摄到照片记录。`,
          es: `No capturamos momentos fotográficos de ${fn} esta semana.`,
          de: `Diese Woche haben wir keine Fotomomente von ${fn} festgehalten.`,
          fr: `Cette semaine, nous n'avons pas pris de photos de ${fn}.`,
          pt: `Esta semana não registramos momentos em foto de ${fn}.`,
          nl: `Deze week hebben we geen fotomomenten van ${fn} vastgelegd.`,
          it: `Questa settimana non abbiamo catturato momenti fotografici di ${fn}.`,
          ja: `今週は${fn}さんの写真の記録はありませんでした。`,
          ko: `이번 주에는 ${fn}의 사진 기록이 없습니다.`,
          uk: `Цього тижня ми не зробили фотознімків ${fn}.`,
          ru: `На этой неделе мы не сделали фотографий ${fn}.`,
        };
        return NO_PHOTOS[input.locale] || `We didn't capture any photo moments for ${fn} this week.`;
      })(),
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
    const resolvedModel = input.model || HAIKU_MODEL;

    const baseSystem = 'You are a warm Montessori teacher writing a weekly update for parents.';
    const langInstruction = getAILanguageInstruction(input.locale);
    const systemMessage = langInstruction ? `${baseSystem} ${langInstruction}` : baseSystem;

    const response = await anthropic.messages.create({
      model: resolvedModel,
      max_tokens: 800,
      system: systemMessage,
      messages: [{ role: 'user', content: prompt }],
    });

    const narrative = sanitizeNarrative(
      response.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('')
        .trim()
    );

    return {
      success: true,
      narrative: narrative || generateTemplateFallback(input),
      model: resolvedModel,
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
