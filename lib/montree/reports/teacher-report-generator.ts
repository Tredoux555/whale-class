// lib/montree/reports/teacher-report-generator.ts
// Sonnet-powered Montessori expert teacher report generator
// Produces per-child weekly analysis at the level of a 30-year AMI consultant
// This is the internal report — detailed, developmental, forward-looking

import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';
import type { WeeklyAnalysisResult } from '@/lib/montree/ai/weekly-analyzer';

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

  "key_insight": "The most important paragraph. Synthesize everything into 3-5 sentences that capture the essence of this child's week. Start with the big picture — is this child on track? What's the developmental story? Then give the headline recommendation: 'Taking all of this into consideration, I recommend focusing on [specific work] in [area] because [developmental reason], [specific work] in [area] because [reason], and [specific work] in [area] because [reason] over the coming week.' This should read like the kind of insight that makes a teacher say 'wow, that's exactly right.'"
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
- Return ONLY valid JSON, no other text`;
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
        ? `${firstName}本周在${getAreaLabel(area, locale)}领域进行了${works.length}项活动：${works.map(w => w.work_name).join('、')}。`
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
      reasoning: w.reasons.join('; '),
    })),

    key_insight: locale === 'zh'
      ? `${firstName}本周参与了${photos.length}项活动。${analysis.recommended_works.length > 0 ? `建议下周关注${analysis.recommended_works.slice(0, 3).map(w => `${getAreaLabel(w.area, locale)}的${w.work_name}`).join('、')}。` : ''}`
      : `${firstName} engaged with ${photos.length} activities this week. ${analysis.recommended_works.length > 0 ? `I recommend focusing on ${analysis.recommended_works.slice(0, 3).map(w => `${w.work_name} in ${getAreaLabel(w.area, locale)}`).join(', ')} in the coming week.` : ''}`,
  };
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

    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('')
      .trim();

    // Parse JSON response
    let report: TeacherReportContent;
    try {
      report = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from response (in case Sonnet wrapped it)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse teacher report JSON:', rawText.substring(0, 200));
        return {
          success: true,
          report: generateTeacherFallback(input),
          generatedAt: new Date().toISOString(),
          error: 'Failed to parse AI response, using fallback',
        };
      }
    }

    // Validate required fields exist
    if (!report.developmental_snapshot || !report.key_insight) {
      console.error('Teacher report missing required fields');
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
      model: HAIKU_MODEL,
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
