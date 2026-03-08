// app/api/montree/guru/teaching-instructions/route.ts
// Personalized teaching instructions for a specific child + work
// Uses Sonnet with full child context to adapt the standard guide

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
import { buildChildContext } from '@/lib/montree/guru/context-builder';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json(
        { success: false, error: 'AI features not enabled' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { child_id, work_name, area, regenerate } = body;

    if (!child_id || !work_name || !area) {
      return NextResponse.json(
        { success: false, error: 'child_id, work_name, and area are required' },
        { status: 400 }
      );
    }

    if (typeof work_name !== 'string' || work_name.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Invalid work_name' },
        { status: 400 }
      );
    }

    // Normalize area aliases (DB may have 'math' instead of 'mathematics', etc.)
    const AREA_ALIASES: Record<string, string> = {
      math: 'mathematics', maths: 'mathematics',
      science_culture: 'cultural', science: 'cultural', culture: 'cultural',
      practical: 'practical_life', pl: 'practical_life',
      sensory: 'sensorial',
      lang: 'language',
    };
    const areaLower = typeof area === 'string' ? area.toLowerCase().trim() : '';
    const normalizedArea = AREA_ALIASES[areaLower] || areaLower;
    const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    if (!validAreas.includes(normalizedArea)) {
      return NextResponse.json(
        { success: false, error: 'Invalid area' },
        { status: 400 }
      );
    }

    // Security check
    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Rate limit: 10/min per teacher
    const supabase = getSupabase();
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = await checkRateLimit(supabase, ip, 'teaching-instructions', 10, 1);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limited', retryAfter: rateCheck.retryAfterSeconds },
        { status: 429 }
      );
    }

    // Check cache (7-day TTL) unless regenerate requested
    if (!regenerate) {
      const cacheKey = `teach:${work_name.toLowerCase().trim()}`;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: cached } = await supabase
        .from('montree_guru_interactions')
        .select('response_insight, asked_at')
        .eq('child_id', child_id)
        .eq('question_type', 'teaching_instruction')
        .eq('question', cacheKey)
        .gte('asked_at', sevenDaysAgo)
        .order('asked_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.response_insight) {
        return NextResponse.json({
          success: true,
          instructions: cached.response_insight,
          cached: true,
          generated_at: cached.asked_at,
        });
      }
    }

    // Build child context
    let childContext;
    try {
      childContext = await buildChildContext(supabase, child_id);
    } catch (ctxErr) {
      console.error('[Teaching Instructions] buildChildContext failed:', ctxErr);
      return NextResponse.json({ success: false, error: 'Failed to build child context' }, { status: 500 });
    }
    if (!childContext) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    // Fetch work guide from curriculum (non-critical — proceed without it)
    let workData = null;
    try {
      const { data } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('quick_guide, presentation_steps, materials, direct_aims, indirect_aims, description, why_it_matters')
        .eq('classroom_id', childContext.classroom_id)
        .ilike('name', work_name)
        .limit(1)
        .maybeSingle();
      workData = data;
    } catch (guideErr) {
      console.error('[Teaching Instructions] Curriculum guide fetch failed:', guideErr);
      // Continue without guide — AI can still generate instructions
    }

    // Build context strings
    const childAge = childContext.age_years
      ? `${childContext.age_years} years${childContext.age_months ? ` ${childContext.age_months} months` : ''}`
      : 'unknown age';

    // Safe array helper for guru_child_profile fields (could be string, array, or undefined)
    const safeArray = (val: unknown): string[] => {
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'string' && val.trim()) return [val];
      return [];
    };

    const profile = childContext.guru_child_profile;
    const safeStr = (val: unknown): string => (typeof val === 'string' ? val : '') || 'N/A';
    const profileStr = profile
      ? `Personality: ${safeStr(profile.personality)}
Strengths: ${safeArray(profile.strengths).join(', ') || 'N/A'}
Challenges: ${safeArray(profile.challenges).join(', ') || 'N/A'}
Interests: ${safeArray(profile.interests).join(', ') || 'N/A'}
Learning style: ${safeStr(profile.learning_style)}`
      : 'No detailed profile available yet.';

    const recentObs = (childContext.recent_observations || [])
      .slice(0, 5)
      .map(o => `- ${o.behavior_description}`)
      .join('\n') || 'No recent observations.';

    const currentWorks = (childContext.focus_works || [])
      .map(fw => `- ${fw.work_name} (${fw.area})`)
      .join('\n') || 'No current focus works.';

    const guideStr = workData
      ? `Standard Guide:
${workData.description || ''}
Quick Guide: ${workData.quick_guide || 'N/A'}
Materials: ${Array.isArray(workData.materials) ? workData.materials.join(', ') : workData.materials || 'N/A'}
Direct Aims: ${Array.isArray(workData.direct_aims) ? workData.direct_aims.join(', ') : workData.direct_aims || 'N/A'}
Why It Matters: ${workData.why_it_matters || 'N/A'}
Presentation Steps:
${Array.isArray(workData.presentation_steps) ? workData.presentation_steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') : 'N/A'}`
      : 'No standard guide available for this work.';

    // ESL context
    const eslNote = childContext.isESL ? '\nThis child is an L1 Chinese speaker learning English. Consider Mandarin phonological challenges and use TPR/comprehensible input strategies.' : '';

    const systemPrompt = `You are an expert Montessori teacher creating personalized teaching instructions for a specific child.

CHILD: ${childContext.name} (${childAge})${eslNote}

CHILD PROFILE:
${profileStr}

RECENT OBSERVATIONS:
${recentObs}

CURRENT FOCUS WORKS:
${currentWorks}

WORK TO TEACH: ${work_name} (${normalizedArea.replace('_', ' ')})

${guideStr}

YOUR TASK:
Create personalized, step-by-step teaching instructions for presenting "${work_name}" to ${childContext.name}. Consider:
1. Their specific personality, strengths, and challenges
2. Their interests (weave them in naturally to increase engagement)
3. Their current developmental stage based on what they've mastered
4. Any behavioral patterns from recent observations
5. Their learning style

FORMAT:
- Start with a 1-2 sentence overview of WHY this work is right for this child right now
- "Before You Begin" section (environment prep, materials, timing tips specific to this child)
- Numbered presentation steps (8-12 steps), adapted for this child
- "Watch For" section — specific signs of understanding or struggle to look for with THIS child
- "If They Struggle" — personalized troubleshooting based on their known challenges
- "Extensions" — 2-3 ways to extend or vary the work based on their interests

Keep it warm, practical, and actionable. Write for a teacher who knows Montessori basics but wants child-specific guidance.
Use markdown formatting (headers, bold, numbered lists).`;

    // Call Sonnet with 30s timeout
    const apiPromise = anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Please create personalized teaching instructions for presenting "${work_name}" to ${childContext.name}.` }],
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Teaching instructions timeout')), 30_000)
    );

    const response = await Promise.race([apiPromise, timeoutPromise]);

    // Extract text response
    const textBlock = response.content.find(b => b.type === 'text');
    const instructions = textBlock ? (textBlock as { type: 'text'; text: string }).text : '';

    if (!instructions) {
      return NextResponse.json({ success: false, error: 'No instructions generated' }, { status: 500 });
    }

    // Cache in guru_interactions
    await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id,
        teacher_id: auth.userId,
        classroom_id: childContext.classroom_id,
        question: `teach:${work_name.toLowerCase().trim()}`,
        question_type: 'teaching_instruction',
        response_insight: instructions,
        asked_at: new Date().toISOString(),
      })
      .catch(err => console.error('[Teaching Instructions] Cache insert failed:', err));

    return NextResponse.json({
      success: true,
      instructions,
      cached: false,
      generated_at: new Date().toISOString(),
    });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Teaching Instructions] Error:', errMsg);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
