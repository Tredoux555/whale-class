// app/api/montree/children/[childId]/activity-summary/route.ts
// Returns a short AI-generated sentence summarizing a child's previous week area focus
// and suggesting this week's guidance direction.
// Uses Haiku for fast, cheap generation (~$0.001/call).
// Caches result in child settings JSONB to avoid redundant AI calls.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { logApiUsage, checkAiBudget } from '@/lib/montree/api-usage';
import type { Locale } from '@/lib/montree/i18n/locales';
import { isValidLocale } from '@/lib/montree/i18n/locales';
import { getAreaLabel } from '@/lib/montree/i18n/area-labels';
import { getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';


// Railway/Next.js default serverless timeout is 15s. AI calls can
// exceed that and return 503 (Service Unavailable). 120s gives the
// route enough headroom while still bounded.
export const maxDuration = 120;

export const dynamic = 'force-dynamic';

// Explicit types to avoid Supabase `never` inference
type AreaRow = { id: string; area_key: string; name: string };
type WorkRow = { id: string; area_id: string };
type MediaRow = { id: string; work_id: string; captured_at: string };
type GroupLinkRow = { child_id: string; media_id: string };
type ChildRow = { name: string; settings: Record<string, unknown> | null };

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// Get Monday of a given date
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await context.params;
    const { classroomId } = auth;

    // Accept locale from query — defaults to 'en'. Cache EN and ZH separately.
    const url = new URL(request.url);
    const localeParam = url.searchParams.get('locale');
    const locale: Locale = isValidLocale(localeParam) ? localeParam : 'en';

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!classroomId) {
      return NextResponse.json({ error: 'No classroom' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Check budget
    const budgetStatus = await checkAiBudget(auth.schoolId);
    if (budgetStatus.blocked) {
      return NextResponse.json(
        { error: `AI budget exceeded (${budgetStatus.percentage}% of ${budgetStatus.budget})` },
        { status: 429 }
      );
    }

    // Check for cached summary in child settings
    const { data: rawChild } = await supabase
      .from('montree_children')
      .select('name, settings')
      .eq('id', childId)
      .maybeSingle();

    const child = rawChild as ChildRow | null;
    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const settings = child.settings || {};
    // Per-locale cache key: 'activity_summary_en' or 'activity_summary_zh'
    // Legacy key 'activity_summary' is read as EN-only fallback for existing data.
    const cacheKey = `activity_summary_${locale}`;
    const cached = (settings[cacheKey] || (locale === 'en' ? settings.activity_summary : undefined)) as
      | { text: string; week_start: string; generated_at: string }
      | undefined;

    // Calculate previous week boundaries
    const now = new Date();
    const thisMonday = getMonday(now);
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevSunday = new Date(thisMonday);
    prevSunday.setDate(prevSunday.getDate() - 1);
    prevSunday.setHours(23, 59, 59, 999);
    const prevWeekStart = prevMonday.toISOString().split('T')[0];

    // Return cached if it matches this previous week
    if (cached && cached.week_start === prevWeekStart) {
      return NextResponse.json({
        summary: cached.text,
        week_start: cached.week_start,
        cached: true,
      }, {
        headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=1800' },
      });
    }

    // 1. Get all curriculum areas for this classroom
    const { data: rawAreas } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key, name')
      .eq('classroom_id', classroomId);

    const areas = (rawAreas || []) as AreaRow[];
    if (areas.length === 0) {
      return NextResponse.json({ summary: null, reason: 'no_areas' });
    }

    const areaIdToKey: Record<string, string> = {};
    for (const a of areas) areaIdToKey[a.id] = a.area_key;

    // 2. Get all work IDs mapped to areas
    const { data: rawWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, area_id')
      .eq('classroom_id', classroomId);

    const works = (rawWorks || []) as WorkRow[];
    const workIdToAreaKey: Record<string, string> = {};
    for (const w of works) {
      workIdToAreaKey[w.id] = areaIdToKey[w.area_id] || 'unknown';
    }

    // 3. Get all confirmed photos for this child in the previous week
    // Direct child_id photos
    const { data: rawDirectMedia } = await supabase
      .from('montree_media')
      .select('id, work_id, captured_at')
      .eq('child_id', childId)
      .not('work_id', 'is', null)
      // Activity summary should reflect teacher-confirmed activity only.
      .or('identification_status.is.null,identification_status.neq.pending_review')
      .gte('captured_at', prevMonday.toISOString())
      .lte('captured_at', prevSunday.toISOString());

    const directMedia = (rawDirectMedia || []) as MediaRow[];

    // Group photo links (montree_media_children)
    const { data: rawGroupLinks } = await supabase
      .from('montree_media_children')
      .select('child_id, media_id')
      .eq('child_id', childId);

    const groupLinks = (rawGroupLinks || []) as GroupLinkRow[];
    const groupMediaIds = groupLinks.map(g => g.media_id);

    let groupMedia: MediaRow[] = [];
    if (groupMediaIds.length > 0) {
      const { data: rawGroupMedia } = await supabase
        .from('montree_media')
        .select('id, work_id, captured_at')
        .in('id', groupMediaIds)
        .not('work_id', 'is', null)
        .or('identification_status.is.null,identification_status.neq.pending_review')
        .gte('captured_at', prevMonday.toISOString())
        .lte('captured_at', prevSunday.toISOString());

      groupMedia = (rawGroupMedia || []) as MediaRow[];
    }

    // Combine and deduplicate
    const allMedia = [...directMedia, ...groupMedia];
    const seen = new Set<string>();
    const uniqueMedia: MediaRow[] = [];
    for (const m of allMedia) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        uniqueMedia.push(m);
      }
    }

    // 4. Count photos per area
    const areaCounts: Record<string, number> = {};
    for (const m of uniqueMedia) {
      const areaKey = workIdToAreaKey[m.work_id];
      if (areaKey && areaKey !== 'unknown') {
        areaCounts[areaKey] = (areaCounts[areaKey] || 0) + 1;
      }
    }

    const totalPhotos = Object.values(areaCounts).reduce((sum, c) => sum + c, 0);

    // If no photos last week, return a simple message (no AI needed)
    if (totalPhotos === 0) {
      const NO_DATA: Record<string, string> = {
        zh: `上周未记录任何观察。本周尝试捕捉${child.name}在各个领域的工作。`,
        es: `No se registraron observaciones la semana pasada. Esta semana, intenta capturar el trabajo de ${child.name} en todas las áreas.`,
      };
      const noDataText = NO_DATA[locale] || `No observations recorded last week. This week, try to capture ${child.name}'s work across all areas.`;
      // Cache it under the locale-specific key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('montree_children') as any)
        .update({
          settings: {
            ...settings,
            [cacheKey]: { text: noDataText, week_start: prevWeekStart, generated_at: new Date().toISOString() },
          },
        })
        .eq('id', childId);

      return NextResponse.json({ summary: noDataText, week_start: prevWeekStart, cached: false });
    }

    // 5. Build area distribution for prompt
    const sorted = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
    const allAreaKeys = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const missingAreas = allAreaKeys.filter(a => !areaCounts[a]);

    const distStr = sorted
      .map(([key, count]) => `${getAreaLabel(key, locale) || key}: ${count} photo${count > 1 ? 's' : ''}`)
      .join(', ');

    const LIST_SEP: Record<string, string> = { zh: '、' };
    const NONE_LABEL: Record<string, string> = { zh: '无', es: 'ninguna' };
    const missingStr = missingAreas.length > 0
      ? missingAreas.map(a => getAreaLabel(a, locale) || a).join(LIST_SEP[locale] || ', ')
      : (NONE_LABEL[locale] || 'none');

    // 6. Generate summary with Haiku
    if (!anthropic) {
      return NextResponse.json({ summary: null, reason: 'ai_disabled' });
    }

    const langInstruction = getAILanguageInstruction(locale);
    const prompt = `You are a Montessori teacher's assistant. Generate ONE sentence (max 30 words) summarizing a child's activity last week and suggesting focus for this week.

Child name: ${child.name}
Last week's observations: ${distStr} (${totalPhotos} total)
Areas with NO observations: ${missingStr}

Rules:
- Use the child's first name
- Mention the area(s) they focused on most
- Suggest the most neglected area for this week
- Keep it warm but brief — a 3-second read
- Do NOT use quotation marks
- Example: "Last week Amy focused heavily on Sensorial and Language. This week, try guiding her toward Practical Life."${langInstruction}`;

    try {
      const response = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      });

      // Log API usage
      if (response.usage) {
        logApiUsage({
          schoolId: auth.schoolId,
          classroomId: classroomId,
          endpoint: '/api/montree/children/[childId]/activity-summary',
          model: HAIKU_MODEL,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        });
      }

      const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';

      if (text) {
        // Cache in child settings under locale-specific key
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('montree_children') as any)
          .update({
            settings: {
              ...settings,
              [cacheKey]: { text, week_start: prevWeekStart, generated_at: new Date().toISOString() },
            },
          })
          .eq('id', childId);

        return NextResponse.json({ summary: text, week_start: prevWeekStart, cached: false });
      }
    } catch (err) {
      console.error('[ActivitySummary] Haiku error:', err);
    }

    // Fallback — template-based (no AI)
    const VARIOUS: Record<string, string> = { zh: '各个领域', es: 'varias áreas' };
    const ALL_AREAS: Record<string, string> = { zh: '所有领域', es: 'todas las áreas' };
    const topArea = sorted[0]
      ? (getAreaLabel(sorted[0][0], locale) || sorted[0][0])
      : (VARIOUS[locale] || 'various areas');
    const suggestArea = missingAreas.length > 0
      ? (getAreaLabel(missingAreas[0], locale) || missingAreas[0])
      : (ALL_AREAS[locale] || 'all areas');
    const FALLBACK: Record<string, string> = {
      zh: `上周${child.name}专注于${topArea}。本周，试着引导他们走向${suggestArea}。`,
      es: `La semana pasada ${child.name} se enfocó en ${topArea}. Esta semana, intenta guiarle hacia ${suggestArea}.`,
    };
    const fallback = FALLBACK[locale] || `Last week ${child.name} focused on ${topArea}. This week, try guiding them toward ${suggestArea}.`;

    return NextResponse.json({ summary: fallback, week_start: prevWeekStart, cached: false });

  } catch (err) {
    console.error('[ActivitySummary] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
