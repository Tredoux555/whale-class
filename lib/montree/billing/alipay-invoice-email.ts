// lib/montree/billing/alipay-invoice-email.ts
//
// Bilingual EN + ZH Resend email for Alipay/WeChat invoice delivery.
// Sent from createAlipayInvoice() after the Stripe invoice is finalised.
//
// Subject line is bilingual so the recipient's preview pane shows both
// languages — useful for treasurers in mainland Chinese schools who toggle
// between English (Stripe receipts) and Chinese (internal accounting).
//
// Body is bilingual: EN paragraph, then ZH paragraph, then a single CTA
// linking to Stripe's hosted invoice URL with QR codes for Alipay + WeChat.
//
// 🚨 NOTE: copy hardcoded here for Phase B. Phase E will migrate to i18n
// keys + Haiku translation for the 12 supported locales. The Chinese here
// is the primary target audience (mainland + HK + Macau + Taiwan), so we
// don't need full locale support for invoice emails specifically.
//
// Reuses lib/montree/email.ts Resend pattern.

import { Resend } from 'resend';

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'Montree <onboarding@resend.dev>';
}

export interface AlipayInvoiceEmailParams {
  to: string;
  schoolName: string;
  hostedInvoiceUrl: string;
  amountCents: number;
  cadence: 'monthly' | 'annual';
  /** Free-form label e.g. "June 2026" or "annual 2026". */
  periodLabel: string;
  studentCount: number;
}

export interface AlipayInvoiceEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function sendAlipayInvoiceEmail(
  params: AlipayInvoiceEmailParams
): Promise<AlipayInvoiceEmailResult> {
  const { to, schoolName, hostedInvoiceUrl, amountCents, cadence, periodLabel, studentCount } = params;
  const usdLabel = fmtUsd(amountCents);

  // Subject — bilingual. Slash-separated EN / ZH so preview-pane shows both.
  const subject = cadence === 'annual'
    ? `Montree — Annual invoice ${periodLabel} (${usdLabel}) / 蒙特里 — ${periodLabel} 年度账单 (${usdLabel})`
    : `Montree — Invoice for ${periodLabel} (${usdLabel}) / 蒙特里 — ${periodLabel} 账单 (${usdLabel})`;

  const html = generateBilingualHtml({
    schoolName,
    hostedInvoiceUrl,
    amountCents,
    cadence,
    periodLabel,
    studentCount,
  });

  const text = generateBilingualText({
    schoolName,
    hostedInvoiceUrl,
    amountCents,
    cadence,
    periodLabel,
    studentCount,
  });

  try {
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[alipay-invoice-email] send error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[alipay-invoice-email] exception:', err);
    return { success: false, error: message };
  }
}

function generateBilingualHtml(p: {
  schoolName: string;
  hostedInvoiceUrl: string;
  amountCents: number;
  cadence: 'monthly' | 'annual';
  periodLabel: string;
  studentCount: number;
}): string {
  const usd = fmtUsd(p.amountCents);
  const enHeading = p.cadence === 'annual' ? `Annual invoice — ${p.periodLabel}` : `Invoice — ${p.periodLabel}`;
  const zhHeading = p.cadence === 'annual' ? `年度账单 — ${p.periodLabel}` : `账单 — ${p.periodLabel}`;
  const enBody = p.cadence === 'annual'
    ? `Your annual Montree subscription invoice for ${p.schoolName} is ready. ${p.studentCount} student${p.studentCount === 1 ? '' : 's'} × 12 months, with a 10% annual discount applied — total ${usd}.`
    : `Your monthly Montree subscription invoice for ${p.schoolName} is ready. ${p.studentCount} student${p.studentCount === 1 ? '' : 's'} this period — total ${usd}.`;
  const zhBody = p.cadence === 'annual'
    ? `${p.schoolName} 的年度蒙特里订阅账单已生成。${p.studentCount} 位学生 × 12 个月,已享受 10% 年度折扣 — 合计 ${usd}。`
    : `${p.schoolName} 的本月蒙特里订阅账单已生成。本月 ${p.studentCount} 位学生 — 合计 ${usd}。`;
  const enInstr = 'Tap "Pay invoice" to open the invoice. From there, scan the QR code with Alipay or WeChat Pay to complete payment.';
  const zhInstr = '点击下方"支付账单"打开账单页面,然后使用支付宝或微信支付扫码完成付款。';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans CJK SC', sans-serif; background-color: #f4f7f5;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    <div style="background: linear-gradient(135deg, #1D6B48 0%, #34d399 100%); padding: 28px 24px; border-radius: 16px 16px 0 0; color: white;">
      <div style="font-size: 13px; opacity: 0.85; letter-spacing: 1px; text-transform: uppercase;">Montree · 蒙特里</div>
      <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 500;">${escapeHtml(enHeading)}</h1>
      <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: 400; opacity: 0.9;">${escapeHtml(zhHeading)}</h2>
    </div>

    <div style="background: white; padding: 28px 24px; border-radius: 0 0 16px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
      <p style="color: #1f2937; font-size: 15px; line-height: 1.65; margin: 0 0 18px;">${escapeHtml(enBody)}</p>
      <p style="color: #1f2937; font-size: 15px; line-height: 1.75; margin: 0 0 22px;">${escapeHtml(zhBody)}</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${escapeHtmlAttr(p.hostedInvoiceUrl)}" style="display: inline-block; background: #1D6B48; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
          Pay invoice / 支付账单 →
        </a>
      </div>

      <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0 0 8px;">${escapeHtml(enInstr)}</p>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.75; margin: 0 0 18px;">${escapeHtml(zhInstr)}</p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 22px 0;">

      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        Montree · montree.xyz · 蒙特里
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generateBilingualText(p: {
  schoolName: string;
  hostedInvoiceUrl: string;
  amountCents: number;
  cadence: 'monthly' | 'annual';
  periodLabel: string;
  studentCount: number;
}): string {
  const usd = fmtUsd(p.amountCents);
  return [
    `Montree — ${p.cadence === 'annual' ? 'Annual invoice' : 'Invoice'} — ${p.periodLabel}`,
    `蒙特里 — ${p.cadence === 'annual' ? '年度账单' : '账单'} — ${p.periodLabel}`,
    ``,
    p.cadence === 'annual'
      ? `Your annual Montree subscription invoice for ${p.schoolName} is ready. ${p.studentCount} student${p.studentCount === 1 ? '' : 's'} × 12 months, with a 10% annual discount applied — total ${usd}.`
      : `Your monthly Montree subscription invoice for ${p.schoolName} is ready. ${p.studentCount} student${p.studentCount === 1 ? '' : 's'} this period — total ${usd}.`,
    ``,
    p.cadence === 'annual'
      ? `${p.schoolName} 的年度蒙特里订阅账单已生成。${p.studentCount} 位学生 × 12 个月,已享受 10% 年度折扣 — 合计 ${usd}。`
      : `${p.schoolName} 的本月蒙特里订阅账单已生成。本月 ${p.studentCount} 位学生 — 合计 ${usd}。`,
    ``,
    `Pay invoice / 支付账单: ${p.hostedInvoiceUrl}`,
    ``,
    `Tap the link above to open the invoice, then scan the QR with Alipay or WeChat Pay.`,
    `点击上方链接打开账单,然后使用支付宝或微信支付扫码完成付款。`,
    ``,
    `Montree · montree.xyz`,
  ].join('\n');
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s);
}

// ── Dunning reminder email ────────────────────────────────────────────────
//
// Day 1 / 7 / 13 since past_due. Phase B dunning cron drives this.

export interface DunningReminderParams {
  to: string;
  schoolName: string;
  hostedInvoiceUrl: string | null;
  amountCents: number;
  daysOverdue: number;
  daysUntilCancel: number;
}

export async function sendDunningReminderEmail(
  params: DunningReminderParams
): Promise<AlipayInvoiceEmailResult> {
  const { to, schoolName, hostedInvoiceUrl, amountCents, daysOverdue, daysUntilCancel } = params;
  const usd = fmtUsd(amountCents);

  const subject = daysUntilCancel <= 1
    ? `Final reminder — Montree invoice (${usd}) / 最终提醒 — 蒙特里账单 (${usd})`
    : `Reminder — Montree invoice ${daysOverdue}d overdue / 提醒 — 蒙特里账单已逾期 ${daysOverdue} 天`;

  const enBody = daysUntilCancel <= 1
    ? `This is the final reminder. ${schoolName}'s Montree invoice for ${usd} is ${daysOverdue} days overdue. If unpaid in the next ${daysUntilCancel} day, the subscription will be canceled and AI features will pause.`
    : `${schoolName}'s Montree invoice for ${usd} is ${daysOverdue} days overdue. The subscription will be canceled in ${daysUntilCancel} days if unpaid.`;
  const zhBody = daysUntilCancel <= 1
    ? `这是最后一次提醒。${schoolName} 的蒙特里账单 ${usd} 已逾期 ${daysOverdue} 天。如果在 ${daysUntilCancel} 天内仍未付款,订阅将被取消,AI 功能将暂停。`
    : `${schoolName} 的蒙特里账单 ${usd} 已逾期 ${daysOverdue} 天。如果在 ${daysUntilCancel} 天内仍未付款,订阅将被取消。`;

  const ctaText = hostedInvoiceUrl ? 'Pay invoice / 支付账单 →' : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans CJK SC', sans-serif; background-color: #fef7e6;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    <div style="background: ${daysUntilCancel <= 1 ? '#dc2626' : '#d97706'}; padding: 24px; border-radius: 16px 16px 0 0; color: white;">
      <div style="font-size: 13px; opacity: 0.85; letter-spacing: 1px; text-transform: uppercase;">Montree · 蒙特里</div>
      <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 500;">${daysUntilCancel <= 1 ? 'Final reminder · 最终提醒' : `Reminder · 提醒`}</h1>
    </div>
    <div style="background: white; padding: 24px; border-radius: 0 0 16px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
      <p style="color: #1f2937; font-size: 15px; line-height: 1.65; margin: 0 0 16px;">${escapeHtml(enBody)}</p>
      <p style="color: #1f2937; font-size: 15px; line-height: 1.75; margin: 0 0 22px;">${escapeHtml(zhBody)}</p>
      ${hostedInvoiceUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${escapeHtmlAttr(hostedInvoiceUrl)}" style="display: inline-block; background: #1D6B48; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
            ${ctaText}
          </a>
        </div>
      ` : ''}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 22px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">Montree · montree.xyz · 蒙特里</p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    `Montree — ${daysUntilCancel <= 1 ? 'Final reminder' : 'Reminder'}`,
    `蒙特里 — ${daysUntilCancel <= 1 ? '最终提醒' : '提醒'}`,
    ``,
    enBody,
    ``,
    zhBody,
    ``,
    hostedInvoiceUrl ? `Pay invoice / 支付账单: ${hostedInvoiceUrl}` : '',
    ``,
    `Montree · montree.xyz`,
  ].filter(Boolean).join('\n');

  try {
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[dunning-reminder-email] send error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
