// app/api/brain/explain/route.ts
// Generate personalized parent explanations for works using Claude

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { anthropic, AI_MODEL, AI_ENABLED } from '@/lib/ai/anthropic';

const EXPLAIN_SYSTEM_PROMPT = `You are a Montessori teacher explaining activities to parents.
Be warm, clear, and focus on the child's development.
Keep explanations concise (2-3 paragraphs max).
Avoid jargon - use everyday language parents understand.
Connect the activity to real-life benefits the parent can observe.`;

/**
 * POST /api/brain/explain
 * Body:
 *   - work_id: UUID of the work to explain
 *   - child_name: Optional child's name for personalization
 *   - child_age: Optional age for age-appropriate context
 *   - context: Optional additional context (e.g., "struggles with focus")
 * 
 * Returns a personalized explanation for parents
 */
export async function POST(request: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json(
      { success: false, error: 'AI features are not enabled' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { work_id, child_name, child_age, context } = body;

    if (!work_id) {
      return NextResponse.json(
        { success: false, error: 'work_id is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get work details
    const { data: work, error: workError } = await supabase
      .from('montessori_works')
      .select('*')
      .eq('id', work_id)
      .single();

    if (workError || !work) {
      return NextResponse.json(
        { success: false, error: 'Work not found' },
        { status: 404 }
      );
    }

    // Get related sensitive periods
    const { data: sensitivePeriods } = await supabase
      .from('work_sensitive_periods')
      .select(`
        relevance_score,
        sensitive_periods (
          name,
          parent_description
        )
      `)
      .eq('work_id', work_id);

    // Build prompt
    const childContext = child_name 
      ? `for ${child_name}${child_age ? ` (age ${child_age})` : ''}`
      : child_age ? `for a ${child_age}-year-old` : '';

    const prompt = `Explain the Montessori work "${work.name}" to a parent ${childContext}.

Work Details:
- Area: ${work.curriculum_area.replace('_', ' ')}
- Direct aims: ${work.direct_aims?.join(', ') || 'Not specified'}
- Indirect aims: ${work.indirect_aims?.join(', ') || 'Not specified'}
- Why it matters: ${work.parent_why_it_matters || 'Builds foundational skills'}

${sensitivePeriods?.length ? `Related sensitive periods: ${sensitivePeriods.map((sp: any) => sp.sensitive_periods?.name).join(', ')}` : ''}

${context ? `Additional context: ${context}` : ''}

Provide:
1. A warm, simple explanation of what the child does
2. What developmental benefits the parent should know about
3. What they might observe at home as a result

Keep it conversational and reassuring.`;

    // Call Claude
    const message = await anthropic!.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: EXPLAIN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const explanation = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return NextResponse.json({
      success: true,
      work: {
        id: work.id,
        name: work.name,
        curriculum_area: work.curriculum_area,
      },
      explanation,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating explanation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
