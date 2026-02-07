// /api/montree/admin/import/route.ts
// Bulk import students and work progress from docx
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import Anthropic from '@anthropic-ai/sdk';

function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Anthropic API key not configured');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

interface WorkItem {
  area: string;
  workNameChinese: string;
  workNameEnglish: string;
  status?: string;
}

interface ChildAssignment {
  childName: string;
  works: WorkItem[];
  focusArea?: string;
  notes?: string;
}

interface ParsedPlan {
  weekNumber?: number;
  assignments: ChildAssignment[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    const classroomId = request.headers.get('x-classroom-id');
    
    // SECURITY: Require authentication
    if (!schoolId || !classroomId) {
      return NextResponse.json({ error: 'Missing school or classroom ID' }, { status: 401 });
    }
    
    // SECURITY: Verify classroom belongs to school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', classroomId)
      .single();
    
    if (!classroom || classroom.school_id !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text from docx
    const textContent = await extractDocxText(buffer);
    console.log('[Import] Extracted text length:', textContent.length);

    // Use Claude to parse
    const parsedPlan = await parseWithClaude(textContent);
    console.log('[Import] Parsed assignments:', parsedPlan.assignments?.length || 0);

    if (!parsedPlan.assignments?.length) {
      return NextResponse.json({ error: 'No students found in document' }, { status: 400 });
    }

    // Get existing children for this classroom
    const { data: existingChildren } = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', classroomId);

    const childrenMap = new Map<string, string>();
    if (existingChildren) {
      for (const child of existingChildren) {
        childrenMap.set(child.name.toLowerCase().trim(), child.id);
      }
    }

    // Create/update children and track results
    const results = {
      childrenCreated: 0,
      childrenUpdated: 0,
      worksAdded: 0,
      children: [] as { name: string; worksCount: number; isNew: boolean }[]
    };

    for (const assignment of parsedPlan.assignments) {
      const childNameLower = assignment.childName.toLowerCase().trim();
      let childId = childrenMap.get(childNameLower);
      let isNew = false;

      // Create child if doesn't exist
      if (!childId) {
        const { data: newChild, error } = await supabase
          .from('montree_children')
          .insert({
            name: assignment.childName,
            classroom_id: classroomId,
            age: 4,
            is_active: true
          })
          .select('id')
          .single();

        if (newChild && !error) {
          childId = newChild.id;
          childrenMap.set(childNameLower, childId);
          results.childrenCreated++;
          isNew = true;
        } else {
          console.error(`Failed to create child: ${assignment.childName}`, error);
          continue;
        }
      } else {
        results.childrenUpdated++;
      }

      // Add work progress
      if (childId && assignment.works?.length > 0) {
        for (const work of assignment.works) {
          let area = work.area;
          if (area === 'mathematics') area = 'math';

          const { error: progressError } = await supabase
            .from('montree_child_progress')
            .insert({
              child_id: childId,
              work_name: work.workNameEnglish || work.workNameChinese,
              work_name_chinese: work.workNameChinese,
              area: area,
              status: work.status || 'practicing',
              notes: assignment.notes || null
            });

          if (!progressError) {
            results.worksAdded++;
          }
        }
      }

      results.children.push({
        name: assignment.childName,
        worksCount: assignment.works?.length || 0,
        isNew
      });
    }

    return NextResponse.json({
      success: true,
      results,
      parsed: parsedPlan
    });

  } catch (error) {
    console.error('Import error:', error);
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

async function parseWithClaude(content: string): Promise<ParsedPlan> {
  const anthropic = getAnthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `You are a Montessori curriculum expert. Parse this Chinese weekly plan document.

DOCUMENT FORMAT:
The document typically has a table where each child has rows with their assigned works.
Each row may contain: Name | Practical Life | Sensorial | Math | Language | Culture | Notes

AREA MAPPING:
- practical_life: 食物制备, 剪纸, 编辫子, 照顾环境, 洗桌子, 衣饰框, 插花, 倒, 舀豆子, 叠衣服
- sensorial: 三项式, 二项式, 味觉瓶, 嗅觉瓶, 音感钟, 色板, 粉红塔, 棕色梯, 红棒, 几何图橱
- mathematics: 数棒, 砂纸数字, 纺锤棒箱, 数字与筹码, 金色珠子, 直线数数, 加法蛇, 邮票游戏
- language: Anything with letters, WBW, WFW, CVC, 3ptc, phonics, matching, 砂纸字母
- culture: 地球仪, 地图, 鸟, 鱼, 青蛙, 蝴蝶, 花, 树, 叶, 动物

DOCUMENT CONTENT:
${content}

Extract and return a JSON object:
{
  "weekNumber": <number or null>,
  "assignments": [
    {
      "childName": "<child name exactly as written>",
      "works": [
        {
          "area": "<practical_life|sensorial|mathematics|language|culture>",
          "workNameChinese": "<original Chinese name>",
          "workNameEnglish": "<translated English name>",
          "status": "practicing"
        }
      ],
      "notes": "<any observation notes>"
    }
  ]
}

IMPORTANT:
- Include ALL children from the document
- Each work must be categorized into exactly one area
- Return ONLY valid JSON, no markdown`
    }]
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found');
  } catch (e) {
    console.error('Parse error:', responseText.substring(0, 500));
    return { assignments: [] };
  }
}
