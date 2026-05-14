// lib/montree/billing/manual-invoice.ts
//
// Phase C — Helper module for generating manual invoice HTML.
//
// Renders a styled HTML invoice document that the super-admin opens in a
// browser tab and saves as PDF via Cmd+P. No puppeteer or headless Chrome
// — same pattern as Session 104's accountant pack export.
//
// Includes Montree Limited HK bank details (Wallex/DBS HKD account) +
// reference number for the receiving banker to match the wire to this school.
//
// Reference number format: MONTREE-<schoolId 8 chars>-<YYYYMM>
//   e.g. MONTREE-C6280FAE-202606
//
// The reference number is what the school's treasurer must include in their
// SWIFT memo field so Tredoux can match the incoming wire to a specific
// school + period when recording it via ⚡ Record incoming wire.

import { ANNUAL_DISCOUNT_FACTOR } from '../billing';

export interface ManualInvoiceParams {
  schoolId: string;
  schoolName: string;
  billingContactName?: string | null;
  billingEmail?: string | null;
  studentCount: number;
  cadence: 'monthly' | 'annual';
  unitPriceUsd: number; // already locale-overridden
  /** ISO YYYY-MM the invoice is FOR. */
  periodMonth: string;
  /** ISO date the invoice is issued. */
  issuedAt: string;
  /** ISO date payment is due. */
  dueAt: string;
  /** Optional notes from manual_invoice_details.invoice_notes. */
  invoiceNotes?: string | null;
}

export interface ManualInvoiceResult {
  html: string;
  reference: string;
  totalUsd: number;
  totalUsdLabel: string;
}

// Canonical bank details — Montree Limited HK / Wallex / DBS HK.
// 🚨 Architectural rule: these are real wire instructions. Do NOT change
// without confirming with Tredoux. The reference number format is canonical.
const MONTREE_BANK_DETAILS = {
  bank_name: 'DBS Bank (Hong Kong) Limited',
  bank_code: '016',
  branch_code: '478',
  branch_name: 'Hong Kong Centre, 99 Queen\'s Road Central',
  account_holder: 'Montree Limited',
  account_number: '7949855392',
  swift: 'DHBKHKHH',
} as const;

/** Build the canonical reference number for a manual invoice. */
export function buildReferenceNumber(schoolId: string, periodMonth: string): string {
  const compactPeriod = periodMonth.replace('-', '');
  return `MONTREE-${schoolId.slice(0, 8).toUpperCase()}-${compactPeriod}`;
}

export function computeManualInvoiceTotalUsd(
  studentCount: number,
  cadence: 'monthly' | 'annual',
  unitPriceUsd: number
): number {
  const qty = Math.max(1, studentCount);
  if (cadence === 'annual') {
    return Number((qty * unitPriceUsd * 12 * ANNUAL_DISCOUNT_FACTOR).toFixed(2));
  }
  return Number((qty * unitPriceUsd).toFixed(2));
}

export function generateManualInvoiceHtml(p: ManualInvoiceParams): ManualInvoiceResult {
  const total = computeManualInvoiceTotalUsd(p.studentCount, p.cadence, p.unitPriceUsd);
  const totalLabel = `$${total.toFixed(2)} USD`;
  const reference = buildReferenceNumber(p.schoolId, p.periodMonth);
  const issuedFmt = formatDate(p.issuedAt);
  const dueFmt = formatDate(p.dueAt);
  const periodLabel = p.cadence === 'annual'
    ? `Annual subscription — 12 months from ${p.periodMonth}`
    : `Monthly subscription — ${p.periodMonth}`;

  const lineDescription = p.cadence === 'annual'
    ? `Montree subscription · ${p.studentCount} student${p.studentCount === 1 ? '' : 's'} × 12 months × $${p.unitPriceUsd}/student/month · 10% annual prepayment discount applied`
    : `Montree subscription · ${p.studentCount} student${p.studentCount === 1 ? '' : 's'} × $${p.unitPriceUsd}/student/month`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Montree Invoice — ${escapeHtml(p.schoolName)} — ${escapeHtml(p.periodMonth)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Lora', Georgia, serif; color: #1f2937; margin: 0; padding: 0; background: #f9fafb; }
    .toolbar { background: #111827; color: white; padding: 12px 24px; position: sticky; top: 0; z-index: 10; display: flex; gap: 12px; align-items: center; }
    .toolbar button { background: #10b981; color: white; border: 0; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
    .toolbar button:hover { background: #34d399; }
    .toolbar .ref { font-family: 'Courier New', monospace; font-size: 12px; opacity: 0.75; }
    .page { max-width: 820px; margin: 24px auto; background: white; padding: 48px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1f2937; padding-bottom: 24px; margin-bottom: 32px; }
    .brand { font-family: 'Lora', Georgia, serif; }
    .brand .name { font-size: 28px; font-weight: 600; color: #1D6B48; }
    .brand .tagline { font-size: 11px; color: #6b7280; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase; }
    .invoice-meta { text-align: right; font-size: 12px; color: #374151; }
    .invoice-meta .label { color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-size: 10px; }
    .invoice-meta .value { font-weight: 600; margin-bottom: 8px; }
    .bill-to { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .bill-to h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; margin: 0 0 6px; }
    .bill-to .name { font-size: 15px; color: #111827; font-weight: 600; }
    .bill-to .detail { font-size: 12px; color: #4b5563; line-height: 1.6; }
    table.lines { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    table.lines th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    table.lines td { padding: 16px 0; vertical-align: top; border-bottom: 1px solid #f3f4f6; }
    table.lines td .desc { font-size: 14px; color: #111827; font-weight: 500; }
    table.lines td .subdesc { font-size: 12px; color: #6b7280; margin-top: 4px; line-height: 1.5; }
    table.lines td.amount { text-align: right; font-size: 15px; color: #111827; font-weight: 600; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals table { font-size: 13px; }
    .totals td { padding: 6px 0; }
    .totals .label { color: #6b7280; padding-right: 24px; }
    .totals .total-row td { padding-top: 14px; border-top: 2px solid #1f2937; font-size: 18px; font-weight: 700; color: #1D6B48; }
    .wire-instructions { background: #f0fdf4; border: 1px solid #34d399; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .wire-instructions h3 { margin: 0 0 12px; font-size: 14px; color: #064e3b; }
    .wire-instructions dl { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; font-size: 12px; margin: 0; }
    .wire-instructions dt { color: #6b7280; }
    .wire-instructions dd { margin: 0; color: #111827; font-weight: 500; font-family: 'Courier New', monospace; }
    .ref-box { background: #fef3c7; border: 1px solid #d97706; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .ref-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #92400e; }
    .ref-box .value { font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; color: #78350f; margin-top: 4px; }
    .ref-box .note { font-size: 11px; color: #78350f; margin-top: 8px; line-height: 1.5; }
    .footer { font-size: 11px; color: #6b7280; text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; line-height: 1.6; }
    .footer .montree-name { color: #1D6B48; font-weight: 600; }
    ${p.invoiceNotes ? '.notes { background: #f9fafb; border-left: 3px solid #6b7280; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #4b5563; line-height: 1.6; }' : ''}
    @media print {
      .toolbar { display: none; }
      .page { box-shadow: none; margin: 0; max-width: 100%; padding: 24px; }
      body { background: white; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save as PDF</button>
    <span class="ref">Reference: ${escapeHtml(reference)}</span>
  </div>

  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="name">Montree</div>
        <div class="tagline">Montessori in your pocket</div>
      </div>
      <div class="invoice-meta">
        <div class="label">Invoice</div>
        <div class="value">${escapeHtml(reference)}</div>
        <div class="label">Issued</div>
        <div class="value">${escapeHtml(issuedFmt)}</div>
        <div class="label">Due</div>
        <div class="value">${escapeHtml(dueFmt)}</div>
      </div>
    </div>

    <div class="bill-to">
      <div>
        <h3>Billed to</h3>
        <div class="name">${escapeHtml(p.schoolName)}</div>
        ${p.billingContactName ? `<div class="detail">${escapeHtml(p.billingContactName)}</div>` : ''}
        ${p.billingEmail ? `<div class="detail">${escapeHtml(p.billingEmail)}</div>` : ''}
      </div>
      <div>
        <h3>From</h3>
        <div class="name">Montree Limited</div>
        <div class="detail">Hong Kong SAR</div>
        <div class="detail">montree.xyz</div>
      </div>
    </div>

    ${p.invoiceNotes ? `<div class="notes">${escapeHtml(p.invoiceNotes)}</div>` : ''}

    <table class="lines">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="desc">${escapeHtml(periodLabel)}</div>
            <div class="subdesc">${escapeHtml(lineDescription)}</div>
          </td>
          <td class="amount">${totalLabel}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr>
          <td class="label">Subtotal</td>
          <td class="amount" style="text-align: right; padding-left: 32px;">${totalLabel}</td>
        </tr>
        <tr>
          <td class="label">Tax</td>
          <td class="amount" style="text-align: right; padding-left: 32px;">$0.00 USD</td>
        </tr>
        <tr class="total-row">
          <td class="label">Total Due</td>
          <td class="amount" style="text-align: right; padding-left: 32px;">${totalLabel}</td>
        </tr>
      </table>
    </div>

    <div class="wire-instructions">
      <h3>📨 Wire payment to</h3>
      <dl>
        <dt>Bank</dt><dd>${escapeHtml(MONTREE_BANK_DETAILS.bank_name)}</dd>
        <dt>Account holder</dt><dd>${escapeHtml(MONTREE_BANK_DETAILS.account_holder)}</dd>
        <dt>Account number</dt><dd>${escapeHtml(MONTREE_BANK_DETAILS.account_number)}</dd>
        <dt>SWIFT / BIC</dt><dd>${escapeHtml(MONTREE_BANK_DETAILS.swift)}</dd>
        <dt>Bank / branch code (HK)</dt><dd>${escapeHtml(MONTREE_BANK_DETAILS.bank_code)}-${escapeHtml(MONTREE_BANK_DETAILS.branch_code)}</dd>
        <dt>Branch address</dt><dd>${escapeHtml(MONTREE_BANK_DETAILS.branch_name)}</dd>
      </dl>
      <div class="ref-box">
        <div class="label">⚠️ Include this reference in your wire memo</div>
        <div class="value">${escapeHtml(reference)}</div>
        <div class="note">
          Without this reference number in the SWIFT memo / payment notes, we cannot match your wire to your school account. Please ensure your bank includes it.
        </div>
      </div>
    </div>

    <div class="footer">
      Thank you for using <span class="montree-name">Montree</span>.<br>
      Questions? Reply to your billing email or write to tredoux@montree.xyz.<br>
      Montree Limited · Hong Kong SAR · montree.xyz
    </div>
  </div>
</body>
</html>`;

  return {
    html,
    reference,
    totalUsd: total,
    totalUsdLabel: totalLabel,
  };
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}
