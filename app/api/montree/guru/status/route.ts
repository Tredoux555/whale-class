// app/api/montree/guru/status/route.ts
// Returns Guru subscription status for the current user
// Used by frontend to show paywall or allow access

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { data: teacher } = await supabase
      .from('montree_teachers')
      .select('role, guru_plan, guru_prompts_used, guru_subscription_status, guru_current_period_end')
      .eq('id', auth.userId)
      .single();

    if (!teacher) {
      return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 });
    }

    const t = teacher as Record<string, unknown>;
    const role = t.role as string || 'teacher';
    const plan = t.guru_plan as string || 'free';
    const promptsUsed = t.guru_prompts_used as number || 0;
    const subStatus = t.guru_subscription_status as string || 'none';
    const periodEnd = t.guru_current_period_end as string | null;

    // Teachers get unlimited Guru — no paywall
    if (role !== 'homeschool_parent') {
      return NextResponse.json({
        success: true,
        guru_access: 'unlimited',
        role,
      });
    }

    // Homeschool parents: check subscription
    const isPaid = plan !== 'free' && subStatus === 'active' &&
      (!periodEnd || new Date(periodEnd) > new Date());

    return NextResponse.json({
      success: true,
      guru_access: isPaid ? 'paid' : 'free_trial',
      role,
      prompts_used: promptsUsed,
      prompts_limit: 3,
      prompts_remaining: isPaid ? null : Math.max(0, 3 - promptsUsed),
      is_locked: !isPaid && promptsUsed >= 3,
      subscription_status: subStatus,
    });

  } catch (error) {
    console.error('[Guru Status] Error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
