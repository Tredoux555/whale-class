// /api/montree/weekly-review/[childId]/route.ts
// POST: Generate teacher review OR parent report for one child
// POST body: { type: 'teacher' | 'parent', locale?: 'en' | 'zh' }
// PATCH: Refine report via teacher feedback (chat with AI)
// PATCH body: { type: 'teacher' | 'parent', feedback: string, current_report: string, locale?: 'en' | 'zh' }

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import {
  loadAllCurriculumWorks,
  enrichWithChineseNames,
  getChineseNameMap,
  findCurriculumWorkByName,
} from '@/lib/montree/curriculum-loader';

// ── Types ──

interface FocusWork {
  area: string;
  work_name: string;
  status: string;
  notes?: string;
  set_by?: string;
  set_at?: string;
  chineseName?: string;
}

interface ProgressRecord {
  work_name: string;
  area: string;
  status: string;
  updated_at: string;
  notes?: string;
}

interface CurriculumWork {
  area_key: string;
  work_key: string;
  name: string;
  chineseName?: string;
  description?: string;
  category_name?: string;
  sequence: number;
  prerequisites?: string[];
  direct_aims?: string[];
  indirect_aims?: string[];
  materials?: string[];
  parent_description?: string;
  why_it_matters?: string;
}

// ── Constants ──

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;

const AREA_LABELS: Record<string, Record<string, string>> = {
  en: {
    practical_life: 'Practical Life',
    sensorial: 'Sensorial',
    mathematics: 'Mathematics',
    language: 'Language',
    cultural: 'Science & Culture',
  },
  zh: {
    practical_life: '日常生活',
    sensorial: '感官区',
    mathematics: '数学',
    language: '语言',
    cultural: '科学文化',
  },
};

const STATUS_LABELS: Record<string, Record<string, string>> = {
  en: {
    mastered: 'Mastered',
    practicing: 'Practicing',
    presented: 'Presented',
    not_started: 'Not Started',
  },
  zh: {
    mastered: '已掌握',
    practicing: '练习中',
    presented: '已展示',
    not_started: '未开始',
  },
};

// ── Curriculum Intelligence ──

function buildCurriculumContext(
  focusWorks: FocusWork[],
  weekProgress: ProgressRecord[],
  allProgress: ProgressRecord[],
  guruReasons: Record<string, string>,
  locale: string
): string {
  const allCurriculum = loadAllCurriculumWorks();
  const curriculumMap = new Map<string, CurriculumWork>();
  for (const w of allCurriculum) {
    curriculumMap.set(w.name.toLowerCase(), w as CurriculumWork);
    if (w.work_key) curriculumMap.set(w.work_key.toLowerCase(), w as CurriculumWork);
  }

  const masteredSet = new Set(
    allProgress.filter(p => p.status === 'mastered').map(p => p.work_name.toLowerCase())
  );
  const practicingSet = new Set(
    allProgress.filter(p => p.status === 'practicing').map(p => p.work_name.toLowerCase())
  );

  const sections: string[] = [];

  for (const area of AREAS) {
    const areaLabel = AREA_LABELS[locale]?.[area] || AREA_LABELS.en[area];
    const focusWork = focusWorks.find(fw => fw.area === area);

    if (!focusWork) {
      const noFocus = locale === 'zh' ? '该区域未分配重点工作' : 'No focus work assigned this area.';
      sections.push(`## ${areaLabel}\n${noFocus}`);
      continue;
    }

    const currWork = curriculumMap.get(focusWork.work_name.toLowerCase());
    const displayName = (locale === 'zh' && focusWork.chineseName) ? focusWork.chineseName : focusWork.work_name;
    const lines: string[] = [`## ${areaLabel}: ${displayName}`];
    lines.push(`Status: ${STATUS_LABELS[locale]?.[focusWork.status] || focusWork.status}`);

    // Guru's reasoning (capped at 500 chars to prevent context bloat)
    if (guruReasons[area]) {
      const reason = typeof guruReasons[area] === 'string' ? guruReasons[area].slice(0, 500) : '';
      if (reason) lines.push(`Guru's reasoning: ${reason}`);
    }

    if (currWork) {
      if (currWork.description) lines.push(`What it is: ${currWork.description}`);

      // Prerequisites and their status
      if (currWork.prerequisites && currWork.prerequisites.length > 0) {
        const prereqLabel = locale === 'zh' ? '先决条件' : 'Prerequisites';
        const statusLabels = locale === 'zh'
          ? { mastered: '✅ 已掌握', practicing: '🔄 练习中', notYet: '⬜ 未开始' }
          : { mastered: '✅ mastered', practicing: '🔄 practicing', notYet: '⬜ not yet' };
        const prereqLines = currWork.prerequisites.map(p => {
          const pLower = p.toLowerCase();
          const status = masteredSet.has(pLower) ? statusLabels.mastered :
            practicingSet.has(pLower) ? statusLabels.practicing : statusLabels.notYet;
          return `  - ${p}: ${status}`;
        });
        lines.push(`${prereqLabel}:\n${prereqLines.join('\n')}`);
      }

      // What comes next in the sequence
      const areaWorks = allCurriculum.filter(w => w.area_key === area);
      const currentIdx = areaWorks.findIndex(w => w.name.toLowerCase() === focusWork.work_name.toLowerCase());
      if (currentIdx >= 0 && currentIdx < areaWorks.length - 1) {
        const nextWork = areaWorks[currentIdx + 1];
        const nextLabel = locale === 'zh' ? '序列中的下一个' : 'Next in sequence';
        const catLabel = locale === 'zh' ? '同类别' : 'same category';
        lines.push(`${nextLabel}: ${nextWork.name} (${nextWork.category_name || catLabel})`);
      }

      if (currWork.direct_aims?.length) lines.push(`Direct aims: ${currWork.direct_aims.join(', ')}`);
      if (currWork.indirect_aims?.length) lines.push(`Indirect aims: ${currWork.indirect_aims.join(', ')}`);
      if (currWork.parent_description) lines.push(`Parent-friendly description: ${currWork.parent_description}`);
      if (currWork.why_it_matters) lines.push(`Why it matters: ${currWork.why_it_matters}`);
    }

    // This week's progress for this area
    const areaProgress = weekProgress.filter(p => p.area === area);
    if (areaProgress.length > 0) {
      const activityLabel = locale === 'zh' ? '本周活动' : "This week's activity";
      const progressLines = areaProgress.map(p =>
        `  - ${p.work_name}: ${STATUS_LABELS[locale]?.[p.status] || p.status}${p.notes ? ` (${p.notes})` : ''}`
      );
      lines.push(`${activityLabel}:\n${progressLines.join('\n')}`);
    }

    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}

// ── Prompt Builders ──

function buildTeacherPrompt(
  childName: string,
  curriculumContext: string,
  locale: string
): string {
  const lang = locale === 'zh' ? 'Chinese (Mandarin)' : 'English';
  return `You are an expert AMI Montessori guide writing an internal weekly review for a teacher's group discussion.

CHILD: ${childName}
OUTPUT LANGUAGE: ${lang}

CURRICULUM CONTEXT (current shelf, prerequisites, sequence, guru reasoning):
${curriculumContext}

Write a structured weekly review with these sections:

1. **THIS WEEK'S SUMMARY** (2-3 sentences)
What the child worked on, how they engaged, any notable observations.

2. **PER-AREA REVIEW** (for each of the 5 areas that has a focus work)
For each area:
- Current work and status
- What was observed/accomplished this week
- Any concerns or celebrations

3. **NEXT WEEK'S PLAN** (the most important section)
For each area, recommend the next work (or continue current). For EACH recommendation:
- Name the specific work
- Explain WHY this work comes next: cite which prerequisites are mastered, where the child is in the curriculum sequence, what sensitive period or developmental need this serves
- Explain how this work CONNECTS to their other areas (cross-curricular links)

4. **DISCUSSION POINTS** (2-3 bullet points)
Things the lead teacher might want to discuss with the team — concerns, ideas, questions.

Be specific, practical, and grounded in Montessori pedagogy. Use the curriculum data provided — cite prerequisites by name, reference the sequence, explain the developmental logic. This is for professionals who understand Montessori terminology.

Return ONLY the review text, no JSON wrapper.`;
}

function buildParentPrompt(
  childName: string,
  curriculumContext: string,
  locale: string
): string {
  const lang = locale === 'zh' ? 'Chinese (Mandarin)' : 'English';
  return `You are writing a warm, professional weekly update for a parent about their child's Montessori education.

CHILD: ${childName}
OUTPUT LANGUAGE: ${lang}

CURRICULUM CONTEXT (current shelf, what they did, what's next):
${curriculumContext}

Write a parent-friendly weekly report:

1. **GREETING** — Warm, personal opening mentioning the child by name.

2. **THIS WEEK** — What their child explored and accomplished. Use simple language — no jargon. Instead of "mastered the decimal system", say "confidently working with large numbers using golden beads." Make the parent FEEL their child's growth.

3. **WHY THESE ACTIVITIES MATTER** — For each main activity, briefly explain WHY it matters for their child's development. Parents want to understand the purpose, not just the name. Example: "The pouring exercises aren't just about not spilling — they're building the hand control and concentration your child will need for writing."

4. **COMING UP NEXT WEEK** — What the child will work on next and WHY. Frame it in terms of their child's readiness: "Because [child] has shown such confidence with X, we're excited to introduce Y which builds on that foundation."

5. **AT HOME** — One simple, specific thing the parent can do at home that connects to the classroom work.

6. **CLOSING** — Warm sign-off.

Keep it concise (250-350 words). The tone should be warm but not saccharine — like a trusted colleague who genuinely cares about their child. No emojis in the text.

Return ONLY the report text, no JSON wrapper.`;
}

function buildRefinementPrompt(
  type: 'teacher' | 'parent',
  currentReport: string,
  feedback: string,
  locale: string
): string {
  const lang = locale === 'zh' ? 'Chinese (Mandarin)' : 'English';
  const audience = type === 'teacher'
    ? 'This is an internal teacher review for group discussion.'
    : 'This is a parent-facing weekly update.';

  return `You are refining a Montessori weekly ${type === 'teacher' ? 'review' : 'report'} based on teacher feedback.

${audience}
OUTPUT LANGUAGE: ${lang}

CURRENT REPORT:
${currentReport}

TEACHER FEEDBACK:
${feedback}

Revise the report incorporating the feedback. Maintain the same structure and tone. If the feedback suggests changing a work recommendation, update both the recommendation AND the reasoning to be internally consistent.

Return ONLY the revised report text, no JSON wrapper.`;
}

// ── Data Fetching ──

async function fetchChildWeekData(childId: string, classroomId: string) {
  const supabase = getSupabase();

  // Monday of current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const mondayStr = monday.toISOString();

  // Sunday end of current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const sundayStr = sunday.toISOString();

  const [
    { data: child },
    { data: focusWorks },
    { data: weekProgress },
    { data: allProgress },
    { data: guruInteractions },
    { data: weekMedia },
  ] = await Promise.all([
    // Child info + settings (for guru_area_reasons)
    supabase.from('montree_children')
      .select('id, name, settings')
      .eq('id', childId)
      .maybeSingle(),

    // Current focus works (the shelf)
    supabase.from('montree_child_focus_works')
      .select('area, work_name, status, notes, set_by, set_at')
      .eq('child_id', childId),

    // This week's progress changes
    supabase.from('montree_child_progress')
      .select('work_name, area, status, updated_at, notes')
      .eq('child_id', childId)
      .gte('updated_at', mondayStr)
      .lte('updated_at', sundayStr),

    // All-time progress (for prerequisite status checking)
    supabase.from('montree_child_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', childId),

    // Guru interactions this week (for context)
    supabase.from('montree_guru_interactions')
      .select('question, response_insight, created_at')
      .eq('child_id', childId)
      .gte('created_at', mondayStr)
      .order('created_at', { ascending: false })
      .limit(5),

    // Photos this week
    supabase.from('montree_media')
      .select('id, storage_path, work_id, caption, captured_at')
      .eq('child_id', childId)
      .gte('captured_at', mondayStr)
      .lte('captured_at', sundayStr)
      .limit(20),
  ]);

  const settings = (child?.settings as Record<string, unknown>) || {};
  const guruReasons = (settings.guru_area_reasons as Record<string, string>) || {};

  return {
    child,
    focusWorks: (focusWorks || []) as FocusWork[],
    weekProgress: (weekProgress || []) as ProgressRecord[],
    allProgress: (allProgress || []) as ProgressRecord[],
    guruInteractions: guruInteractions || [],
    weekMedia: weekMedia || [],
    guruReasons,
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  };
}

// ── POST: Generate a new review ──

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await params;

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const limited = await checkRateLimit(`weekly-review-${auth.userId}`, 30, 86400);
    if (limited) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    if (!anthropic) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const body = await request.json();
    const type = body.type as 'teacher' | 'parent';
    const locale = (['en', 'zh'].includes(body.locale) ? body.locale : 'en') as string;

    if (!type || !['teacher', 'parent'].includes(type)) {
      return NextResponse.json({ error: 'type must be "teacher" or "parent"' }, { status: 400 });
    }

    const data = await fetchChildWeekData(childId, auth.classroomId || '');
    if (!data.child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Enrich with Chinese names if locale is zh
    const enrichedFocus = locale === 'zh'
      ? enrichWithChineseNames(data.focusWorks.map(fw => ({ ...fw })))
      : data.focusWorks;

    const curriculumContext = buildCurriculumContext(
      enrichedFocus,
      data.weekProgress,
      data.allProgress,
      data.guruReasons,
      locale
    );

    const prompt = type === 'teacher'
      ? buildTeacherPrompt(data.child.name, curriculumContext, locale)
      : buildParentPrompt(data.child.name, curriculumContext, locale);

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const reportText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    if (!reportText) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      type,
      child_name: data.child.name,
      report: reportText,
      week_start: data.weekStart,
      week_end: data.weekEnd,
      focus_works: enrichedFocus.map(fw => ({
        area: fw.area,
        work_name: fw.work_name,
        status: fw.status,
      })),
      photos_count: data.weekMedia.length,
    });

  } catch (error) {
    console.error('Weekly review generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH: Refine report via teacher feedback ──

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await params;

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const limited = await checkRateLimit(`weekly-review-refine-${auth.userId}`, 30, 86400);
    if (limited) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    if (!anthropic) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { type, feedback, current_report, locale: reqLocale } = body;
    const locale = (['en', 'zh'].includes(reqLocale) ? reqLocale : 'en') as string;

    if (!type || !['teacher', 'parent'].includes(type)) {
      return NextResponse.json({ error: 'type must be "teacher" or "parent"' }, { status: 400 });
    }
    if (!feedback || typeof feedback !== 'string' || feedback.length > 2000) {
      return NextResponse.json({ error: 'feedback required (max 2000 chars)' }, { status: 400 });
    }
    if (!current_report || typeof current_report !== 'string') {
      return NextResponse.json({ error: 'current_report required' }, { status: 400 });
    }

    const prompt = buildRefinementPrompt(type, current_report, feedback, locale);

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const reportText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    if (!reportText) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      type,
      report: reportText,
    });

  } catch (error) {
    console.error('Weekly review refine error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
