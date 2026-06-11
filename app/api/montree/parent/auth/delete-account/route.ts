// app/api/montree/parent/auth/delete-account/route.ts
//
// Self-service deletion for a logged-in parent (portal / access-code session).
// Required by Apple App Store Guideline 5.1.1(v).
//
//   GET    -> preview (read-only)
//   DELETE -> delete the parent account (montree_parents row + cascade) and
//             clear the parent session cookie. The child record stays — it is
//             owned by the school, not the parent.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';
import {
  previewParentDeletion,
  executeParentDeletion,
  AccountDeletionError,
} from '@/lib/montree/account-deletion';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabase();
  const parent = await resolveAuthorizedParent(supabase);
  if (!parent) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!parent.parentId) {
    return NextResponse.json(
      { error: 'This session has no deletable account. Contact your school.' },
      { status: 409 }
    );
  }
  const preview = await previewParentDeletion(parent.parentId);
  return NextResponse.json(preview);
}

export async function DELETE(request: NextRequest) {
  const supabase = getSupabase();
  const parent = await resolveAuthorizedParent(supabase);
  if (!parent) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!parent.parentId) {
    return NextResponse.json(
      { error: 'This session has no deletable account. Contact your school.' },
      { status: 409 }
    );
  }

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await executeParentDeletion(parent.parentId, body.reason);
    const response = NextResponse.json(result);
    response.cookies.set('montree_parent_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    const status = err instanceof AccountDeletionError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status }
    );
  }
}
