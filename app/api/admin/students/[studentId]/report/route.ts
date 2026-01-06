import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// POST /api/admin/students/[studentId]/report - Generate AI report
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    // Get student info
    const { data: student } = await supabase
      .from('children')
      .select('*')
      .eq('id', studentId)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Calculate age
    const birthDate = new Date(student.date_of_birth);
    const today = new Date();
    const ageYears = (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    // Get recent mastered works (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: masteredWorks } = await supabase
      .from('child_work_progress')
      .select('mastered_date, curriculum_roadmap!inner(name, area, category)')
      .eq('child_id', studentId)
      .eq('status', 3)
      .gte('mastered_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('mastered_date', { ascending: false });

    // Get works currently practicing
    const { data: practicingWorks } = await supabase
      .from('child_work_progress')
      .select('curriculum_roadmap!inner(name, area)')
      .eq('child_id', studentId)
      .eq('status', 2)
      .limit(5);

    // Get recent photos
    const { data: photos } = await supabase
      .from('child_photos')
      .select('caption, taken_at, curriculum_roadmap(name)')
      .eq('child_id', studentId)
      .gte('taken_at', thirtyDaysAgo.toISOString().split('T')[0])
      .order('taken_at', { ascending: false })
      .limit(5);

    // Build prompt for Claude
    const masteredList = (masteredWorks || [])
      .map((w: any) => `- ${w.curriculum_roadmap.name} (${w.curriculum_roadmap.area})`)
      .join('\n');

    const practicingList = (practicingWorks || [])
      .map((w: any) => `- ${w.curriculum_roadmap.name} (${w.curriculum_roadmap.area})`)
      .join('\n');

    const photoNotes = (photos || [])
      .filter((p: any) => p.caption)
      .map((p: any) => `- ${p.caption}${p.curriculum_roadmap ? ` (during ${p.curriculum_roadmap.name})` : ''}`)
      .join('\n');

    const prompt = `Write a warm, professional parent progress report for a Montessori student. The report should sound like it was written by their caring, observant teacher - not by AI. Use a conversational yet professional tone.

STUDENT INFO:
- Name: ${student.name}
- Age: ${ageYears.toFixed(1)} years old

WORKS MASTERED THIS MONTH:
${masteredList || 'None this month'}

CURRENTLY PRACTICING:
${practicingList || 'None currently'}

TEACHER OBSERVATIONS (from photos):
${photoNotes || 'No specific notes'}

GUIDELINES:
- Write 2-3 warm paragraphs
- Highlight specific accomplishments naturally
- Mention what they're working on next
- Include encouraging observations about their development
- Sound like a real teacher who knows this child
- Don't use bullet points or formal headers
- Don't mention "AI" or "generated"
- Use the child's name naturally throughout
- Be specific about the Montessori works when mentioning them`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const reportContent = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    // Save report to database
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);

    const { data: report, error: reportError } = await supabase
      .from('parent_reports')
      .insert({
        child_id: studentId,
        title: `Progress Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        content: reportContent,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        works_mastered: (masteredWorks || []).map((w: any) => w.curriculum_roadmap.name),
        status: 'draft',
      })
      .select()
      .single();

    if (reportError) throw reportError;

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
