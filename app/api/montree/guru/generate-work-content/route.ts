// app/api/montree/guru/generate-work-content/route.ts
// AI-powered content generation for new curriculum works
// Teacher provides work name + area + optional prompt → Sonnet generates all fields

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';

const GENERATE_CONTENT_TOOL = {
  name: 'generate_work_content' as const,
  description: 'Generate comprehensive Montessori curriculum content for a work/activity.',
  input_schema: {
    type: 'object' as const,
    properties: {
      description: {
        type: 'string',
        description: 'Professional 1-2 sentence description of this Montessori work for teachers.',
      },
      parent_description: {
        type: 'string',
        description: 'Warm, accessible 1-2 sentence explanation for parents who may not know Montessori terminology.',
      },
      why_it_matters: {
        type: 'string',
        description: 'Brief explanation of the developmental significance of this work (cognitive, motor, social-emotional benefits).',
      },
      quick_guide: {
        type: 'string',
        description: 'Step-by-step presentation guide for teachers (numbered steps, concise, actionable).',
      },
      materials: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of materials needed (e.g., "Pink Tower (10 cubes)", "Small mat").',
      },
      direct_aims: {
        type: 'array',
        items: { type: 'string' },
        description: 'Direct aims of this work (what the child explicitly learns).',
      },
      presentation_steps: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ordered presentation steps for the teacher.',
      },
    },
    required: ['description', 'parent_description', 'why_it_matters', 'quick_guide', 'materials', 'direct_aims', 'presentation_steps'],
  },
};

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { work_name, area, teacher_prompt } = body;
    const locale = ['en', 'zh'].includes(body.locale) ? body.locale : 'en';

    if (!work_name || typeof work_name !== 'string' || work_name.length > 200) {
      return NextResponse.json({ success: false, error: 'Valid work_name required (max 200 chars)' }, { status: 400 });
    }

    const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    if (!area || !validAreas.includes(area)) {
      return NextResponse.json({ success: false, error: 'Valid area required' }, { status: 400 });
    }

    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: false, error: 'AI features not enabled' }, { status: 503 });
    }

    // Check for duplicate work in classroom
    const supabase = getSupabase();
    let duplicateWarning: string | null = null;

    if (auth.classroomId) {
      try {
        // Sanitize for ILIKE (escape special chars)
        const sanitized = work_name.trim().replace(/[%_\\]/g, '\\$&');
        const { data: existing } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('name')
          .eq('classroom_id', auth.classroomId)
          .eq('is_active', true)
          .ilike('name', `%${sanitized}%`)
          .limit(3);

        if (existing && existing.length > 0) {
          const names = existing.map(w => w.name).join(', ');
          duplicateWarning = locale === 'zh'
            ? `教室中已有类似的工作: ${names}`
            : `Similar works already exist in your classroom: ${names}`;
        }
      } catch {
        // Non-fatal
      }
    }

    const langInstruction = locale === 'zh'
      ? 'Write ALL content in Simplified Chinese.'
      : 'Write ALL content in English.';

    const teacherContext = teacher_prompt && typeof teacher_prompt === 'string'
      ? `\n\nTeacher's notes about this work: "${teacher_prompt.slice(0, 500)}"`
      : '';

    const systemPrompt = `You are an experienced AMI-trained Montessori teacher creating curriculum content for a new work.

${langInstruction}

Generate comprehensive, professional content for this Montessori work. Be specific, practical, and warm.
- Description: Professional but accessible
- Parent description: Assume zero Montessori knowledge, warm tone
- Why it matters: Connect to child development (cognitive, motor, social-emotional)
- Quick guide: Numbered steps a teacher can follow immediately
- Materials: Specific items needed
- Aims: What the child explicitly learns
- Presentation steps: Detailed ordered steps for showing the child${teacherContext}`;

    // Call Sonnet with tool_use for structured output
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const apiPromise = anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1200,
      system: systemPrompt,
      tools: [GENERATE_CONTENT_TOOL],
      tool_choice: { type: 'tool', name: 'generate_work_content' },
      messages: [{
        role: 'user',
        content: `Generate curriculum content for the Montessori work "${work_name.trim()}" in the ${area.replace('_', ' ')} area.`,
      }],
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Content generation took too long')), 45000);
    });

    const message = await Promise.race([apiPromise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutHandle!);
    });

    const toolBlock = message.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return NextResponse.json({ success: false, error: 'Failed to generate content' }, { status: 500 });
    }

    const raw = toolBlock.input as Record<string, unknown>;

    // Validate and sanitize output
    const content = {
      description: typeof raw.description === 'string' ? raw.description.slice(0, 500) : '',
      parent_description: typeof raw.parent_description === 'string' ? raw.parent_description.slice(0, 500) : '',
      why_it_matters: typeof raw.why_it_matters === 'string' ? raw.why_it_matters.slice(0, 500) : '',
      quick_guide: typeof raw.quick_guide === 'string' ? raw.quick_guide.slice(0, 2000) : '',
      materials: Array.isArray(raw.materials) ? raw.materials.filter(m => typeof m === 'string').slice(0, 20) : [],
      direct_aims: Array.isArray(raw.direct_aims) ? raw.direct_aims.filter(a => typeof a === 'string').slice(0, 10) : [],
      presentation_steps: Array.isArray(raw.presentation_steps) ? raw.presentation_steps.filter(s => typeof s === 'string').slice(0, 15) : [],
    };

    return NextResponse.json({
      success: true,
      content,
      duplicate_warning: duplicateWarning,
    });

  } catch (error) {
    console.error('[GenerateWorkContent] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate content' }, { status: 500 });
  }
}
