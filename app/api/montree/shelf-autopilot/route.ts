// POST: Generate shelf proposals for children
// POST /apply: Apply selected proposals to focus works
//
// Uses pure sequencer engine (zero AI cost) — optionally enhanced by Haiku for reasoning

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';
import { updateChildSettings } from '@/lib/montree/guru/settings-helper';
import {
  generateShelfProposals,
  type ChildProgress,
  type FocusWork,
  type SequencerResult,
} from '@/lib/montree/guru/work-sequencer';

// ---- POST: Generate proposals ----

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { child_ids, classroom_id, action } = body;

    // Route to apply handler
    if (action === 'apply') {
      return handleApply(request, auth, body);
    }

    // Rate limit: 20/day per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const supabase = getSupabase();
    const { allowed } = await checkRateLimit(
      supabase, ip,
      '/api/montree/shelf-autopilot',
      20, 1440
    );
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit reached (20/day)' }, { status: 429 });
    }

    // Determine which children to process
    let childRows: Array<{ id: string; name: string; school_id: string }>;

    if (child_ids && Array.isArray(child_ids) && child_ids.length > 0) {
      // Specific children — scoped to school for security
      const { data, error } = await supabase
        .from('montree_children')
        .select('id, name, school_id')
        .in('id', child_ids)
        .eq('school_id', auth.schoolId);
      if (error) {
        console.error('[shelf-autopilot] Children fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
      }
      childRows = data || [];
    } else if (classroom_id) {
      // Entire classroom — scoped to school for security
      const { data, error } = await supabase
        .from('montree_children')
        .select('id, name, school_id')
        .eq('classroom_id', classroom_id)
        .eq('school_id', auth.schoolId);
      if (error) {
        console.error('[shelf-autopilot] Classroom children error:', error);
        return NextResponse.json({ error: 'Failed to fetch classroom children' }, { status: 500 });
      }
      childRows = data || [];
    } else {
      return NextResponse.json({ error: 'child_ids or classroom_id required' }, { status: 400 });
    }

    if (childRows.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        children_with_proposals: 0,
        children_stable: 0,
        total_proposals: 0,
      });
    }

    // Filter children to only those belonging to this school
    const schoolChildren = childRows.filter(c => c.school_id === auth.schoolId);
    if (schoolChildren.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    childRows = schoolChildren;

    // Process children in parallel (max 5 concurrent)
    const results: Array<SequencerResult & { error?: string }> = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < childRows.length; i += BATCH_SIZE) {
      const batch = childRows.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(child => processChild(supabase, child.id, child.name))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          results.push(result.value);
          // Save proposals to child settings (fire-and-forget)
          if (result.value.proposals.length > 0) {
            updateChildSettings(result.value.child_id, {
              shelf_autopilot_proposals: result.value.proposals,
              shelf_autopilot_generated_at: new Date().toISOString(),
            }).catch(err => console.error('[shelf-autopilot] Save settings error:', err));
          }
        } else {
          const child = batch[j];
          console.error(`[shelf-autopilot] Failed for ${child.name}:`, result.reason);
          results.push({
            child_id: child.id,
            child_name: child.name,
            proposals: [],
            areas_stable: [],
            summary: `Error generating proposals`,
            error: 'Generation failed — try again',
          });
        }
      }
    }

    const childrenWithProposals = results.filter(r => r.proposals.length > 0 && !r.error).length;
    const childrenStable = results.filter(r => r.proposals.length === 0 && !r.error).length;
    const totalProposals = results.reduce((sum, r) => sum + r.proposals.length, 0);

    return NextResponse.json({
      success: true,
      results,
      children_with_proposals: childrenWithProposals,
      children_stable: childrenStable,
      children_errored: results.filter(r => r.error).length,
      total_proposals: totalProposals,
    });

  } catch (err) {
    console.error('[shelf-autopilot] POST error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Failed to generate proposals' }, { status: 500 });
  }
}

// ---- Process Single Child ----

async function processChild(
  supabase: ReturnType<typeof getSupabase>,
  childId: string,
  childName: string,
): Promise<SequencerResult> {
  // 2 parallel DB queries: progress + focus works
  const [progressRes, focusRes] = await Promise.all([
    supabase
      .from('montree_child_progress')
      .select('work_name, area, status')
      .eq('child_id', childId),
    supabase
      .from('montree_child_focus_works')
      .select('area, work_name, work_id, status')
      .eq('child_id', childId),
  ]);

  if (progressRes.error) {
    throw new Error(`Progress query failed for ${childName}: ${progressRes.error.message}`);
  }
  if (focusRes.error) {
    throw new Error(`Focus works query failed for ${childName}: ${focusRes.error.message}`);
  }

  const progress: ChildProgress[] = (progressRes.data || []).map(p => ({
    work_name: p.work_name,
    area: p.area,
    status: p.status,
  }));

  const focusWorks: FocusWork[] = (focusRes.data || []).map(f => ({
    area: f.area,
    work_name: f.work_name,
    work_id: f.work_id,
    status: f.status,
  }));

  return generateShelfProposals(childId, childName, progress, focusWorks);
}

// ---- Apply Proposals ----

async function handleApply(
  request: NextRequest,
  auth: { schoolId: string; userId?: string },
  body: Record<string, unknown>,
) {
  const applications = body.applications as Array<{
    child_id: string;
    area: string;
    work_name: string;
  }>;

  if (!applications || !Array.isArray(applications) || applications.length === 0) {
    return NextResponse.json({ error: 'applications array required' }, { status: 400 });
  }

  // Cap at 50 applications per request
  if (applications.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 applications per request' }, { status: 400 });
  }

  const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
  const supabase = getSupabase();
  let applied = 0;
  let failed = 0;

  for (const app of applications) {
    try {
      if (!app.child_id || !app.area || !app.work_name) {
        failed++;
        continue;
      }

      if (typeof app.work_name !== 'string' || app.work_name.length === 0 || app.work_name.length > 200) {
        failed++;
        continue;
      }

      if (!validAreas.includes(app.area)) {
        failed++;
        continue;
      }

      // Verify child belongs to school
      const access = await verifyChildBelongsToSchool(app.child_id, auth.schoolId);
      if (!access.allowed) {
        failed++;
        continue;
      }

      // Upsert focus work (same pattern as focus-works POST)
      const { error } = await supabase
        .from('montree_child_focus_works')
        .upsert({
          child_id: app.child_id,
          area: app.area,
          work_name: app.work_name,
          set_at: new Date().toISOString(),
          set_by: 'shelf_autopilot',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'child_id,area',
        });

      if (error) {
        console.error('[shelf-autopilot] Apply error:', error);
        failed++;
      } else {
        applied++;
      }

      // Ensure work exists in progress table with at least 'presented' status
      await supabase
        .from('montree_child_progress')
        .upsert({
          child_id: app.child_id,
          work_name: app.work_name,
          area: app.area,
          status: 'presented',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'child_id,work_name',
          ignoreDuplicates: true, // Don't overwrite existing status
        }).catch(err => console.error('[shelf-autopilot] Progress upsert error:', err));

    } catch (err) {
      console.error('[shelf-autopilot] Apply exception:', err);
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    applied,
    failed,
    total: applications.length,
  });
}
