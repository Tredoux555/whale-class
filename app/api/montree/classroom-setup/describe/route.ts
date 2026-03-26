// POST /api/montree/classroom-setup/describe
// Sonnet vision call to generate rich visual + parent descriptions from a reference photo
// Used by: Classroom Setup page + Photo Audit "Use as Reference" button

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { getPublicUrl } from '@/lib/supabase-client';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';

const DESCRIBE_TIMEOUT_MS = 45_000;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (!auth.classroomId) {
      return NextResponse.json({ success: false, error: 'No classroom associated' }, { status: 403 });
    }

    // Rate limit: 20 describe calls per 15 minutes per IP (Sonnet is expensive)
    const supabase = getSupabase();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const { allowed, retryAfterSeconds } = await checkRateLimit(supabase, ip, '/api/montree/classroom-setup/describe', 20, 15);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: `Rate limited. Try again in ${retryAfterSeconds || 60}s` },
        { status: 429 }
      );
    }
    if (!anthropic) {
      return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { photo_url, storage_path, work_name, area } = body;

    // Accept either photo_url (full URL from photo-audit) or storage_path (from classroom-setup)
    let resolvedPhotoUrl = photo_url;
    let resolvedStoragePath = storage_path;
    if (!resolvedPhotoUrl && storage_path) {
      // Classroom-setup sends storage_path — build full URL for Anthropic vision API
      resolvedPhotoUrl = getPublicUrl('montree-media', storage_path);
    }

    if (!resolvedPhotoUrl || typeof resolvedPhotoUrl !== 'string' || !resolvedPhotoUrl.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'Valid photo_url or storage_path required' }, { status: 400 });
    }
    if (!work_name || typeof work_name !== 'string') {
      return NextResponse.json({ success: false, error: 'work_name required' }, { status: 400 });
    }

    // Check for existing visual_memory entry to accumulate descriptions
    let existingDescription: string | null = null;
    try {
      const { data: existing } = await supabase
        .from('montree_visual_memory')
        .select('visual_description')
        .eq('classroom_id', auth.classroomId)
        .ilike('work_name', work_name.trim())
        .maybeSingle();
      if (existing?.visual_description) {
        existingDescription = existing.visual_description;
        console.log(`[Describe] Found existing description for "${work_name}" — will merge`);
      }
    } catch {
      // Non-critical — proceed without existing description
    }

    const apiAbortController = new AbortController();
    const apiTimeout = setTimeout(() => apiAbortController.abort(), DESCRIBE_TIMEOUT_MS);
    const startMs = Date.now();

    // Build user prompt — include existing description if available so Sonnet merges knowledge
    const userPromptParts: string[] = [
      `This is the Montessori work "${work_name}" (area: ${area || 'unknown'}).`,
    ];
    if (existingDescription) {
      userPromptParts.push(
        `\nAn earlier reference photo produced this description:\n"${existingDescription}"\n`,
        `Now you have a NEW reference photo. Produce an ENHANCED description that merges what you already know from the earlier description with any NEW visual details from this photo. Keep everything that was accurate before and ADD new observations. The result should be richer and more complete than either source alone.`
      );
    } else {
      userPromptParts.push(
        `Generate a complete description set from this reference photo. Focus on what makes this specific material recognizable — its exact colors, shapes, textures, and arrangement.`
      );
    }

    let message;
    try {
      message = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        system: `You are a Montessori classroom material describer. Given a photo of a Montessori work/material, you produce structured descriptions for two audiences:
1. CLIP visual classifier — a technical description of what the material PHYSICALLY looks like (shape, color, material composition, arrangement)
2. Parents — a warm, educational description of what this work teaches and why it matters

IMPORTANT: Describe the MATERIALS, not the child or the environment. Focus on what makes THIS specific version of the work recognizable.`,
        tools: [{
          name: 'describe_work',
          description: 'Generate structured descriptions of a Montessori work from a reference photo',
          input_schema: {
            type: 'object' as const,
            properties: {
              visual_description: {
                type: 'string',
                description: 'Technical description for CLIP classifier (150-250 words). Material-first: exact composition (wood, metal, plastic, fabric, beads). Colors, dimensions, arrangement. What makes THIS version unique. Action verbs for what hands DO with it. NOT X disambiguation for similar-looking works.',
              },
              parent_description: {
                type: 'string',
                description: 'Warm parent-facing description (2-3 sentences). "Your child is working with..." format. What the child does with it. What skills it develops.',
              },
              why_it_matters: {
                type: 'string',
                description: 'Developmental significance (1-2 sentences). What cognitive/motor/social skills this builds. Why Montessori uses this specific material design.',
              },
              key_materials: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of 3-8 key physical materials visible (e.g., "wooden cubes", "pink paint", "graduated sizes")',
              },
              negative_descriptions: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of 1-3 "NOT X" statements to disambiguate from similar works (e.g., "NOT sandpaper letters which have rough textured surfaces")',
              },
            },
            required: ['visual_description', 'parent_description', 'why_it_matters', 'key_materials', 'negative_descriptions'],
          },
        }],
        tool_choice: { type: 'tool', name: 'describe_work' },
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: resolvedPhotoUrl },
            },
            {
              type: 'text',
              text: userPromptParts.join(' '),
            },
          ],
        }],
      }, { signal: apiAbortController.signal });
    } catch (err) {
      if (apiAbortController.signal.aborted) {
        console.error(`[Describe] Sonnet vision timed out after ${DESCRIBE_TIMEOUT_MS}ms`);
        return NextResponse.json({ success: false, error: 'Description generation timed out' }, { status: 504 });
      }
      throw err;
    } finally {
      clearTimeout(apiTimeout);
    }

    console.log(`[Describe] Sonnet vision completed in ${Date.now() - startMs}ms for "${work_name}"`);

    // Extract tool_use result
    let result: {
      visual_description: string;
      parent_description: string;
      why_it_matters: string;
      key_materials: string[];
      negative_descriptions: string[];
    } | null = null;

    for (const block of message.content) {
      if (block.type === 'tool_use' && block.name === 'describe_work') {
        result = block.input as typeof result;
        break;
      }
    }

    if (!result || !result.visual_description || !result.parent_description || !result.why_it_matters) {
      console.error('[Describe] Sonnet returned incomplete tool_use result:', result ? Object.keys(result) : 'null');
      return NextResponse.json({ success: false, error: 'Failed to generate description' }, { status: 500 });
    }
    // Ensure arrays are present (Sonnet might omit them)
    if (!Array.isArray(result.key_materials)) result.key_materials = [];
    if (!Array.isArray(result.negative_descriptions)) result.negative_descriptions = [];

    // Build reference_photo_url for the client (proxy URL for China speed)
    const referencePhotoUrl = resolvedStoragePath
      ? getProxyUrl(resolvedStoragePath)
      : photo_url; // photo-audit already has a full URL

    return NextResponse.json({
      success: true,
      description: {
        visual_description: result.visual_description.slice(0, 1000),
        parent_description: result.parent_description.slice(0, 500),
        why_it_matters: result.why_it_matters.slice(0, 500),
        key_materials: (result.key_materials || []).slice(0, 20),
        negative_descriptions: (result.negative_descriptions || []).slice(0, 10),
      },
      reference_photo_url: referencePhotoUrl,
    });
  } catch (error) {
    console.error('[Describe] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
