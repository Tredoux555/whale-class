// app/api/montree/guru/weekly-review/route.ts
// Weekly Review API — auto-generates Sunday review from week's progress
// GET /api/montree/guru/weekly-review?child_id=X
// Cached per child per week (ISO week number)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import Anthropic from '@anthropic-ai/sdk';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Get ISO week string for caching: "2026-W09"
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Get Monday of current week
function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ success: false, error: 'child_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Check cache for this week
    const weekKey = getISOWeek(new Date());

    const { data: cached } = await supabase
      .from('montree_guru_interactions')
      .select('id, response_insight, asked_at')
      .eq('child_id', childId)
      .eq('question_type', 'weekly_review')
      .eq('question', weekKey)
      .order('asked_at', { ascending: false })
      .limit(1)
      .single();

    if (cached?.response_insight) {
      return NextResponse.json({
        success: true,
        review: cached.response_insight,
        week: weekKey,
        cached: true,
        interaction_id: cached.id,
      });
    }

    // Fetch child
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, age, classroom_id')
      .eq('id', childId)
      .single();

    if (!child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    // Fetch this week's progress
    const weekStart = getWeekStart();
    const { data: weekProgress } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, notes, created_at')
      .eq('child_id', childId)
      .gte('created_at', `${weekStart}T00:00:00Z`)
      .order('created_at', { ascending: true });

    const progress = weekProgress || [];

    // If no progress this week, return a gentle message
    if (progress.length === 0) {
      const noProgressMsg = `No tracked progress this week for ${child.name.split(' ')[0]} — and that's perfectly okay! Some of the best learning happens in unstructured moments. If you've been doing activities at home, try logging them in ${child.name.split(' ')[0]}'s week view so we can celebrate the progress together next time.`;
      return NextResponse.json({
        success: true,
        review: noProgressMsg,
        week: weekKey,
        cached: false,
        no_data: true,
      });
    }

    const childName = child.name.split(' ')[0];
    const mastered = progress.filter(p => p.status === 'mastered');
    const practicing = progress.filter(p => p.status === 'practicing');
    const presented = progress.filter(p => p.status === 'presented');

    const system = `You are the Montree Montessori Guru writing a weekly review for a homeschool parent. Be warm, celebratory, and specific.

RESPONSE FORMAT — exactly 3 short paragraphs, no headers:
1. CELEBRATION — What went well this week. Name specific works and achievements. Be genuinely enthusiastic.
2. PATTERNS — What you notice about the child's learning patterns, interests, or developmental trajectory. Connect dots the parent might not see.
3. NEXT WEEK — One specific suggestion for next week based on what happened this week. Keep it simple and actionable.

Keep the entire response under 150 words. No bullet points, no headers — just 3 warm paragraphs.`;

    const user = `CHILD: ${childName}, Age ${child.age || 4}

THIS WEEK'S ACTIVITY:
${mastered.length > 0 ? `Mastered: ${mastered.map(m => `${m.work_name} (${m.area})`).join(', ')}` : ''}
${practicing.length > 0 ? `Practicing: ${practicing.map(p => `${p.work_name} (${p.area})`).join(', ')}` : ''}
${presented.length > 0 ? `Newly presented: ${presented.map(p => `${p.work_name} (${p.area})`).join(', ')}` : ''}
${progress.filter(p => p.notes).map(p => `Notes on ${p.work_name}: ${p.notes}`).join('\n')}

Total activities tracked: ${progress.length}

Write the weekly review for ${childName}.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });
    const startTime = Date.now();

    const message = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const reviewText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    const processingTime = Date.now() - startTime;

    // Cache
    const { data: saved } = await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id: childId,
        classroom_id: child.classroom_id,
        question: weekKey,
        question_type: 'weekly_review',
        response_insight: reviewText,
        response_root_cause: 'weekly_review',
        response_action_plan: [],
        response_timeline: weekKey,
        sources_used: ['progress_data'],
        model_used: HAIKU_MODEL,
        processing_time_ms: processingTime,
      })
      .select('id')
      .single();

    return NextResponse.json({
      success: true,
      review: reviewText,
      week: weekKey,
      cached: false,
      interaction_id: saved?.id,
      stats: {
        mastered: mastered.length,
        practicing: practicing.length,
        presented: presented.length,
        total: progress.length,
      },
    });

  } catch (error) {
    console.error('[Guru Weekly Review] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate weekly review' },
      { status: 500 }
    );
  }
}
