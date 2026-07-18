import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// Public, anonymous. Given a founding/partner signup code (?code=FND-XXXX),
// returns ONLY whether it maps to a waitlist row and, if so, its grant_type.
// The /try signup banner uses this to show partner codes the correct
// "Foundation Partner — Premium free for life" copy instead of the retired
// "Founding 100 · $3/student" copy.
//
// 🔒 Privacy: this route NEVER returns email / school_name / status / ids —
// only {valid, grant_type} — so it cannot be used to enumerate the waitlist.
// It may never 500: any error degrades to {valid:false, grant_type:null} and
// the client keeps its default (Founding 100) copy.
export const dynamic = 'force-dynamic';

type GrantType = 'founding_3_life' | 'partner_free_life';

function json(valid: boolean, grant_type: GrantType | null) {
  return NextResponse.json({ valid, grant_type }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('code');
    if (!raw || typeof raw !== 'string') return json(false, null);
    const code = raw.trim().toUpperCase();
    if (code.length < 4 || code.length > 32) return json(false, null);

    const supabase = getSupabase();

    // grant_type only exists after migration 290. Try WITH it; on the
    // missing-column case (42703) fall back to a select without it and treat
    // any matched code as legacy founding_3_life (42703-safe — mirrors
    // resolveFoundingCode in try/instant).
    const withGrant = await supabase
      .from('montree_founding_waitlist')
      .select('signup_code, grant_type')
      .eq('signup_code', code)
      .maybeSingle();

    if (withGrant.error) {
      const isMissingColumn =
        withGrant.error.code === '42703' ||
        (withGrant.error.message || '').includes('grant_type');
      if (!isMissingColumn) {
        console.error('[founding/lookup] lookup failed:', withGrant.error.message);
        return json(false, null);
      }
      const fallback = await supabase
        .from('montree_founding_waitlist')
        .select('signup_code')
        .eq('signup_code', code)
        .maybeSingle();
      if (fallback.error || !fallback.data) return json(false, null);
      // Pre-290 deploy: no grant_type column → any matched code is legacy founding.
      return json(true, 'founding_3_life');
    }

    if (!withGrant.data) return json(false, null);

    const grantType: GrantType =
      (withGrant.data as { grant_type?: string | null }).grant_type === 'partner_free_life'
        ? 'partner_free_life'
        : 'founding_3_life';

    return json(true, grantType);
  } catch (err) {
    console.error('[founding/lookup] threw (non-fatal):', err);
    return json(false, null);
  }
}
