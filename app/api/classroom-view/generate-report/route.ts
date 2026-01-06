import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  
  try {
    const { childId } = await request.json();

    if (!childId) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
    }

    // Get child info
    const { data: child } = await supabase
      .from('children')
      .select('name, date_of_birth')
      .eq('id', childId)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Calculate age
    const birth = new Date(child.date_of_birth);
    const now = new Date();
    const age = (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    // Get mastered works from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentMastered } = await supabase
      .from('child_work_progress')
      .select('work_id, mastered_date')
      .eq('child_id', childId)
      .eq('status', 3)
      .gte('mastered_date', thirtyDaysAgo.toISOString().split('T')[0]);

    const masteredWorkNames = [];
    for (const m of recentMastered || []) {
      const { data: work } = await supabase
        .from('curriculum_roadmap')
        .select('name, area')
        .eq('id', m.work_id)
        .single();
      if (work) {
        masteredWorkNames.push(`${work.name} (${work.area})`);
      }
    }

    // Get all mastered count
    const { count: totalMastered } = await supabase
      .from('child_work_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('status', 3);

    // Get practicing works
    const { data: practicing } = await supabase
      .from('child_work_progress')
      .select('work_id')
      .eq('child_id', childId)
      .eq('status', 2);

    const practicingNames = [];
    for (const p of practicing || []) {
      const { data: work } = await supabase
        .from('curriculum_roadmap')
        .select('name')
        .eq('id', p.work_id)
        .single();
      if (work) practicingNames.push(work.name);
    }

    // Build prompt for Claude
    const prompt = `You are writing a parent report for a Montessori classroom. Write as if you are the child's teacher - warm, professional, encouraging, and specific.

Child: ${child.name}
Age: ${age.toFixed(1)} years old

Recent achievements (last 30 days):
${masteredWorkNames.length > 0 ? masteredWorkNames.join('\n') : 'No new works mastered this period'}

Total works mastered: ${totalMastered || 0}

Currently practicing:
${practicingNames.length > 0 ? practicingNames.slice(0, 5).join(', ') : 'Working on foundational skills'}

Write a 2-3 paragraph report that:
1. Opens with a warm, specific observation about the child
2. Highlights their recent achievements naturally (don't just list them)
3. Mentions what they're currently working on
4. Ends with encouragement and what to look forward to

Keep it genuine and human - avoid generic praise. Write like a real teacher who knows this child well. Do not use bullet points or headers.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const reportContent = message.content[0].type === 'text' 
      ? message.content[0].text 
      : 'Unable to generate report';

    return NextResponse.json({ report: reportContent });
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
