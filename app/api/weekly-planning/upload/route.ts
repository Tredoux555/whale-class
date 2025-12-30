import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface WorkAssignment {
  childName: string;
  works: {
    area: string;
    workNameChinese: string;
    workNameEnglish: string;
    matchedWorkId?: string;
  }[];
}

interface TranslatedPlan {
  weekNumber: number;
  startDate?: string;
  endDate?: string;
  assignments: WorkAssignment[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const weekNumber = parseInt(formData.get('weekNumber') as string) || 0;
    const year = parseInt(formData.get('year') as string) || new Date().getFullYear();

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text from docx
    const textContent = await extractDocxText(buffer);

    // Get work translations from database for context
    const { data: translations } = await supabase
      .from('work_translations')
      .select('chinese_name, english_name, area, aliases');

    // Use Claude to translate and structure the plan
    const translatedPlan = await translatePlanWithClaude(textContent, translations || []);

    // Match works to curriculum database
    const matchedPlan = await matchWorksToCurriculum(translatedPlan);

    // Save to database
    const { data: savedPlan, error: saveError } = await supabase
      .from('weekly_plans')
      .upsert({
        week_number: weekNumber || translatedPlan.weekNumber,
        year: year,
        original_filename: file.name,
        translated_content: matchedPlan,
        status: 'draft',
        start_date: translatedPlan.startDate,
        end_date: translatedPlan.endDate,
      }, {
        onConflict: 'week_number,year'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 });
    }

    // Create assignments for each child-work pair
    if (savedPlan) {
      await createAssignments(savedPlan.id, matchedPlan);
    }

    return NextResponse.json({
      success: true,
      plan: savedPlan,
      translatedContent: matchedPlan,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  // Use mammoth for proper docx extraction
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    // Fallback: basic extraction
    const text = buffer.toString('utf-8');
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

async function translatePlanWithClaude(
  content: string, 
  translations: any[]
): Promise<TranslatedPlan> {
  const translationContext = translations
    .map(t => `${t.chinese_name} = ${t.english_name} (${t.area})`)
    .join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a Montessori curriculum expert. Translate and structure this weekly plan.

KNOWN WORK TRANSLATIONS:
${translationContext}

DOCUMENT CONTENT:
${content}

Extract and return a JSON object with this structure:
{
  "weekNumber": <number>,
  "startDate": "<YYYY-MM-DD or null>",
  "endDate": "<YYYY-MM-DD or null>",
  "assignments": [
    {
      "childName": "<child name>",
      "works": [
        {
          "area": "<practical_life|sensorial|mathematics|language|culture>",
          "workNameChinese": "<original Chinese name>",
          "workNameEnglish": "<translated English name>"
        }
      ]
    }
  ]
}

Use the known translations when available. For unknown works, provide your best translation.
Categorize each work into one of the 5 Montessori areas.
Return ONLY valid JSON, no explanation.`
      }
    ]
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found');
  } catch (e) {
    console.error('Failed to parse Claude response:', responseText);
    return { weekNumber: 0, assignments: [] };
  }
}

async function matchWorksToCurriculum(plan: TranslatedPlan): Promise<TranslatedPlan> {
  const { data: curriculumWorks } = await supabase
    .from('curriculum_roadmap')
    .select('id, name, chinese_name, area_id');

  const { data: translations } = await supabase
    .from('work_translations')
    .select('chinese_name, english_name, curriculum_work_id, aliases');

  if (!curriculumWorks || !translations) return plan;

  for (const assignment of plan.assignments) {
    for (const work of assignment.works) {
      const translation = translations.find(t => 
        t.chinese_name === work.workNameChinese ||
        t.aliases?.includes(work.workNameChinese)
      );
      
      if (translation?.curriculum_work_id) {
        work.matchedWorkId = translation.curriculum_work_id;
        continue;
      }

      const curriculumMatch = curriculumWorks.find(c =>
        c.name.toLowerCase() === work.workNameEnglish.toLowerCase() ||
        c.chinese_name === work.workNameChinese
      );

      if (curriculumMatch) {
        work.matchedWorkId = curriculumMatch.id;
      }
    }
  }

  return plan;
}

async function createAssignments(planId: string, plan: TranslatedPlan) {
  const { data: children } = await supabase
    .from('children')
    .select('id, name');

  if (!children) return;

  const assignments = [];

  for (const assignment of plan.assignments) {
    const child = children.find(c => 
      c.name.toLowerCase() === assignment.childName.toLowerCase()
    );

    if (!child) continue;

    for (const work of assignment.works) {
      assignments.push({
        weekly_plan_id: planId,
        child_id: child.id,
        work_id: work.matchedWorkId || null,
        work_name: work.workNameEnglish,
        area: work.area,
        progress_status: 'not_started',
      });
    }
  }

  if (assignments.length > 0) {
    await supabase
      .from('weekly_assignments')
      .delete()
      .eq('weekly_plan_id', planId);

    await supabase
      .from('weekly_assignments')
      .insert(assignments);
  }
}
