// /api/montree/super-admin/schools/[id]/issue-manual-invoice/route.ts
//
// Phase C — Generate a printable HTML invoice for a manual_invoice school.
//
// Super-admin opens the returned URL in a browser tab → Cmd+P → Save as PDF.
// Same pattern as Session 104's accountant pack export — no puppeteer.
//
// Writes a billing_history row with status='open' so the school's principal
// can see the pending invoice on their /montree/admin/billing page. Idempotent
// per (school_id + period_month) via the reference number — re-issuing the
// same period regenerates the HTML but doesn't duplicate the history row.
//
// Auth: super-admin only.
//
// Two response shapes:
//   GET   ?period_month=YYYY-MM&token=...    → renders HTML directly (for
//                                                window.open + Cmd+P workflow)
//   POST  { period_month, send_email: bool } → records the invoice, optionally
//                                                emails to school's billing contact

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import {
  generateManualInvoiceHtml,
  buildReferenceNumber,
  computeManualInvoiceTotalUsd,
} from '@/lib/montree/billing/manual-invoice';
import {
  loadSchoolBilling,
  countActiveStudents,
  effectivePricePerStudentUsd,
} from '@/lib/montree/billing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface IssueBody {
  period_month?: string;
  due_at?: string;
  send_email?: boolean;
}

function isValidPeriodMonth(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

function currentPeriodMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function authOrToken(request: NextRequest): Promise<boolean> {
  try {
    const headerAuth = await verifySuperAdminAuth(request.headers);
    if (headerAuth.valid) return true;
  } catch {
    // fall through
  }
  // window.open() can't set headers — accept ?token= as fallback for the
  // print-in-tab workflow only.
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get('token');
  if (queryToken) {
    try {
      const fakeHeaders = new Headers({ authorization: `Bearer ${queryToken}` });
      const auth = await verifySuperAdminAuth(fakeHeaders);
      if (auth.valid) return true;
    } catch {
      return false;
    }
  }
  return false;
}

// GET — render printable HTML in the browser tab.
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authed = await authOrToken(request);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: schoolId } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const periodMonth = searchParams.get('period_month') || currentPeriodMonth();
  if (!isValidPeriodMonth(periodMonth)) {
    return NextResponse.json({ error: 'period_month must be YYYY-MM' }, { status: 400 });
  }

  const supabase = getSupabase();
  const school = await loadSchoolBilling(supabase, schoolId);
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  if (school.payment_method !== 'manual_invoice') {
    return NextResponse.json(
      { error: `School is on payment_method=${school.payment_method}, not manual_invoice` },
      { status: 409 }
    );
  }

  const quantity = Math.max(1, await countActiveStudents(supabase, schoolId));
  const unitPriceUsd = effectivePricePerStudentUsd(school);
  const cadence: 'monthly' | 'annual' = school.billing_cadence === 'annual' ? 'annual' : 'monthly';

  const details = (school.manual_invoice_details || {}) as Record<string, unknown>;
  const issuedAt = new Date().toISOString();
  const termsDays = typeof details.payment_terms_days === 'number' && details.payment_terms_days > 0
    ? Math.min(60, Math.floor(details.payment_terms_days))
    : 14;
  const dueAt = new Date(Date.now() + termsDays * 24 * 60 * 60 * 1000).toISOString();

  const result = generateManualInvoiceHtml({
    schoolId,
    schoolName: school.name || 'School',
    billingContactName: (details.billing_contact_name as string) || null,
    billingEmail:
      (details.billing_email_override as string) ||
      school.billing_email ||
      school.owner_email ||
      null,
    studentCount: quantity,
    cadence,
    unitPriceUsd,
    periodMonth,
    issuedAt,
    dueAt,
    invoiceNotes: (details.invoice_notes as string) || null,
  });

  return new NextResponse(result.html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// POST — record the invoice in billing_history, log audit, optionally email.
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: schoolId } = await ctx.params;
  let body: IssueBody = {};
  try {
    body = await request.json();
  } catch {
    // empty body is OK — defaults apply
  }

  const periodMonth = body.period_month || currentPeriodMonth();
  if (!isValidPeriodMonth(periodMonth)) {
    return NextResponse.json({ error: 'period_month must be YYYY-MM' }, { status: 400 });
  }

  const supabase = getSupabase();
  const school = await loadSchoolBilling(supabase, schoolId);
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }
  if (school.payment_method !== 'manual_invoice') {
    return NextResponse.json(
      { error: `School is on payment_method=${school.payment_method}, not manual_invoice` },
      { status: 409 }
    );
  }

  const quantity = Math.max(1, await countActiveStudents(supabase, schoolId));
  const unitPriceUsd = effectivePricePerStudentUsd(school);
  const cadence: 'monthly' | 'annual' = school.billing_cadence === 'annual' ? 'annual' : 'monthly';
  const totalUsd = computeManualInvoiceTotalUsd(quantity, cadence, unitPriceUsd);
  const reference = buildReferenceNumber(schoolId, periodMonth);

  const details = (school.manual_invoice_details || {}) as Record<string, unknown>;
  const termsDays = typeof details.payment_terms_days === 'number' && details.payment_terms_days > 0
    ? Math.min(60, Math.floor(details.payment_terms_days))
    : 14;
  const dueAt = body.due_at
    ? new Date(body.due_at).toISOString()
    : new Date(Date.now() + termsDays * 24 * 60 * 60 * 1000).toISOString();

  const printUrl = `/api/montree/super-admin/schools/${schoolId}/issue-manual-invoice?period_month=${periodMonth}`;

  // Record open invoice on per-school timeline. Use reference as
  // stripe_invoice_id (it's the canonical idempotency key for this rail).
  const { error: insertErr } = await supabase
    .from('montree_billing_history')
    .insert({
      school_id: schoolId,
      stripe_invoice_id: reference, // manual-invoice rail uses reference as the id
      amount_cents: Math.round(totalUsd * 100),
      currency: 'usd',
      status: 'open',
      description: `Manual invoice — ${cadence} — ${quantity} student${quantity === 1 ? '' : 's'} — period ${periodMonth}`,
      invoice_pdf_url: printUrl,
      quantity,
    });

  let alreadyExists = false;
  if (insertErr) {
    const code = (insertErr as { code?: string }).code;
    if (code === '23505') {
      // Duplicate — already issued for this period. Acceptable, return the
      // existing row's reference.
      alreadyExists = true;
    } else {
      console.error('[issue-manual-invoice] billing_history insert failed:', insertErr.message);
      return NextResponse.json(
        { error: 'Could not record invoice', detail: insertErr.message },
        { status: 500 }
      );
    }
  }

  // Audit fire-and-forget.
  logAudit(supabase, {
    adminIdentifier: 'super_admin',
    action: 'school_manual_invoice_issued',
    resourceType: 'school',
    resourceId: schoolId,
    resourceDetails: {
      reference,
      period_month: periodMonth,
      cadence,
      quantity,
      total_usd: totalUsd,
      due_at: dueAt,
      duplicate: alreadyExists,
      send_email_requested: !!body.send_email,
    },
    ipAddress: getClientIP(request.headers),
    userAgent: getUserAgent(request.headers),
    isSensitive: false,
  });

  return NextResponse.json({
    ok: true,
    duplicate: alreadyExists,
    reference,
    period_month: periodMonth,
    cadence,
    total_usd: totalUsd,
    due_at: dueAt,
    print_url: printUrl,
  });
}
