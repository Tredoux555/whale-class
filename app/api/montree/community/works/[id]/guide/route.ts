// /api/montree/community/works/[id]/guide/route.ts
// POST: Admin-triggered AI guide generation using Claude Haiku

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Admin only
    const password = request.headers.get('x-admin-password') || '';
    if (!verifySuperAdminPassword(password).valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Fetch the work
    const { data: work, error } = await supabase
      .from('montree_community_works')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    // Build prompt for Haiku
    const prompt = `You are a Montessori education expert. Create a detailed, practical step-by-step guide for presenting this Montessori work to children.

WORK DETAILS:
- Title: ${work.title}
- Area: ${work.area}
- Category: ${work.category || 'General'}
- Description: ${work.description}
${work.detailed_description ? `- Detailed Description: ${work.detailed_description}` : ''}
- Age Range: ${work.age_range}
- Materials: ${(work.materials || []).join(', ') || 'Not specified'}
- Direct Aims: ${(work.direct_aims || []).join(', ') || 'Not specified'}
- Indirect Aims: ${(work.indirect_aims || []).join(', ') || 'Not specified'}
- Control of Error: ${work.control_of_error || 'Not specified'}

Generate a JSON response with this EXACT structure:
{
  "presentation_steps": [
    {"step": 1, "title": "...", "instruction": "...", "teacher_says": "..."},
    ...
  ],
  "tips": ["...", "..."],
  "common_mistakes": ["...", "..."],
  "variations": ["...", "..."],
  "extensions": ["...", "..."],
  "materials_sourcing": ["Where to find or how to make each material"],
  "observation_points": ["What to watch for to know the child is ready / mastering"],
  "parent_friendly_summary": "A 2-3 sentence summary a parent would understand"
}

Be specific and practical. Assume the teacher may have limited Montessori training. Include what to SAY to the child where relevant.`;

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse JSON from response
    let guide;
    try {
      // Try to find JSON in the response (might be wrapped in markdown code blocks)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        guide = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI guide' }, { status: 500 });
    }

    // Save guide to work
    const { data: updated, error: updateError } = await supabase
      .from('montree_community_works')
      .update({
        ai_guide: guide,
        ai_guide_generated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Guide save error:', updateError);
      return NextResponse.json({ error: 'Guide generated but failed to save' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      guide,
      work: updated,
    });
  } catch (error) {
    console.error('Guide generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
