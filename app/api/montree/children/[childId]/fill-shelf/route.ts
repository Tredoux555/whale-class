// app/api/montree/children/[childId]/fill-shelf/route.ts
// Takes a list of work names from a game plan, resolves their areas from the
// classroom curriculum, and sets them as focus works on the child's shelf.
// Only fills empty area slots — never overwrites existing focus works.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

interface RouteContext {
  params: Promise<{ childId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await context.params;
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { works } = await request.json() as { works: string[] };
    if (!works?.length) {
      return NextResponse.json({ success: false, error: 'No works provided' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get the child's classroom
    const { data: child } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .maybeSingle();

    if (!child?.classroom_id) {
      return NextResponse.json({ success: false, error: 'Child not in a classroom' }, { status: 400 });
    }

    // Get existing focus works — don't overwrite occupied slots
    const { data: existingFocus } = await supabase
      .from('montree_child_focus_works')
      .select('area')
      .eq('child_id', childId);

    const occupiedAreas = new Set((existingFocus || []).map((f: { area: string }) => f.area));

    // Look up each work in the classroom curriculum to find its area
    const { data: areas } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', child.classroom_id);

    if (!areas?.length) {
      return NextResponse.json({ success: false, error: 'No curriculum areas found' }, { status: 400 });
    }

    const areaIdToKey: Record<string, string> = {};
    for (const a of areas as Array<{ id: string; area_key: string }>) {
      areaIdToKey[a.id] = a.area_key;
    }

    // Resolve work names to areas via case-insensitive match.
    // Accept BOTH English (`name`) and Chinese (`name_chinese`) names so Chinese-locale game
    // plans that produce Chinese work names still resolve to the correct area. Always store
    // the canonical English name in focus_works/progress so downstream locale-aware renderers
    // can map to Chinese via name_chinese lookup.
    const { data: curriculumWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, name_chinese, area_id')
      .eq('classroom_id', child.classroom_id);

    const workToArea: Record<string, string> = {};
    const lookupToCanonical: Record<string, string> = {}; // any name (EN/ZH) -> canonical English name
    const allCurrWorks = (curriculumWorks || []) as Array<{ name: string; name_chinese: string | null; area_id: string }>;
    for (const w of allCurrWorks) {
      const areaKey = areaIdToKey[w.area_id];
      if (!areaKey) continue;
      const enKey = w.name.toLowerCase();
      workToArea[enKey] = areaKey;
      lookupToCanonical[enKey] = w.name;
      if (w.name_chinese) {
        const zhKey = w.name_chinese.toLowerCase();
        workToArea[zhKey] = areaKey;
        lookupToCanonical[zhKey] = w.name;
      }
    }

    // Tokenize-tolerant fuzzy match — same algorithm as replan-child.ts.
    // Handles Haiku-generated names like "Golden Bead Addition" matching
    // "Golden Beads — Static Addition" via token prefix overlap.
    function fuzzyFindWork(planWorkName: string): { canonicalName: string; areaKey: string } | null {
      const planTokens = planWorkName.toLowerCase().split(/[-_\s—()\u3000]+/).filter(t => t.length > 1);
      if (planTokens.length < 2) return null;
      let best: { name: string; areaKey: string; score: number } | null = null;
      for (const w of allCurrWorks) {
        const areaKey = areaIdToKey[w.area_id];
        if (!areaKey) continue;
        const currTokens = w.name.toLowerCase().split(/[-_\s—()\u3000]+/).filter(t => t.length > 1);
        if (currTokens.length === 0) continue;
        let hits = 0;
        for (const pt of planTokens) {
          if (currTokens.some(ct => ct.startsWith(pt) || pt.startsWith(ct))) hits++;
        }
        const score = hits / Math.max(planTokens.length, currTokens.length);
        if (score >= 0.6 && hits >= 2 && (!best || score > best.score)) {
          best = { name: w.name, areaKey, score };
        }
      }
      return best ? { canonicalName: best.name, areaKey: best.areaKey } : null;
    }

    // Fill empty slots — first match per area wins
    const filled: Array<{ work_name: string; area: string }> = [];
    const filledAreas = new Set<string>();
    const now = new Date().toISOString();

    for (let workName of works) {
      // Strip area prefix if Haiku wrote "Practical Life: Pouring Water"
      if (workName.includes(':')) {
        workName = workName.split(':').pop()!.trim();
      }
      const key = workName.toLowerCase();
      let area = workToArea[key];
      let canonicalName = lookupToCanonical[key] || workName;

      // Fuzzy fallback when exact match fails
      if (!area) {
        const fuzzy = fuzzyFindWork(workName);
        if (fuzzy) {
          area = fuzzy.areaKey;
          canonicalName = fuzzy.canonicalName;
          console.log(`[FillShelf] Fuzzy match: "${workName}" → "${canonicalName}" (area=${area})`);
        }
      }

      if (!area) continue; // work not in curriculum even with fuzzy
      if (occupiedAreas.has(area)) continue; // area already has a focus work
      if (filledAreas.has(area)) continue; // already filling this area from another plan work

      // Set as focus work
      await supabase
        .from('montree_child_focus_works')
        .upsert({
          child_id: childId,
          classroom_id: child.classroom_id,
          area,
          work_name: canonicalName,
          set_at: now,
          set_by: 'game_plan',
          updated_at: now,
        }, { onConflict: 'child_id,area' });

      // Also ensure progress row exists
      await supabase
        .from('montree_child_progress')
        .upsert({
          child_id: childId,
          work_name: canonicalName,
          area,
          status: 'presented',
          updated_at: now,
        }, { onConflict: 'child_id,work_name' });

      filled.push({ work_name: canonicalName, area });
      filledAreas.add(area);
    }

    // ── Deterministic gap-fill for missing core areas ────────────────
    const CORE_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const allFilled = new Set([...occupiedAreas, ...filledAreas]);
    const missingAreas = CORE_AREAS.filter((a) => !allFilled.has(a));

    if (missingAreas.length > 0) {
      for (const missingArea of missingAreas) {
        const candidates = allCurrWorks.filter((w) => {
          const ak = areaIdToKey[w.area_id];
          return ak === missingArea;
        });
        if (candidates.length === 0) continue;

        const pick = candidates[Math.floor(Math.random() * candidates.length)];

        await supabase
          .from('montree_child_focus_works')
          .upsert({
            child_id: childId,
            classroom_id: child.classroom_id,
            area: missingArea,
            work_name: pick.name,
            set_at: now,
            set_by: 'game_plan',
            updated_at: now,
          }, { onConflict: 'child_id,area' });

        await supabase
          .from('montree_child_progress')
          .upsert({
            child_id: childId,
            work_name: pick.name,
            area: missingArea,
            status: 'presented',
            updated_at: now,
          }, { onConflict: 'child_id,work_name' });

        filled.push({ work_name: pick.name, area: missingArea });
        filledAreas.add(missingArea);
        console.log(`[FillShelf] Gap-filled ${missingArea} with "${pick.name}" for child ${childId}`);
      }
    }

    console.log(`[FillShelf] Filled ${filled.length} slots for child ${childId}: ${filled.map(f => `${f.area}=${f.work_name}`).join(', ')}`);

    return NextResponse.json({
      success: true,
      filled,
      skipped_areas: Array.from(occupiedAreas),
    });
  } catch (error) {
    console.error('[FillShelf] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
