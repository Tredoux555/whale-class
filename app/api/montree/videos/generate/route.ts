// /api/montree/videos/generate/route.ts
// Generate weekly video content for all students
// Uses Claude API for personalized narration
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SCHOOL_SLUG = 'beijing-international';

interface VideoContent {
  studentId: string;
  studentName: string;
  narration: string;
  photos: string[];
  highlights: string[];
  areasWorked: string[];
}


export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    // 1. Get school
    const { data: school } = await supabase
      .from('schools')
      .select('id, name')
      .eq('slug', SCHOOL_SLUG)
      .single();

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // 2. Get all students (from montree_children table)
    // NOTE: This route may need further refactoring - uses old schema patterns
    const { data: students } = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('school_id', school.id)
      .order('name');

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'No students found' }, { status: 404 });
    }

    // 3. Get this week's works for all students
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: works } = await supabase
      .from('student_works')
      .select('student_id, work_name, area, photo_url, notes, created_at')
      .in('student_id', students.map(s => s.id))
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: true });

    // Group works by student
    const worksByStudent: Record<string, any[]> = {};
    (works || []).forEach(w => {
      if (!worksByStudent[w.student_id]) worksByStudent[w.student_id] = [];
      worksByStudent[w.student_id].push(w);
    });


    // 4. Generate video content for each student
    const videoContents: VideoContent[] = [];

    for (const student of students) {
      const studentWorks = worksByStudent[student.id] || [];
      const areas = [...new Set(studentWorks.map(w => w.area))];
      const photos = studentWorks.map(w => w.photo_url).filter(Boolean);
      const workNames = studentWorks.map(w => w.work_name);

      // Generate narration with Claude
      let narration = `${student.name} had a wonderful week at school!`;
      
      if (studentWorks.length > 0) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [{
              role: 'user',
              content: `Write a warm, brief (2-3 sentences) narration for a parent video about their child's week at Montessori school.

Child's name: ${student.name}
Activities completed: ${workNames.join(', ')}
Areas worked in: ${areas.join(', ')}

Make it heartfelt and specific. Mention 1-2 activities by name. Keep it under 50 words.
Write ONLY the narration, no quotes or labels.`
            }]
          });

          const text = response.content[0];
          if (text.type === 'text') {
            narration = text.text;
          }
        } catch (err) {
          console.error('Claude error for', student.name, err);
        }
      }

      videoContents.push({
        studentId: student.id,
        studentName: student.name,
        narration,
        photos,
        highlights: workNames.slice(0, 3),
        areasWorked: areas,
      });
    }

    return NextResponse.json({
      videos: videoContents,
      count: videoContents.length,
      weekOf: oneWeekAgo.toISOString().split('T')[0],
    });

  } catch (error: any) {
    console.error('Video generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
