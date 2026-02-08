// /api/home/debug/route.ts
// Temporary diagnostic endpoint — checks table existence, seeding, and permissions

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  const familyId = request.nextUrl.searchParams.get('family_id');
  const results: Record<string, unknown> = { timestamp: new Date().toISOString() };

  try {
    const supabase = getSupabase();
    results.supabase_connected = true;

    // 1. Check home_families table
    const { data: families, error: famErr } = await supabase
      .from('home_families')
      .select('id, name')
      .limit(3);
    results.home_families = famErr
      ? { error: famErr.message, code: famErr.code }
      : { count: families?.length, sample: families };

    // 2. Check home_curriculum table — select * to discover actual columns
    const { data: curriculum, error: currErr } = await supabase
      .from('home_curriculum')
      .select('*')
      .limit(2);
    results.home_curriculum = currErr
      ? { error: currErr.message, code: currErr.code, hint: currErr.hint }
      : { count: curriculum?.length, columns: curriculum?.[0] ? Object.keys(curriculum[0]) : 'empty_table', sample: curriculum };

    // 3. Check home_children table
    const { data: children, error: childErr } = await supabase
      .from('home_children')
      .select('id, family_id, name')
      .limit(3);
    results.home_children = childErr
      ? { error: childErr.message, code: childErr.code, hint: childErr.hint }
      : { count: children?.length, sample: children };

    // 4. If family_id provided, check curriculum for that family
    if (familyId) {
      const { data: famCurr, error: famCurrErr } = await supabase
        .from('home_curriculum')
        .select('id')
        .eq('family_id', familyId);
      results.family_curriculum = famCurrErr
        ? { error: famCurrErr.message, code: famCurrErr.code }
        : { count: famCurr?.length };

      // 5. Try inserting a test row and immediately deleting it
      // Audit fix: always clean up in finally block to prevent orphaned test data
      let testInserted = false;
      try {
        const { error: insertErr } = await supabase
          .from('home_curriculum')
          .insert({
            family_id: familyId,
            work_name: '__TEST_WORK__',
            area: 'practical_life',
            category: 'Test',
            sequence: 9999,
          });
        if (insertErr) {
          results.insert_test = { error: insertErr.message, code: insertErr.code, hint: insertErr.hint };
        } else {
          testInserted = true;
          results.insert_test = { success: true };
        }
      } finally {
        // Always attempt cleanup if insert succeeded
        if (testInserted) {
          await supabase
            .from('home_curriculum')
            .delete()
            .eq('family_id', familyId)
            .eq('work_name', '__TEST_WORK__');
        }
      }
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ...results, fatal_error: message }, { status: 500 });
  }
}
