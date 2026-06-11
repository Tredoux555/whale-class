// app/api/montree/auth/delete-account/route.ts
//
// Self-service account deletion for the logged-in teacher / principal /
// homeschool parent / agent. Required by Apple App Store Guideline 5.1.1(v).
//
//   GET    -> preview: what deletion will do for THIS account (role-aware,
//             read-only). Drives the confirmation UI.
//   DELETE -> execute: performs the role-correct cascade, writes an audit
//             row, and clears the auth cookie so the session ends.
//
// Auth: requires a valid montree-auth cookie/JWT. The account acted on is
// always the caller's own (auth.userId) — you can only delete yourself.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { clearMontreeAuthCookie } from '@/lib/montree/server-auth';
import {
  previewAccountDeletion,
  executeAccountDeletion,
  AccountDeletionError,
} from '@/lib/montree/account-deletion';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const preview = await previewAccountDeletion({ userId: auth.userId });
    return NextResponse.json(preview);
  } catch (err) {
    const status = err instanceof AccountDeletionError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { confirmText?: string; reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await executeAccountDeletion(
      { userId: auth.userId },
      { confirmText: body.confirmText, reason: body.reason }
    );
    const response = NextResponse.json(result);
    clearMontreeAuthCookie(response); // session is now invalid — end it
    return response;
  } catch (err) {
    const status = err instanceof AccountDeletionError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status }
    );
  }
}
