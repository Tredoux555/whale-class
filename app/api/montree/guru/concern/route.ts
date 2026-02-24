// app/api/montree/guru/concern/route.ts
// Concern Guide API — personalized guidance for a parent's specific worry
// GET /api/montree/guru/concern?child_id=X&concern_id=speech_delay
// Uses Haiku for speed + cost, cached per child per concern per day

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getConcernById, type ConcernMapping } from '@/lib/montree/guru/concern-mappings';
import Anthropic from '@anthropic-ai/sdk';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

function buildConcernPrompt(
  childName: string,
  childAge: number,
  concern: ConcernMapping,
  childProgress: Array<{ work_name: string; area: string; status: string }>,
): { system: string; user: string } {
  // Find which of the concern's related works the child is doing or has mastered
  const relatedWorkNames = concern.relatedWorks.map(w => w.name);
  const matchedProgress = childProgress.filter(p =>
    relatedWorkNames.some(rw => p.work_name.toLowerCase().includes(rw.toLowerCase()) || rw.toLowerCase().includes(p.work_name.toLowerCase()))
  );
  const mastered = matchedProgress.filter(p => p.status === 'mastered');
  const practicing = matchedProgress.filter(p => p.status === 'practicing' || p.status === 'presented');

  const system = `You are the Montree Montessori Guru speaking to a homeschool parent about their concern: "${concern.title}".

You are warm, encouraging, and deeply knowledgeable about Montessori pedagogy from Maria Montessori's original writings. You know this child's progress data.

VOICE: Like a wise friend who happens to be a Montessori expert. Validate the concern before giving guidance. Frame everything around what the child CAN do.

RULES:
1. NEVER use Montessori jargon without immediately explaining in plain language
2. Connect every work to the parent's real-world concern
3. For every work mentioned, provide a HOME VERSION with household items
4. Reference the child's actual progress data
5. Explain connections across curriculum areas
6. Include age-appropriate expectations
7. Be specific about when to seek professional help (concrete benchmarks)
8. Never diagnose. Never claim Montessori replaces therapy.

RESPONSE FORMAT (use these exact headers):

## Understanding ${childName}'s Development 🌿

### What's Normal at Age ${childAge}
[2-3 sentences about developmental norms for this concern at this age. Include specific benchmarks.]

### What ${childName} Is Already Doing
[Reference their actual progress on related works. Celebrate what they've accomplished. If no progress data, say "Let's start building these skills together."]

### 5 Things You Can Do at Home This Week
[5 specific, practical activities using household items. Each should have:
- Activity name (fun, not clinical)
- What you need (household items only)
- How to do it (2-3 sentences, step by step)
- Why it helps (1 sentence connecting to the concern)]

### When to Seek Help
[Specific, concrete benchmarks for when professional evaluation is recommended. No vague "if you're worried" — give ages and milestones.]

### You're Doing Great 💚
[1-2 sentence warm affirmation specific to this parent's situation]`;

  const user = `CHILD: ${childName}, Age ${childAge}

PARENT'S CONCERN: ${concern.title}
${concern.fullDesc}

DEVELOPMENTAL CONTEXT:
${concern.developmentalContext}

RELATED MONTESSORI WORKS FOR THIS CONCERN:
${concern.relatedWorks.map(w => `- ${w.name} (${w.area}) — ${w.whyItHelps}`).join('\n')}

CHILD'S PROGRESS ON RELATED WORKS:
${mastered.length > 0 ? `Mastered: ${mastered.map(m => m.work_name).join(', ')}` : 'No related works mastered yet.'}
${practicing.length > 0 ? `Currently working on: ${practicing.map(p => p.work_name).join(', ')}` : 'No related works in progress yet.'}

SUGGESTED HOME ACTIVITIES (use as inspiration, personalize for ${childName}):
${concern.homeActivities.map(a => `- ${a.activity}: ${a.materials.join(', ')} — ${a.why}`).join('\n')}

RED FLAGS (when to recommend professional help):
${concern.redFlags.join('\n')}

NORMAL RANGE: ${concern.normalRange}

Please generate a personalized concern guide for ${childName}. Make it warm, specific to their age and progress, and actionable for a parent with no Montessori experience.`;

  return { system, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const concernId = searchParams.get('concern_id');

    if (!childId || !concernId) {
      return NextResponse.json(
        { success: false, error: 'child_id and concern_id are required' },
        { status: 400 }
      );
    }

    // Validate concern exists
    const concern = getConcernById(concernId);
    if (!concern) {
      return NextResponse.json(
        { success: false, error: 'Invalid concern_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Security: verify child belongs to this school
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Check cache: one concern guide per child per concern per day
    const today = new Date().toISOString().split('T')[0];

    const { data: cached } = await supabase
      .from('montree_guru_interactions')
      .select('id, response_insight, asked_at')
      .eq('child_id', childId)
      .eq('question_type', 'concern_guide')
      .eq('question', concernId)
      .gte('asked_at', `${today}T00:00:00Z`)
      .order('asked_at', { ascending: false })
      .limit(1)
      .single();

    if (cached?.response_insight) {
      return NextResponse.json({
        success: true,
        guide: cached.response_insight,
        concern: {
          id: concern.id,
          title: concern.title,
          icon: concern.icon,
        },
        cached: true,
        interaction_id: cached.id,
      });
    }

    // Fetch child data
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, age, classroom_id')
      .eq('id', childId)
      .single();

    if (!child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    // Fetch child's progress
    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status')
      .eq('child_id', childId);

    const childProgress = progress || [];

    // Build prompt and call Haiku
    const { system, user } = buildConcernPrompt(
      child.name.split(' ')[0],
      child.age || 4,
      concern,
      childProgress,
    );

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });
    const startTime = Date.now();

    const message = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const guideText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    const processingTime = Date.now() - startTime;

    // Cache in guru interactions
    const { data: saved } = await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id: childId,
        classroom_id: child.classroom_id,
        question: concernId,
        question_type: 'concern_guide',
        response_insight: guideText,
        response_root_cause: concern.title,
        response_action_plan: concern.homeActivities.map(a => a.activity),
        response_timeline: concern.normalRange,
        sources_used: ['concern_mappings', 'curriculum_json'],
        model_used: HAIKU_MODEL,
        processing_time_ms: processingTime,
      })
      .select('id')
      .single();

    return NextResponse.json({
      success: true,
      guide: guideText,
      concern: {
        id: concern.id,
        title: concern.title,
        icon: concern.icon,
      },
      cached: false,
      interaction_id: saved?.id,
    });

  } catch (error) {
    console.error('[Guru Concern Guide] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate concern guide' },
      { status: 500 }
    );
  }
}
