// /api/montree/curriculum/duplicates/route.ts
// GET — detect potential duplicate works in a classroom
// POST — consolidate (merge) a group of duplicates into a winner

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { appendEvents } from '@/lib/montree/progress/write-progress';
import { fetchAllRows } from '@/lib/montree/tracking/paging';
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

    const searchQuery = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() || '';
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

    // Progress counts (by work_name) — progress table uses string FK.
    // SCOPED TO THIS CLASSROOM'S CHILDREN. montree_child_progress has no tenancy in
    // its key — UNIQUE (child_id, work_name), migration 111 — and every school on the
    // instance seeds the same Montessori vocabulary, so an unscoped work_name filter
    // counts (and, in POST, RENAMES AND DELETES) other schools' rows.
    const classroomChildIds = await childIdsOfClassroom(supabase, classroomId);
    // PAGED. One row per child per work name: a 25-child room against a ~330-work
    // curriculum is well past PostgREST's silent 1000-row ceiling, and a truncated
    // read here under-counts progress_count, which is what ranks the merge winner.
    const { rows: progressCounts } = classroomChildIds.length
      ? await fetchAllRows<{ work_name: string }>((from, to) =>
          supabase
            .from('montree_child_progress')
            .select('id, work_name')
            .in('child_id', classroomChildIds)
            .in('work_name', workNames)
            .order('id')
            .range(from, to),
        )
      : { rows: [] as Array<{ work_name: string }> };
    const progressMap = new Map<string, number>();
    for (const p of progressCounts) {
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

    // If search query provided, return all matching works as a single manual-merge group
    if (searchQuery) {
      const matching = candidates
        .filter(w => w.name.toLowerCase().includes(searchQuery))
        .sort((a, b) => {
          const scoreA = a.media_count * 2 + a.progress_count + (a.parent_description ? 1 : 0);
          const scoreB = b.media_count * 2 + b.progress_count + (b.parent_description ? 1 : 0);
          return scoreB - scoreA;
        });

      const searchGroups = matching.length >= 2
        ? [{ works: matching, score: 0, reason: `Manual search: "${searchQuery}"` }]
        : [];

      return NextResponse.json({
        groups: searchGroups,
        total_works: works.length,
        search_results: matching.length,
        mode: 'search',
      });
    }

    const groups = detectDuplicates(candidates);

    return NextResponse.json({
      groups,
      total_works: works.length,
      duplicates_found: groups.reduce((sum, g) => sum + g.works.length, 0),
      mode: 'auto',
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
    // work_key is selected because the journal rows below must carry the WINNER's
    // key — rule 1 says nothing writes progress history without one, and the merge
    // used to journal work_key: null, tripping invariant #1 forever.
    const descFields = 'id, name, work_key, area_id, parent_description, why_it_matters, parent_description_zh, why_it_matters_zh, quick_guide, guide_content_zh';
    const { data: winner } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(descFields)
      .eq('id', winner_id)
      .eq('classroom_id', classroomId)
      .maybeSingle();

    if (!winner) {
      return NextResponse.json({ error: 'Winner work not found in this classroom' }, { status: 404 });
    }

    // 2. Verify all losers exist and belong to this classroom
    const { data: losers } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(descFields)
      .eq('classroom_id', classroomId)
      .in('id', loser_ids);

    if (!losers || losers.length === 0) {
      return NextResponse.json({ error: 'No loser works found in this classroom' }, { status: 404 });
    }
    // Lenient: proceed with whatever losers exist (some may already be deleted from a prior merge)
    const foundLoserIds = losers.map(l => l.id);

    // Deduplicate loser names (two losers may have the same name)
    const loserNames = [...new Set(losers.map(l => l.name))];
    const stats = { media: 0, progress: 0, visual_memory: 0, deleted: 0 };

    // 3. Re-point photos (montree_media.work_id)
    const { data: movedMedia } = await supabase
      .from('montree_media')
      .update({ work_id: winner_id })
      .in('work_id', foundLoserIds)
      .select('id');
    stats.media = movedMedia?.length || 0;

    // 4. Merge progress records (montree_child_progress.work_name — STRING FK)
    //
    // TENANCY (audit 08-verify-tracking §1, CRITICAL). Every statement below is
    // scoped to THIS CLASSROOM'S CHILDREN. montree_child_progress is keyed
    // UNIQUE (child_id, work_name) — per child, not per school — and school_id /
    // classroom_id are nullable stamps, so a bare .eq('work_name', …) selects every
    // school's rows on the instance. Before this scoping, a teacher at school A
    // merging "Sandpaper Letters (Lower)" into "Sandpaper Letters" DELETED school B's
    // mastered row and RENAMED school C's, with no way back. verifySchoolRequest
    // admits any teacher, so this was not even an admin-only hazard.
    const childIds = await childIdsOfClassroom(supabase, classroomId);

    // Collect ALL loser progress in one pass, then deduplicate against winner + each other
    const allLoserProgress: { id: string; child_id: string; work_name: string; status: string | null }[] = [];
    const childrenWithWinnerProgress = new Set<string>();

    if (childIds.length > 0) {
      for (const loserName of loserNames) {
        if (loserName === winner.name) continue; // skip if loser has same name as winner
        const { data: lp } = await supabase
          .from('montree_child_progress')
          .select('id, child_id, work_name, status')
          .in('child_id', childIds)
          .eq('work_name', loserName);
        if (lp) allLoserProgress.push(...lp);
      }

      // Track which children already have progress under the winner name
      const { data: existingWinnerProgress } = await supabase
        .from('montree_child_progress')
        .select('child_id')
        .in('child_id', childIds)
        .eq('work_name', winner.name);
      for (const ep of (existingWinnerProgress || [])) {
        childrenWithWinnerProgress.add(ep.child_id);
      }
    }

    // RULE 2 / RULE 3, deliberately shaped. This is a CURRICULUM MERGE, not a status
    // change: no child's rung moves, only the name their row is filed under. The SQL
    // therefore stays a rename/delete (writeProgress is keyed on (child_id,
    // work_name) and has no vocabulary for "the same rung, under a different name" —
    // routing this through it would mean deleting and re-creating every row, losing
    // presented_at/mastered_at). What was missing is the AUDIT TRAIL: a child's work
    // name silently changing under them, with nothing to explain it. Every affected
    // child now gets a journal row — source 'correction', old_status === new_status,
    // reason recorded in the note — so the rename is visible in the same place every
    // other change to that child's record is.
    const mergeEvents: Array<Record<string, unknown>> = [];
    const mergedAt = new Date().toISOString();
    const winnerKey = (winner as { work_key?: string | null }).work_key ?? null;
    for (const lp of allLoserProgress) {
      const duplicate = childrenWithWinnerProgress.has(lp.child_id);
      if (duplicate) {
        // Child already has progress under winner name — delete this duplicate.
        // child_id is re-asserted on the statement itself so the delete can never
        // reach outside the roster even if `lp` were ever built unscoped again.
        await supabase
          .from('montree_child_progress')
          .delete()
          .eq('id', lp.id)
          .eq('child_id', lp.child_id);
      } else {
        // Rename to winner name and mark child as handled
        await supabase
          .from('montree_child_progress')
          .update({ work_name: winner.name })
          .eq('id', lp.id)
          .eq('child_id', lp.child_id);
        childrenWithWinnerProgress.add(lp.child_id);
      }
      mergeEvents.push({
        child_id: lp.child_id,
        classroom_id: classroomId,
        school_id: auth.schoolId || null,
        // RULE 1: the winner's permanent key, never null. A keyless journal row is
        // an invariant-#1 violation for the rest of time.
        work_key: winnerKey,
        work_name: winner.name,
        area: null,
        // A DELETE is not a rename: the child HAD a rung under the loser name and
        // now has none under it. Journalling old === new here (as this route used to)
        // hides a destroyed rung behind something that reads as a rename, and replay
        // would keep deriving the old status forever. It is journalled as the real
        // transition it is, with a reason, which is the only shape rule 4 accepts
        // for a downward move.
        old_status: duplicate ? (lp.status || 'not_started') : lp.status,
        new_status: duplicate ? 'not_started' : (lp.status || 'not_started'),
        source: 'correction',
        reason: duplicate
          ? `duplicate-merge: "${lp.work_name}" folded into "${winner.name}" (child already had the winner row — the duplicate row was deleted)`
          : `duplicate-merge: "${lp.work_name}" renamed to "${winner.name}"`,
        actor: auth.userId || null,
        created_at: mergedAt,
      });
      stats.progress++;
    }
    // Best-effort, exactly like every other journal write.
    await appendEvents(supabase, mergeEvents);

    // 5. Merge visual memory (montree_visual_memory.work_name — STRING with unique constraint)
    // Process all losers, always checking current winner VM state (may have been created by a previous iteration)
    for (const loserName of loserNames) {
      if (loserName === winner.name) continue; // skip same-name losers

      const { data: loserVm } = await supabase
        .from('montree_visual_memory')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('work_name', loserName)
        .maybeSingle();

      if (!loserVm) continue;

      // Re-check winner VM each iteration (may have been created/updated by previous loser)
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

        // Delete loser VM entry (safe — winner already exists)
        await supabase
          .from('montree_visual_memory')
          .delete()
          .eq('classroom_id', classroomId)
          .eq('work_name', loserName);
      } else {
        // No winner VM yet — rename the loser's entry to become the winner's
        await supabase
          .from('montree_visual_memory')
          .update({ work_name: winner.name, updated_at: new Date().toISOString() })
          .eq('classroom_id', classroomId)
          .eq('work_name', loserName);
      }
      stats.visual_memory++;
    }

    // 6. Keep the RICHEST descriptions across winner + all losers (never lose Sonnet content)
    {
      const allWorks = [winner, ...losers];
      const pickRichest = (field: string): string | null => {
        let best: string | null = null;
        for (const w of allWorks) {
          const val = (w as Record<string, unknown>)[field] as string | null;
          if (val && (!best || val.length > best.length)) best = val;
        }
        return best;
      };
      // For JSONB fields, pick the one that exists (winner first, then losers)
      const pickJsonb = (field: string): unknown | null => {
        for (const w of allWorks) {
          const val = (w as Record<string, unknown>)[field];
          if (val) return val;
        }
        return null;
      };

      const updates: Record<string, unknown> = {};
      const textFields = ['parent_description', 'why_it_matters', 'parent_description_zh', 'why_it_matters_zh', 'quick_guide'];
      for (const f of textFields) {
        const richest = pickRichest(f);
        const current = (winner as Record<string, unknown>)[f] as string | null;
        if (richest && (!current || richest.length > current.length)) {
          updates[f] = richest;
        }
      }
      // guide_content_zh is JSONB — keep whichever exists (winner preference)
      if (!winner.guide_content_zh) {
        const loserGuide = pickJsonb('guide_content_zh');
        if (loserGuide) updates.guide_content_zh = loserGuide;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('montree_classroom_curriculum_works')
          .update(updates)
          .eq('id', winner_id);
        console.log(`[Duplicates] Enriched winner "${winner.name}" with richer descriptions:`, Object.keys(updates).join(', '));
      }
    }

    // 7. Delete loser works
    const { error: deleteErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .delete()
      .in('id', foundLoserIds);

    if (deleteErr) {
      console.error('[Duplicates] Delete losers error:', deleteErr);
      return NextResponse.json({ error: 'Failed to delete duplicate works' }, { status: 500 });
    }
    stats.deleted = foundLoserIds.length;

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

/**
 * The roster this merge is allowed to touch. Every montree_child_progress
 * statement in this route is scoped with it — see the tenancy note in POST §4.
 */
async function childIdsOfClassroom(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
): Promise<string[]> {
  // PAGED. This list is the TENANCY SCOPE of every montree_child_progress
  // statement in this route, so a silently truncated roster is not a display bug:
  // the children past row 1000 would be excluded from the merge and keep rows
  // under the loser name forever, while the winner's work is deleted from under
  // them. Failing closed (returning []) on error is deliberate for the same reason.
  const { rows, error } = await fetchAllRows<{ id: string }>((from, to) =>
    supabase
      .from('montree_children')
      .select('id')
      .eq('classroom_id', classroomId)
      .order('id')
      .range(from, to),
  );
  if (error) {
    console.error('[Duplicates] roster load failed:', error.message || error);
    return [];
  }
  return rows.map((c) => c.id);
}
