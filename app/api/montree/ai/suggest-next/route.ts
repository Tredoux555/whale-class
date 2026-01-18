// app/api/montree/ai/suggest-next/route.ts
// POST /api/montree/ai/suggest-next - AI-powered work recommendations
// THE SMART ENGINE: Analyzes readiness and suggests optimal next works

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { anthropic, AI_ENABLED, AI_MODEL, MAX_TOKENS } from '@/lib/ai/anthropic';
import { isValidUUID } from '@/lib/montree/utils/validation';
import { 
  MONTREE_SYSTEM_PROMPT, 
  buildSuggestNextPrompt,
  transformAssignment,
  transformChildContext,
  generateFallbackSuggestions
} from '@/lib/montree/ai';
import type { 
  SuggestNextResponse, 
  WorkSuggestion,
  ChildContext, 
  AssignmentWithWork 
} from '@/lib/montree/types/ai';
import { AREA_KEYS, type AreaKey } from '@/lib/montree/types/curriculum';

// ============================================
// TYPES
// ============================================

interface AvailableWork {
  id: string;
  work_key: string;
  name: string;
  name_chinese?: string;
  description?: string;
  age_range: string;
  materials: string[];
  direct_aims: string[];
  indirect_aims: string[];
  prerequisites: string[];
  category_key?: string;
  category_name?: string;
  area_key: string;
  area_name: string;
}

interface WorkWithReadiness extends AvailableWork {
  prereqs_met: string[];
  prereqs_missing: string[];
  readiness_score: number;
}

interface AISuggestion {
  work_id: string;
  work_key: string;
  readiness_score: number;
  reason: string;
  developmental_benefit: string;
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { child_id, area, limit = 5 } = body;

    // Validate child_id
    if (!child_id) {
      return NextResponse.json(
        { error: 'child_id is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(child_id)) {
      return NextResponse.json(
        { error: 'Invalid child_id format' },
        { status: 400 }
      );
    }

    // Validate area if provided
    if (area && !AREA_KEYS.includes(area)) {
      return NextResponse.json(
        { error: `Invalid area. Must be one of: ${AREA_KEYS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate and clamp limit
    const validatedLimit = Math.min(Math.max(1, Number(limit) || 5), 10);

    const supabase = await createServerClient();

    // ========================================
    // STEP 1: Fetch child with classroom info
    // ========================================
    const { data: rawChild, error: childError } = await supabase
      .from('montree_children')
      .select(`
        id,
        name,
        name_chinese,
        age,
        date_of_birth,
        classroom_id,
        classroom:montree_classrooms(id, name)
      `)
      .eq('id', child_id)
      .single();

    if (childError || !rawChild) {
      return NextResponse.json(
        { error: 'Child not found' },
        { status: 404 }
      );
    }

    const childContext = transformChildContext(rawChild as Parameters<typeof transformChildContext>[0]);
    
    if (!childContext) {
      return NextResponse.json(
        { error: 'Child is not assigned to a classroom' },
        { status: 400 }
      );
    }

    // ========================================
    // STEP 2: Fetch child's current assignments
    // ========================================
    const { data: rawAssignments, error: assignmentsError } = await supabase
      .from('montree_child_assignments')
      .select(`
        id,
        child_id,
        work_id,
        status,
        current_level,
        assigned_at,
        presented_at,
        mastered_at,
        notes,
        work:montree_classroom_curriculum_works(
          id,
          work_key,
          name,
          name_chinese,
          description,
          age_range,
          materials,
          direct_aims,
          indirect_aims,
          prerequisites,
          category_key,
          category_name,
          area_id,
          area:montree_classroom_curriculum_areas(
            area_key,
            name
          )
        )
      `)
      .eq('child_id', child_id);

    if (assignmentsError) {
      console.error('Fetch assignments error:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    // Transform using shared utility
    const transformedAssignments: AssignmentWithWork[] = (rawAssignments || [])
      .map(a => transformAssignment(a as Parameters<typeof transformAssignment>[0]))
      .filter((a): a is AssignmentWithWork => a !== null);

    // ========================================
    // STEP 3: Fetch ALL available works in classroom
    // ========================================
    let worksQuery = supabase
      .from('montree_classroom_curriculum_works')
      .select(`
        id,
        work_key,
        name,
        name_chinese,
        description,
        age_range,
        materials,
        direct_aims,
        indirect_aims,
        prerequisites,
        category_key,
        category_name,
        area:montree_classroom_curriculum_areas(
          area_key,
          name
        )
      `)
      .eq('classroom_id', rawChild.classroom_id)
      .eq('is_active', true);

    // Filter by area if specified
    if (area) {
      const { data: areaData } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id')
        .eq('classroom_id', rawChild.classroom_id)
        .eq('area_key', area)
        .single();
      
      if (areaData) {
        worksQuery = worksQuery.eq('area_id', areaData.id);
      }
    }

    const { data: allWorks, error: worksError } = await worksQuery;

    if (worksError) {
      console.error('Fetch works error:', worksError);
      return NextResponse.json(
        { error: 'Failed to fetch available works' },
        { status: 500 }
      );
    }

    // Transform to AvailableWork type
    const availableWorks: AvailableWork[] = (allWorks || []).map(w => {
      const areaInfo = w.area as { area_key: string; name: string } | null;
      return {
        id: w.id,
        work_key: w.work_key,
        name: w.name,
        name_chinese: w.name_chinese || undefined,
        description: w.description || undefined,
        age_range: w.age_range,
        materials: w.materials || [],
        direct_aims: w.direct_aims || [],
        indirect_aims: w.indirect_aims || [],
        prerequisites: w.prerequisites || [],
        category_key: w.category_key || undefined,
        category_name: w.category_name || undefined,
        area_key: areaInfo?.area_key || 'unknown',
        area_name: areaInfo?.name || 'Unknown'
      };
    });

    // ========================================
    // STEP 4: Calculate prerequisite readiness
    // ========================================
    const masteredWorkKeys = new Set(
      transformedAssignments
        .filter(a => a.status === 'mastered')
        .map(a => a.work.work_key)
    );

    const assignedWorkIds = new Set(
      transformedAssignments.map(a => a.work_id)
    );

    // Filter to unassigned works only
    const unassignedWorks = availableWorks.filter(w => !assignedWorkIds.has(w.id));

    // Calculate readiness scores
    const worksWithReadiness: WorkWithReadiness[] = unassignedWorks.map(w => {
      const prereqsMet = w.prerequisites.filter(p => masteredWorkKeys.has(p));
      const prereqsMissing = w.prerequisites.filter(p => !masteredWorkKeys.has(p));
      const readinessScore = w.prerequisites.length === 0 
        ? 1.0 
        : prereqsMet.length / w.prerequisites.length;
      
      return {
        ...w,
        prereqs_met: prereqsMet,
        prereqs_missing: prereqsMissing,
        readiness_score: readinessScore
      };
    });

    // Sort by readiness score (highest first)
    worksWithReadiness.sort((a, b) => b.readiness_score - a.readiness_score);

    // ========================================
    // STEP 5: Call AI for smart ranking (with robust fallback)
    // ========================================
    let aiSuggestions: AISuggestion[];

    if (AI_ENABLED && anthropic && worksWithReadiness.length > 0) {
      try {
        const prompt = buildSuggestNextPrompt(
          childContext,
          transformedAssignments,
          availableWorks,
          area,
          validatedLimit
        );

        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: MAX_TOKENS,
          system: MONTREE_SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });

        const textContent = response.content.find(c => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Could not parse AI response as JSON');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        aiSuggestions = parsed.suggestions || [];
        
        // Validate AI suggestions - if none are valid, use fallback
        if (aiSuggestions.length === 0) {
          throw new Error('AI returned no suggestions');
        }
      } catch (aiError) {
        console.error('AI suggestion error, using fallback:', aiError);
        aiSuggestions = generateFallbackSuggestions(worksWithReadiness, validatedLimit);
      }
    } else {
      // AI not available or no works to suggest, use fallback
      console.log('Using fallback suggestions');
      aiSuggestions = generateFallbackSuggestions(worksWithReadiness, validatedLimit);
    }

    // ========================================
    // STEP 6: Build rich suggestions with work details
    // ========================================
    const workMap = new Map(worksWithReadiness.map(w => [w.id, w]));
    const workKeyMap = new Map(worksWithReadiness.map(w => [w.work_key, w]));

    const suggestions: WorkSuggestion[] = [];
    const usedWorkIds = new Set<string>();

    // First, try to match AI suggestions
    for (const ai of aiSuggestions) {
      if (suggestions.length >= validatedLimit) break;
      
      // Try to find work by ID first, then by work_key
      const work = workMap.get(ai.work_id) || workKeyMap.get(ai.work_key);
      
      if (work && !usedWorkIds.has(work.id)) {
        usedWorkIds.add(work.id);
        suggestions.push({
          work: {
            id: work.id,
            name: work.name,
            name_chinese: work.name_chinese,
            area: work.area_key as AreaKey,
            area_name: work.area_name,
            category: work.category_name || 'General',
            description: work.description,
            materials: work.materials,
            age_range: work.age_range
          },
          readiness_score: ai.readiness_score,
          reason: ai.reason,
          developmental_benefit: ai.developmental_benefit,
          prerequisites_met: work.prereqs_met,
          prerequisites_missing: work.prereqs_missing
        });
      }
    }

    // If we don't have enough suggestions, fill with top readiness works
    if (suggestions.length < validatedLimit) {
      for (const work of worksWithReadiness) {
        if (suggestions.length >= validatedLimit) break;
        if (usedWorkIds.has(work.id)) continue;
        
        usedWorkIds.add(work.id);
        suggestions.push({
          work: {
            id: work.id,
            name: work.name,
            name_chinese: work.name_chinese,
            area: work.area_key as AreaKey,
            area_name: work.area_name,
            category: work.category_name || 'General',
            description: work.description,
            materials: work.materials,
            age_range: work.age_range
          },
          readiness_score: work.readiness_score,
          reason: work.prerequisites.length === 0 
            ? 'No prerequisites required - ready to begin'
            : `${work.prereqs_met.length} of ${work.prerequisites.length} prerequisites mastered`,
          developmental_benefit: work.direct_aims.slice(0, 2).join(', ') || 'Builds foundational skills',
          prerequisites_met: work.prereqs_met,
          prerequisites_missing: work.prereqs_missing
        });
      }
    }

    // ========================================
    // STEP 7: Build final response
    // ========================================
    const response: SuggestNextResponse = {
      child: {
        id: childContext.id,
        name: childContext.name,
        age: childContext.age
      },
      suggestions,
      total_available_works: unassignedWorks.length,
      generated_at: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Suggest next API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
