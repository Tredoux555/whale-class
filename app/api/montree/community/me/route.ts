// /api/montree/community/me
// Who is signed in to the Teachers' Room, if anyone.
//
// Never errors: no cookie, a bad cookie, an unrun migration and a dead DB all
// answer {user:null}. The page treats that as "logged out", which is the
// correct public state anyway — this endpoint can't break the SATPIN page.
import { NextRequest, NextResponse } from 'next/server';
import { getCommunityUser } from '@/lib/montree/community/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCommunityUser(request);

    // A banned account reads as signed-out. Its cookie stays valid but every
    // write route rejects it, so showing it as signed in would only produce a
    // confusing dead end.
    if (!user || user.isBanned) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        displayName: user.displayName,
        email: user.email,
        confirmed: user.confirmed,
      },
    });
  } catch (err) {
    console.error('[community/me] error:', err);
    return NextResponse.json({ user: null });
  }
}
