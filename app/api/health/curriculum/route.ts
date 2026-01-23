// app/api/health/curriculum/route.ts
// Health check endpoint for curriculum system

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const issues: string[] = [];
  
  try {
    // 1. Check curriculum_roadmap
    const { data: roadmapStats, error: roadmapError } = await supabase
      .from('curriculum_roadmap')
      .select('id, parent_description')
      .then(res => ({
        data: {
          total: res.data?.length || 0,
          withDescription: res.data?.filter(w => w.parent_description).length || 0,
        },
        error: res.error
      }));

    if (roadmapError) issues.push(`curriculum_roadmap query failed: ${roadmapError.message}`);

    // 2. Check montree_school_curriculum_works
    const { data: schoolStats } = await supabase
      .from('montree_school_curriculum_works')
      .select('id, is_active, parent_description')
      .then(res => ({
        data: {
          total: res.data?.length || 0,
          active: res.data?.filter(w => w.is_active).length || 0,
          withDescription: res.data?.filter(w => w.is_active && w.parent_description).length || 0,
        }
      }));

    // 3. Check for orphaned assignments
    const { data: orphanedAssignments } = await supabase.rpc('check_orphaned_assignments').catch(() => ({ data: null }));

    // If RPC doesn't exist, do manual check
    let orphanedCount = 0;
    if (orphanedAssignments === null) {
      const { data: assignments } = await supabase
        .from('montree_child_assignments')
        .select('id, child_id, work_id');
      
      const { data: children } = await supabase
        .from('montree_children')
        .select('id');
      
      const { data: works } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('id');

      const childIds = new Set(children?.map(c => c.id) || []);
      const workIds = new Set(works?.map(w => w.id) || []);

      orphanedCount = assignments?.filter(a => 
        !childIds.has(a.child_id) || !workIds.has(a.work_id)
      ).length || 0;
    }

    // 4. Check children count
    const { count: childrenCount } = await supabase
      .from('montree_children')
      .select('*', { count: 'exact', head: true });

    // 5. Check games
    const { count: gamesCount } = await supabase
      .from('montessori_games')
      .select('*', { count: 'exact', head: true });

    // 6. Check areas
    const { count: areasCount } = await supabase
      .from('curriculum_areas')
      .select('*', { count: 'exact', head: true });

    // Determine overall health
    const descriptionCoverage = roadmapStats?.total 
      ? Math.round((roadmapStats.withDescription / roadmapStats.total) * 100)
      : 0;

    if (descriptionCoverage < 80) {
      issues.push(`Low parent description coverage: ${descriptionCoverage}%`);
    }
    if (orphanedCount > 0) {
      issues.push(`${orphanedCount} orphaned assignments detected`);
    }

    const status = issues.length === 0 ? 'healthy' : 'degraded';

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      metrics: {
        curriculum_roadmap: {
          total: roadmapStats?.total || 0,
          with_parent_description: roadmapStats?.withDescription || 0,
          coverage_percent: descriptionCoverage,
        },
        montree_school_works: {
          total: schoolStats?.total || 0,
          active: schoolStats?.active || 0,
          with_parent_description: schoolStats?.withDescription || 0,
        },
        children: childrenCount || 0,
        games: gamesCount || 0,
        areas: areasCount || 0,
        orphaned_assignments: orphanedCount,
      },
      issues: issues.length > 0 ? issues : undefined,
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
