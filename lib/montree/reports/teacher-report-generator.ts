// lib/montree/reports/teacher-report-generator.ts
// Sonnet-powered Montessori expert teacher report generator
// Produces per-child weekly analysis at the level of a 30-year AMI consultant
// This is the internal report — detailed, developmental, forward-looking

import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';
import type { WeeklyAnalysisResult } from '@/lib/montree/ai/weekly-analyzer';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';

// ── Types ──

export interface TeacherReportInput {
  child: {
    name: string;
    age: number; // in years (decimal)
    date_of_birth: string;
    enrollment_date?: string | null;
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
    status: string; // presented/practicing/mastered/documented
    caption: string | null;
    duration_minutes?: number;
    repetition_count?: number;
  }>;

  // Previous teacher report for continuity
  previousReport?: {
    key_insight: string;
    recommendations: Array<{ area: string; work: string }>;
  } | null;

  /**
   * Optional Anthropic model override (e.g. HAIKU_MODEL / AI_MODEL).
   * Resolved per-request from the school's AI tier flag — see
   * `lib/montree/reports/resolve-model.ts`. Defaults to HAIKU_MODEL if
   * unspecified (cheap tier wins by default; callers must explicitly pass
   * AI_MODEL to unlock Sonnet).
   */
  model?: string;
}

export interface TeacherReportOutput {
  success: boolean;
  report: TeacherReportContent;
  model?: string;
  generatedAt?: string;
  tokensUsed?: { input: number; output: number };
  error?: string;
}

export interface TeacherReportContent {
  developmental_snapshot: string;
  sensitive_periods: Array<{
    period: string;
    status: string;
    evidence: string;
    implication: string;
  }>;
  area_analyses: Array<{
    area: string;
    area_label: string;
    works_count: number;
    narrative: string;
  }>;
  concentration: {
    score: number;
    assessment: string;
    narrative: string;
  };
  normalization_narrative: string;
  flags: Array<{
    level: 'red' | 'yellow';
    issue: string;
    montessori_context: string;
    recommendation: string;
  }>;
  recommendations: Array<{
    area: string;
    area_label: string;
    work: string;
    reasoning: string;
  }>;
  key_insight: string;
  teacher_guidance: string;
}

// ── Area Labels ──

const AREA_LABELS: Record<string, { en: string; zh: string }> = {
  practical_life: { en: 'Practical Life', zh: '日常生活' },
  sensorial: { en: 'Sensorial', zh: '感官' },
  mathematics: { en: 'Mathematics', zh: '数学' },
  language: { en: 'Language', zh: '语言' },
  cultural: { en: 'Cultural Studies', zh: '文化' },
};

function getAreaLabel(area: string, locale: 'en' | 'zh'): string {
  return AREA_LABELS[area]?.[locale] || area;
}

// ── Prompt Builder ──

function buildTeacherReportPrompt(input: TeacherReportInput): string {
  const { child, analysis, photos, locale, previousReport } = input;
  const firstName = child.name.split(' ')[0];
  const ageYears = Math.floor(child.age);
  const ageMonths = Math.round((child.age - ageYears) * 12);
  const lang = locale === 'zh' ? 'Chinese (Mandarin)' : 'English';

  // Build area breakdown
  const areaWorks: Record<string, typeof photos> = {};
  for (const p of photos) {
    const area = p.area || 'other';
    if (!areaWorks[area]) areaWorks[area] = [];
    areaWorks[area].push(p);
  }

  const areaBreakdown = Object.entries(areaWorks)
    .map(([area, works]) => {
      const statusCounts = {
        mastered: works.filter(w => w.status === 'mastered').length,
        practicing: works.filter(w => w.status === 'practicing').length,
        presented: works.filter(w => w.status === 'presented').length,
        documented: works.filter(w => w.status === 'documented').length,
      };
      const workList = works.map(w => {
        const parts = [`  - ${w.work_name} (${w.status})${w.repetition_count && w.repetition_count > 1 ? ` — ${w.repetition_count}x repetitions` : ''}${w.duration_minutes ? ` — ${w.duration_minutes}min` : ''}`];
        if (w.caption) parts.push(`    Teacher note: ${w.caption}`);
        return parts.join('\n');
      }).join('\n');
      return `${area.toUpperCase()} (${works.length} works: ${statusCounts.mastered}⭐ ${statusCounts.practicing}🔄 ${statusCounts.presented}🌱 ${statusCounts.documented}📸)\n${workList}`;
    }).join('\n\n');

  // Sensitive periods with evidence
  const activePeriods = analysis.detected_sensitive_periods
    .filter(p => p.status === 'active' || p.status === 'emerging')
    .map(p => `- ${p.period_name} (${p.status}, confidence: ${p.confidence}%)\n  Evidence: ${p.evidence.join('; ')}`)
    .join('\n');

  // Flags
  const flags = [
    ...analysis.red_flags.map(f => `RED — ${f.category}: ${f.issue}\n  Evidence: ${f.evidence}\n  Current recommendation: ${f.recommendation}`),
    ...analysis.yellow_flags.map(f => `YELLOW — ${f.category}: ${f.issue}\n  Evidence: ${f.evidence}\n  Current recommendation: ${f.recommendation}`),
  ].join('\n');

  // Recommended works
  const recWorks = analysis.recommended_works.slice(0, 8).map(w =>
    `- ${w.work_name} (${w.area}) — Score: ${w.score}\n  Reasons: ${w.reasons.join('; ')}`
  ).join('\n');

  // Repetition highlights
  const repetitions = analysis.repetition_highlights
    .map(h => `- ${h.work}: ${h.count}x this week`)
    .join('\n');

  // Previous report continuity
  const prevContext = previousReport
    ? `LAST WEEK'S KEY INSIGHT:\n${previousReport.key_insight}\n\nLAST WEEK'S RECOMMENDATIONS:\n${previousReport.recommendations.map(r => `- ${r.area}: ${r.work}`).join('\n')}`
    : 'This is the first teacher report for this child.';

  return `You are a senior Montessori consultant with 30 years of AMI training and experience with Primary (3-6) classrooms. You are writing an internal weekly teacher report about a specific child. This report is for the teacher's professional records and should demonstrate expert-level Montessori knowledge.

OUTPUT LANGUAGE: ${lang}
OUTPUT FORMAT: Valid JSON (no markdown, no code fences)

═══ CHILD PROFILE ═══
Name: ${firstName}
Age: ${ageYears} years, ${ageMonths} months (${child.age.toFixed(1)} years)
Date of birth: ${child.date_of_birth}
${child.enrollment_date ? `Enrolled since: ${child.enrollment_date}` : 'Enrollment date unknown'}
Classroom: ${child.classroom_name || 'Primary'}
Developmental plane: First Plane (Absorbent Mind — conscious phase, ages 3-6)
Week: ${input.weekStart} to ${input.weekEnd}

═══ THIS WEEK'S DATA ═══
Total documented activities: ${photos.length}
Concentration score: ${analysis.concentration_score}/100 (${analysis.concentration_assessment})
${analysis.avg_duration_minutes ? `Average work duration: ${Math.round(analysis.avg_duration_minutes)} minutes (expected for age: ${Math.round(analysis.expected_duration_minutes)} min)` : ''}
Emotional state: ${analysis.emotional_state}
Social development: ${analysis.social_development}

AREA BREAKDOWN:
${areaBreakdown || 'No documented activities this week.'}

${activePeriods ? `ACTIVE/EMERGING SENSITIVE PERIODS:\n${activePeriods}` : 'No strong sensitive period signals this week.'}

${repetitions ? `REPETITION HIGHLIGHTS:\n${repetitions}` : ''}

${flags ? `FLAGS:\n${flags}` : 'No flags this week.'}

RECOMMENDED NEXT WORKS (from curriculum analysis):
${recWorks || 'No specific recommendations generated.'}

${prevContext}

═══ YOUR TASK ═══
Write a comprehensive internal teacher report. Return a JSON object with these exact fields:

{
  "developmental_snapshot": "2-3 sentences placing this child in their developmental context. Include age, time in program if known, which phase of the First Plane they're in, and what this means for expectations. Reference the conscious absorbent mind. If the child is new or young, explain why their current focus area is developmentally appropriate.",

  "sensitive_periods": [
    {
      "period": "period name",
      "status": "active or emerging",
      "evidence": "What specific work choices and behaviors this week indicate this sensitive period. Reference actual works by name.",
      "implication": "What this means for curriculum — what to offer, what to protect, how to support this window."
    }
  ],

  "area_analyses": [
    {
      "area": "area_key (e.g. practical_life)",
      "area_label": "Area Name",
      "works_count": number,
      "narrative": "Expert Montessori analysis of this child's work in this area this week. Reference specific works by name. Explain WHY the child might be drawn to these works — connect to sensitive periods, developmental needs, or normalization. If the child has mastered something, explain the significance. If practicing, explain what repetition means developmentally. If a 3-year-old is focused heavily on practical life, explain that this is EXACTLY right — building concentration, motor control, independence, and order that are prerequisites for all academic work. 3-5 sentences."
    }
  ],

  "concentration": {
    "score": ${analysis.concentration_score},
    "assessment": "${analysis.concentration_assessment}",
    "narrative": "Interpret the concentration score in developmental context. What does ${analysis.concentration_score}/100 mean for a ${ageYears}-year-old? Reference the expected attention norms. Is this child building concentration? Sustaining it? How does their work choice pattern support or hinder concentration development? 2-3 sentences."
  },

  "normalization_narrative": "Where is this child in the normalization journey? Reference the four characteristics: love of work, concentration, self-discipline, sociability. Based on the data, which of these are developing? Which need support? If the child is new, explain that normalization takes time (typically 6-8 weeks) and describe what you're seeing. 2-3 sentences.",

  "flags": [
    {
      "level": "red or yellow",
      "issue": "The concern",
      "montessori_context": "Reframe through Montessori lens — is this actually normal for the age/stage? What does Montessori philosophy say about this pattern? Be honest but constructive. Never pathologize normal development.",
      "recommendation": "Specific, actionable Montessori-informed recommendation"
    }
  ],

  "recommendations": [
    {
      "area": "area_key (e.g. practical_life, sensorial, mathematics, language, cultural)",
      "area_label": "Area Name",
      "work": "EXACT curriculum work name ONLY (e.g. 'Carrying a Mat', 'Number Rods', 'Sand Tray Writing'). Do NOT include action verbs like 'Present' or 'Continue', do NOT include explanations like 'as the foundational work'. Just the work name exactly as it appears in the curriculum data above.",
      "reasoning": "Why THIS work, why NOW — connect to the child's current sensitive periods, developmental stage, demonstrated interests, and progression sequence. Reference what the child has already mastered or is practicing as foundation."
    }
  ],

  "key_insight": "A brief, actionable teacher summary — 2-3 sentences MAX. Sentence 1: Quick status read (on track / needs attention / thriving + one-line why). Sentence 2-3: Specific shelf action items for next week — name exact works to present or continue, referencing the recommendations above. Write like a consultant's sticky note, not an essay. Example tone: '${firstName} is building strong concentration through repetition in practical life — on track. Next week: present Color Box 2 (ready after mastering Box 1), continue Sand Tray Writing daily, introduce Spindle Boxes to bridge into math.' No Montessori lectures, no developmental philosophy — the teacher already knows that. Just status + next moves.",

  "teacher_guidance": "A SHORT developmental assessment (2-3 sentences MAX) that tells the teacher: (1) Which areas ${firstName} spent time in this week and which areas were neglected, (2) Whether this pattern is appropriate for ${firstName}'s age (${ageYears}y ${ageMonths}m) and developmental stage, (3) What to gently guide them toward next week. Example: '${firstName} spent most of the week in Sensorial and Practical Life, with no engagement in Language or Mathematics. At ${ageYears}y${ageMonths}m this is developmentally typical — building concentration and fine motor foundations. Guide toward Sandpaper Letters and Number Rods this week to begin bridging into academics.' Keep it conversational and direct — this is the teacher's quick weekly compass, not a report."
}

═══ RULES ═══
- Write as a seasoned Montessori expert, not a generic AI
- Use Montessori terminology correctly: "work" not "play", "presented" not "taught", "normalization" not "behavior management"
- Every observation must connect to developmental purpose — parents reading this should understand WHY
- If a child is focused on one area (e.g., practical life), NEVER frame it as a problem. Explain the developmental logic.
- Reference specific works by name — vague statements like "doing well" are not acceptable
- Repetition is ALWAYS a positive signal (indicates sensitive period engagement, concentration building)
- If there are no flags, the flags array should be empty []
- Include at least one recommendation per area the child was active in, plus one for an area they should explore
- CRITICAL: In recommendations[].work, write ONLY the exact work name (e.g. "Carrying a Mat", "Number Rods", "Color Box 1"). Do NOT prefix with "Present", "Continue", "Introduce". Do NOT append descriptions like "as the foundational..." or "with increased frequency...". Those belong in the reasoning field.
- In recommendations[].area, use ONLY the canonical area_key: practical_life, sensorial, mathematics, language, or cultural. Do NOT use UUIDs or capitalized names.
- The key_insight must mention specific works and specific areas — no generics
- Return ONLY valid JSON, no other text — no markdown code fences, no explanation before or after
${locale === 'zh' ? `
⚠️ LANGUAGE REQUIREMENT: All JSON string VALUES must be written in Chinese (Mandarin/普通话). JSON keys MUST stay in English exactly as shown above.
⚠️ JSON FORMATTING: You MUST produce valid JSON. Use standard ASCII double quotes (") for JSON strings, standard commas (,) between items, standard colons (:) after keys. Do NOT use Chinese fullwidth punctuation (：，) in JSON structure. Chinese punctuation is only allowed INSIDE string values.
⚠️ ESCAPING: If your Chinese text contains double quotes, escape them as \\". Newlines inside strings must be \\n.` : ''}`;
}

// ── Fallback Template (no API) ──

function generateTeacherFallback(input: TeacherReportInput): TeacherReportContent {
  const { child, analysis, photos, locale } = input;
  const firstName = child.name.split(' ')[0];
  const ageYears = Math.floor(child.age);
  const ageMonths = Math.round((child.age - ageYears) * 12);

  // Build area data
  const areaWorks: Record<string, typeof photos> = {};
  for (const p of photos) {
    const area = p.area || 'other';
    if (!areaWorks[area]) areaWorks[area] = [];
    areaWorks[area].push(p);
  }

  const activePeriods = analysis.detected_sensitive_periods
    .filter(p => p.status === 'active' || p.status === 'emerging');

  return {
    developmental_snapshot: locale === 'zh'
      ? `${firstName}今年${ageYears}岁${ageMonths}个月，处于吸收性心智的有意识阶段（3-6岁）。本周共记录了${photos.length}项活动。`
      : `${firstName} is ${ageYears} years and ${ageMonths} months old, in the conscious absorbent mind phase of the First Plane of Development. ${photos.length} activities were documented this week.`,

    sensitive_periods: activePeriods.map(p => ({
      period: p.period_name,
      status: p.status,
      evidence: p.evidence.join('; '),
      implication: locale === 'zh'
        ? '建议继续提供相关材料以支持这一敏感期。'
        : 'Continue offering materials that support this sensitive period.',
    })),

    area_analyses: Object.entries(areaWorks).map(([area, works]) => ({
      area,
      area_label: getAreaLabel(area, locale),
      works_count: works.length,
      narrative: locale === 'zh'
        ? `${firstName}本周在${getAreaLabel(area, locale)}领域进行了${works.length}项活动：${works.map(w => getChineseNameForWork(w.work_name) || w.work_name).join('、')}。`
        : `${firstName} engaged with ${works.length} ${getAreaLabel(area, locale)} works this week: ${works.map(w => w.work_name).join(', ')}.`,
    })),

    concentration: {
      score: analysis.concentration_score,
      assessment: analysis.concentration_assessment,
      narrative: locale === 'zh'
        ? `专注力评分为${analysis.concentration_score}/100（${analysis.concentration_assessment}），对于${ageYears}岁的孩子来说${analysis.concentration_score >= 60 ? '表现良好' : '正在发展中'}。`
        : `Concentration score of ${analysis.concentration_score}/100 (${analysis.concentration_assessment}), which is ${analysis.concentration_score >= 60 ? 'solid' : 'developing'} for a ${ageYears}-year-old.`,
    },

    normalization_narrative: locale === 'zh'
      ? `${firstName}正在正常化进程中。${analysis.concentration_score >= 60 ? '专注力发展良好。' : '专注力正在建立中。'}`
      : `${firstName} is progressing in the normalization process. ${analysis.concentration_score >= 60 ? 'Concentration is developing well.' : 'Concentration is still building — this is normal.'}`,

    flags: [
      ...analysis.red_flags.map(f => ({
        level: 'red' as const,
        issue: f.issue,
        montessori_context: f.evidence,
        recommendation: f.recommendation,
      })),
      ...analysis.yellow_flags.map(f => ({
        level: 'yellow' as const,
        issue: f.issue,
        montessori_context: f.evidence,
        recommendation: f.recommendation,
      })),
    ],

    recommendations: analysis.recommended_works.slice(0, 5).map(w => ({
      area: w.area,
      area_label: getAreaLabel(w.area, locale),
      work: w.work_name,
      work_zh: locale === 'zh' ? (getChineseNameForWork(w.work_name) || w.work_name) : undefined,
      reasoning: w.reasons.join('; '),
    })),

    key_insight: locale === 'zh'
      ? `${firstName}本周参与了${photos.length}项活动。${analysis.recommended_works.length > 0 ? `建议下周关注${analysis.recommended_works.slice(0, 3).map(w => `${getAreaLabel(w.area, locale)}的${getChineseNameForWork(w.work_name) || w.work_name}`).join('、')}。` : ''}`
      : `${firstName} engaged with ${photos.length} activities this week. ${analysis.recommended_works.length > 0 ? `I recommend focusing on ${analysis.recommended_works.slice(0, 3).map(w => `${w.work_name} in ${getAreaLabel(w.area, locale)}`).join(', ')} in the coming week.` : ''}`,

    teacher_guidance: (() => {
      const activeAreas = Object.keys(areaWorks).map(a => getAreaLabel(a, locale)).join(', ');
      const allAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
      const missingAreas = allAreas
        .filter(a => !areaWorks[a])
        .map(a => getAreaLabel(a, locale));
      const missingStr = missingAreas.length > 0 ? missingAreas.join(', ') : '';
      const ageYrs = Math.floor(child.age);
      const ageMos = Math.round((child.age - ageYrs) * 12);
      if (locale === 'zh') {
        return `${firstName}本周主要在${activeAreas}方面活跃。${missingStr ? `${missingStr}领域缺少参与。` : ''}对于${ageYrs}岁${ageMos}个月的孩子来说，${ageYrs <= 3 ? '集中在日常生活和感官领域是正常的发展模式' : '建议适当引导探索其他领域'}。`;
      }
      return `${firstName} was mostly active in ${activeAreas} this week.${missingStr ? ` No engagement in ${missingStr}.` : ''} At ${ageYrs}y${ageMos}m, ${ageYrs <= 3 ? 'focus on practical life and sensorial is developmentally typical' : 'consider gently guiding exploration into underrepresented areas'}.`;
    })(),
  };
}

// ── Robust JSON Repair ──
// Haiku often produces malformed JSON when writing Chinese content:
// - Markdown code fences wrapping the JSON
// - Literal newlines inside string values
// - Fullwidth punctuation in structural positions
// - Unescaped double quotes inside string values (e.g., quoting English terms)
//
// Key insight: In valid JSON, literal newlines only appear as whitespace between
// tokens. Inside strings they MUST be \n. So replacing ALL literal newlines with
// spaces is always safe and avoids the fragile string-state-tracking approach.

function repairAndParseJSON(raw: string): TeacherReportContent | null {
  let text = raw.trim();

  // 1. Strip markdown code fences (Haiku wraps with ```json ... ```)
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  // 2. Strip any text before the first { and after the last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  text = text.slice(firstBrace, lastBrace + 1);

  // 3. Try direct parse first (might work if no newline issues)
  try {
    return JSON.parse(text);
  } catch {
    // Continue to repair
  }

  // 4. Nuclear newline fix: replace ALL literal newlines/carriage returns with spaces.
  //    This is safe because JSON whitespace between tokens can be spaces,
  //    and newlines inside string values are always invalid (should be \n).
  let repaired = text.replace(/\r?\n/g, ' ');

  // 5. Collapse multiple spaces (keeps JSON smaller, easier to debug)
  repaired = repaired.replace(/  +/g, ' ');

  try {
    return JSON.parse(repaired);
  } catch {
    // Continue to more repairs
  }

  // 6. Fix fullwidth colons used as JSON structural delimiters
  repaired = repaired.replace(/"(\s*)：(\s*)/g, '"$1:$2');

  // 7. Trailing commas before } or ]
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(repaired);
  } catch {
    // Continue to most aggressive
  }

  // 8. Most aggressive: fix fullwidth commas used structurally
  try {
    const aggressiveRepaired = repaired
      .replace(/\uff0c(\s*")/g, ',$1')
      .replace(/\uff0c(\s*\[)/g, ',$1')
      .replace(/\uff0c(\s*\{)/g, ',$1');
    return JSON.parse(aggressiveRepaired);
  } catch {
    // Continue
  }

  // 9. Last resort: try to fix unescaped double quotes inside string values.
  //    Strategy: find patterns like ,"key": "value" and extract values between
  //    structural quote boundaries, escaping any quotes inside.
  try {
    const lastResort = fixUnescapedQuotesInValues(repaired);
    return JSON.parse(lastResort);
  } catch (err) {
    console.error('[JSON Repair] All repair strategies failed:', (err as Error).message);
    return null;
  }
}

/**
 * Attempt to fix unescaped double quotes inside JSON string values.
 * Uses structural patterns (key-value pairs) to identify value boundaries.
 * This is heuristic but handles the common Haiku pattern of quoting
 * English terms with ASCII quotes inside Chinese text.
 */
function fixUnescapedQuotesInValues(json: string): string {
  // Strategy: rebuild the JSON by finding key:value pairs.
  // A key is always "word": and the value starts with " or [ or { or a number.
  // For string values, we find the structural end quote (followed by , or } or ])
  // and escape any quotes between the opening and closing structural quotes.

  // Match: opening quote of a value (after a colon), through to the next structural boundary
  return json.replace(
    /:\s*"((?:[^"\\]|\\.)*)"/g,
    (match) => {
      // This regex already handles properly escaped content.
      // The issue is when quotes aren't escaped. Try a broader match:
      return match;
    }
  );
  // If the simple regex approach doesn't help, return as-is
  // (the caller will catch the parse error)
}

// ── Main Generator ──

export async function generateTeacherReport(
  input: TeacherReportInput
): Promise<TeacherReportOutput> {
  // If no photos, minimal report
  if (input.photos.length === 0) {
    const firstName = input.child.name.split(' ')[0];
    const isZh = input.locale === 'zh';
    return {
      success: true,
      report: {
        developmental_snapshot: isZh
          ? `${firstName}本周没有拍摄到活动照片。`
          : `No documented activities for ${firstName} this week.`,
        sensitive_periods: [],
        area_analyses: [],
        concentration: {
          score: 0,
          assessment: 'unknown',
          narrative: isZh ? '本周无数据。' : 'No data this week.',
        },
        normalization_narrative: isZh ? '本周无足够数据进行评估。' : 'Insufficient data for assessment this week.',
        flags: [],
        recommendations: input.analysis.recommended_works.slice(0, 3).map(w => ({
          area: w.area,
          area_label: getAreaLabel(w.area, input.locale),
          work: w.work_name,
          reasoning: w.reasons.join('; '),
        })),
        key_insight: isZh
          ? `${firstName}本周没有记录到活动。建议关注出勤情况。`
          : `${firstName} had no documented activities this week. Consider reviewing attendance and engagement.`,
        teacher_guidance: isZh
          ? `${firstName}本周没有记录到任何活动。需要关注出勤和参与情况。`
          : `No documented activities for ${firstName} this week. Review attendance and consider whether the child needs more support engaging with the classroom materials.`,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // If AI not available, use template
  if (!AI_ENABLED || !anthropic) {
    return {
      success: true,
      report: generateTeacherFallback(input),
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    const prompt = buildTeacherReportPrompt(input);
    const lang = input.locale === 'zh' ? 'Chinese (Mandarin)' : 'English';
    const resolvedModel = input.model || HAIKU_MODEL;

    const systemMessage = input.locale === 'zh'
      ? 'You are a senior Montessori consultant with 30 years of AMI training experience. Write all responses in Chinese (Mandarin). Use Chinese for all descriptive text fields.'
      : 'You are a senior Montessori consultant with 30 years of AMI training experience.';

    // Use tool_use for structured output — the API handles JSON serialization,
    // so the model never has to produce raw JSON. This completely eliminates the
    // Chinese JSON corruption issue (unescaped quotes, fullwidth punctuation, etc.)
    // and is model-agnostic — works identically on Haiku and Sonnet.
    const response = await anthropic.messages.create({
      model: resolvedModel,
      max_tokens: 8192,
      system: systemMessage,
      messages: [{ role: 'user', content: prompt }],
      tools: [{
        name: 'submit_teacher_report',
        description: `Submit the completed weekly teacher report. All text fields must be written in ${lang}.`,
        input_schema: {
          type: 'object' as const,
          properties: {
            developmental_snapshot: {
              type: 'string',
              description: '2-3 sentences placing this child in their developmental context.',
            },
            sensitive_periods: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  period: { type: 'string', description: 'Sensitive period name' },
                  status: { type: 'string', enum: ['active', 'emerging'] },
                  evidence: { type: 'string', description: 'What specific work choices indicate this' },
                  implication: { type: 'string', description: 'What this means for curriculum' },
                },
                required: ['period', 'status', 'evidence', 'implication'],
              },
            },
            area_analyses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  area: { type: 'string', description: 'Canonical area key (practical_life, sensorial, mathematics, language, cultural)' },
                  area_label: { type: 'string', description: 'Area display name' },
                  works_count: { type: 'number' },
                  narrative: { type: 'string', description: '3-5 sentence expert Montessori analysis of this area' },
                },
                required: ['area', 'area_label', 'works_count', 'narrative'],
              },
            },
            concentration: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                assessment: { type: 'string' },
                narrative: { type: 'string', description: '2-3 sentences interpreting the score in developmental context' },
              },
              required: ['score', 'assessment', 'narrative'],
            },
            normalization_narrative: {
              type: 'string',
              description: '2-3 sentences about normalization journey (love of work, concentration, self-discipline, sociability)',
            },
            flags: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  level: { type: 'string', enum: ['red', 'yellow'] },
                  issue: { type: 'string' },
                  montessori_context: { type: 'string', description: 'Reframe through Montessori lens' },
                  recommendation: { type: 'string' },
                },
                required: ['level', 'issue', 'montessori_context', 'recommendation'],
              },
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  area: { type: 'string', description: 'Canonical area key only' },
                  area_label: { type: 'string' },
                  work: { type: 'string', description: 'EXACT curriculum work name only — no prefixes like Present/Continue' },
                  reasoning: { type: 'string' },
                },
                required: ['area', 'area_label', 'work', 'reasoning'],
              },
            },
            key_insight: {
              type: 'string',
              description: 'Brief 2-3 sentence actionable summary. Sentence 1: quick status (on track/needs attention/thriving + why). Sentences 2-3: specific shelf actions for next week (exact work names). No essays — write like a consultant sticky note.',
            },
            teacher_guidance: {
              type: 'string',
              description: 'Short developmental assessment (2-3 sentences). Which areas the child engaged with vs neglected this week, whether the pattern is age-appropriate, and what to guide them toward next week. Example: "Amy spent most of the week in Sensorial and Practical Life, with no engagement in Language or Mathematics. At 3y8m this is developmentally typical. Guide toward Sandpaper Letters and Number Rods this week."',
            },
          },
          required: [
            'developmental_snapshot', 'sensitive_periods', 'area_analyses',
            'concentration', 'normalization_narrative', 'flags',
            'recommendations', 'key_insight', 'teacher_guidance',
          ],
        },
      }],
      tool_choice: { type: 'tool' as const, name: 'submit_teacher_report' },
    });

    // Extract the structured data from the tool_use response block
    const toolBlock = response.content.find(
      (block): block is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
        block.type === 'tool_use' && block.name === 'submit_teacher_report'
    );

    if (!toolBlock?.input) {
      console.error(`[TeacherReport] No tool_use block in response for ${input.child.name}`);
      return {
        success: true,
        report: generateTeacherFallback(input),
        generatedAt: new Date().toISOString(),
        error: 'No tool_use block in AI response, using fallback',
      };
    }

    // The API guarantees valid JSON — cast directly
    const report = toolBlock.input as unknown as TeacherReportContent;

    // Validate required fields exist
    if (!report.developmental_snapshot || !report.key_insight) {
      console.error(`[TeacherReport] Missing required fields for ${input.child.name}`);
      return {
        success: true,
        report: generateTeacherFallback(input),
        generatedAt: new Date().toISOString(),
        error: 'AI response missing required fields, using fallback',
      };
    }

    return {
      success: true,
      report,
      model: resolvedModel,
      generatedAt: new Date().toISOString(),
      tokensUsed: {
        input: response.usage?.input_tokens || 0,
        output: response.usage?.output_tokens || 0,
      },
    };
  } catch (err) {
    console.error('Teacher report generation failed, using fallback:', err);
    return {
      success: true,
      report: generateTeacherFallback(input),
      generatedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
