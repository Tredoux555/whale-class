/**
 * POST /api/montree/dark-phonics-live/auth/token
 *
 * STANDALONE-APP login. Same access code, same JWT, no cookie.
 *
 * The website's parent login (`/api/montree/parent/auth/access-code`) validates
 * an invite code and puts the resulting JWT in an HTTP-only cookie. A native
 * shell can't hold that cookie, so this sibling performs the IDENTICAL
 * validation and hands the SAME token back in the response body for the app to
 * store and replay as `Authorization: Bearer <jwt>`.
 *
 * Every check below MIRRORS app/api/montree/parent/auth/access-code/route.ts
 * (read directly, not guessed): the same rate limit shape, the same
 * montree_parent_invites lookup, the same expiry / max-uses / school-lock
 * checks, the same use-count bump, the same lightweight montree_parents
 * provisioning, and the same createParentToken() call. The two differences are
 * (1) no `cookies().set(...)`, and (2) the extra `dark_phonics_live` flag gate.
 * If the access-code route changes, mirror the change here.
 *
 * Gated on `dark_phonics_live` (404 when off). schoolId for that gate comes
 * from the invite's child row, resolved before the gate runs.
 *
 * Body: { accessCode: string }   (`code` accepted as an alias)
 * 200 → { token, parent: { parentId, parentName, schoolId }, expiresAt }
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getSupabase } from '@/lib/supabase-client';
import { createParentToken, MONTREE_JWT_TTL_DAYS } from '@/lib/montree/server-auth';
import { isSchoolLocked } from '@/lib/montree/school-lock';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { withDplCors, dplOptionsHandler } from '@/lib/montree/dark-phonics-live/app-auth';

export const dynamic = 'force-dynamic';

const FEATURE_KEY = 'dark_phonics_live';
const ENDPOINT = '/api/montree/dark-phonics-live/auth/token';

/** Preflight for the app shell's cross-origin POST. */
export const OPTIONS = dplOptionsHandler;

interface TokenBody {
  accessCode?: unknown;
  /** Alias — the website route names this field `code`. */
  code?: unknown;
}

interface InviteRow {
  id: string;
  invite_code: string;
  child_id: string;
  expires_at: string | null;
  is_active: boolean;
  is_reusable: boolean | null;
  use_count: number | null;
  max_uses: number | null;
}

interface ChildRow {
  id: string;
  name: string | null;
  nickname: string | null;
  classroom_id: string | null;
  school_id: string | null;
}

export async function POST(request: NextRequest) {
  const json = (body: Record<string, unknown>, status: number): NextResponse =>
    withDplCors(NextResponse.json(body, { status }), request);

  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);

    // --- rate limit (mirrors the website route: 5 attempts / 15 min / IP) ----
    // Its own endpoint key, so app attempts and web attempts meter separately
    // rather than one surface locking a parent out of the other.
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, ENDPOINT, 5, 15
    );
    if (!allowed) {
      const res = json(
        { success: false, error: 'Too many attempts. Please try again later.' },
        429
      );
      res.headers.set('Retry-After', String(retryAfterSeconds));
      return res;
    }

    // --- body ---------------------------------------------------------------
    let body: TokenBody;
    try {
      body = (await request.json()) as TokenBody;
    } catch {
      return json({ success: false, error: 'Please enter a valid access code' }, 400);
    }

    const raw = typeof body.accessCode === 'string'
      ? body.accessCode
      : typeof body.code === 'string'
        ? body.code
        : '';
    if (!raw || raw.length < 4) {
      return json({ success: false, error: 'Please enter a valid access code' }, 400);
    }
    const cleanCode = raw.toUpperCase().trim();

    // --- invite lookup ------------------------------------------------------
    const failedLogin = () =>
      logAudit(supabase, {
        adminIdentifier: ip,
        action: 'login_failed',
        resourceType: 'parent_access_code',
        ipAddress: ip,
        userAgent,
      });

    const { data: inviteData, error: inviteError } = await supabase
      .from('montree_parent_invites')
      .select(`
        id,
        invite_code,
        child_id,
        expires_at,
        is_active,
        is_reusable,
        use_count,
        max_uses,
        used_at
      `)
      .eq('invite_code', cleanCode)
      .eq('is_active', true)
      .single();

    const invite = inviteData as InviteRow | null;
    if (inviteError || !invite) {
      await failedLogin();
      return json(
        { success: false, error: 'Invalid access code. Please check and try again.' },
        401
      );
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await failedLogin();
      return json(
        {
          success: false,
          error: 'This access code has expired. Please contact your teacher for a new code.',
        },
        401
      );
    }

    // Only enforced when max_uses is set (null = unlimited).
    if (invite.max_uses !== null && (invite.use_count ?? 0) >= invite.max_uses) {
      await failedLogin();
      return json(
        {
          success: false,
          error:
            'This access code has reached its use limit. Please contact your teacher for a new code.',
        },
        401
      );
    }

    // --- child (carries the school context every gate below needs) ----------
    const { data: childData, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, nickname, classroom_id, school_id')
      .eq('id', invite.child_id)
      .single();

    const child = childData as ChildRow | null;
    if (childError || !child) {
      await failedLogin();
      return json(
        { success: false, error: 'Could not find child record. Please contact your teacher.' },
        404
      );
    }

    // Refuse a locked school BEFORE minting anything. isSchoolLocked is cached
    // + fail-open, so an outage never locks parents out. (Mirrors the website
    // route's placement — before the use-count bump and before token creation.)
    if (child.school_id && (await isSchoolLocked(child.school_id))) {
      return json(
        { success: false, error: 'This account has been locked.', code: 'school_locked' },
        403
      );
    }

    // --- dark_phonics_live gate (this route's only addition) -----------------
    // 404 so the app-login surface reads as nonexistent for un-flagged schools,
    // matching every other DPL route. schoolId is resolved from the invite's
    // child row above, so the gate runs on real school context.
    const enabled = child.school_id
      ? await isFeatureEnabled(supabase, child.school_id, FEATURE_KEY)
      : false;
    if (!enabled) {
      return json({ error: 'not_found' }, 404);
    }

    // --- usage tracking ------------------------------------------------------
    await supabase
      .from('montree_parent_invites')
      .update({
        use_count: (invite.use_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    // --- provision the lightweight montree_parents row -----------------------
    // Byte-for-byte the same idempotent provisioning the website route does
    // (Session 117): placeholder email/name, UNIQUE(email, school_id) handles
    // the race, plus the montree_parent_children junction link. Without a
    // parentId the minted token can't satisfy resolveDplParent, so unlike the
    // website route this one treats total failure as fatal (see below).
    let provisionedParentId: string | undefined;
    let provisionedParentName: string | undefined;
    try {
      const placeholderEmail = `pending-${invite.id}@parent.montree.local`;
      const childDisplay = (child.name || child.nickname || 'child').trim();
      const placeholderName = `${childDisplay}'s parent`;
      const placeholderHash = `pending:${invite.id}:${Date.now()}`;

      const { data: existingParent } = await supabase
        .from('montree_parents')
        .select('id, name, email')
        .eq('email', placeholderEmail)
        .eq('school_id', child.school_id)
        .maybeSingle();

      if (existingParent) {
        const row = existingParent as { id: string; name: string | null; email: string };
        provisionedParentId = row.id;
        provisionedParentName = row.name || row.email;
      } else {
        const { data: newParent, error: parentInsertErr } = await supabase
          .from('montree_parents')
          .insert({
            school_id: child.school_id,
            email: placeholderEmail,
            password_hash: placeholderHash,
            name: placeholderName,
            is_active: true,
          })
          .select('id, name, email')
          .single();

        if (parentInsertErr) {
          // 23505 unique_violation race: someone provisioned just before us.
          if (parentInsertErr.code === '23505') {
            const { data: raced } = await supabase
              .from('montree_parents')
              .select('id, name, email')
              .eq('email', placeholderEmail)
              .eq('school_id', child.school_id)
              .maybeSingle();
            if (raced) {
              const row = raced as { id: string; name: string | null; email: string };
              provisionedParentId = row.id;
              provisionedParentName = row.name || row.email;
            }
          } else {
            console.error('[dpl/auth/token] provision parent insert failed', parentInsertErr);
          }
        } else if (newParent) {
          const row = newParent as { id: string; name: string | null; email: string };
          provisionedParentId = row.id;
          provisionedParentName = row.name || row.email;
        }
      }

      // Junction link parent↔child. Idempotent via UNIQUE(parent_id, child_id).
      if (provisionedParentId) {
        const { error: linkErr } = await supabase
          .from('montree_parent_children')
          .insert({ parent_id: provisionedParentId, child_id: child.id });
        if (linkErr && linkErr.code !== '23505') {
          console.error('[dpl/auth/token] provision link insert failed', linkErr);
        }
      }
    } catch (provErr) {
      console.error('[dpl/auth/token] provisioning failed (non-fatal here)', provErr);
    }

    // The website route tolerates a failed provision (the parent still lands on
    // the dashboard with an invite-only session). The app cannot: every DPL
    // route resolves through resolveDplParent, which requires parentId. So a
    // token without one would be dead on arrival — fail loudly instead.
    if (!provisionedParentId) {
      return json(
        { success: false, error: 'Could not prepare your parent account. Please try again.' },
        503
      );
    }

    // --- mint the SAME JWT the cookie flow would set -------------------------
    // createParentToken() from lib/montree/server-auth — identical payload to
    // the website route. It is NOT put in a cookie; the app stores it and
    // replays it as `Authorization: Bearer <token>`.
    const token = await createParentToken({
      sub: child.id,
      childName: child.name || child.nickname || undefined,
      classroomId: child.classroom_id || undefined,
      inviteId: invite.id,
      parentId: provisionedParentId,
    });

    // TTL parity with the token itself (MONTREE_JWT_TTL_DAYS, default 3650d).
    const expiresAt = new Date(
      Date.now() + MONTREE_JWT_TTL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    logAudit(supabase, {
      adminIdentifier: `parent:${invite.id}`,
      action: 'login_success',
      resourceType: 'parent',
      resourceId: invite.id,
      resourceDetails: { endpoint: ENDPOINT, childId: child.id, surface: 'standalone_app' },
      ipAddress: ip,
      userAgent,
    });

    return json(
      {
        token,
        parent: {
          parentId: provisionedParentId,
          parentName: provisionedParentName ?? '',
          schoolId: child.school_id ?? '',
        },
        expiresAt,
      },
      200
    );
  } catch (error) {
    console.error('[dpl/auth/token] unexpected error', error);
    return json({ success: false, error: 'Something went wrong. Please try again.' }, 500);
  }
}
