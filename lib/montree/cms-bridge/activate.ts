// lib/montree/cms-bridge/activate.ts
// ============================================================================
// THE HANDSHAKE, MONTREE'S HALF. CMS phase 7.
// ============================================================================
//
// 🚨 THE PRINCIPLE, FOUNDER-CONFIRMED, AND THE REASON THIS FILE IS SHORT:
//     MONTREE ALREADY HAS THE ENTIRE PARENT COMMUNICATION STACK. Invite codes,
//     the parent portal, encrypted parent↔teacher threads, weekly reports,
//     photo montages, appointments, push notifications, and real Agora
//     video/voice calls. CMS's job is to ROUTE a family into it. CMS must never
//     grow a second messaging system, and nothing in this file is one.
//
//     So the whole handshake is three writes and one check:
//       1. prove the Montree classroom belongs to the linked Montree school,
//       2. create the montree_children row,
//       3. mint a parent invite code the way Montree itself mints one.
//     Everything a family then does — chatting to the teacher, reading a
//     report, joining a call — happens inside Montree, on code that already
//     exists and that CMS does not touch.
//
// ── WHY THIS FILE LIVES UNDER lib/montree/, NOT lib/cms/ ────────────────────
// Because every row it writes is a MONTREE row. A montree_children insert and a
// montree_parent_invites insert are Montree's business, written to Montree's
// conventions, and the day one of those tables changes shape it is a Montree
// engineer who fixes this file — in the directory they already read.
//
// That placement is what makes the DIRECTION LAW hold rather than bend:
//   · CMS never imports from `lib/montree/**`. Not once, not "just this type".
//   · Montree MAY import from CMS (this bridge's sibling, `document-source.ts`,
//     already imports the pure CMS engine).
// The CMS accept route therefore cannot call this function directly. It crosses
// the boundary the only way a hard direction law allows — over HTTP, through
// `app/api/montree/cms-bridge/activate`, which authenticates the CMS
// school_admin session ITSELF (a Montree route importing `lib/cms/auth` is the
// permitted direction) and re-derives every tenancy fact from that session
// rather than believing anything in the request body. See the JUNCTION PATTERN
// section of CLAUDE.md.
//
// ── WHICH INVITE MECHANISM THIS REUSES, AND WHY THAT ONE ────────────────────
// Montree mints a parent code in exactly one way, in four different routes
// (`/api/montree/invites` POST + PUT, `/api/montree/dashboard/parent-codes`
// POST + PUT, `/api/montree/admin/parent-codes/generate-all`):
//
//     supabase.rpc('generate_parent_invite_code')      -- the canonical DB fn
//     insert into montree_parent_invites {
//       child_id, invite_code, created_by,
//       expires_at: now + 365 days,
//       is_reusable: true, max_uses: null }
//
// This file reproduces that call sequence byte-for-byte in shape. It does NOT
// call those HTTP routes, and could not: every one of them is gated by
// `verifySchoolRequest`, which wants a MONTREE teacher/principal token. A CMS
// school_admin has no such token and should not be issued one — that would mean
// minting Montree credentials for CMS staff, which is a much bigger door than
// this feature needs. The canonical thing being reused is the DB function that
// all four routes agree is the way codes are made.
//
// 🚨 `is_reusable: true, max_uses: null` IS LOAD-BEARING, NOT A COPY-PASTE.
// The column defaults from migration 096 are single-use (`max_uses = 1`), and a
// parent needs to sign in again on a new phone next March. Both Montree routes
// carry a comment saying exactly this. Drop these two fields and the family's
// code dies the first time they use it.
//
// 🚨 `created_by` IS LEFT NULL, DELIBERATELY. It is
// `references montree_teachers(id)`, and the acting user here is a `cms_users`
// row — a different identity space. Writing the CMS user's uuid into it would
// either violate the FK or, worse, collide with a real teacher's id. Who
// accepted is recorded where it belongs: `cms_enrollments.decided_by_user_id`.
//
// 🚨 NO AI, NO SEEDING, NO ONBOARDING SIDE-EFFECTS. A child who arrives this
// way gets a row and a code and nothing else. The Aug-12 seeding rules are for
// children a TEACHER creates through the onboarding flow; an office acceptance
// is not that flow and must not fire it.
//
// ── FAILURE IS EXPECTED AND IS NOT AN EXCEPTION ─────────────────────────────
// Every function here returns a result object. The caller needs to record a
// partial success (child created, invite failed) as a REAL outcome, because the
// recovery is "press accept again" and that only works if the link was saved.
// Throwing would roll the link away and leave an orphan Montree child that the
// next attempt would duplicate.
// ============================================================================

import { getSupabase, type UntypedClient } from '@/lib/supabase-client';
import { safeErrorLog } from '@/lib/api-error';

type Row = Record<string, unknown>;

/** One year, matching every Montree invite route. */
const INVITE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export interface HandshakeChild {
  /** As on the birth certificate — Montree's `name` is the register name. */
  legalName: string;
  /** What the room calls them — Montree's `nickname`. */
  preferredName: string;
  /** ISO date, or null when genuinely unknown (the roster sentinel). */
  dateOfBirth: string | null;
  /** The family's requested start date, if they gave one. */
  startDate: string | null;
}

export type HandshakeState =
  /** Child created (or already there) AND a code is in hand. */
  | 'linked'
  /** Child created (or already there); the invite failed. Retry mints it. */
  | 'invite_pending';

export type HandshakeError =
  /** No montree_* tables on this database at all. CMS still works. */
  | 'montree_unavailable'
  /** The linked classroom is not in the linked school. Refuse, loudly. */
  | 'classroom_not_in_school'
  /** The classroom uuid names nothing. */
  | 'classroom_missing'
  | 'child_write_failed';

export type HandshakeResult =
  | { ok: true; state: HandshakeState; montreeChildId: string; inviteCode: string | null }
  | { ok: false; error: HandshakeError };

function db(): UntypedClient {
  return getSupabase();
}

/**
 * 🚨 THE OWNERSHIP CHECK. Jul 3 2026: existence is not ownership.
 *
 * Both link columns are set by an operator running SQL, one statement each, and
 * nothing stops a mis-paste that names school A and a classroom in school B. If
 * that ever happened, every acceptance this office made would create children
 * inside a STRANGER'S classroom — visible to their teachers, in their reports,
 * with invite codes handed to the wrong families. So the classroom is re-read
 * and re-proved on every single acceptance, not trusted because it is stored.
 */
async function verifyClassroom(
  montreeSchoolId: string,
  montreeClassroomId: string
): Promise<{ ok: true } | { ok: false; error: HandshakeError }> {
  const { data, error } = await db()
    .from('montree_classrooms')
    .select('id, school_id')
    .eq('id', montreeClassroomId)
    .maybeSingle();

  if (error) {
    // 42P01 = undefined_table: a CMS-only database. Not a fault, a deployment.
    safeErrorLog('montree/cms-bridge/activate/verifyClassroom', error);
    return { ok: false, error: 'montree_unavailable' };
  }
  const row = data as Row | null;
  if (!row) return { ok: false, error: 'classroom_missing' };
  if (row.school_id !== montreeSchoolId) {
    console.error('[SECURITY] CMS handshake blocked — classroom is not in the linked school:', {
      montreeClassroomId,
      classroomSchool: row.school_id,
      linkedSchool: montreeSchoolId,
    });
    return { ok: false, error: 'classroom_not_in_school' };
  }
  return { ok: true };
}

/** Whole years on a date. Montree keeps `age` as an integer beside the DOB. */
function ageOn(dateOfBirth: string, on = new Date()): number | null {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = on.getFullYear() - dob.getFullYear();
  const m = on.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < dob.getDate())) age -= 1;
  return age >= 0 && age < 30 ? age : null;
}

/**
 * Mint a parent invite code for a Montree child — the exact shape every Montree
 * route uses. Idempotent by intent: an ACTIVE code already on the child is
 * returned as-is rather than replaced, mirroring the `already_active` branch of
 * `/api/montree/dashboard/parent-codes`. Re-minting on every accept would
 * invalidate the slip the office already handed the family.
 */
export async function mintParentInviteCode(
  montreeChildId: string
): Promise<string | null> {
  try {
    const supabase = db();

    const { data: existing } = await supabase
      .from('montree_parent_invites')
      .select('invite_code')
      .eq('child_id', montreeChildId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const live = (existing as Row | null)?.invite_code;
    if (typeof live === 'string' && live) return live;

    const { data: code, error: codeError } = await supabase.rpc(
      'generate_parent_invite_code'
    );
    if (codeError || !code) {
      safeErrorLog('montree/cms-bridge/activate/generateCode', codeError);
      return null;
    }

    const { error: insertError } = await supabase
      .from('montree_parent_invites')
      .insert({
        child_id: montreeChildId,
        invite_code: code,
        // created_by stays NULL — see the header. A cms_users.id is not a
        // montree_teachers.id.
        expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
        is_active: true,
        // 🚨 Both of these override migration 096's single-use defaults.
        is_reusable: true,
        max_uses: null,
      });
    if (insertError) {
      safeErrorLog('montree/cms-bridge/activate/insertInvite', insertError);
      return null;
    }

    return String(code);
  } catch (error) {
    safeErrorLog('montree/cms-bridge/activate/mintParentInviteCode', error);
    return null;
  }
}

/**
 * Create the Montree child (or adopt the one already linked) and get the family
 * a code.
 *
 * `existingMontreeChildId` is the retry path: when a previous accept created
 * the child but the invite failed, the second accept must NOT create a second
 * child — it re-enters here with the id it already stored and only mints.
 */
export async function activateMontreeComms(input: {
  montreeSchoolId: string;
  montreeClassroomId: string;
  child: HandshakeChild;
  existingMontreeChildId?: string | null;
}): Promise<HandshakeResult> {
  const { montreeSchoolId, montreeClassroomId, child } = input;

  try {
    if (input.existingMontreeChildId) {
      const code = await mintParentInviteCode(input.existingMontreeChildId);
      return {
        ok: true,
        state: code ? 'linked' : 'invite_pending',
        montreeChildId: input.existingMontreeChildId,
        inviteCode: code,
      };
    }

    const classroom = await verifyClassroom(montreeSchoolId, montreeClassroomId);
    if (!classroom.ok) return classroom;

    const dob = child.dateOfBirth;
    const supabase = db();
    const { data, error } = await supabase
      .from('montree_children')
      .insert({
        classroom_id: montreeClassroomId,
        // school_id is NOT NULL on montree_children (migration 143). It is the
        // LINKED school, never a value derived from the CMS session, so the
        // ownership check above is the only thing that can authorise it.
        school_id: montreeSchoolId,
        // Montree's convention: `name` is the register name, `nickname` is what
        // the room calls them. Same split CMS already stores, so no invention.
        name: child.legalName || child.preferredName,
        nickname:
          child.preferredName && child.preferredName !== child.legalName
            ? child.preferredName
            : null,
        date_of_birth: dob,
        // Derived, never guessed: no birthday on file means no age, because a
        // plausible wrong age is worse than a blank one (the phase-6 rule).
        age: dob ? ageOn(dob) : null,
        enrolled_at: child.startDate || new Date().toISOString().split('T')[0],
        is_active: true,
      })
      .select('id')
      .single();

    if (error || !data) {
      safeErrorLog('montree/cms-bridge/activate/createChild', error);
      const code = (error as { code?: string } | null)?.code;
      return { ok: false, error: code === '42P01' ? 'montree_unavailable' : 'child_write_failed' };
    }

    const montreeChildId = String((data as Row).id);
    const inviteCode = await mintParentInviteCode(montreeChildId);

    return {
      ok: true,
      // 🚨 A failed invite is a SUCCESS with a missing piece, not a failure.
      // The child exists in Montree now; the caller must store that link before
      // returning, or the next attempt creates a duplicate child. The office UI
      // shows "invite pending — retry" and pressing accept again mints it.
      state: inviteCode ? 'linked' : 'invite_pending',
      montreeChildId,
      inviteCode,
    };
  } catch (error) {
    safeErrorLog('montree/cms-bridge/activate/activateMontreeComms', error);
    return { ok: false, error: 'montree_unavailable' };
  }
}
