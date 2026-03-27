// POST: Generate per-area weekly admin for one child
// GET: Return existing guru_weekly_* fields from child settings

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { updateChildSettings } from '@/lib/montree/guru/settings-helper';
import { enrichWithChineseNames } from '@/lib/montree/curriculum-loader';

// ---- Types ----

interface FocusWork {
  area: string;
  work_name: string;
  status?: string;
  chineseName?: string;
}

interface ProgressRecord {
  work_name: string;
  area: string;
  status: string;
  updated_at: string;
}

interface GuruInteraction {
  question: string;
  response_insight: string;
  asked_at: string;
}
// ---- Area Labels ----

const AREA_LABELS: Record<string, Record<string, string>> = {
  en: {
    practical_life: 'Practical Life',
    sensorial: 'Sensorial',
    mathematics: 'Mathematics',
    language: 'Language',
    cultural: 'Science & Culture',
  },
  zh: {
    practical_life: '日常',
    sensorial: '感官区',
    mathematics: '数学',
    language: '语言',
    cultural: '科学文化',
  },
};

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// ---- Prompt Builder ----

function buildPerChildPrompt(
  childName: string,
  focusWorks: FocusWork[],
  progressRecords: ProgressRecord[],
  guruInteractions: GuruInteraction[],
  locale: string,
  weekStart: string,
  weekEnd: string
): string {
  const isZh = locale === 'zh';
  const labels = AREA_LABELS[locale] || AREA_LABELS.en;
  // Build focus works context (use Chinese names when locale is zh)
  const worksContext = focusWorks.length > 0
    ? focusWorks.map(w => {
        const workDisplay = isZh && w.chineseName ? w.chineseName : w.work_name;
        return `• ${labels[w.area] || w.area}: ${workDisplay} (${w.status || 'assigned'})`;
      }).join('\n')
    : 'No focus works currently assigned.';

  // Build progress context (enrich with Chinese names when locale is zh)
  const enrichedProgress = enrichWithChineseNames(progressRecords);
  const progressContext = enrichedProgress.length > 0
    ? enrichedProgress.map(p => {
        const workDisplay = isZh && p.chineseName ? p.chineseName : p.work_name;
        return `• ${labels[p.area] || p.area}: ${workDisplay} → ${p.status} (${p.updated_at.split('T')[0]})`;
      }).join('\n')
    : 'No progress changes this week.';

  // Build guru context
  const guruContext = guruInteractions.length > 0
    ? guruInteractions.map(g => `Q: ${g.question.slice(0, 200)}\nA: ${g.response_insight.slice(0, 400)}`).join('\n---\n')
    : 'No Guru conversations this week.';

  const outputLang = isZh
    ? 'Write ALL output in Chinese (中文). Area headers in Chinese.'
    : 'Write ALL output in English. Area headers in English.';

  const areaHeaders = isZh
    ? '日常 | 感官区 | 数学 | 语言 | 科学文化'
    : 'Practical | Sensorial | Math | Language | Culture';

  return `You are a senior Montessori educator writing weekly administrative documents for one child.

CHILD: ${childName}
WEEK: ${weekStart} to ${weekEnd}

CURRENT FOCUS WORKS (on the child's shelf):
${worksContext}

PROGRESS THIS WEEK:
${progressContext}

GURU CONVERSATIONS THIS WEEK:
${guruContext}

${outputLang}

YOUR TASKS:

TASK 1 — PLAN ROW
For each of the 5 Montessori areas, suggest ONE specific work for NEXT week based on this week's progress.
- If mastered → suggest the next logical work in sequence
- If practicing → continue the same work
- If presented → continue with guided practice
- If no data → suggest an age-appropriate work based on what's on the shelf
Also include a "notes" field with a brief Chinese developmental observation (1-2 sentences).

TASK 2 — PER-AREA DETAILS
For each of the 5 areas, write:
- "work": The specific work name
- "this_week": What the child did this week in this area (2-3 sentences). Do NOT prefix with the area name — the key already identifies the area.
- "next_week": What to focus on next week (1-2 sentences). Do NOT prefix with the area name.

TASK 3 — FULL SUMMARY
Write a complete narrative summary for this child covering ALL 5 areas. Each area paragraph MUST start with the area prefix (${isZh ? '日常：, 感官：, 数学：, 语言：, 科学文化：' : 'Practical Life:, Sensorial:, Mathematics:, Language:, Science & Culture:'}). This is for the Chinese government weekly summary document. Each area section should be 2-4 sentences (${isZh ? '50-100 Chinese characters' : '30-60 words'} per area).

TASK 4 — QUICK ITEMS
- "this_week": 1-2 sentences summarizing what the child worked on across all areas
- "next_week": 1-2 sentences on next week's plan
- "one_liner": Max 15 words, purely factual: "${childName} did [X] this week; next week [Y]"
- "advice": 1-2 paragraphs of deep developmental advice (AMI progression, sensitive periods, what to watch for). Max 400 words.

OUTPUT FORMAT (respond in JSON only):
{
  "plan_row": {
    "practical_life": "work name",
    "sensorial": "work name",
    "mathematics": "work name",
    "language": "work name",
    "cultural": "work name",
    "notes": "brief developmental note"
  },
  "area_details": {
    "practical_life": { "work": "...", "this_week": "...", "next_week": "..." },
    "sensorial": { "work": "...", "this_week": "...", "next_week": "..." },
    "mathematics": { "work": "...", "this_week": "...", "next_week": "..." },
    "language": { "work": "...", "this_week": "...", "next_week": "..." },
    "cultural": { "work": "...", "this_week": "...", "next_week": "..." }
  },
  "full_summary": "area-prefixed narrative covering all 5 areas",
  "this_week": "...",
  "next_week": "...",
  "one_liner": "${childName} did ... this week; next week ...",
  "advice": "..."
}

IMPORTANT:
- Be specific — use actual Montessori work names from the curriculum
- The plan_row works should match the area_details works
- full_summary MUST include area prefixes (${isZh ? '日常：' : 'Practical Life:'} etc.)
- area_details values must NOT include area prefixes (redundant with key)
- Keep advice practical and actionable
JSON:`;
}
// ---- Parse Response ----

interface ParsedResult {
  plan_row: Record<string, string>;
  area_details: Record<string, { work: string; this_week: string; next_week: string }>;
  full_summary: string;
  this_week: string;
  next_week: string;
  one_liner: string;
  advice: string;
}

function parseResponse(text: string): ParsedResult | null {
  let jsonStr = text.trim();
  // Handle markdown code blocks
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  // Try to extract JSON object if surrounded by text
  if (!jsonStr.startsWith('{')) {
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) jsonStr = match[0];
  }
  try {
    const parsed = JSON.parse(jsonStr);
    // Validate required fields
    if (!parsed.plan_row || !parsed.area_details || !parsed.full_summary) {
      console.error('[weekly-admin] Missing required fields in response');
      return null;
    }
    return parsed as ParsedResult;
  } catch {
    // Try fixing common JSON issues: trailing commas
    try {
      const fixed = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      const parsed = JSON.parse(fixed);
      if (!parsed.plan_row || !parsed.area_details || !parsed.full_summary) return null;
      return parsed as ParsedResult;
    } catch {
      console.error('[weekly-admin] Failed to parse JSON:', jsonStr.slice(0, 300));
      return null;
    }
  }
}

// ---- Week Helpers ----

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// ---- POST Handler ----

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { childId } = await params;

  // Verify child belongs to school
  const childCheck = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!childCheck.allowed) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const locale = body.locale || 'en';
    const weekStart = body.week_start || getWeekStart();

    if (!['en', 'zh'].includes(locale)) {
      return NextResponse.json({ error: 'locale must be "en" or "zh"' }, { status: 400 });
    }

    // Rate limit: 100/day per IP (high to allow batch generation of full classroom)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const supabase = getSupabase();
    const { allowed } = await checkRateLimit(
      supabase, ip,
      '/api/montree/children/weekly-admin',
      100, 1440
    );
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit reached (100/day)' }, { status: 429 });
    }

    if (!anthropic) {
      return NextResponse.json({ error: 'AI not available' }, { status: 503 });
    }
    // Calculate week end (Friday)
    const weekStartDate = new Date(weekStart + 'T00:00:00');
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 4);
    const weekEnd = weekEndDate.toISOString().split('T')[0];

    // Fetch child info
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, settings')
      .eq('id', childId)
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const childName = child.name || 'Student';

    // 4 parallel DB queries
    const [focusRes, progressRes, guruRes] = await Promise.all([
      // 1. Current focus works
      supabase
        .from('montree_child_focus_works')
        .select('area, work_name, status')
        .eq('child_id', childId),

      // 2. Recent progress this week
      supabase
        .from('montree_child_progress')
        .select('work_name, area, status, updated_at')
        .eq('child_id', childId)
        .gte('updated_at', weekStart)
        .order('updated_at', { ascending: false })
        .limit(20),

      // 3. Guru conversations this week
      supabase
        .from('montree_guru_interactions')
        .select('question, response_insight, asked_at')
        .eq('child_id', childId)
        .gte('asked_at', weekStart)
        .order('asked_at', { ascending: false })
        .limit(5),
    ]);

    const rawFocusWorks: FocusWork[] = focusRes.data || [];
    const focusWorks = enrichWithChineseNames(rawFocusWorks);
    const progressRecords: ProgressRecord[] = progressRes.data || [];
    const guruInteractions: GuruInteraction[] = guruRes.data || [];

    // Build prompt
    const prompt = buildPerChildPrompt(
      childName, focusWorks, progressRecords, guruInteractions,
      locale, weekStart, weekEnd
    );

    // Call Sonnet (60s timeout — structured JSON generation can take 15-40s)
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }, { timeout: 60000 });

    // Extract text
    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    if (!responseText) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });
    }

    // Parse
    const parsed = parseResponse(responseText);
    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Save to child settings (catch separately to still return data on save failure)
    try {
      await updateChildSettings(childId, {
      guru_weekly_plan_row: parsed.plan_row,
      guru_weekly_area_details: parsed.area_details,
      guru_weekly_full_summary: parsed.full_summary,
      guru_weekly_this_week: parsed.this_week,
      guru_weekly_next_week: parsed.next_week,
      guru_weekly_one_liner: parsed.one_liner,
      guru_weekly_advice: parsed.advice,
      guru_weekly_summary: `${parsed.this_week} ${parsed.next_week}`.slice(0, 300),
      guru_weekly_summary_updated_at: new Date().toISOString(),
      });
    } catch (saveErr) {
      console.error('[weekly-admin] Failed to save settings:', saveErr);
      // Still return the data even if save fails — user can retry
    }

    return NextResponse.json({
      success: true,
      plan_row: parsed.plan_row,
      area_details: parsed.area_details,
      full_summary: parsed.full_summary,
      this_week: parsed.this_week,
      next_week: parsed.next_week,
      one_liner: parsed.one_liner,
      advice: parsed.advice,
      week_start: weekStart,
      week_end: weekEnd,
    });

  } catch (err) {
    console.error('[weekly-admin] POST error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Failed to generate weekly admin' }, { status: 500 });
  }
}

// ---- GET Handler ----

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { childId } = await params;

  const childCheck = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!childCheck.allowed) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data: child, error } = await supabase
    .from('montree_children')
    .select('settings')
    .eq('id', childId)
    .maybeSingle();

  if (error) {
    console.error('[weekly-admin] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch child' }, { status: 500 });
  }
  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const settings = (child.settings as Record<string, unknown>) || {};

  return NextResponse.json({
    success: true,
    plan_row: settings.guru_weekly_plan_row || null,
    area_details: settings.guru_weekly_area_details || null,
    full_summary: settings.guru_weekly_full_summary || null,
    this_week: settings.guru_weekly_this_week || null,
    next_week: settings.guru_weekly_next_week || null,
    one_liner: settings.guru_weekly_one_liner || null,
    advice: settings.guru_weekly_advice || null,
    updated_at: settings.guru_weekly_summary_updated_at || null,
  });
}