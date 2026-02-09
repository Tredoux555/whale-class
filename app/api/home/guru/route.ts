// /api/home/guru/route.ts
// Home Montessori Advisor - Parent-specific guidance
// Provides child-specific Montessori advice for home learning

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, AI_ENABLED, AI_MODEL, MAX_TOKENS } from '@/lib/ai/anthropic';

export interface GuruRequest {
  child_id: string;
  family_id: string;
  question: string;
}

export interface GuruResponse {
  success: boolean;
  insight?: string;
  suggestions?: Array<{
    priority: number;
    suggestion: string;
    details: string;
  }>;
  parent_tips?: string[];
  interaction_id?: string;
  error?: string;
}

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check AI is enabled
    if (!AI_ENABLED || !anthropic) {
      return errorResponse('AI features are not enabled. Check ANTHROPIC_API_KEY.', undefined, 503);
    }

    // Parse request
    const body: GuruRequest = await request.json();
    const { child_id, family_id, question } = body;

    if (!child_id || !family_id || !question) {
      return errorResponse('child_id, family_id, and question are required', undefined, 400);
    }

    if (question.length < 5) {
      return errorResponse('Question is too short. Please provide more detail.', undefined, 400);
    }

    if (question.length > 1000) {
      return errorResponse('Question is too long. Please be more concise.', undefined, 400);
    }

    const supabase = getSupabase();

    // Get child info and recent progress
    const { data: child } = await supabase
      .from('home_children')
      .select('id, name, age, birth_date')
      .eq('id', child_id)
      .eq('family_id', family_id)
      .single();

    if (!child) {
      return errorResponse('Child not found', undefined, 404);
    }

    // Get recent observations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: observations } = await supabase
      .from('home_observations')
      .select('observation_type, behavior, context, area, work_name, notes, observed_at')
      .eq('child_id', child_id)
      .gte('observed_at', thirtyDaysAgo.toISOString())
      .limit(5);

    // Get recent progress by area
    const { data: progress } = await supabase
      .from('home_progress')
      .select('work_name, area, status')
      .eq('child_id', child_id)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Build context
    const areaFocus: Record<string, number> = {};
    for (const p of progress || []) {
      areaFocus[p.area] = (areaFocus[p.area] || 0) + 1;
    }

    const contextStr = `
Child: ${child.name}, Age: ${child.age} years
Recent Areas of Focus: ${Object.entries(areaFocus)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([area, count]) => `${area} (${count} works)`)
      .join(', ')}
Recent Works: ${(progress || [])
      .slice(0, 5)
      .map(p => p.work_name)
      .join(', ')}
Recent Observations: ${(observations || []).length > 0 ? 'Yes, recorded behaviors observed' : 'None yet'}
    `.trim();

    const systemPrompt = `You are a Montessori education advisor providing guidance to parents implementing Montessori principles at home.
You have deep knowledge of Montessori philosophy, child development, and practical home learning strategies.
You provide warm, encouraging, and practical advice that respects the child's individual pace of development.
Focus on independence, concentration, and following the child's interests.`;

    const userPrompt = `Context about the child:
${contextStr}

Parent's question: ${question}

Please provide:
1. A clear insight or answer to their question
2. 2-3 practical suggestions they can implement at home
3. 2-3 parent tips for supporting this area of development`;

    if (!anthropic) {
      return errorResponse('AI service not available', undefined, 503);
    }

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    // Extract response text
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Parse response
    const lines = responseText.split('\n').filter(l => l.trim());
    let insight = '';
    const suggestions: Array<{ priority: number; suggestion: string; details: string }> = [];
    const parent_tips: string[] = [];

    let currentSection = '';
    for (const line of lines) {
      if (line.includes('insight') || line.includes('answer') || line.includes('Question')) {
        currentSection = 'insight';
      } else if (line.includes('suggestion') || line.includes('implement')) {
        currentSection = 'suggestions';
      } else if (line.includes('tip') || line.includes('Parent')) {
        currentSection = 'tips';
      } else if (currentSection === 'insight' && !insight) {
        insight = line.replace(/^[\d.\-*]\s*/, '').trim();
      } else if (currentSection === 'suggestions' && line.trim()) {
        const match = line.match(/^[\d.\-*]\s*(.+?):\s*(.+)$/);
        if (match) {
          suggestions.push({
            priority: suggestions.length + 1,
            suggestion: match[1].trim(),
            details: match[2].trim(),
          });
        } else if (line.trim().length > 10) {
          suggestions.push({
            priority: suggestions.length + 1,
            suggestion: line.replace(/^[\d.\-*]\s*/, '').trim(),
            details: '',
          });
        }
      } else if (currentSection === 'tips' && line.trim()) {
        parent_tips.push(line.replace(/^[\d.\-*]\s*/, '').trim());
      }
    }

    // Fallback parsing if structured parsing didn't work
    if (!insight) insight = responseText.split('\n')[0];
    if (suggestions.length === 0 && responseText.includes('suggestion')) {
      const suggestionLines = responseText.split('\n').filter(l => l.includes('suggest') || l.includes('try'));
      for (let i = 0; i < Math.min(suggestionLines.length, 3); i++) {
        suggestions.push({
          priority: i + 1,
          suggestion: suggestionLines[i].replace(/^[\d.\-*]\s*/, '').trim(),
          details: '',
        });
      }
    }

    // Save to database - store as two separate messages (user question and assistant response)
    const userMessage = {
      family_id,
      child_id,
      message_role: 'user',
      message_content: question,
      context: {},
      model: AI_MODEL,
    };

    const assistantMessage = {
      family_id,
      child_id,
      message_role: 'assistant',
      message_content: responseText,
      context: {
        insight,
        suggestions,
        parent_tips,
      },
      model: AI_MODEL,
    };

    const { data: savedMessages, error: saveError } = await supabase
      .from('home_guru_interactions')
      .insert([userMessage, assistantMessage])
      .select('id');

    if (saveError) {
      console.error('[Home Guru] Failed to save interaction:', saveError);
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      insight,
      suggestions,
      parent_tips,
      interaction_id: savedMessages?.[0]?.id,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Home Guru] Error:', message);

    if (message.includes('rate_limit')) {
      return errorResponse('Rate limit exceeded. Please try again in a moment.', undefined, 429);
    }
    if (message.includes('invalid_api_key')) {
      return errorResponse('AI service configuration error.', undefined, 503);
    }

    return errorResponse('Failed to get response. Please try again.', undefined, 500);
  }
}

// GET: Get conversation history for a child
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const familyId = searchParams.get('family_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!childId || !familyId) {
      return errorResponse('child_id and family_id are required', undefined, 400);
    }

    const supabase = getSupabase();

    const { data: history, error } = await supabase
      .from('home_guru_interactions')
      .select('id, created_at, message_role, message_content, context')
      .eq('child_id', childId)
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Home Guru] Failed to fetch history:', error);
      return errorResponse('Failed to fetch history', { message: error.message });
    }

    return NextResponse.json({
      success: true,
      history: history || [],
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Home Guru] GET error:', message);
    return errorResponse('Internal server error', { message });
  }
}
