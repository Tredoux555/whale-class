// /api/montree/teacher/earnings/route.ts
// Returns revenue share earnings for the authenticated teacher

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  // Check if this teacher is a founding teacher of their school
  const { data: school } = await supabase
    .from('montree_schools')
    .select('id, name, founding_teacher_id, revenue_share_active, revenue_share_pct, subscription_status, plan_type')
    .eq('id', auth.schoolId)
    .maybeSingle();

  const isFounding = school?.founding_teacher_id === auth.userId;

  // Fetch earnings history
  const { data: earnings } = await supabase
    .from('montree_teacher_earnings')
    .select('*')
    .eq('teacher_id', auth.userId)
    .order('month', { ascending: false });

  // Fetch current student count for live estimate
  const { count: studentCount } = await supabase
    .from('montree_children')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', auth.schoolId)
    .eq('is_active', true);

  const sharePct = school?.revenue_share_pct ?? 20;
  const monthlySchoolRevenue = (studentCount ?? 0) * 7;
  const estimatedMonthlyShare = Math.round(monthlySchoolRevenue * (sharePct / 100) * 100) / 100;

  const totalPaid = (earnings ?? [])
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.teacher_earnings), 0);

  const totalPending = (earnings ?? [])
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.teacher_earnings), 0);

  return NextResponse.json({
    isFounding,
    isActive: school?.revenue_share_active ?? false,
    sharePct,
    school: school ? { id: school.id, name: school.name } : null,
    studentCount: studentCount ?? 0,
    estimatedMonthlyShare,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    earnings: earnings ?? [],
  });
}
