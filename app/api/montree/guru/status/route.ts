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
      .select('role, guru_plan, guru_prompts_used, guru_subscription_status, guru_current_period_end, guru_tier')
      .eq('id', auth.userId)
      .single();

    if (!teacher) {
      return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 });
    }

    const t = teacher as Record<string, unknown>;
    const role = t.role as string || 'teacher';

    // FEATURE FLAG: Set GURU_FREEMIUM_ENABLED=true on Railway to activate paywall.
    // When false (default), everyone gets unlimited Guru access.
    const freemiumEnabled = process.env.GURU_FREEMIUM_ENABLED === 'true';

    // Teachers always get unlimited Guru — no paywall
    // Homeschool parents also get unlimited when freemium is disabled
    if (role !== 'homeschool_parent' || !freemiumEnabled) {
      return NextResponse.json({
        success: true,
        guru_access: 'unlimited',
        role,
      });
    }

    // Homeschool parents with freemium enabled: check subscription
    const plan = t.guru_plan as string || 'free';
    const promptsUsed = t.guru_prompts_used as number || 0;
    const subStatus = t.guru_subscription_status as string || 'none';
    const periodEnd = t.guru_current_period_end as string | null;

    const isPaid = plan !== 'free' && subStatus === 'active' &&
      (!periodEnd || new Date(periodEnd) > new Date());

    // Free trial users don't have a tier yet — show null so frontend can display both options
    const tier = isPaid ? ((t.guru_tier as string) || 'sonnet') : null;
    const monthlyLimit = isPaid ? 30 : 10;

    return NextResponse.json({
      success: true,
      guru_access: isPaid ? 'paid' : 'free_trial',
      role,
      tier,
      prompts_used: promptsUsed,
      prompts_limit: monthlyLimit,
      prompts_remaining: Math.max(0, monthlyLimit - promptsUsed),
      is_locked: promptsUsed >= monthlyLimit,
      subscription_status: subStatus,
      pricing: {
        haiku: { price: 5, prompts: 30, description: 'Quick, focused Montessori advice' },
        sonnet: { price: 20, prompts: 30, description: 'Deep therapeutic support + pattern detection' },
      },
    });

  } catch (error) {
    console.error('[Guru Status] Error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
