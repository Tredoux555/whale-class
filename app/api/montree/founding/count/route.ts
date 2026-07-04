import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// Public. Returns spots remaining for the Founding 100 homepage counter.
// remaining = cap - admitted (NOT cap - signups). Admits are set manually in
// super-admin, so the counter can never be burned down by raw form submissions.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data: config } = await supabase
      .from('montree_founding_config')
      .select('cap, wave, is_closed')
      .eq('id', 1)
      .maybeSingle();

    const cap = config?.cap ?? 100;
    const wave = config?.wave ?? 1;
    const isClosed = config?.is_closed ?? false;

    const { count: admitted } = await supabase
      .from('montree_founding_waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'admitted');

    const admittedCount = admitted ?? 0;
    const remaining = Math.max(0, cap - admittedCount);

    return NextResponse.json(
      { cap, wave, admitted: admittedCount, remaining, is_closed: isClosed },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[founding/count] failed:', err);
    // Fail soft — the section degrades to a generic waitlist, never a crash.
    return NextResponse.json(
      { cap: 100, wave: 1, admitted: 0, remaining: 100, is_closed: false },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
