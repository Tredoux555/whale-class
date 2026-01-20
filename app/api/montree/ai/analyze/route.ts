// app/api/montree/ai/analyze/route.ts
// POST /api/montree/ai/analyze - AI-powered developmental analysis
// THE DIFFERENTIATOR: Transform "Leo did spooning" → developmental insights

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { anthropic, AI_ENABLED, AI_MODEL, MAX_TOKENS } from '@/lib/ai/anthropic';
import { isValidUUID } from '@/lib/montree/utils/validation';
import { 
  MONTREE_SYSTEM_PROMPT, 
  buildAnalyzePrompt,
  transformAssignment,
  transformChildContext,
  getAreaDisplayName,
  generateFallbackAnalysis
} from '@/lib/montree/ai';
import type { 
  AnalyzeResponse, 
  ChildContext, 
  AssignmentWithWork,
  AreaInsight 
} from '@/lib/montree/types/ai';
import { AREA_KEYS, type AreaKey } from '@/lib/montree/types/curriculum';

// ============================================
// TYPES FOR INTERNAL USE
// ============================================

interface AreaStats {
  total: number;
  completed: number;
  in_progress: number;
  not_started: number;
}

interface AIAnalysisResult {
  summary: string;
  strengths: string[];
  growth_areas: string[];
  area_insights: Array<{
    area: string;
    insight: string;
  }>;
  developmental_stage: string;
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { child_id } = body;

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

    const supabase = await createServerClient();

    // ========================================
    // STEP 1: Fetch child with classroom info
    // Using 'children' table (classroom system) - NOT montree_children!
    // ========================================
    const { data: rawChild, error: childError } = await supabase
      .from('children')
      .select(`
        id,
        name,
        date_of_birth,
        classroom_id,
        classroom:classrooms(id, name)
      `)
      .eq('id', child_id)
      .single();

    if (childError || !rawChild) {
      return NextResponse.json(
        { error: 'Child not found' },
        { status: 404 }
      );
    }

    // Calculate age from date_of_birth
    const age = rawChild.date_of_birth 
      ? Math.floor((Date.now() - new Date(rawChild.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10
      : null;

    const childContext = transformChildContext({
      ...rawChild,
      age,
      classroom: rawChild.classroom
    } as Parameters<typeof transformChildContext>[0]);
    
    if (!childContext) {
      return NextResponse.json(
        { error: 'Child is not assigned to a classroom' },
        { status: 400 }
      );
    }

    // ========================================
    // STEP 2: Fetch all assignments with work details
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
    // STEP 3: Calculate area statistics
    // ========================================
    const { data: areaWorksCount, error: areaError } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(`
        area:montree_classroom_curriculum_areas(area_key, name),
        id
      `)
      .eq('classroom_id', rawChild.classroom_id)
      .eq('is_active', true);

    if (areaError) {
      console.error('Fetch area works error:', areaError);
    }

    // Build area stats
    const areaStats = new Map<string, AreaStats>();
    
    // Initialize all areas
    for (const key of AREA_KEYS) {
      areaStats.set(key, { total: 0, completed: 0, in_progress: 0, not_started: 0 });
    }

    // Count total works per area
    if (areaWorksCount) {
      for (const work of areaWorksCount) {
        const areaKey = (work.area as { area_key: string })?.area_key;
        if (areaKey && areaStats.has(areaKey)) {
          areaStats.get(areaKey)!.total++;
        }
      }
    }

    // Count assignments by status per area
    for (const assignment of transformedAssignments) {
      const areaKey = assignment.work.area_key;
      if (areaStats.has(areaKey)) {
        const stats = areaStats.get(areaKey)!;
        switch (assignment.status) {
          case 'mastered':
            stats.completed++;
            break;
          case 'practicing':
          case 'presented':
            stats.in_progress++;
            break;
          case 'not_started':
            stats.not_started++;
            break;
        }
      }
    }

    // ========================================
    // STEP 4: Build AI prompt and call Claude (with fallback)
    // ========================================
    let aiResult: AIAnalysisResult;
    let usedFallback = false;
    
    // Try AI first, use fallback if unavailable or fails
    if (AI_ENABLED && anthropic) {
      try {
        const prompt = buildAnalyzePrompt(childContext, transformedAssignments, areaStats);
        
        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: MAX_TOKENS,
          system: MONTREE_SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });

        // Extract text content
        const textContent = response.content.find(c => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        // Parse JSON response
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Could not parse AI response as JSON');
        }

        aiResult = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
      } catch (aiError) {
        console.error('AI analysis error, using fallback:', aiError);
        aiResult = generateFallbackAnalysis(childContext, transformedAssignments, areaStats);
        usedFallback = true;
      }
    } else {
      // AI not available, use fallback
      console.log('AI not enabled, using fallback analysis');
      aiResult = generateFallbackAnalysis(childContext, transformedAssignments, areaStats);
      usedFallback = true;
    }

    // ========================================
    // STEP 5: Build final response
    // ========================================
    const areaInsights: AreaInsight[] = AREA_KEYS.map(areaKey => {
      const stats = areaStats.get(areaKey)!;
      const aiInsight = aiResult.area_insights.find(ai => ai.area === areaKey);
      
      return {
        area: areaKey as AreaKey,
        area_name: getAreaDisplayName(areaKey),
        total_works: stats.total,
        completed: stats.completed,
        in_progress: stats.in_progress,
        not_started: stats.not_started,
        completion_percentage: stats.total > 0 
          ? Math.round((stats.completed / stats.total) * 100) 
          : 0,
        insight: aiInsight?.insight || `No specific insight for ${getAreaDisplayName(areaKey)} yet.`
      };
    });

    const response: AnalyzeResponse = {
      child: {
        id: childContext.id,
        name: childContext.name,
        age: childContext.age,
        classroom_name: childContext.classroom_name
      },
      summary: aiResult.summary,
      strengths: aiResult.strengths,
      growth_areas: aiResult.growth_areas,
      area_insights: areaInsights,
      developmental_stage: aiResult.developmental_stage,
      generated_at: new Date().toISOString()
    };

    // Add metadata about whether fallback was used (for debugging/transparency)
    if (usedFallback) {
      (response as Record<string, unknown>)._meta = { ai_fallback_used: true };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze child progress' },
      { status: 500 }
    );
  }
}
