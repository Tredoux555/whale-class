// app/api/story/admin/whoami/route.ts
//
// Lightweight identity probe for sanctuary clients. Returns the caller's space,
// a friendly display name, and whether they are the platform OWNER (Tredoux) —
// the only account that may administer members. Derived entirely from the
// verified admin token; nothing trusted from the client.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAdminSpace, isOwner } from '@/lib/story-db';
import { displayNameForSpace } from '@/lib/story/coach';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const username = await verifyAdminToken(auth);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const space = await getAdminSpace(auth);
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    username,
    space,
    displayName: displayNameForSpace(space),
    isOwner: await isOwner(auth),
  });
}
