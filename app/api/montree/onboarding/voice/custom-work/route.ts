// app/api/montree/onboarding/voice/custom-work/route.ts
// Adds a custom curriculum work surfaced from voice onboarding (no photo).
// The teacher said something like "rainbow stacking blocks" — we need to add it
// to the classroom curriculum so future onboarding/photo-identification can match it.
//
// Differs from /guru/photo-insight/add-custom-work in that there is NO photo:
// no media_id to attach, no visual memory to generate. Just a clean curriculum entry
// with Sonnet-authored description/parent_description/why_it_matters/materials.
//
// This is the "I noticed you mentioned X — can I help you add it?" wow moment, so it
// uses Sonnet (not Haiku) for the work content generation.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { checkRateLimit } from '@/lib/rate-limiter';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { translateAllLocales } from '@/lib/montree/insert-curriculum-work';
import { randomUUID } from 'crypto';

export const maxDuration = 90;

const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;

const ENRICH_TOOL = {
  name: 'fill_custom_work' as const,
  description:
    "Generate a clean, accurate curriculum entry for a custom Montessori work that a teacher just mentioned by voice. Use AMI Montessori terminology and a calm, professional teacher voice.",
  input_schema: {
    type: 'object' as const,
    properties: {
      description: {
        type: 'string' as const,
        description:
          'Internal description for teachers. 2-3 sentences explaining what the work is, what it looks like, and how the child engages with it. Max 500 chars.',
      },
      parent_description: {
        type: 'string' as const,
        description:
          'Warm, accessible description for parents. 2-3 sentences explaining what their child is doing without jargon. Max 600 chars.',
      },
      why_it_matters: {
        type: 'string' as const,
        description:
          'The Montessori rationale — what skill or sensitive period this work serves. 1-2 sentences. Max 400 chars.',
      },
      materials: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description:
          '3-6 specific physical components used in this work. Each item is a noun phrase, max 50 chars.',
      },
    },
    required: ['description', 'parent_description', 'why_it_matters', 'materials'],
  },
};

function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'No school' }, { status: 403 });
    }

    const supabase = getSupabase();

    const rate = await checkRateLimit(
      supabase,
      `onboarding-custom-work:${auth.schoolId}`,
      '/api/montree/onboarding/voice/custom-work',
      30,
      60
    );
    if (!rate.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { name, area, classroom_id, teacher_phrase } = body as {
      name?: string;
      area?: string;
      classroom_id?: string;
      teacher_phrase?: string;
    };

    const cid = classroom_id || auth.classroomId;
    const trimmedName = (name || '').trim();

    if (!cid) {
      return NextResponse.json({ success: false, error: 'classroom_id required' }, { status: 400 });
    }
    if (!trimmedName || trimmedName.length < 3 || trimmedName.length > 60) {
      return NextResponse.json(
        { success: false, error: 'Name must be 3-60 characters' },
        { status: 400 }
      );
    }
    if (!area || !VALID_AREAS.includes(area as typeof VALID_AREAS[number])) {
      return NextResponse.json({ success: false, error: 'Invalid area' }, { status: 400 });
    }

    // Verify classroom belongs to teacher's school
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', cid)
      .maybeSingle() as { data: { school_id: string } | null; error: unknown };

    if (classroomError || !classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Classroom validation failed' }, { status: 403 });
    }

    // Resolve area_key → area_id
    const { data: areaRow } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', cid)
      .eq('area_key', area)
      .maybeSingle() as { data: { id: string } | null };

    if (!areaRow?.id) {
      return NextResponse.json(
        { success: false, error: `Curriculum area "${area}" not found in this classroom` },
        { status: 500 }
      );
    }
    const areaId = areaRow.id;

    // Check for existing custom work with the same name (case-insensitive) before generating
    const { data: existing } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name')
      .eq('classroom_id', cid)
      .ilike('name', escapeIlike(trimmedName))
      .maybeSingle() as { data: { id: string; name: string } | null };

    if (existing?.id) {
      return NextResponse.json({
        success: true,
        work_id: existing.id,
        deduplicated: true,
      });
    }

    // Generate enrichment via Sonnet (the wow moment — personality matters here)
    let enrichment: {
      description: string;
      parent_description: string;
      why_it_matters: string;
      materials: string[];
    } | null = null;

    if (anthropic) {
      try {
        const prompt = `A Montessori teacher just mentioned a custom work in their classroom by voice: "${trimmedName}" (area: ${area}).${teacher_phrase ? ` In context: "${teacher_phrase}"` : ''}

Generate a clean curriculum entry. Use AMI Montessori terminology where it fits. Keep the parent description warm and free of jargon. The why_it_matters should connect to a sensitive period or developmental skill.

If the work name is vague, infer reasonably from the area. Stay neutral and professional — don't invent grandiose claims.`;

        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 1500,
          tools: [ENRICH_TOOL],
          tool_choice: { type: 'tool', name: 'fill_custom_work' },
          messages: [{ role: 'user', content: prompt }],
        });

        const toolBlock = response.content.find(b => b.type === 'tool_use');
        if (toolBlock && toolBlock.type === 'tool_use') {
          const out = toolBlock.input as {
            description?: string;
            parent_description?: string;
            why_it_matters?: string;
            materials?: string[];
          };
          enrichment = {
            description: (out.description || '').slice(0, 500),
            parent_description: (out.parent_description || '').slice(0, 600),
            why_it_matters: (out.why_it_matters || '').slice(0, 400),
            materials: (out.materials || [])
              .filter(m => typeof m === 'string')
              .map(m => m.trim().slice(0, 50))
              .filter(Boolean)
              .slice(0, 6),
          };
        }
      } catch (err) {
        console.error('[VoiceOnboarding/custom-work] Sonnet enrichment failed:', err);
        // Fall through — we'll insert with minimal data
      }
    }

    // Compute next sequence
    const { data: seqRow } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('sequence')
      .eq('classroom_id', cid)
      .eq('area_id', areaId)
      .order('sequence', { ascending: false })
      .limit(1) as { data: Array<{ sequence: number }> | null };

    const nextSequence = (seqRow?.[0]?.sequence || 0) + 1;
    const workKey = `custom_${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${randomUUID().slice(0, 8)}`;

    // Insert custom work
    const { data: newWork, error: insertError } = await supabase
      .from('montree_classroom_curriculum_works')
      .insert({
        classroom_id: cid,
        name: trimmedName,
        work_key: workKey,
        area_id: areaId,
        sequence: nextSequence,
        description: enrichment?.description || null,
        parent_description: enrichment?.parent_description || null,
        why_it_matters: enrichment?.why_it_matters || null,
        materials: enrichment?.materials || [],
        is_custom: true,
        is_active: true,
        source: 'voice_onboarding',
      })
      .select('id')
      .single() as { data: { id: string } | null; error: { code?: string } | null };

    if (insertError) {
      // 23505 = unique constraint violation; try to fetch the existing row
      if (insertError.code === '23505') {
        const { data: dedup } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id')
          .eq('classroom_id', cid)
          .ilike('name', escapeIlike(trimmedName))
          .eq('is_custom', true)
          .maybeSingle() as { data: { id: string } | null };

        if (dedup?.id) {
          return NextResponse.json({
            success: true,
            work_id: dedup.id,
            deduplicated: true,
          });
        }
      }
      console.error('[VoiceOnboarding/custom-work] Insert error:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to create work' }, { status: 500 });
    }

    if (!newWork?.id) {
      return NextResponse.json({ success: false, error: 'Failed to create work' }, { status: 500 });
    }

    const workId = newWork.id;

    // Fire-and-forget: translate to all enabled locales
    if (enrichment) {
      translateAllLocales(
        {
          classroomId: cid,
          workName: trimmedName,
          parentDescription: enrichment.parent_description,
          whyItMatters: enrichment.why_it_matters,
        }
      ).catch(err => {
        console.error('[VoiceOnboarding/custom-work] Translation failed (non-fatal):', err);
      });
    }

    // Fire-and-forget: log to global staging for cross-school learning
    supabase
      .from('montree_global_works_staging')
      .insert({
        source_school_id: auth.schoolId,
        source_classroom_id: cid,
        source_work_id: workId,
        name: trimmedName,
        area,
        description: enrichment?.description || null,
        materials: enrichment?.materials || [],
        why_it_matters: enrichment?.why_it_matters || null,
        origin: 'voice_onboarding',
      })
      .then(({ error }) => {
        if (error) {
          console.error('[VoiceOnboarding/custom-work] Global staging failed (non-fatal):', error.message);
        }
      });

    return NextResponse.json({
      success: true,
      work_id: workId,
      name: trimmedName,
      area,
      deduplicated: false,
    });
  } catch (err) {
    console.error('[VoiceOnboarding/custom-work] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
