// app/api/story/admin/family/recipients/route.ts
//
// GET → everyone the signed-in CAPTAIN may feed context to (their Family panel):
// children + a partner, each with its link kind, plus the caller's own family
// role so the UI can self-gate.
//
// 🔒 Identity (author_space) comes ONLY from the verified admin token, never the
// client. This route returns NOTHING from anyone's sealed conversation — only
// the link list + how many notes THIS captain has written each person.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import { getFamilyRole, listFamilyTargets } from '@/lib/story/coach';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!(await verifyAdminToken(auth))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const space = await getAdminSpace(auth);
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const role = await getFamilyRole(supabase, space);
  // Only a captain (a parent) has a Family panel.
  if (role !== 'parent') {
    return NextResponse.json({ role, recipients: [] });
  }
  const recipients = await listFamilyTargets(supabase, space);
  return NextResponse.json({ role, recipients });
}
