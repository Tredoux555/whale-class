// POST /api/montree/classroom-setup/describe
// Sonnet vision: teacher uploads a reference photo of a work → Sonnet generates structured description
// Returns 5 fields: visual_description, parent_description, why_it_matters, key_materials, negative_descriptions
// Cost: ~$0.03-0.06 per call (Sonnet vision, ~500 output tokens)

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase, getPublicUrl } from '@/lib/supabase-client';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { checkRateLimit } from '@/lib/rate-limiter';

const DESCRIBE_WORK_TOOL = {
  name: 'describe_work',
  description: 'Provide a structured visual description of a Montessori work material photographed by the teacher.',
  input_schema: {
    type: 'object' as const,
    properties: {
      visual_description: {
        type: 'string',
        description: 'Detailed visual description (100-300 words) of the physical materials visible in the photo. Focus on: exact material composition (wood, metal, plastic, fabric, beads, sandpaper), colors, shapes, sizes, arrangement, what child\'s hands would be doing. Describe what a phone camera sees from 1-2 meters distance. Include explicit "NOT X which has Y" statements for commonly confused works.',
      },
      parent_description: {
        type: 'string',
        description: 'A warm 2-3 sentence description for parents explaining what this work is and why their child does it. No jargon. E.g. "Your child is working with the Pink Tower — ten pink wooden cubes that stack from largest to smallest. This helps them refine their sense of size and develop concentration."',
      },
      why_it_matters: {
        type: 'string',
        description: 'A single sentence explaining the developmental purpose. E.g. "Develops visual discrimination of dimension and prepares for mathematical concepts of the decimal system."',
      },
      key_materials: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of 3-8 key physical materials/objects visible. E.g. ["10 pink wooden cubes", "largest cube 10cm", "smallest cube 1cm", "natural wood tray"]. Be specific about materials, counts, and sizes.',
      },
      negative_descriptions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of 2-5 "NOT X" statements to distinguish from visually similar works. E.g. ["NOT Brown Stair which has brown rectangular prisms varying in TWO dimensions", "NOT Knobless Cylinders which are colored cylinders"]. Focus on the most commonly confused works in the same area.',
      },
    },
    required: ['visual_description', 'parent_description', 'why_it_matters', 'key_materials', 'negative_descriptions'],
  },
};

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (!auth.classroomId) {
      return NextResponse.json({ success: false, error: 'No classroom associated with this account' }, { status: 403 });
    }
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    if (!anthropic) {
      return NextResponse.json({ success: false, error: 'AI service unavailable' }, { status: 503 });
    }

    const supabase = getSupabase();

    // Verify classroom belongs to this school
    const { data: classroomCheck } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', auth.classroomId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroomCheck) {
      return NextResponse.json({ success: false, error: 'Classroom not found in your school' }, { status: 403 });
    }

    // Rate limit: 20 per hour per school (Sonnet calls are expensive)
    const rateKey = `classroom-setup-describe:${auth.schoolId}`;
    const rateResult = await checkRateLimit(supabase, rateKey, '/api/montree/classroom-setup/describe', 20, 3600);
    if (!rateResult.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { storage_path, work_name, work_key, area } = body;

    // Validate required fields
    if (!storage_path || typeof storage_path !== 'string') {
      return NextResponse.json({ success: false, error: 'storage_path is required' }, { status: 400 });
    }
    // Guard against path traversal
    if (storage_path.includes('..') || storage_path.startsWith('/') || storage_path.includes('://')) {
      return NextResponse.json({ success: false, error: 'Invalid storage path' }, { status: 400 });
    }
    if (!work_name || typeof work_name !== 'string') {
      return NextResponse.json({ success: false, error: 'work_name is required' }, { status: 400 });
    }
    if (!work_key || typeof work_key !== 'string') {
      return NextResponse.json({ success: false, error: 'work_key is required' }, { status: 400 });
    }
    const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'special_events'];
    if (!area || !validAreas.includes(area)) {
      return NextResponse.json({ success: false, error: 'Invalid area' }, { status: 400 });
    }

    // Validate work exists in classroom curriculum
    const { data: workExists } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name')
      .eq('classroom_id', auth.classroomId)
      .eq('work_key', work_key)
      .maybeSingle();

    if (!workExists) {
      return NextResponse.json({ success: false, error: 'Work not found in classroom curriculum' }, { status: 404 });
    }

    // Construct public URL from storage_path
    const photoUrl = getPublicUrl('montree-media', storage_path);
    if (!photoUrl.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'Invalid photo URL' }, { status: 400 });
    }

    // Call Sonnet vision with tool_use for structured output
    const describeAbort = new AbortController();
    const describeTimeout = setTimeout(() => describeAbort.abort(), 45000);

    try {
      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 800,
        tool_choice: { type: 'tool', name: 'describe_work' },
        tools: [DESCRIBE_WORK_TOOL],
        system: `You are a Montessori material documentation expert. A teacher is photographing each work in their classroom so the AI can learn to recognize them.

Given a photo of a Montessori work material, provide a comprehensive structured description. Your description will be used by a CLIP/SigLIP image classifier to identify this work in future photos.

CRITICAL REQUIREMENTS:
1. MATERIAL-FIRST: Lead with exact material composition (wood, metal, plastic, fabric, beads, sandpaper, etc.)
2. PHOTO-SPECIFIC: Describe what a phone camera sees from 1-2 meters, not conceptual understanding
3. ANTI-CONFUSION: Include explicit "NOT X which has Y" for commonly confused works in the same area
4. DIMENSIONS: Include approximate sizes in cm/inches where visible
5. ACTION: Describe what a child's hands would be doing with these materials
6. ARRANGEMENT: How materials are laid out on the shelf or work mat

The work name is "${work_name}" in the ${area.replace('_', ' ')} area. Use this to provide accurate Montessori context, but describe what you ACTUALLY SEE in the photo.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: photoUrl } },
            { type: 'text', text: `This is a reference photo of the Montessori work "${work_name}" (area: ${area}, key: ${work_key}). Please provide a comprehensive structured description for our AI visual learning system.` },
          ],
        }],
      }, { signal: describeAbort.signal });

      // Extract tool_use result
      let result: {
        visual_description?: string;
        parent_description?: string;
        why_it_matters?: string;
        key_materials?: string[];
        negative_descriptions?: string[];
      } | null = null;

      for (const block of response.content) {
        if (block.type === 'tool_use' && block.name === 'describe_work') {
          result = block.input as typeof result;
          break;
        }
      }

      if (!result || !result.visual_description || result.visual_description.length < 20) {
        console.error('[ClassroomSetup/Describe] Sonnet returned empty or invalid result');
        return NextResponse.json({ success: false, error: 'AI failed to generate description. Please try again.' }, { status: 500 });
      }
      // Validate other required fields (non-fatal — use fallbacks)
      if (!result.parent_description || typeof result.parent_description !== 'string') {
        result.parent_description = '';
      }
      if (!result.why_it_matters || typeof result.why_it_matters !== 'string') {
        result.why_it_matters = '';
      }
      if (!Array.isArray(result.key_materials)) {
        if (result.key_materials) console.warn('[ClassroomSetup/Describe] key_materials not array:', typeof result.key_materials);
        result.key_materials = [];
      }
      if (!Array.isArray(result.negative_descriptions)) {
        if (result.negative_descriptions) console.warn('[ClassroomSetup/Describe] negative_descriptions not array:', typeof result.negative_descriptions);
        result.negative_descriptions = [];
      }

      // Validate and sanitize output
      const sanitized = {
        visual_description: result.visual_description.trim().slice(0, 1000),
        parent_description: (result.parent_description || '').trim().slice(0, 500),
        why_it_matters: (result.why_it_matters || '').trim().slice(0, 500),
        key_materials: result.key_materials
          .filter((m): m is string => typeof m === 'string' && m.trim().length > 0).slice(0, 20),
        negative_descriptions: result.negative_descriptions
          .filter((n): n is string => typeof n === 'string' && n.trim().length > 0).slice(0, 10),
      };

      console.log(`[ClassroomSetup/Describe] Generated description for "${work_name}" (${sanitized.visual_description.length} chars, ${sanitized.key_materials.length} materials, ${sanitized.negative_descriptions.length} negatives)`);

      return NextResponse.json({
        success: true,
        description: sanitized,
        // Include storage_path + photo_url so client can save both
        reference_photo_url: photoUrl,
      });

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[ClassroomSetup/Describe] Sonnet call timed out');
        return NextResponse.json({ success: false, error: 'AI timed out. Please try again.' }, { status: 504 });
      }
      throw err;
    } finally {
      clearTimeout(describeTimeout);
    }

  } catch (error) {
    console.error('[ClassroomSetup/Describe] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
