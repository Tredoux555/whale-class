// app/api/montree/admin/ai-budget/route.ts
// GET: current AI usage + budget for authenticated school
// PATCH: update budget settings (principals + super-admin)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { clearBudgetCache } from '@/lib/montree/api-usage';

// GET — Fetch current usage + budget
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    // Get school-level summary
    const { data: summary, error: summaryError } = await supabase
      .rpc('get_school_ai_usage', { p_school_id: auth.schoolId });

    if (summaryError) {
      console.error('[AI-Budget] Summary RPC failed:', summaryError.message);
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
    }

    // Get per-classroom breakdown
    const { data: classrooms, error: classroomError } = await supabase
      .rpc('get_classroom_ai_usage', { p_school_id: auth.schoolId });

    if (classroomError) {
      console.error('[AI-Budget] Classroom RPC failed:', classroomError.message);
    }

    // Get daily trend (last 30 days)
    const { data: dailyTrend } = await supabase
      .from('montree_api_usage')
      .select('created_at, cost_usd, endpoint, model')
      .eq('school_id', auth.schoolId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(10000);

    // Aggregate daily totals
    const dailyMap = new Map<string, { cost: number; count: number }>();
    for (const row of (dailyTrend || [])) {
      if (!row.created_at) continue;
      const day = row.created_at.slice(0, 10);
      const existing = dailyMap.get(day) || { cost: 0, count: 0 };
      existing.cost += Number(row.cost_usd);
      existing.count += 1;
      dailyMap.set(day, existing);
    }
    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      cost: Math.round(data.cost * 10000) / 10000,
      count: data.count,
    }));

    return NextResponse.json({
      success: true,
      summary: summary || { spent: 0, budget: 50, percentage: 0, action: 'warn', request_count: 0 },
      classrooms: classrooms || [],
      daily,
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });

  } catch (error) {
    console.error('[AI-Budget] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — Update budget settings (principals + super-admin only)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // Only principals (and super-admin) can change budget settings
    if (auth.role !== 'principal' && auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only principals can update budget settings' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { monthly_ai_budget_usd, ai_budget_action } = body;

    // Validate inputs
    const updates: Record<string, unknown> = {};

    if (monthly_ai_budget_usd !== undefined) {
      const budget = Number(monthly_ai_budget_usd);
      if (isNaN(budget) || budget < 0 || budget > 10000) {
        return NextResponse.json({ error: 'Budget must be between $0 and $10,000' }, { status: 400 });
      }
      updates.monthly_ai_budget_usd = budget;
    }

    if (ai_budget_action !== undefined) {
      if (!['warn', 'soft_limit', 'hard_limit'].includes(ai_budget_action)) {
        return NextResponse.json({ error: 'Action must be warn, soft_limit, or hard_limit' }, { status: 400 });
      }
      updates.ai_budget_action = ai_budget_action;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('montree_schools')
      .update(updates)
      .eq('id', auth.schoolId);

    if (error) {
      console.error('[AI-Budget] PATCH error:', error.message);
      return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
    }

    // Clear cached budget for this school
    clearBudgetCache(auth.schoolId);

    return NextResponse.json({ success: true, updated: updates });

  } catch (error) {
    console.error('[AI-Budget] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
