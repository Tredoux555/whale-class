// app/api/montree/child-onboarding/document/route.ts
//
// Authenticated, signed-URL access to Child Onboarding DOCUMENTS —
// vaccination booklet, health check, medical certificates. These are
// sensitive medical documents and must NEVER ride the public, unauthenticated
// media proxy (unlike face photos / pickup-person photos, which stay on
// getProxyUrl — they're needed for label/print rendering and are no more
// sensitive than any other child photo already on that path).
//
// GET ?path=intake/<schoolId>/<childId>/<file>
//
//   Auth (either one):
//     • Teacher/principal — verifySchoolRequest; the path's schoolId segment
//       must equal the session's schoolId.
//     • Parent — resolveAuthorizedParent; the path's childId segment must be
//       one of the parent's authorized children.
//
//   The path is parsed with parseIntakePath() BEFORE any auth check runs —
//   malformed input never reaches storage or the DB.
//
//   On success: mints a 60s signed URL on the montree-media bucket and
//   302-redirects to it (mirrors the createSignedUrl pattern from
//   app/api/montree/super-admin/agents/[id]/tax-form/route.ts). A redirect —
//   not JSON — so this URL drops straight into an <a href>/target="_blank"
//   exactly like the public proxy URL it replaces; no client fetch needed.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import {
  CHILD_ONBOARDING_FEATURE_KEY,
  INTAKE_BUCKET,
  parseIntakePath,
} from '@/lib/montree/child-onboarding/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rawPath = request.nextUrl.searchParams.get('path');
  const parsed = parseIntakePath(rawPath);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid document path' }, { status: 400 });
  }
  const { schoolId, childId } = parsed;

  const supabase = getSupabase();
  let authorized = false;

  // Teacher/principal: the school segment must match their own session.
  const schoolAuth = await verifySchoolRequest(request);
  if (!(schoolAuth instanceof NextResponse) && schoolAuth.schoolId === schoolId) {
    authorized = true;
  }

  // Fall back to a parent session: the child segment must be one of theirs.
  // (The child's real school is fixed at write time — checking the childId
  // link is sufficient; a forged schoolId segment just fails to resolve any
  // real storage object.)
  if (!authorized) {
    const parent = await resolveAuthorizedParent(supabase);
    if (parent && parent.authorizedChildIds.includes(childId)) {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isFeatureEnabled(supabase, schoolId, CHILD_ONBOARDING_FEATURE_KEY))) {
    return NextResponse.json({ error: 'feature_disabled' }, { status: 403 });
  }

  const { data: signed, error } = await supabase.storage
    .from(INTAKE_BUCKET)
    .createSignedUrl(rawPath as string, 60);

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not resolve document' }, { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
