// /api/montree/progress/batch-master/route.ts
// Batch-mark multiple works as mastered for a child
// Used by auto-mastery: when teacher sets focus at work #N, works 1..N-1 are mastered

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { child_id, works } = body;

    // works: Array<{ work_name: string; area: string }>
    if (!child_id || !Array.isArray(works) || works.length === 0) {
      return NextResponse.json({ error: 'child_id and works[] required' }, { status: 400 });
    }

    // Cap at 100 to prevent abuse
    if (works.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 works per batch' }, { status: 400 });
    }

    // Verify child exists
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id')
      .eq('id', child_id)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Query 1: Fetch existing progress for these work names (to preserve mastered_at)
    const workNames = works.map((w: { work_name: string }) => w.work_name);
    const { data: existing } = await supabase
      .from('montree_child_progress')
      .select('work_name, status, mastered_at')
      .eq('child_id', child_id)
      .in('work_name', workNames);

    const existingMap = new Map<string, { status: string; mastered_at: string | null }>();
    for (const e of existing || []) {
      existingMap.set(e.work_name?.toLowerCase(), {
        status: e.status,
        mastered_at: e.mastered_at,
      });
    }

    // Build upsert records — only for works not already mastered
    const records = [];
    let skipped = 0;

    for (const w of works) {
      const key = w.work_name?.toLowerCase();
      const ex = existingMap.get(key);

      // Skip if already mastered (don't overwrite mastered_at)
      if (ex?.status === 'mastered') {
        skipped++;
        continue;
      }

      records.push({
        child_id,
        work_name: w.work_name,
        area: w.area,
        status: 'mastered',
        mastered_at: ex?.mastered_at || now,
        updated_at: now,
      });
    }

    // Query 2: Batch upsert all at once
    let upserted = 0;
    if (records.length > 0) {
      const { error: upsertError } = await supabase
        .from('montree_child_progress')
        .upsert(records, {
          onConflict: 'child_id,work_name',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('[batch-master] Upsert error:', upsertError);
        return NextResponse.json({ error: 'Failed to batch update' }, { status: 500 });
      }
      upserted = records.length;
    }

    return NextResponse.json({
      success: true,
      upserted,
      skipped,
      total: works.length,
    });

  } catch (error) {
    console.error('[batch-master] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
