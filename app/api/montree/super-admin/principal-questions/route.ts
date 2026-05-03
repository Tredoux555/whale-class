// app/api/montree/super-admin/principal-questions/route.ts
//
// Super-admin view of every question principals have asked the home-page
// "ask anything" agent (across all schools). Tredoux uses this to learn
// what to build next based on what real principals are asking.
//
// GET: list questions, filterable + paginated
//   query params:
//     ?school_id=...   filter to one school
//     ?from=YYYY-MM-DD filter by asked_at
//     ?to=YYYY-MM-DD   filter by asked_at (exclusive)
//     ?limit=50        page size (default 50, max 200)
//     ?offset=0        pagination offset

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export async function GET(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request.headers);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const schoolId = url.searchParams.get('school_id');
  const fromStr = url.searchParams.get('from');
  const toStr = url.searchParams.get('to');
  const limitRaw = parseInt(url.searchParams.get('limit') || '50', 10);
  const limit = Math.min(Math.max(limitRaw, 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

  const supabase = getSupabase();

  // Pull rows
  let query = supabase
    .from('montree_principal_agent_log')
    .select(
      'id, school_id, principal_id, conversation_id, question, answer, tools_called, model, input_tokens, output_tokens, cost_usd, duration_ms, error, asked_at',
      { count: 'exact' }
    )
    .order('asked_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (schoolId) query = query.eq('school_id', schoolId);
  if (fromStr) query = query.gte('asked_at', fromStr);
  if (toStr) query = query.lte('asked_at', toStr);

  const { data: rows, error, count } = await query;
  if (error) {
    console.error('[super-admin/principal-questions] query error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = rows || [];

  // Hydrate school name + principal name in batch
  const schoolIds = Array.from(
    new Set(items.map((r) => r.school_id).filter(Boolean))
  );
  const principalIds = Array.from(
    new Set(items.map((r) => r.principal_id).filter(Boolean))
  );

  const [schoolsRes, principalsRes] = await Promise.all([
    schoolIds.length
      ? supabase
          .from('montree_schools')
          .select('id, name')
          .in('id', schoolIds)
      : Promise.resolve({ data: [], error: null }),
    principalIds.length
      ? supabase
          .from('montree_school_admins')
          .select('id, name, email')
          .in('id', principalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const schoolNameById = new Map<string, string>();
  for (const s of schoolsRes.data || []) {
    schoolNameById.set(s.id, s.name);
  }
  const principalById = new Map<
    string,
    { name: string; email: string | null }
  >();
  for (const p of principalsRes.data || []) {
    principalById.set(p.id, { name: p.name, email: p.email });
  }

  const enriched = items.map((r) => ({
    ...r,
    school_name: schoolNameById.get(r.school_id) || 'Unknown school',
    principal_name:
      principalById.get(r.principal_id)?.name || 'Unknown principal',
    principal_email: principalById.get(r.principal_id)?.email || null,
  }));

  // Aggregate quick stats over the same filtered set
  const totalCount = count ?? 0;
  const totalCostUsd = items.reduce(
    (sum, r) => sum + (typeof r.cost_usd === 'number' ? r.cost_usd : 0),
    0
  );
  const errorCount = items.filter((r) => !!r.error).length;

  // Per-school breakdown for the filtered set
  const perSchool = new Map<
    string,
    { school_id: string; school_name: string; questions: number; cost: number }
  >();
  for (const r of items) {
    const key = r.school_id;
    if (!perSchool.has(key)) {
      perSchool.set(key, {
        school_id: key,
        school_name: schoolNameById.get(key) || 'Unknown',
        questions: 0,
        cost: 0,
      });
    }
    const entry = perSchool.get(key)!;
    entry.questions += 1;
    entry.cost += typeof r.cost_usd === 'number' ? r.cost_usd : 0;
  }

  return NextResponse.json({
    items: enriched,
    total: totalCount,
    page: { limit, offset, returned: items.length },
    summary: {
      total_cost_usd: Number(totalCostUsd.toFixed(6)),
      error_count: errorCount,
      per_school: Array.from(perSchool.values()).sort(
        (a, b) => b.questions - a.questions
      ),
    },
  });
}
