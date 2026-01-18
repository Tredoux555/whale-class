import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Anthropic API key not configured');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

interface WorkItem {
  area: string;
  workNameChinese: string;
  workNameEnglish: string;
  matchedWorkId?: string;
}

interface ChildAssignment {
  childName: string;
  works: WorkItem[];
  focusArea?: string;
  observationNotes?: string;
}

interface TranslatedPlan {
  weekNumber: number;
  startDate?: string;
  endDate?: string;
  assignments: ChildAssignment[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const year = new Date().getFullYear();

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text from docx
    const textContent = await extractDocxText(buffer);
    console.log('[Upload] Extracted text length:', textContent.length);

    // Get existing translations for context
    const { data: translations } = await supabase
      .from('work_translations')
      .select('chinese_name, english_name, area, aliases');
    
    // Get curriculum works for matching
    const { data: curriculumWorks } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, chinese_name, area_id');

    // Use Claude to parse and translate
    let translatedPlan: TranslatedPlan;
    try {
      translatedPlan = await translatePlanWithClaude(
        textContent, 
        translations || [],
        curriculumWorks || []
      );
      console.log('[Upload] Parsed assignments:', translatedPlan.assignments?.length || 0);
    } catch (claudeError: any) {
      console.error('[Upload] Claude API error:', claudeError.message);
      return NextResponse.json({ 
        error: 'Claude API failed', 
        details: claudeError.message 
      }, { status: 500 });
    }

    // Match works to curriculum database
    const matchedPlan = await matchWorksToCurriculum(supabase, translatedPlan, curriculumWorks || []);

    // Use week number from parsed document
    const weekNumber = translatedPlan.weekNumber;
    if (!weekNumber || weekNumber === 0) {
      return NextResponse.json({ error: 'Could not detect week number from document' }, { status: 400 });
    }

    // Save to database
    const { data: savedPlan, error: saveError } = await supabase
      .from('weekly_plans')
      .upsert({
        week_number: weekNumber,
        year: year,
        original_filename: file.name,
        translated_content: matchedPlan,
        status: 'active',
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

    // Create children and assignments for each child-work pair
    if (savedPlan) {
      await createChildrenAndAssignments(supabase, weekNumber, year, matchedPlan);
    }

    return NextResponse.json({
      success: true,
      plan: savedPlan,
      translatedContent: matchedPlan,
      debug: {
        childrenCount: matchedPlan.assignments?.length || 0,
        totalWorks: matchedPlan.assignments?.reduce((sum, a) => sum + a.works.length, 0) || 0
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}


async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    const text = buffer.toString('utf-8');
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}


async function translatePlanWithClaude(
  content: string, 
  translations: any[],
  curriculumWorks: any[]
): Promise<TranslatedPlan> {
  const anthropic = getAnthropic();
  
  // Build context with known works
  const knownWorks = curriculumWorks.slice(0, 100).map(w => 
    `${w.chinese_name || ''} = ${w.name} (${w.area_id})`
  ).filter(s => s.includes(' = ')).join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: `You are a Montessori curriculum expert. Parse this Chinese weekly plan document.

DOCUMENT FORMAT:
The document has a table where each child has TWO rows:
- Row 1: Name | Practical Life | Sensorial | Math | Language | Culture | Notes
- Row 2: Focus Area (like 社交, 专注力, 意志力) | empty cells | observation notes

KNOWN MONTESSORI WORKS:
${knownWorks}

AREA MAPPING:
- Practical Life / practical_life: 食物制备, 剪纸, 编辫子, 照顾环境, 洗桌子, 衣饰框, 插花, 倒, 舀豆子, 叠衣服
- Sensorial / sensorial: 三项式, 二项式, 味觉瓶, 嗅觉瓶, 音感钟, 色板, 粉红塔, 棕色梯, 红棒, 几何图橱
- Mathematics / mathematics: 数棒, 砂纸数字, 纺锤棒箱, 数字与筹码, 金色珠子, 直线数数, 加法蛇, 邮票游戏
- Language / language: Anything with letters, WBW, WFW, CVC, 3ptc, phonics, matching
- Culture / culture: 地球仪, 地图, 鸟, 鱼, 青蛙, 蝴蝶, 花, 树, 叶, 动物

DOCUMENT CONTENT:
${content}

Extract and return a JSON object with this exact structure:
{
  "weekNumber": <number from document title or 0>,
  "assignments": [
    {
      "childName": "<child name exactly as written>",
      "works": [
        {
          "area": "<practical_life|sensorial|mathematics|language|culture>",
          "workNameChinese": "<original Chinese name>",
          "workNameEnglish": "<translated English name>"
        }
      ],
      "focusArea": "<focus area like 社交, 专注力, etc - if present>",
      "observationNotes": "<any observation notes from the notes column>"
    }
  ]
}

IMPORTANT:
- Include ALL children from the document
- Each work must be categorized into exactly one area
- The focusArea is usually on the row below the child's main data (社交, 专注力, 意志力, etc)
- Observation notes may contain progress notes in Chinese
- Return ONLY valid JSON, no markdown or explanation`
      }
    ]
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  } catch (e) {
    console.error('Failed to parse Claude response:', responseText.substring(0, 500));
    return { weekNumber: 0, assignments: [] };
  }
}


async function matchWorksToCurriculum(
  supabase: SupabaseClient, 
  plan: TranslatedPlan,
  curriculumWorks: any[]
): Promise<TranslatedPlan> {
  
  const { data: translations } = await supabase
    .from('work_translations')
    .select('chinese_name, english_name, curriculum_work_id, aliases');

  for (const assignment of plan.assignments) {
    for (const work of assignment.works) {
      // Try to match via translations table
      const translation = translations?.find(t => 
        t.chinese_name === work.workNameChinese ||
        t.aliases?.includes(work.workNameChinese)
      );
      
      if (translation?.curriculum_work_id) {
        work.matchedWorkId = translation.curriculum_work_id;
        continue;
      }

      // Try direct match on curriculum works
      const curriculumMatch = curriculumWorks.find(c =>
        c.name?.toLowerCase() === work.workNameEnglish?.toLowerCase() ||
        c.chinese_name === work.workNameChinese
      );

      if (curriculumMatch) {
        work.matchedWorkId = curriculumMatch.id;
      }
    }
  }

  return plan;
}


async function createChildrenAndAssignments(
  supabase: SupabaseClient, 
  weekNumber: number,
  year: number,
  plan: TranslatedPlan
) {
  // Get existing children from database
  const { data: existingChildren } = await supabase
    .from('children')
    .select('id, name');

  const childrenMap = new Map<string, string>();
  
  // Build map of existing children (lowercase name -> id)
  if (existingChildren) {
    for (const child of existingChildren) {
      childrenMap.set(child.name.toLowerCase(), child.id);
    }
  }

  // Create children that don't exist
  let displayOrder = existingChildren?.length || 0;
  
  for (const assignment of plan.assignments) {
    const childNameLower = assignment.childName.toLowerCase();
    
    if (!childrenMap.has(childNameLower)) {
      // CREATE the child with required date_of_birth (use placeholder)
      const { data: newChild, error } = await supabase
        .from('children')
        .insert({
          name: assignment.childName,
          display_order: displayOrder++,
          date_of_birth: '2021-01-01' // Placeholder - teacher can update later
        })
        .select('id, name')
        .single();
      
      if (newChild && !error) {
        childrenMap.set(childNameLower, newChild.id);
        console.log(`[Upload] Created child: ${assignment.childName}`);
      } else {
        console.error(`[Upload] Failed to create child: ${assignment.childName}`, error);
      }
    }
  }

  // Build assignments
  const assignments = [];

  for (const assignment of plan.assignments) {
    const childId = childrenMap.get(assignment.childName.toLowerCase());

    if (!childId) {
      console.log(`[Upload] Child still not found: ${assignment.childName}`);
      continue;
    }

    for (const work of assignment.works) {
      // Map area names to match DB constraint (mathematics → math)
      let area = work.area;
      if (area === 'mathematics') area = 'math';
      
      assignments.push({
        week_number: weekNumber,
        year: year,
        child_id: childId,
        work_id: work.matchedWorkId || null,
        work_name: work.workNameEnglish || work.workNameChinese,
        area: area
      });
    }
  }

  if (assignments.length > 0) {
    // Delete existing assignments for this week
    await supabase
      .from('weekly_assignments')
      .delete()
      .eq('week_number', weekNumber)
      .eq('year', year);

    // Insert new assignments
    const { error } = await supabase
      .from('weekly_assignments')
      .insert(assignments);

    if (error) {
      console.error('Failed to insert assignments:', error);
    } else {
      console.log(`[Upload] Created ${assignments.length} assignments for ${childrenMap.size} children`);
    }
  }
}
