// lib/cms/montree-junction.ts
// ============================================================================
// THE JUNCTION, SEEN FROM CMS'S SIDE. CMS phase 7.
// ============================================================================
//
// CMS needs one thing from Montree — "please make this child real over there
// and mint the family a code" — and is not allowed to reach for it directly.
// The import law is absolute in this direction:
//
//     🚨 CMS NEVER IMPORTS FROM lib/montree/**. Not a function, not a type,
//        not "just the constant". Montree may import CMS; CMS may not import
//        Montree. (CLAUDE.md, phase-6 amendment.)
//
// So the request is made the way one product asks another for something: over
// HTTP, at `POST /api/montree/cms-bridge/activate`, which lives in MONTREE's
// namespace, authenticates the CMS school_admin session itself, and re-derives
// every tenancy fact from that session. This file is the whole CMS-side half of
// that conversation — a URL, a fetch, and a result type. It imports nothing
// from Montree, and could not: there is nothing here to import.
//
// 🚨 THE COOKIE IS FORWARDED, NOT A SHARED SECRET. There is no service token,
// no header password, no allow-list of internal callers. The junction route
// verifies the SAME signed CMS session cookie the office page was rendered
// with, so the montree side answers exactly the person who clicked Accept, with
// exactly their school's scope. An internal-secret design would have made the
// route answerable by anything that could reach it.
// ============================================================================

/** Where the parent portal opens a code. `/montree/parent?code=…` forwards to
 *  the login-select screen with the code intact — it is the URL printed on
 *  every QR code Montree generates, so it is the URL CMS shows too.
 *  A string builder, nothing more: no Montree import hides in here. */
export function montreeParentEntryUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://montree.xyz';
  return `${base}/montree/parent?code=${encodeURIComponent(code)}`;
}

/** What the junction can answer. Mirrors the montree-side result, deliberately
 *  restated here rather than imported — see the header. */
export type JunctionState =
  /** Montree child exists and a code is in hand. */
  | 'linked'
  /** Montree child exists; minting the code failed. Pressing accept again
   *  mints it and creates nothing. */
  | 'invite_pending'
  /** The CMS school or the requested room has no Montree link. A SUCCESS: the
   *  acceptance still stands, communication just cannot be switched on. */
  | 'not_linked'
  /** Montree answered, and said no. `reason` names which fault. */
  | 'failed';

export interface JunctionResult {
  state: JunctionState;
  montreeChildId: string | null;
  inviteCode: string | null;
  /** For `not_linked`: which half is missing. For `failed`: which fault. */
  reason: string | null;
}

/**
 * Ask Montree to activate communications for the child on this enrolment.
 *
 * `origin` is the caller's to compute — this function just fetches it. The
 * caller (`app/api/cms/office/enrollments/[id]/accept/route.ts`) prefers
 * `NEXT_PUBLIC_APP_URL`, the deployment's own pinned base URL, over the
 * incoming request's `Host` header: this call carries the session cookie, so
 * an unvalidated Host header would be a way to redirect that cookie to
 * whoever sent it. The request-derived origin remains the fallback for an
 * environment that never set the env var (localhost, an ephemeral preview
 * deployment), so this still works unchanged there.
 *
 * The enrolment id is the ONLY thing sent: the montree side looks up the
 * school link, the room link, the child and the tenancy itself, because a
 * body that could name a Montree school would be a body that could file a
 * child into a stranger's classroom.
 *
 * Never throws. A junction that is down must not un-accept a child, so a
 * network failure comes back as `failed` and the office sees "activation
 * unavailable — retry", with the acceptance already recorded.
 */
export async function requestMontreeActivation(
  origin: string,
  cookieHeader: string,
  enrollmentId: string
): Promise<JunctionResult> {
  try {
    const res = await fetch(`${origin}/api/montree/cms-bridge/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookieHeader },
      body: JSON.stringify({ enrollmentId }),
      cache: 'no-store',
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        state: 'failed',
        montreeChildId: null,
        inviteCode: null,
        reason: typeof body.error === 'string' ? body.error : `http_${res.status}`,
      };
    }

    const state = body.state;
    return {
      state:
        state === 'linked' || state === 'invite_pending' || state === 'not_linked'
          ? state
          : 'failed',
      montreeChildId: typeof body.montreeChildId === 'string' ? body.montreeChildId : null,
      inviteCode: typeof body.inviteCode === 'string' ? body.inviteCode : null,
      reason: typeof body.reason === 'string' ? body.reason : null,
    };
  } catch {
    // Deliberately not safeErrorLog'd with the payload: the cookie is in scope.
    console.error('[cms/montree-junction] activation request failed to reach the bridge');
    return { state: 'failed', montreeChildId: null, inviteCode: null, reason: 'bridge_unreachable' };
  }
}
