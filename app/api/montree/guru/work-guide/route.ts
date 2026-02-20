// app/api/montree/guru/work-guide/route.ts
// Detailed step-by-step presentation guide for a specific work
// For homeschool parents who need hand-holding on how to present each activity
// Uses Haiku for speed, includes video recommendations

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import Anthropic from '@anthropic-ai/sdk';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Load curriculum data
import languageData from '@/lib/curriculum/data/language.json';
import mathData from '@/lib/curriculum/data/math.json';
import sensorialData from '@/lib/curriculum/data/sensorial.json';
import practicalLifeData from '@/lib/curriculum/data/practical-life.json';
import culturalData from '@/lib/curriculum/data/cultural.json';

function findWorkInCurriculum(workName: string) {
  const areas = [
    { data: practicalLifeData, areaId: 'practical_life', areaName: 'Practical Life' },
    { data: sensorialData, areaId: 'sensorial', areaName: 'Sensorial' },
    { data: mathData, areaId: 'mathematics', areaName: 'Mathematics' },
    { data: languageData, areaId: 'language', areaName: 'Language' },
    { data: culturalData, areaId: 'cultural', areaName: 'Cultural Studies' },
  ];

  for (const area of areas) {
    const categories = (area.data as any).categories || [];
    for (const cat of categories) {
      for (const work of cat.works || []) {
        if (work.name === workName || work.id === workName) {
          return {
            ...work,
            categoryName: cat.name,
            areaName: area.areaName,
            areaId: area.areaId,
          };
        }
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { work_name, child_id, child_age } = body;

    if (!work_name) {
      return NextResponse.json({ success: false, error: 'work_name is required' }, { status: 400 });
    }

    // Find the work in our curriculum
    const currWork = findWorkInCurriculum(work_name);

    // Build context
    let childContext = '';
    if (child_id) {
      const supabase = getSupabase();
      const { data: child } = await supabase
        .from('montree_children')
        .select('name, age')
        .eq('id', child_id)
        .single();

      // Get child's status on this work
      const { data: progress } = await supabase
        .from('montree_child_progress')
        .select('status, notes')
        .eq('child_id', child_id)
        .eq('work_name', work_name)
        .single();

      if (child) {
        childContext = `\nCHILD: ${child.name.split(' ')[0]}, Age ${child.age || child_age || 4}`;
        if (progress) {
          childContext += `\nCurrent status on this work: ${progress.status}`;
          if (progress.notes) childContext += `\nTeacher notes: ${progress.notes}`;
        }
      }
    }

    const system = `You are a patient, experienced Montessori guide giving a first-time homeschool parent a step-by-step guide on how to present a Montessori work to their child. You are standing beside them, talking them through it.

RULES:
- Use simple, clear language. No jargon.
- Number every step. Be very specific about hand movements, positioning, speed.
- The parent has NEVER seen this done before. Assume zero knowledge.
- Include what to say (or not say) to the child.
- Explain what "success" looks like and what to do if the child struggles.
- Suggest a YouTube video search term they can watch first.
- Include DIY alternatives if official Montessori materials aren't available.
- Keep the tone warm and encouraging.

RESPONSE FORMAT (use these exact headers):

## [Work Name]
**Area:** [Montessori area]
**Age range:** [appropriate age]
**Time needed:** [minutes]

### 🎬 Watch First
Search YouTube: "[specific search terms]"

### 🛒 What You Need
[Numbered list of materials, with DIY alternatives in parentheses]

### 📍 Setup
[How to arrange the materials before you start]

### 👋 Invitation
[Exact words to say to invite the child]

### 📝 Step-by-Step Presentation
[Numbered steps with very specific instructions]

### 👀 What to Watch For
**Success looks like:** [description]
**If they struggle:** [what to do]
**Control of error:** [how the child self-corrects]

### 🔄 Variations & Extensions
[2-3 ways to make it easier or harder]

### 💡 Why This Work Matters
[2-3 sentences about the developmental purpose]`;

    const workInfo = currWork
      ? `WORK: ${currWork.name}
Area: ${currWork.areaName} > ${currWork.categoryName}
Description: ${currWork.description}
Materials: ${currWork.materials?.join(', ') || 'not listed'}
Direct Aims: ${currWork.directAims?.join(', ') || 'not listed'}
Indirect Aims: ${currWork.indirectAims?.join(', ') || 'not listed'}
Control of Error: ${currWork.controlOfError || 'not listed'}
Levels:
${(currWork.levels || []).map((l: any) => `  Level ${l.level}: ${l.name} — ${l.description}${l.videoSearchTerms ? ` (YouTube: ${l.videoSearchTerms.join(', ')})` : ''}`).join('\n')}
Prerequisites: ${currWork.prerequisites?.length > 0 ? currWork.prerequisites.join(', ') : 'None'}
Age Range: ${currWork.ageRange || 'primary'}
Sequence in category: ${currWork.sequence || 'unknown'}`
      : `WORK: ${work_name}\n(No curriculum data found — generate guidance based on standard Montessori knowledge)`;

    const userPrompt = `${workInfo}${childContext}

Generate a complete, step-by-step presentation guide for this work. The parent is doing this for the first time.`;

    // Call Haiku
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2500,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const guideText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    return NextResponse.json({
      success: true,
      guide: guideText,
      work_name,
      area: currWork?.areaName || 'unknown',
      materials: currWork?.materials || [],
      video_terms: currWork?.levels?.[0]?.videoSearchTerms || [`${work_name} montessori presentation`],
    });

  } catch (error) {
    console.error('[Guru Work Guide] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate work guide' },
      { status: 500 }
    );
  }
}
