// GET /api/lens/auth/me — who is signed in, and her letterhead.
// POST /api/lens/auth/logout lives next door; this route is read-only.

import { NextRequest, NextResponse } from 'next/server';
import { lensDb, loadObserver } from '@/lib/lens/db';
import { lensError, requireObserver } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;

  try {
    const observer = await loadObserver(lensDb(), session.observerId);
    if (!observer) {
      // A valid cookie for a row that no longer exists (or was deactivated).
      // 401 rather than 404: the client's job is to send her back to the door.
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    return NextResponse.json({ observer });
  } catch (error) {
    return lensError('auth/me', error);
  }
}
