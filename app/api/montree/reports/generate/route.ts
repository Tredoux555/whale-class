// app/api/montree/reports/generate/route.ts
// Generate formatted reports from weekly analysis
// POST: Generate teacher, parent, and/or AI analysis reports

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { analyzeWeeklyProgress, WeeklyAnalysisResult } from '@/lib/montree/ai';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getLocaleFromRequest, getTranslator, getTranslatedAreaName } from '@/lib/montree/i18n/server';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';
import type { Locale } from '@/lib/montree/i18n/locales';
import { isValidLocale } from '@/lib/montree/i18n/locales';
import { getLanguageName } from '@/lib/montree/i18n/locale-config';

// ============================================
// TYPES
// ============================================

interface TeacherReport {
  type: 'teacher';
  child_name: string;
  child_age: number;
  week_range: string;
  summary: string;
  metrics: {
    total_works: number;
    concentration_score: number;
    concentration_assessment: string;
    avg_duration?: number;
    expected_duration: number;
  };
  area_breakdown: {
    area: string;
    percentage: number;
    expected_range: string;
    status: 'healthy' | 'low' | 'high';
  }[];
  sensitive_periods: {
    name: string;
    status: string;
    confidence: number;
    evidence: string[];
  }[];
  flags: {
    type: 'red' | 'yellow';
    issue: string;
    evidence: string;
    recommendation: string;
  }[];
  recommendations: {
    work_name: string;
    area: string;
    score: number;
    reasons: string[];
  }[];
  work_patterns: {
    work: string;
    count: number;
  }[];
}

interface ParentReport {
  type: 'parent';
  child_name: string;
  greeting: string;
  highlights: string[];
  areas_explored: {
    area_name: string;
    emoji: string;
    works: string[];
    description: string;
  }[];
  home_suggestions: string[];
  closing: string;
  photos?: { url: string; caption?: string }[];
}

interface AIAnalysisReport {
  type: 'ai_analysis';
  child_name: string;
  child_age: number;
  profile: {
    concentration: string;
    emotional: string;
    social: string;
  };
  sensitive_periods_analysis: string;
  developmental_trajectory: string;
  concerns: {
    severity: string;
    issue: string;
    evidence: string;
    recommendation: string;
  }[];
  two_week_plan: string[];
  observation_questions: string[];
  parent_communication_points: string[];
}

// ============================================
// LOCALE-AGNOSTIC HELPERS
// ============================================

// TYPE A: Date separator (locale-keyed Record)
const DATE_SEPARATORS: Record<string, string> = {
  zh: '至',
  es: 'al',
};
const getDateSeparator = (locale: Locale): string => DATE_SEPARATORS[locale] || 'to';

// TYPE A: Sensitive period name translations (map for non-English locales)
const SENSITIVE_PERIOD_NAMES_ZH: Record<string, string> = {
  order: '秩序',
  language: '语言',
  movement: '运动',
  sensory: '感官',
  small_objects: '细小物品',
  grace_courtesy: '礼仪与优雅',
  writing: '书写',
  reading: '阅读',
};
const SENSITIVE_PERIOD_NAMES: Record<string, Record<string, string>> = {
  en: {
    order: 'Order', language: 'Language', movement: 'Movement', sensory: 'Sensory', small_objects: 'Small Objects', grace_courtesy: 'Grace & Courtesy', writing: 'Writing', reading: 'Reading',
  },
  zh: SENSITIVE_PERIOD_NAMES_ZH,
  es: {
    order: 'Orden', language: 'Lenguaje', movement: 'Movimiento', sensory: 'Sensorial', small_objects: 'Objetos Pequeños', grace_courtesy: 'Gracia y Cortesía', writing: 'Escritura', reading: 'Lectura',
  },
};
const translateSensitivePeriodName = (name: string, locale: Locale): string => {
  const names = SENSITIVE_PERIOD_NAMES[locale] || SENSITIVE_PERIOD_NAMES['en'];
  const lookupKey = name.toLowerCase();
  return names[lookupKey] || names[lookupKey.replace(/\s+/g, '_')] || name;
};

// TYPE A: Sensitive period status translations (map for non-English locales)
const SENSITIVE_PERIOD_STATUS_ZH: Record<string, string> = {
  active: '活跃',
  emerging: '显现',
  inactive: '不活跃',
};
const SENSITIVE_PERIOD_STATUS: Record<string, Record<string, string>> = {
  en: {
    active: 'Active', emerging: 'Emerging', inactive: 'Inactive',
  },
  zh: SENSITIVE_PERIOD_STATUS_ZH,
  es: {
    active: 'Activo', emerging: 'Emergente', inactive: 'Inactivo',
  },
};
const translateSensitivePeriodStatus = (status: string, locale: Locale): string => {
  const statuses = SENSITIVE_PERIOD_STATUS[locale] || SENSITIVE_PERIOD_STATUS['en'];
  return statuses[status] || status;
};

// TYPE E: AI analysis phrases - locale-aware text for AI reports
const AI_ANALYSIS_PHRASES: Record<string, Record<string, string>> = {
  zh: {
    developmentaryTrajectoryOpening: '的发展与其年龄（{age}岁）相符。',
    activeSensitivePeriodPrefix: '目前处于',
    activeSensitivePeriodSuffix: '敏感期，需要提供适当的教具支持。',
    activeJoiner: '和',
    concentrationNeedsSupport: '专注力发展需要支持——建议增加日常生活练习。',
    confidenceSuffix: '置信度',
    presentWork: '展示{work}（{area}）',
    inviteToArea: '邀请到{area}区域',
    observationQuestion1: '{name}在活动之间的过渡中有什么反应？',
    observationQuestion2: '一天中哪个时间段专注力最强？',
    observationQuestion3: '{name}自然地倾向于和哪些同伴互动？',
    parentPoint1: '{name}目前的兴趣以及如何在家中支持',
    parentPoint2: '与其年龄相符的发展里程碑',
    parentPointExtra: '我们正在提供额外支持的领域',
    insufficientData: '敏感期分析数据不足。',
  },
  en: {
    developmentaryTrajectoryOpening: ' is developing appropriately for their age ({age} years). ',
    activeSensitivePeriodPrefix: 'Currently in ',
    activeSensitivePeriodSuffix: ' sensitive period(s), which should be supported with appropriate materials. ',
    activeJoiner: ' and ',
    concentrationNeedsSupport: 'Concentration development needs support - recommend more practical life work. ',
    confidenceSuffix: ' confidence',
    presentWork: 'Present {work} ({area})',
    inviteToArea: 'Invite to {area} area',
    observationQuestion1: 'How does {name} respond to transitions between activities?',
    observationQuestion2: 'What time of day shows the strongest concentration?',
    observationQuestion3: 'Which peers does {name} naturally gravitate toward?',
    parentPoint1: '{name}\'s current interests and how to support them at home',
    parentPoint2: 'Developmental milestones appropriate for their age',
    parentPointExtra: 'Areas where we are providing extra support',
    insufficientData: 'Insufficient data for sensitive period analysis.',
  },
};

const getAIPhrase = (locale: Locale, key: string, defaultValue: string = ''): string => {
  return AI_ANALYSIS_PHRASES[locale]?.[key] || AI_ANALYSIS_PHRASES['en']?.[key] || defaultValue;
};

// ============================================
// AREA HELPERS
// ============================================

function getAreaDisplay(area: string, locale: Locale): { name: string; emoji: string; description: string } {
  const t = getTranslator(locale);
  const emojis: Record<string, string> = {
    practical_life: '🧹', sensorial: '👁️', mathematics: '🔢',
    language: '📚', cultural: '🌍', special_events: '🎉',
  };
  const descriptions: Record<string, string> = {
    practical_life: t('report.generate.areaDescription.practical_life' as any, 'Activities for independence and care of self and environment'),
    sensorial: t('report.generate.areaDescription.sensorial' as any, 'Exploring the world through the senses'),
    mathematics: t('report.generate.areaDescription.mathematics' as any, 'Understanding numbers, quantities, and patterns'),
    language: t('report.generate.areaDescription.language' as any, 'Letters, sounds, reading, and writing'),
    cultural: t('report.generate.areaDescription.cultural' as any, 'Geography, science, art, and music'),
  };

  return {
    name: getTranslatedAreaName(area, locale),
    emoji: emojis[area] || '📌',
    description: descriptions[area] || '',
  };
}

// ============================================
// REPORT GENERATORS
// ============================================

function generateTeacherReport(
  analysis: WeeklyAnalysisResult,
  locale: Locale,
  dbChineseMap: Map<string, string>
): TeacherReport {
  const areaBreakdown = Object.entries(analysis.area_distribution).map(([area, pct]) => {
    const expected = analysis.expected_distribution[area];
    let status: 'healthy' | 'low' | 'high' = 'healthy';
    if (expected) {
      if (pct < expected.min) status = 'low';
      else if (pct > expected.max) status = 'high';
    }
    const areaDisplay = getAreaDisplay(area, locale);
    return {
      area: areaDisplay.name,
      percentage: Math.round(pct * 100),
      expected_range: expected ? `${Math.round(expected.min * 100)}-${Math.round(expected.max * 100)}%` : 'N/A',
      status,
    };
  });

  return {
    type: 'teacher',
    child_name: analysis.child_name,
    child_age: analysis.child_age,
    week_range: `${analysis.week_start} ${getDateSeparator(locale)} ${analysis.week_end}`,
    summary: analysis.teacher_summary,
    metrics: {
      total_works: analysis.total_works,
      concentration_score: analysis.concentration_score,
      concentration_assessment: analysis.concentration_assessment,
      avg_duration: analysis.avg_duration_minutes,
      expected_duration: analysis.expected_duration_minutes,
    },
    area_breakdown: areaBreakdown,
    sensitive_periods: analysis.detected_sensitive_periods,
    flags: [...analysis.red_flags, ...analysis.yellow_flags],
    recommendations: analysis.recommended_works,
    work_patterns: analysis.repetition_highlights.map(h => {
      const getDisplayWorkName = (workName: string): string => {
        if (locale === 'zh') {
          return getChineseNameForWork(workName) || dbChineseMap.get(workName.toLowerCase().trim()) || workName;
        }
        return workName;
      };
      return {
        ...h,
        work: getDisplayWorkName(h.work),
      };
    }),
  };
}

function generateParentReport(
  analysis: WeeklyAnalysisResult,
  worksByArea: Record<string, string[]>,
  locale: Locale,
  dbChineseMap: Map<string, string>
): ParentReport {
  const t = getTranslator(locale);
  const firstName = analysis.child_name.split(' ')[0];

  // Generate greeting based on emotional state — using i18n keys for both locales
  let greeting: string;
  if (analysis.emotional_state === 'positive') {
    greeting = t('report.generate.activeWeek' as any, `${firstName} had an active and engaged week!`).replace('{name}', firstName);
  } else {
    greeting = t('report.generate.wonderfulWeek' as any, `${firstName} had a wonderful week in the classroom!`).replace('{name}', firstName);
  }

  // Generate highlights — using i18n keys for both locales
  const highlights: string[] = [];
  if (analysis.repetition_highlights.length > 0) {
    const rawWorkName = analysis.repetition_highlights[0].work;
    // TYPE A: Locale-aware work name display
    const WORK_NAME_BY_LOCALE: Record<Locale, string> = {
      zh: getChineseNameForWork(rawWorkName) || dbChineseMap.get(rawWorkName.toLowerCase().trim()) || rawWorkName,
      en: rawWorkName,
    };
    const displayWorkName = WORK_NAME_BY_LOCALE[locale] || WORK_NAME_BY_LOCALE['en'];
    const worksText = `${displayWorkName} (${analysis.repetition_highlights[0].count}x)`;
    highlights.push(
      t('report.generate.deepConcentration' as any, `${firstName} showed deep concentration with {works}.`)
        .replace('{name}', firstName)
        .replace('{works}', worksText)
    );
  }
  if (analysis.concentration_assessment === 'strong') {
    highlights.push(
      t('report.generate.excellentFocus' as any, `${firstName} demonstrated excellent focus during work time.`)
        .replace('{name}', firstName)
    );
  }
  const activePeriods = analysis.detected_sensitive_periods.filter(p => p.status === 'active');
  if (activePeriods.length > 0) {
    // TYPE A: Locale-aware sensitive period name
    const PERIOD_NAMES_BY_LOCALE: Record<string, Record<string, string>> = {
      en: { order: 'Order', language: 'Language', movement: 'Movement', sensory: 'Sensory', small_objects: 'Small Objects', grace_courtesy: 'Grace & Courtesy', writing: 'Writing', reading: 'Reading' },
      zh: { order: '秩序', language: '语言', movement: '运动', sensory: '感官', small_objects: '细小物品', grace_courtesy: '礼仪与优雅', writing: '书写', reading: '阅读' },
      es: { order: 'Orden', language: 'Lenguaje', movement: 'Movimiento', sensory: 'Sensorial', small_objects: 'Objetos Pequeños', grace_courtesy: 'Gracia y Cortesía', writing: 'Escritura', reading: 'Lectura' },
    };
    const periodNameKey = activePeriods[0].period_name.toLowerCase();
    const periodMap = PERIOD_NAMES_BY_LOCALE[locale] || PERIOD_NAMES_BY_LOCALE['en'];
    const areaDisplay = periodMap[periodNameKey] || periodNameKey;
    highlights.push(
      t('report.generate.specialInterest' as any, `${firstName} is showing special interest in the {area} area.`)
        .replace('{name}', firstName)
        .replace('{area}', areaDisplay)
    );
  }

  // Generate areas explored
  const areasExplored = Object.entries(worksByArea)
    .filter(([_, works]) => works.length > 0)
    .map(([area, works]) => {
      const areaDisplay = getAreaDisplay(area, locale);
      return {
        area_name: areaDisplay.name,
        emoji: areaDisplay.emoji,
        works: works.slice(0, 3),
        description: areaDisplay.description,
      };
    });

  // Home suggestions — using i18n keys for both locales
  const homeSuggestions: string[] = [
    t('report.generate.encourageIndependence' as any, 'Continue encouraging independence at home — let them help with simple tasks!'),
    t('report.generate.readTogether' as any, 'Read together daily and point out letters in the environment.'),
    t('report.generate.sortAndCount' as any, 'Provide opportunities for sorting, counting, and organizing.'),
  ];

  // Closing — using i18n keys for both locales
  const closing = t('report.generate.loveHaving' as any, `We love having ${firstName} in our classroom. See you next week!`)
    .replace('{name}', firstName);

  return {
    type: 'parent',
    child_name: analysis.child_name,
    greeting,
    highlights,
    areas_explored: areasExplored,
    home_suggestions: homeSuggestions,
    closing,
  };
}

function generateAIAnalysisReport(
  analysis: WeeklyAnalysisResult,
  locale: string | undefined,
  dbChineseMap: Map<string, string>
): AIAnalysisReport {
  const firstName = analysis.child_name.split(' ')[0];
  // TYPE A: Sensitive period name translations - locale-aware
  const PERIOD_NAMES_BY_LOCALE: Record<string, Record<string, string>> = {
    en: { order: 'Order', language: 'Language', movement: 'Movement', sensory: 'Sensory', small_objects: 'Small Objects', grace_courtesy: 'Grace & Courtesy', writing: 'Writing', reading: 'Reading' },
    zh: { order: '秩序', language: '语言', movement: '运动', sensory: '感官', small_objects: '细小物品', grace_courtesy: '礼仪与优雅', writing: '书写', reading: '阅读' },
    es: { order: 'Orden', language: 'Lenguaje', movement: 'Movimiento', sensory: 'Sensorial', small_objects: 'Objetos Pequeños', grace_courtesy: 'Gracia y Cortesía', writing: 'Escritura', reading: 'Lectura' },
  };
  const translatePeriodName = (name: string): string => {
    const lookupKey = name.toLowerCase();
    const periodMap = PERIOD_NAMES_BY_LOCALE[locale] || PERIOD_NAMES_BY_LOCALE['en'];
    return periodMap[lookupKey] || periodMap[lookupKey.replace(/\s+/g, '_')] || name;
  };

  // Developmental trajectory
  let trajectory = getAIPhrase(normalizedLocale, 'developmentaryTrajectoryOpening', '')
    .replace('{age}', analysis.child_age.toString());
  trajectory = `${firstName}${trajectory}`;

  if (analysis.detected_sensitive_periods.length > 0) {
    const active = analysis.detected_sensitive_periods.filter(p => p.status === 'active');
    if (active.length > 0) {
      const activePeriodNames = active.map(p => translatePeriodName(p.period_name));
      const prefix = getAIPhrase(normalizedLocale, 'activeSensitivePeriodPrefix', '');
      const joiner = getAIPhrase(normalizedLocale, 'activeJoiner', ' and ');
      const suffix = getAIPhrase(normalizedLocale, 'activeSensitivePeriodSuffix', '');
      trajectory += `${prefix}${activePeriodNames.join(joiner)}${suffix}`;
    }
  }
  if (analysis.concentration_assessment === 'weak') {
    trajectory += getAIPhrase(normalizedLocale, 'concentrationNeedsSupport', '');
  }

  // Sensitive periods analysis
  const STATUS_BY_LOCALE: Record<Locale, Record<string, string>> = {
    en: { active: 'active', emerging: 'emerging', inactive: 'inactive' },
    zh: { active: '活跃', emerging: '显现', inactive: '不活跃' },
  };
  const getStatusDisplay = (status: string): string => STATUS_BY_LOCALE[normalizedLocale]?.[status] || status;
  let spAnalysis = '';
  for (const sp of analysis.detected_sensitive_periods.slice(0, 3)) {
    const statusDisplay = getStatusDisplay(sp.status);
    const confidenceSuffix = getAIPhrase(normalizedLocale, 'confidenceSuffix', 'confidence');
    spAnalysis += `${translatePeriodName(sp.period_name)} (${statusDisplay}, ${sp.confidence}% ${confidenceSuffix}): ${sp.evidence.join('; ')}. `;
  }

  // Two week plan (translate work names and areas for Chinese)
  const getWorkDisplayName = (workName: string): string => {
    if (normalizedLocale === 'zh') {
      return getChineseNameForWork(workName) || dbChineseMap.get(workName.toLowerCase().trim()) || workName;
    }
    return workName;
  };
  const getAreaDisplayName = (area: string): string => {
    return getTranslatedAreaName(area, normalizedLocale);
  };
  const twoWeekPlan = [
    ...analysis.recommended_works.slice(0, 3).map(r => {
      const workDisplay = getWorkDisplayName(r.work_name);
      const areaDisplay = getAreaDisplayName(r.area);
      const presentPhrase = getAIPhrase(normalizedLocale, 'presentWork', 'Present {work} ({area})')
        .replace('{work}', workDisplay)
        .replace('{area}', areaDisplay);
      return presentPhrase;
    }),
    ...analysis.areas_needing_attention.slice(0, 2).map(a => {
      const areaDisplay = getAreaDisplayName(a.area);
      const invitePhrase = getAIPhrase(normalizedLocale, 'inviteToArea', 'Invite to {area} area')
        .replace('{area}', areaDisplay);
      return invitePhrase;
    }),
  ];

  // Observation questions
  const observationQuestions = [
    getAIPhrase(normalizedLocale, 'observationQuestion1', '').replace('{name}', firstName),
    getAIPhrase(normalizedLocale, 'observationQuestion2', ''),
    getAIPhrase(normalizedLocale, 'observationQuestion3', '').replace('{name}', firstName),
  ];

  // Parent communication points
  const parentPoints = [
    getAIPhrase(normalizedLocale, 'parentPoint1', '').replace('{name}', firstName),
    getAIPhrase(normalizedLocale, 'parentPoint2', ''),
  ];
  if (analysis.red_flags.length > 0) {
    parentPoints.push(getAIPhrase(normalizedLocale, 'parentPointExtra', ''));
  }

  return {
    type: 'ai_analysis',
    child_name: analysis.child_name,
    child_age: analysis.child_age,
    profile: {
      concentration: analysis.concentration_assessment,
      emotional: analysis.emotional_state,
      social: analysis.social_development,
    },
    sensitive_periods_analysis: spAnalysis || getAIPhrase(normalizedLocale, 'insufficientData', ''),
    developmental_trajectory: trajectory,
    concerns: [...analysis.red_flags, ...analysis.yellow_flags].map(f => ({
      severity: f.type,
      issue: f.issue,
      evidence: f.evidence,
      recommendation: f.recommendation,
    })),
    two_week_plan: twoWeekPlan,
    observation_questions: observationQuestions,
    parent_communication_points: parentPoints,
  };
}

// ============================================
// POST: Generate reports
// ============================================
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { child_id, week_start, week_end, report_types } = body;

    if (!child_id || !week_start || !week_end) {
      return NextResponse.json(
        { success: false, error: 'child_id, week_start, and week_end are required' },
        { status: 400 }
      );
    }

    // Verify child belongs to the authenticated user's school
    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const requestedTypes = report_types || ['teacher', 'parent', 'ai_analysis'];

    const supabase = getSupabase();

    // Fetch child first (needed for classroom_id in curriculum query)
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, date_of_birth, classroom_id')
      .eq('id', child_id)
      .maybeSingle();

    if (!child) {
      return NextResponse.json(
        { success: false, error: 'Child not found' },
        { status: 404 }
      );
    }

    // Fetch progress, historical, and curriculum in parallel (all independent)
    const fourWeeksAgo = new Date(week_start);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const [progressResult, historicalResult, curriculumResult] = await Promise.all([
      supabase
        .from('montree_child_progress')
        .select('*')
        .eq('child_id', child_id)
        .gte('created_at', week_start)
        .lte('created_at', week_end + 'T23:59:59'),
      supabase
        .from('montree_child_progress')
        .select('work_name, area, status, created_at')
        .eq('child_id', child_id)
        .gte('created_at', fourWeeksAgo.toISOString())
        .lt('created_at', week_start),
      supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, area, name_chinese')
        .eq('classroom_id', child.classroom_id),
    ]);

    const progress = progressResult.data;
    const historical = historicalResult.data;
    const curriculum = curriculumResult.data;

    // Build DB name→chinese map for custom works (not in static JSON)
    // Priority: static JSON (getChineseNameForWork) → DB fallback (dbChineseMap)
    const dbChineseMap = new Map<string, string>();
    for (const w of (curriculum || []) as Array<{ id: string; name: string; area: string; name_chinese: string | null }>) {
      if (w.name_chinese && w.name) {
        dbChineseMap.set(w.name.toLowerCase().trim(), w.name_chinese);
      }
    }

    // Run analysis
    const analysis = analyzeWeeklyProgress({
      child: {
        id: child.id,
        name: child.name,
        date_of_birth: child.date_of_birth,
        classroom_id: child.classroom_id,
      },
      weekStart: week_start,
      weekEnd: week_end,
      progress: (progress || []).map(p => ({
        work_name: p.work_name,
        area: p.area,
        status: p.status,
        notes: p.notes,
        date: p.created_at,
        duration_minutes: p.duration_minutes,
        repetition_count: p.repetition_count,
      })),
      historicalProgress: (historical || []).map(p => ({
        work_name: p.work_name,
        area: p.area,
        status: p.status,
        date: p.created_at,
      })),
      availableWorks: (curriculum || []).map(w => ({
        id: w.id,
        name: w.name,
        area: w.area,
      })),
    });

    // Extract locale from URL (needed before building worksByArea)
    const locale = getLocaleFromRequest(request.url);

    // Group works by area for parent report (translate names for Chinese locale)
    const worksByArea: Record<string, string[]> = {};
    const getWorkDisplayName = (workName: string): string => {
      const WORK_NAME_MAP: Record<string, string> = {
        zh: getChineseNameForWork(workName) || dbChineseMap.get(workName.toLowerCase().trim()) || workName,
        en: workName,
      };
      return WORK_NAME_MAP[locale] || WORK_NAME_MAP['en'];
    };
    for (const p of progress || []) {
      if (!worksByArea[p.area]) worksByArea[p.area] = [];
      const displayName = getWorkDisplayName(p.work_name);
      if (!worksByArea[p.area].includes(displayName)) {
        worksByArea[p.area].push(displayName);
      }
    }

    // Generate requested reports
    const reports: Record<string, any> = {};

    if (requestedTypes.includes('teacher')) {
      reports.teacher = generateTeacherReport(analysis, locale, dbChineseMap);
    }
    if (requestedTypes.includes('parent')) {
      reports.parent = generateParentReport(analysis, worksByArea, locale, dbChineseMap);
    }
    if (requestedTypes.includes('ai_analysis')) {
      reports.ai_analysis = generateAIAnalysisReport(analysis, locale, dbChineseMap);
    }

    return NextResponse.json({
      success: true,
      reports,
      analysis_summary: {
        child_name: analysis.child_name,
        child_age: analysis.child_age,
        total_works: analysis.total_works,
        concentration_score: analysis.concentration_score,
        flags_count: analysis.red_flags.length + analysis.yellow_flags.length,
      },
    });

  } catch (error) {
    console.error('Reports POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
