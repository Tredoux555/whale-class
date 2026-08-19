/**
 * lib/montree/credits/ledger.ts
 *
 * Data access for the Dark Phonics Live class-credit ledger
 * (`montree_class_credits_ledger`, created in migrations/224_dark_phonics_live.sql).
 *
 * DESIGN RULES — please keep these true:
 *
 * 1. The ledger is APPEND-ONLY. Nothing in this module UPDATEs or DELETEs.
 *    A mistake is corrected by writing a compensating row, never by editing
 *    history.
 *
 * 2. There is no stored balance anywhere. A balance is always
 *    `SUM(delta) WHERE child_id = ?`. Do not add a `credits_remaining` column
 *    to the children table "for speed" — the log and the counter will drift.
 *
 * 3. The child is the unit of account. `parent_id` rides along on every row
 *    (denormalised on purpose) for family-level history screens and to
 *    attribute grants to the paying adult, but it is never the thing you sum.
 *
 * 4. Zero-delta rows are deliberate. `class_no_show` and `class_cancelled_late`
 *    move no credits — the credit was already burned when the class was booked
 *    — but they are written anyway so the ledger stays a complete event log of
 *    everything that happened to a booking. `SUM(delta)` is unaffected.
 *
 * This module is transport-agnostic: it takes a Supabase client as its first
 * argument and imports nothing from Next.js. Callers (route handlers, server
 * components, scripts) supply whichever client carries the right auth.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Table / RPC names
// ---------------------------------------------------------------------------

const LEDGER_TABLE = 'montree_class_credits_ledger';

/**
 * Postgres function created in section 6 of migration 224. Does the
 * check-and-burn atomically. See `spendCreditForBooking` below.
 */
export const SPEND_CREDIT_RPC = 'spend_credit_for_booking';

/**
 * PostgREST caps rows per response (commonly 1000). `getCreditBalance` pages
 * through rather than silently truncating the sum.
 */
const PAGE_SIZE = 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreditReason =
  | 'manual_grant'
  | 'class_booked'
  | 'class_no_show'
  | 'class_cancelled_late'
  | 'refund';

export interface CreditLedgerRow {
  id: string;
  parent_id: string;
  child_id: string;
  /** Positive = granted, negative = spent, zero = informational audit event. */
  delta: number;
  reason: CreditReason;
  appointment_id: string | null;
  package_id: string | null;
  created_by: string | null;
  note: string | null;
  created_at: string;
}

/**
 * Shape written on insert. `id` and `created_at` come from database defaults;
 * every other column is spelled out explicitly (nulls included) so a new column
 * on the table shows up as a compile error rather than a silently missing value.
 */
export type NewCreditLedgerRow = Omit<CreditLedgerRow, 'id' | 'created_at'>;

export interface GrantCreditsParams {
  childId: string;
  parentId: string;
  /** Number of classes granted. Must be a positive integer. */
  credits: number;
  /** Catalog row this grant was sold against, when known. */
  packageId?: string;
  /** Staff user id who granted (audit trail — always pass a real id). */
  createdBy: string;
  /** Free text, e.g. "WeChat transfer 2026-08-19 ¥1200, ref 8842". */
  note?: string;
}

export interface SpendCreditForBookingParams {
  childId: string;
  parentId: string;
  appointmentId: string;
  /** Whoever initiated the booking — parent or staff user id. */
  createdBy: string;
}

export type SpendCreditResult =
  | { ok: true }
  | { ok: false; reason: 'insufficient_credits' };

export interface ReverseCreditParams {
  appointmentId: string;
  createdBy: string;
  /**
   * True when the cancellation landed inside the no-refund window
   * (< 24h before class start, per the build contract). Late cancellations
   * do NOT return the credit.
   */
  lateCancel: boolean;
}

export interface MarkNoShowParams {
  appointmentId: string;
  createdBy: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Narrow shape we need from a ledger row when resolving an appointment. */
interface AppointmentPartiesRow {
  parent_id: string;
  child_id: string;
}

function fail(operation: string, error: { message?: string } | null): never {
  throw new Error(
    `[montree/credits/ledger] ${operation} failed: ${error?.message ?? 'unknown error'}`,
  );
}

/**
 * Resolves the parent/child a booking belongs to by reading back the
 * `class_booked` row written when the class was booked.
 *
 * Deliberately sourced from the ledger and not from `montree_appointments`:
 * the ledger is the financial record, so a reversal is always applied to
 * exactly the parties that were charged, even if the appointment row has since
 * been re-assigned or soft-deleted.
 */
async function findBookingParties(
  supabase: SupabaseClient,
  appointmentId: string,
): Promise<AppointmentPartiesRow | null> {
  const { data, error } = await supabase
    .from(LEDGER_TABLE)
    .select('parent_id, child_id')
    .eq('appointment_id', appointmentId)
    .eq('reason', 'class_booked')
    .limit(1)
    .maybeSingle();

  if (error) fail('findBookingParties', error);
  return (data as AppointmentPartiesRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Current credit balance for a child: the sum of every ledger delta.
 *
 * Returns 0 for a child with no ledger history (that is a real, correct
 * answer — no rows means no credits, not "unknown").
 *
 * Pages through results because PostgREST truncates large responses; a silent
 * truncation here would understate a balance and wrongly block a booking.
 *
 * Alternative if this ever gets hot: `SELECT balance FROM
 * montree_class_credit_balances WHERE child_id = $1` (the view created in
 * section 4 of migration 224) does the aggregation server-side in one row.
 */
export async function getCreditBalance(
  supabase: SupabaseClient,
  childId: string,
): Promise<number> {
  let balance = 0;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(LEDGER_TABLE)
      .select('delta')
      .eq('child_id', childId)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) fail('getCreditBalance', error);

    const rows = (data ?? []) as Array<Pick<CreditLedgerRow, 'delta'>>;
    for (const row of rows) balance += row.delta;

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return balance;
}

/**
 * Grants credits to a child after an off-platform payment (WeChat/Alipay QR).
 *
 * Writes a single positive `manual_grant` row. One row per grant, whatever the
 * package size — a 10-class package is `delta: 10`, not ten rows, so the
 * grant maps one-to-one onto the thing the parent actually paid for.
 */
export async function grantCredits(
  supabase: SupabaseClient,
  { childId, parentId, credits, packageId, createdBy, note }: GrantCreditsParams,
): Promise<void> {
  if (!Number.isInteger(credits) || credits <= 0) {
    throw new Error(
      `[montree/credits/ledger] grantCredits: credits must be a positive integer, got ${credits}`,
    );
  }

  const row: NewCreditLedgerRow = {
    parent_id: parentId,
    child_id: childId,
    delta: credits,
    reason: 'manual_grant',
    appointment_id: null,
    package_id: packageId ?? null,
    created_by: createdBy,
    note: note ?? null,
  };

  const { error } = await supabase.from(LEDGER_TABLE).insert(row);
  if (error) fail('grantCredits', error);
}

/**
 * Burns one credit for a booking, if the child has one.
 *
 * Calls the `spend_credit_for_booking` Postgres function (migration 224,
 * section 6), which takes an advisory lock on the child, checks the balance,
 * and inserts the `-1` row inside a single server-side transaction — so two
 * simultaneous booking requests for a child with exactly 1 credit cannot both
 * succeed. This is not racy: the lock + check + insert happen server-side as
 * one unit, not as two separate round trips from this client.
 *
 * The partial unique index `uniq_montree_class_credits_ledger_booking` is a
 * second, independent safety net: it guarantees at most one `class_booked`
 * row per appointment, so a retried request cannot double-burn even if it
 * somehow bypassed the RPC.
 *
 * WRITE ORDER — the appointment row must already exist before this call.
 * `appointment_id` has a foreign key to `montree_appointments`. Callers must
 * insert the appointment first, then spend — see
 * `app/api/montree/dark-phonics-live/book/route.ts` for the reference order.
 * Calling this before the appointment exists fails with SQLSTATE 23503, not
 * with an `insufficient_credits` result.
 *
 * Insufficient credits is a normal outcome, not an exception — it is returned
 * as a value so the caller can render the "buy more classes" state.
 */
export async function spendCreditForBooking(
  supabase: SupabaseClient,
  { childId, parentId, appointmentId, createdBy }: SpendCreditForBookingParams,
): Promise<SpendCreditResult> {
  // Calls the `spend_credit_for_booking` Postgres function (migration 224,
  // section 6): it takes an advisory lock on the child, checks the balance,
  // and inserts the `-1` row inside one server-side transaction, so two
  // simultaneous bookings for a child with exactly 1 credit cannot both
  // succeed. This replaces an earlier client-side check-then-insert, which
  // was racy by construction (two round trips, no lock between them).
  //
  // WRITE ORDER (unchanged requirement): `appointment_id` has a foreign key
  // to `montree_appointments`, so the appointment row must exist before this
  // call. Callers must insert the appointment first, then spend — see
  // `app/api/montree/dark-phonics-live/book/route.ts` for the reference
  // order. Calling this before the appointment exists fails with SQLSTATE
  // 23503, not with an `insufficient_credits` result.
  const { data, error } = await supabase.rpc(SPEND_CREDIT_RPC, {
    p_child_id: childId,
    p_parent_id: parentId,
    p_appointment_id: appointmentId,
    p_created_by: createdBy,
  });

  if (error) fail('spendCreditForBooking', error);

  return data === true ? { ok: true } : { ok: false, reason: 'insufficient_credits' };
}

/**
 * Handles the credit side of a cancellation.
 *
 * On-time cancellation (`lateCancel: false`)
 *   → writes a `+1` `refund` row referencing the appointment. The credit goes
 *     back to the child and can be re-booked.
 *
 * Late cancellation (`lateCancel: true`)
 *   → writes NO refund. This is the intended, contract-specified behaviour
 *     (cancelling inside 24h forfeits the class), not an oversight — the
 *     early return is explicit so nobody "fixes" it later.
 *     It still writes a `class_cancelled_late` row with `delta: 0`. That row
 *     changes no balance; it exists so the ledger remains a complete event log.
 *     Without it, a forfeited class looks identical to a class that simply
 *     never happened, and the first parent to ask "where did my credit go?"
 *     has no answer in the data.
 *
 * Idempotent in practice: `uniq_montree_class_credits_ledger_refund` allows at
 * most one refund per appointment, so a retried cancellation cannot mint a
 * second credit — it surfaces as a unique-violation error rather than silently
 * doubling.
 *
 * No-ops (without error) if no `class_booked` row exists for the appointment:
 * there is nothing to reverse, e.g. a class that was created by staff without
 * burning a credit.
 */
export async function reverseCreditForCancellation(
  supabase: SupabaseClient,
  { appointmentId, createdBy, lateCancel }: ReverseCreditParams,
): Promise<void> {
  const parties = await findBookingParties(supabase, appointmentId);

  // Nothing was ever charged for this appointment — nothing to reverse and
  // nothing meaningful to log against a parent/child.
  if (!parties) return;

  if (lateCancel) {
    // Deliberate: no credit is returned. Audit row only (delta 0).
    const lateRow: NewCreditLedgerRow = {
      parent_id: parties.parent_id,
      child_id: parties.child_id,
      delta: 0,
      reason: 'class_cancelled_late',
      appointment_id: appointmentId,
      package_id: null,
      created_by: createdBy,
      note: 'Cancelled inside the no-refund window; credit forfeited.',
    };

    const { error } = await supabase.from(LEDGER_TABLE).insert(lateRow);
    if (error) fail('reverseCreditForCancellation (late)', error);
    return;
  }

  const refundRow: NewCreditLedgerRow = {
    parent_id: parties.parent_id,
    child_id: parties.child_id,
    delta: 1,
    reason: 'refund',
    appointment_id: appointmentId,
    package_id: null,
    created_by: createdBy,
    note: 'Cancelled outside the no-refund window; credit returned.',
  };

  const { error } = await supabase.from(LEDGER_TABLE).insert(refundRow);
  if (error) fail('reverseCreditForCancellation (refund)', error);
}

/**
 * Records that a booked class was a no-show.
 *
 * Writes a `delta: 0` audit row. No credit moves: the credit was burned when
 * the class was booked and a no-show forfeits it. The row exists purely so the
 * booking's history is complete and so no-show counts can be reported
 * (`montree_class_credit_balances.no_shows`) without inferring them from the
 * absence of other rows.
 *
 * No-ops if the appointment has no `class_booked` row.
 */
export async function markNoShow(
  supabase: SupabaseClient,
  { appointmentId, createdBy }: MarkNoShowParams,
): Promise<void> {
  const parties = await findBookingParties(supabase, appointmentId);
  if (!parties) return;

  const row: NewCreditLedgerRow = {
    parent_id: parties.parent_id,
    child_id: parties.child_id,
    delta: 0,
    reason: 'class_no_show',
    appointment_id: appointmentId,
    package_id: null,
    created_by: createdBy,
    note: 'No-show; credit was already spent at booking time.',
  };

  const { error } = await supabase.from(LEDGER_TABLE).insert(row);
  if (error) fail('markNoShow', error);
}

/**
 * Full ledger history for a child, newest first. Useful for the parent-facing
 * "my classes" screen and for support.
 */
export async function listLedgerForChild(
  supabase: SupabaseClient,
  childId: string,
  limit = 100,
): Promise<CreditLedgerRow[]> {
  const { data, error } = await supabase
    .from(LEDGER_TABLE)
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) fail('listLedgerForChild', error);
  return (data ?? []) as CreditLedgerRow[];
}
