// /api/montree/curriculum/duplicates/route.ts
// GET — detect potential duplicate works in a classroom
// POST — consolidate (merge) a group of duplicates into a winner

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { detectDuplicates, type WorkCandidate } from '@/lib/montree/curriculum/duplicate-detection';

// ─── GET: Detect duplicates ───
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const classroomId = auth.classroomId;
    if (!classroomId) {
      return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Load all works for the classroom
    const { data: works, error: worksErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, area_id, is_custom, source, created_at, parent_description, why_it_matters')
      .eq('classroom_id', classroomId)
      .eq('is_active', true);

    if (worksErr) {
      console.error('[Duplicates] Works query error:', worksErr);
      return NextResponse.json({ error: 'Failed to load works' }, { status: 500 });
    }
    if (!works || works.length === 0) {
      return NextResponse.json({ groups: [], total_works: 0 });
    }

    // Load counts in parallel: media per work_id, progress per work_name, visual_memory per work_name
    const workIds = works.map(w => w.id);
    const workNames = works.map(w => w.name);

    // Media counts (by work_id)
    const { data: mediaCounts } = await supabase
      .from('montree_media')
      .select('work_id')
      .in('work_id', workIds);
    const mediaMap = new Map<string, number>();
    for (const m of (mediaCounts || [])) {
      mediaMap.set(m.work_id, (mediaMap.get(m.work_id) || 0) + 1);
    }

    // Progress counts (by work_name) — progress table uses string FK
    const { data: progressCounts } = await supabase
      .from('montree_child_progress')
      .select('work_name')
      .in('work_name', workNames);
    const progressMap = new Map<string, number>();
    for (const p of (progressCounts || [])) {
      progressMap.set(p.work_name, (progressMap.get(p.work_name) || 0) + 1);
    }

    // Visual memory existence (by work_name)
    const { data: vmEntries } = await supabase
      .from('montree_visual_memory')
      .select('work_name')
      .eq('classroom_id', classroomId)
      .in('work_name', workNames);
    const vmSet = new Set((vmEntries || []).map(v => v.work_name));

    // Build candidates
    const candidates: WorkCandidate[] = works.map(w => ({
      id: w.id,
      name: w.name,
      area_id: w.area_id,
      is_custom: w.is_custom ?? false,
      source: w.source,
      created_at: w.created_at,
      parent_description: w.parent_description,
      why_it_matters: w.why_it_matters,
      media_count: mediaMap.get(w.id) || 0,
      progress_count: progressMap.get(w.name) || 0,
      visual_memory_exists: vmSet.has(w.name),
    }));

    const groups = detectDuplicates(candidates);

    return NextResponse.json({
      groups,
      total_works: works.length,
      duplicates_found: groups.reduce((sum, g) => sum + g.works.length, 0),
    });
  } catch (err) {
    console.error('[Duplicates] Detection error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── POST: Consolidate a duplicate group ───
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const classroomId = auth.classroomId;
    if (!classroomId) {
      return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
    }

    const body = await request.json();
    const { winner_id, loser_ids } = body as { winner_id: string; loser_ids: string[] };

    if (!winner_id || !Array.isArray(loser_ids) || loser_ids.length === 0) {
      return NextResponse.json({ error: 'winner_id and loser_ids[] required' }, { status: 400 });
    }
    if (loser_ids.includes(winner_id)) {
      return NextResponse.json({ error: 'winner_id cannot be in loser_ids' }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Verify winner exists and belongs to this classroom
    const { data: winner } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, area_id, parent_description, why_it_matters')
      .eq('id', winner_id)
      .eq('classroom_id', classroomId)
      .maybeSingle();

    if (!winner) {
      return NextResponse.json({ error: 'Winner work not found in this classroom' }, { status: 404 });
    }

    // 2. Verify all losers exist and belong to this classroom
    const { data: losers } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, parent_description, why_it_matters')
      .eq('classroom_id', classroomId)
      .in('id', loser_ids);

    if (!losers || losers.length !== loser_ids.length) {
      return NextResponse.json({ error: 'Some loser works not found' }, { status: 404 });
    }

    const loserNames = losers.map(l => l.name);
    const stats = { media: 0, progress: 0, visual_memory: 0, deleted: 0 };

    // 3. Re-point photos (montree_media.work_id)
    const { data: movedMedia } = await supabase
      .from('montree_media')
      .update({ work_id: winner_id })
      .in('work_id', loser_ids)
      .select('id');
    stats.media = movedMedia?.length || 0;

    // 4. Merge progress records (montree_child_progress.work_name — STRING FK)
    // For each loser name, check if the child already has a record under the winner name
    for (const loserName of loserNames) {
      // Get all progress records for this loser name
      const { data: loserProgress } = await supabase
        .from('montree_child_progress')
        .select('id, child_id, work_name')
        .eq('work_name', loserName);

      if (!loserProgress || loserProgress.length === 0) continue;

      for (const lp of loserProgress) {
        // Check if child already has progress under the winner name
        const { data: existing } = await supabase
          .from('montree_child_progress')
          .select('id')
          .eq('child_id', lp.child_id)
          .eq('work_name', winner.name)
          .maybeSingle();

        if (existing) {
          // Delete the duplicate (child already has progress under winner name)
          await supabase.from('montree_child_progress').delete().eq('id', lp.id);
        } else {
          // Rename to winner name
          await supabase
            .from('montree_child_progress')
            .update({ work_name: winner.name })
            .eq('id', lp.id);
        }
        stats.progress++;
      }
    }

    // 5. Merge visual memory (montree_visual_memory.work_name — STRING with unique constraint)
    for (const loserName of loserNames) {
      const { data: loserVm } = await supabase
        .from('montree_visual_memory')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('work_name', loserName)
        .maybeSingle();

      if (!loserVm) continue;

      // Check if winner already has a visual memory entry
      const { data: winnerVm } = await supabase
        .from('montree_visual_memory')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('work_name', winner.name)
        .maybeSingle();

      if (winnerVm) {
        // Merge: take the richer data
        const updates: Record<string, unknown> = {};

        // Take richer visual_description
        if (loserVm.visual_description && (!winnerVm.visual_description ||
            loserVm.visual_description.length > winnerVm.visual_description.length)) {
          updates.visual_description = loserVm.visual_description;
        }

        // Merge key_materials (deduplicate)
        if (loserVm.key_materials && Array.isArray(loserVm.key_materials)) {
          const existing = Array.isArray(winnerVm.key_materials) ? winnerVm.key_materials : [];
          const seen = new Set(existing.map((m: string) => m.toLowerCase().trim()));
          const merged = [...existing];
          for (const m of loserVm.key_materials) {
            if (typeof m === 'string' && !seen.has(m.toLowerCase().trim())) {
              merged.push(m);
              seen.add(m.toLowerCase().trim());
            }
          }
          if (merged.length > existing.length) updates.key_materials = merged.slice(0, 20);
        }

        // Take higher confidence
        if (loserVm.description_confidence > (winnerVm.description_confidence || 0)) {
          updates.description_confidence = loserVm.description_confidence;
          updates.source = loserVm.source;
        }

        // Merge negative_descriptions
        if (loserVm.negative_descriptions && Array.isArray(loserVm.negative_descriptions)) {
          const existing = Array.isArray(winnerVm.negative_descriptions) ? winnerVm.negative_descriptions : [];
          const merged = [...existing, ...loserVm.negative_descriptions].slice(0, 8);
          if (merged.length > existing.length) updates.negative_descriptions = merged;
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          await supabase
            .from('montree_visual_memory')
            .update(updates)
            .eq('classroom_id', classroomId)
            .eq('work_name', winner.name);
        }

        // Delete loser VM entry
        await supabase
          .from('montree_visual_memory')
          .delete()
          .eq('classroom_id', classroomId)
          .eq('work_name', loserName);
      } else {
        // No winner VM — just rename the loser's entry
        await supabase
          .from('montree_visual_memory')
          .update({ work_name: winner.name, updated_at: new Date().toISOString() })
          .eq('classroom_id', classroomId)
          .eq('work_name', loserName);
      }
      stats.visual_memory++;
    }

    // 6. If winner is missing parent_description, steal from richest loser
    if (!winner.parent_description) {
      const richestLoser = losers
        .filter(l => l.parent_description)
        .sort((a, b) => (b.parent_description?.length || 0) - (a.parent_description?.length || 0))[0];
      if (richestLoser) {
        const updates: Record<string, unknown> = { parent_description: richestLoser.parent_description };
        if (richestLoser.why_it_matters && !winner.why_it_matters) {
          updates.why_it_matters = richestLoser.why_it_matters;
        }
        await supabase
          .from('montree_classroom_curriculum_works')
          .update(updates)
          .eq('id', winner_id);
      }
    }

    // 7. Delete loser works
    const { error: deleteErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .delete()
      .in('id', loser_ids);

    if (deleteErr) {
      console.error('[Duplicates] Delete losers error:', deleteErr);
      return NextResponse.json({ error: 'Failed to delete duplicate works' }, { status: 500 });
    }
    stats.deleted = loser_ids.length;

    console.log(`[Duplicates] Consolidated "${winner.name}": merged ${stats.media} photos, ${stats.progress} progress, ${stats.visual_memory} VM entries, deleted ${stats.deleted} duplicates`);

    return NextResponse.json({
      success: true,
      winner: { id: winner_id, name: winner.name },
      stats,
    });
  } catch (err) {
    console.error('[Duplicates] Consolidation error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
