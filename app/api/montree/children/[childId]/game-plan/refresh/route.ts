// app/api/montree/children/[childId]/game-plan/refresh/route.ts
// Refresh a child's game plan incorporating their latest progress data.
// Reads existing game plan + current progress + teacher notes, then generates an updated plan.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { updateChildSettings } from '@/lib/montree/guru/settings-helper';
import { AREA_LABELS_EN, AREA_LABELS_ES, getAreaLabel } from '@/lib/montree/i18n/area-labels';
import { SUPPORTED_LOCALES } from '@/lib/montree/i18n/locales';

export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// Bilingual game plan tool — Haiku generates English works (canonical
// for DB matching) + bilingual nudge. Chinese works and direction are
// derived post-generation from DB lookups and area-label maps.
const GAME_PLAN_TOOL = {
  name: 'create_game_plan' as const,
  description: 'Create a brief, warm game plan nudge for a tired teacher. Provide the nudge in English, Chinese, and Argentine Spanish.',
  input_schema: {
    type: 'object' as const,
    properties: {
      nudge_en: {
        type: 'string' as const,
        description: 'One warm sentence in ENGLISH telling the teacher what to focus on next. Max 25 words.',
      },
      nudge_zh: {
        type: 'string' as const,
        description: 'The SAME nudge translated to Chinese (中文). Max 25 words equivalent.',
      },
      nudge_es: {
        type: 'string' as const,
        description: 'The SAME nudge translated to Argentine Spanish (Spanish with voseo: vos tenés). Max 25 words equivalent.',
      },
      works: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: '3-5 specific works to present next. Use EXACT ENGLISH names from the classroom curriculum.',
      },
      direction: {
        type: 'string' as const,
        description: 'The area progression in arrow format using ENGLISH area names. Example: "Practical Life → Sensorial → Language"',
      },
    },
    required: ['nudge_en', 'nudge_zh', 'nudge_es', 'works', 'direction'],
  },
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await context.params;
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (!anthropic) {
      return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 500 });
    }

    const supabase = getSupabase();

    // Fetch child + existing game plan + profile + progress
    const [childResult, profileResult, progressResult, notesResult] = await Promise.all([
      supabase.from('montree_children').select('name, date_of_birth, settings').eq('id', childId).maybeSingle(),
      supabase.from('montree_child_mental_profiles').select('*').eq('child_id', childId).maybeSingle(),
      supabase.from('montree_child_progress').select('work_name, area, status').eq('child_id', childId),
      supabase.from('montree_teacher_notes').select('content, created_at').eq('child_id', childId).order('created_at', { ascending: false }).limit(5),
    ]);

    const child = childResult.data as { name: string; date_of_birth: string | null; settings: Record<string, unknown> } | null;
    if (!child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    const existingPlan = child.settings?.game_plan as Record<string, unknown> | undefined;
    const profile = profileResult.data as {
      family_notes?: string | null;
      special_considerations?: string | null;
      successful_strategies?: string[];
      challenging_triggers?: string[];
    } | null;
    const progress = (progressResult.data || []) as Array<{ work_name: string; area: string; status: string }>;
    const notes = (notesResult.data || []) as Array<{ content: string; created_at: string }>;

    // Build progress summary
    const progressByArea: Record<string, { mastered: string[]; practicing: string[]; presented: string[] }> = {};
    for (const p of progress) {
      if (!progressByArea[p.area]) progressByArea[p.area] = { mastered: [], practicing: [], presented: [] };
      const bucket = p.status === 'mastered' ? 'mastered' : p.status === 'practicing' ? 'practicing' : 'presented';
      progressByArea[p.area][bucket].push(p.work_name);
    }

    const progressSummary = Object.entries(progressByArea)
      .map(([area, data]) => {
        const parts = [];
        if (data.mastered.length) parts.push(`mastered: ${data.mastered.join(', ')}`);
        if (data.practicing.length) parts.push(`practicing: ${data.practicing.join(', ')}`);
        if (data.presented.length) parts.push(`presented: ${data.presented.join(', ')}`);
        return `${area}: ${parts.join(' | ')}`;
      })
      .join('\n');

    const recentNotes = notes
      .map(n => `[${new Date(n.created_at).toLocaleDateString()}] ${n.content}`)
      .join('\n');

    const previousNudge = (existingPlan as Record<string, unknown>)?.nudge || (existingPlan as Record<string, unknown>)?.headline || '';
    const previousWorks = (existingPlan as Record<string, unknown>)?.works || [];

    // Locale is no longer needed for generation — we always produce both
    // languages. Kept for logging/debugging purposes.
    let _locale = 'en';
    try {
      const url = new URL(request.url);
      _locale = url.searchParams.get('locale') || 'en';
    } catch { /* no locale param */ }
    void _locale; // used only for debug logging

    // ── Load curriculum constraint list (mirrors replan-child.ts Stage 2.5) ──
    const classroomId = access.classroomId;
    let availableWorksList = '';
    const enToZhWorkName: Record<string, string> = {};
    if (classroomId) {
      const [areasRes, worksRes] = await Promise.all([
        supabase
          .from('montree_classroom_curriculum_areas')
          .select('id, area_key')
          .eq('classroom_id', classroomId),
        supabase
          .from('montree_classroom_curriculum_works')
          .select('name, name_chinese, area_id')
          .eq('classroom_id', classroomId),
      ]);

      const promptAreaIdToKey: Record<string, string> = {};
      for (const a of (areasRes.data || []) as Array<{ id: string; area_key: string }>) {
        promptAreaIdToKey[a.id] = a.area_key;
      }
      // Always feed ENGLISH names to Haiku — canonical for DB matching.
      // Chinese names are resolved post-generation from the DB.
      const worksByArea: Record<string, string[]> = {};
      for (const w of (worksRes.data || []) as Array<{ name: string; name_chinese: string | null; area_id: string }>) {
        const areaKey = promptAreaIdToKey[w.area_id];
        if (!areaKey) continue;
        if (!worksByArea[areaKey]) worksByArea[areaKey] = [];
        worksByArea[areaKey].push(w.name);
        if (w.name_chinese) {
          enToZhWorkName[w.name.toLowerCase()] = w.name_chinese;
        }
      }
        availableWorksList = Object.entries(worksByArea)
        .map(([area, works]) => `[${area}] ${works.join(', ')}`)
        .join('\n');
    }

    // Extract previous nudge/works from potentially bilingual format
    const prevNudgeStr = typeof previousNudge === 'object' && previousNudge !== null
      ? (previousNudge as Record<string, string>).en || ''
      : (previousNudge as string) || '';
    const prevWorksArr = Array.isArray(previousWorks)
      ? previousWorks
      : typeof previousWorks === 'object' && previousWorks !== null
        ? (previousWorks as Record<string, string[]>).en || []
        : [];

    const prompt = `Update a child's game plan based on their progress. Keep it brief — one sentence a tired teacher reads in 2 seconds.

IMPORTANT — TRILINGUAL OUTPUT:
- Write nudge_en in English, nudge_zh in Chinese (中文), and nudge_es in Argentine Spanish (voseo: vos tenés).
- All three nudges say the same thing in different languages.
- Pick works using their ENGLISH names from the AVAILABLE WORKS list.
- Write the direction using ENGLISH area names (e.g. "Practical Life → Sensorial → Language").

CHILD: ${child.name}
PREVIOUS NUDGE: "${prevNudgeStr}"
PREVIOUS WORKS: ${JSON.stringify(prevWorksArr)}

${progressSummary ? `PROGRESS:\n${progressSummary}` : 'No progress data yet.'}
${recentNotes ? `RECENT NOTES:\n${recentNotes}` : ''}
${profile?.family_notes ? `FAMILY: ${profile.family_notes}` : ''}
${availableWorksList ? `\nAVAILABLE WORKS IN THIS CLASSROOM — pick from this list using EXACT ENGLISH names:\n${availableWorksList}\n` : ''}
What should the teacher focus on NEXT? Pick 3-5 works that build on what's been done, spread across different curriculum areas.`;

    console.log(`[GamePlan] Refreshing plan for ${child.name} (Haiku)`);

    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500,
      temperature: 0, // durable per-child game_plan write → deterministic (mirrors replan-child.ts)
      tools: [GAME_PLAN_TOOL],
      tool_choice: { type: 'tool', name: 'create_game_plan' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return NextResponse.json({ success: false, error: 'AI generation failed' }, { status: 500 });
    }

    const rawPlan = toolBlock.input as {
      nudge_en?: string; nudge_zh?: string; nudge_es?: string;
      nudge?: string; // backward compat
      works?: string[]; direction?: string;
    };
    const planWorks = (rawPlan.works || []).filter((w): w is string => typeof w === 'string' && w.trim().length > 0);

    // ── Build bilingual JSONB structure ─────────────────────────────
    const worksZh = planWorks.map(w => enToZhWorkName[w.toLowerCase()] || w);

    const directionEn = rawPlan.direction || '';
    const direction: Record<string, string> = { en: directionEn };
    for (const loc of SUPPORTED_LOCALES) {
      if (loc === 'en') continue;
      let locDir = directionEn;
      for (const [key, enLabel] of Object.entries(AREA_LABELS_EN)) {
        const locLabel = getAreaLabel(key, loc);
        if (locLabel) locDir = locDir.replace(new RegExp(enLabel, 'gi'), locLabel);
      }
      direction[loc] = locDir;
    }

    const nudgeEn = rawPlan.nudge_en || rawPlan.nudge || '';
    const nudgeZh = rawPlan.nudge_zh || nudgeEn;
    const nudgeEs = rawPlan.nudge_es || nudgeEn;

    // Spanish works: use name_es column when available (not yet populated), else English
    const enToEsWorkName: Record<string, string> = {};
    // TODO: populate from name_es column when it exists
    const worksEs = planWorks.map(w => enToEsWorkName[w.toLowerCase()] || w);

    const works: Record<string, string[]> = { en: planWorks, zh: worksZh, es: worksEs };

    const updatedPlan = {
      nudge: { en: nudgeEn, zh: nudgeZh, es: nudgeEs },
      works,
      direction,
      generated_at: existingPlan?.generated_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      child_name: child.name,
      source: 'refresh',
    };

    await updateChildSettings(childId, { game_plan: updatedPlan });
    console.log(`[GamePlan] Refreshed bilingual plan saved for ${child.name}`);

    return NextResponse.json({ success: true, game_plan: updatedPlan });
  } catch (error) {
    console.error('[GamePlan] Refresh error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
