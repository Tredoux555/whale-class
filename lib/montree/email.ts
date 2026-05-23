// lib/montree/email.ts
// Email service using Resend
// Install: npm install resend
// Session 126: Fixed to read env vars at runtime

import { Resend } from 'resend';

// Initialize Resend lazily at runtime, not module load time
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

// Default sender (must be verified domain or Resend test domain)
const getFromEmail = () => process.env.RESEND_FROM_EMAIL || 'Montree <onboarding@resend.dev>';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================
// SEND REPORT READY NOTIFICATION
// ============================================

export async function sendReportReadyEmail(
  parentEmail: string,
  parentName: string,
  childName: string,
  weekNumber: number,
  year: number,
  reportUrl: string
): Promise<EmailResult> {
  try {
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: parentEmail,
      subject: `📊 ${childName}'s Weekly Report is Ready`,
      html: generateReportReadyHtml(parentName, childName, weekNumber, year, reportUrl),
      text: generateReportReadyText(parentName, childName, weekNumber, year, reportUrl)
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Email exception:', err);
    return { success: false, error: message };
  }
}

// ============================================
// SEND WELCOME EMAIL
// ============================================

export async function sendWelcomeEmail(
  parentEmail: string,
  parentName: string,
  childName: string,
  dashboardUrl: string
): Promise<EmailResult> {
  try {
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: parentEmail,
      subject: `🌳 Welcome to Montree - Track ${childName}'s Progress`,
      html: generateWelcomeHtml(parentName, childName, dashboardUrl),
      text: generateWelcomeText(parentName, childName, dashboardUrl)
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Email exception:', err);
    return { success: false, error: message };
  }
}

// ============================================
// BATCH SEND TO PARENTS
// ============================================

export async function notifyParentsOfReport(
  childId: string,
  childName: string,
  weekNumber: number,
  year: number,
  reportId: string,
  parentEmails: { email: string; name: string }[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/montree/parent/report/${reportId}`;

  for (const parent of parentEmails) {
    const result = await sendReportReadyEmail(
      parent.email,
      parent.name,
      childName,
      weekNumber,
      year,
      reportUrl
    );

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

// ============================================
// HTML TEMPLATES
// ============================================

function generateReportReadyHtml(
  parentName: string,
  childName: string,
  weekNumber: number,
  year: number,
  reportUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0fdf4;">
  <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
      <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
      <h1 style="color: white; margin: 0; font-size: 24px;">Weekly Report Ready!</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Hi ${parentName},
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        <strong>${childName}'s</strong> weekly progress report for <strong>Week ${weekNumber}, ${year}</strong> is now available!
      </p>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 25px;">
        See what activities ${childName} explored this week, areas of growth, and recommendations for activities at home.
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reportUrl}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
          View Report →
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
      
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        🌳 Montree - Montessori Progress Tracking
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateWelcomeHtml(
  parentName: string,
  childName: string,
  dashboardUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0fdf4;">
  <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
      <div style="font-size: 48px; margin-bottom: 10px;">🌳</div>
      <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Montree!</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Hi ${parentName},
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Your account has been created! You can now track <strong>${childName}'s</strong> Montessori learning journey.
      </p>
      
      <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #059669; margin: 0 0 12px; font-size: 14px;">What you'll see:</h3>
        <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Weekly progress reports</li>
          <li>Skills and works mastered</li>
          <li>Recommendations for home activities</li>
          <li>Growth areas and highlights</li>
        </ul>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
          Open Dashboard →
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
      
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        🌳 Montree - Montessori Progress Tracking
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================
// PLAIN TEXT TEMPLATES
// ============================================

function generateReportReadyText(
  parentName: string,
  childName: string,
  weekNumber: number,
  year: number,
  reportUrl: string
): string {
  return `
Hi ${parentName},

${childName}'s weekly progress report for Week ${weekNumber}, ${year} is now available!

See what activities ${childName} explored this week, areas of growth, and recommendations for activities at home.

View the report here:
${reportUrl}

---
🌳 Montree - Montessori Progress Tracking
  `.trim();
}

function generateWelcomeText(
  parentName: string,
  childName: string,
  dashboardUrl: string
): string {
  return `
Hi ${parentName},

Welcome to Montree! Your account has been created.

You can now track ${childName}'s Montessori learning journey including:
- Weekly progress reports
- Skills and works mastered
- Recommendations for home activities
- Growth areas and highlights

Open your dashboard here:
${dashboardUrl}

---
🌳 Montree - Montessori Progress Tracking
  `.trim();
}


// ============================================
// SEND PARENT INVITE EMAIL
// ============================================

export async function sendParentInviteEmail(
  recipientEmail: string,
  childName: string,
  schoolName: string,
  inviteCode: string,
  signupUrl: string
): Promise<EmailResult> {
  try {
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: recipientEmail,
      subject: `🌳 You're Invited - Track ${childName}'s Learning Journey`,
      html: generateInviteHtml(childName, schoolName, inviteCode, signupUrl),
      text: generateInviteText(childName, schoolName, inviteCode, signupUrl)
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Email exception:', err);
    return { success: false, error: message };
  }
}

// ============================================
// INVITE EMAIL TEMPLATES
// ============================================

function generateInviteHtml(
  childName: string,
  schoolName: string,
  inviteCode: string,
  signupUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0fdf4;">
  <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
      <div style="font-size: 48px; margin-bottom: 10px;">🌱</div>
      <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        <strong>${schoolName}</strong> has invited you to track <strong>${childName}'s</strong> Montessori learning journey with Montree.
      </p>
      
      <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #059669; margin: 0 0 12px; font-size: 14px;">With Montree you can:</h3>
        <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>View weekly progress reports</li>
          <li>See skills and works your child has mastered</li>
          <li>Get activity recommendations for home</li>
          <li>Track growth over time</li>
        </ul>
      </div>
      
      <!-- Invite Code Box -->
      <div style="text-align: center; margin: 25px 0;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px;">Your invite code:</p>
        <div style="background: #1f2937; color: #10b981; font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 16px 24px; border-radius: 10px; display: inline-block;">
          ${inviteCode}
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${signupUrl}?code=${inviteCode}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
          Create Account →
        </a>
      </div>
      
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0 0 10px;">
        Or go to <strong>${signupUrl}</strong> and enter the code above.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
      
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        🌳 Montree - Montessori Progress Tracking
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateInviteText(
  childName: string,
  schoolName: string,
  inviteCode: string,
  signupUrl: string
): string {
  return `
You're Invited!

${schoolName} has invited you to track ${childName}'s Montessori learning journey with Montree.

With Montree you can:
- View weekly progress reports
- See skills and works your child has mastered
- Get activity recommendations for home
- Track growth over time

YOUR INVITE CODE: ${inviteCode}

Create your account here:
${signupUrl}?code=${inviteCode}

---
🌳 Montree - Montessori Progress Tracking
  `.trim();
}

// ============================================
// SEND PRINCIPAL INVITE EMAIL
// ============================================
// Soft-pitch from a teacher to their principal.
// Warm, human tone. Goal: principal logs in, looks at the existing
// classroom for free, and converts when they want to add their own.

export async function sendPrincipalInviteEmail(
  principalEmail: string,
  principalName: string,
  teacherName: string,
  schoolName: string,
  loginCode: string,
  loginUrl: string,
  optionalNote?: string,
): Promise<EmailResult> {
  try {
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: principalEmail,
      subject: `${teacherName} wants to show you something`,
      html: generatePrincipalInviteHtml(
        principalName,
        teacherName,
        schoolName,
        loginCode,
        loginUrl,
        optionalNote,
      ),
      text: generatePrincipalInviteText(
        principalName,
        teacherName,
        schoolName,
        loginCode,
        loginUrl,
        optionalNote,
      ),
    });

    if (error) {
      console.error('[email] Principal invite send error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[email] Principal invite exception:', err);
    return { success: false, error: message };
  }
}

function generatePrincipalInviteHtml(
  principalName: string,
  teacherName: string,
  schoolName: string,
  loginCode: string,
  loginUrl: string,
  optionalNote?: string,
): string {
  const noteBlock = optionalNote && optionalNote.trim().length > 0
    ? `
        <div style="margin: 24px 0 28px; padding: 16px 20px; background: #f4f8f3; border-left: 3px solid #34d399; border-radius: 6px; font-style: italic; color: #2d4a3e; line-height: 1.6;">
          ${escapeHtml(optionalNote.trim())}
          <div style="margin-top: 10px; font-style: normal; font-size: 13px; color: #5a7a6c;">— ${escapeHtml(teacherName)}</div>
        </div>
      `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to Montree</title>
</head>
<body style="margin: 0; padding: 0; background: #f7faf7; font-family: 'Lora', Georgia, serif; color: #2d4a3e;">
  <table role="presentation" style="width: 100%; max-width: 560px; margin: 0 auto; padding: 40px 24px;" cellpadding="0" cellspacing="0">
    <tr>
      <td>
        <h1 style="font-family: 'Lora', Georgia, serif; font-size: 26px; font-weight: 500; color: #1d2e26; letter-spacing: -0.5px; margin: 0 0 8px;">
          Hello ${escapeHtml(principalName)},
        </h1>
        <p style="font-size: 16px; line-height: 1.65; color: #2d4a3e; margin: 0 0 18px;">
          ${escapeHtml(teacherName)} at ${escapeHtml(schoolName)} invited you to see what they've been working on in&nbsp;Montree.
        </p>

        ${noteBlock}

        <p style="font-size: 16px; line-height: 1.65; color: #2d4a3e; margin: 0 0 18px;">
          Montree is the AI-powered classroom management system designed specifically for Montessori schools. ${escapeHtml(teacherName)} has been using it to track every child, every observation, every parent letter — and would like you to see what that looks like.
        </p>

        <div style="background: #1a2e22; border-radius: 14px; padding: 28px 24px; text-align: center; margin: 28px 0;">
          <div style="font-size: 11px; font-weight: 600; color: rgba(232,201,106,0.85); letter-spacing: 1.6px; text-transform: uppercase; margin-bottom: 10px;">
            Your code
          </div>
          <div style="font-family: 'Lora', Georgia, serif; font-size: 36px; font-weight: 600; color: #ffffff; letter-spacing: 4px; margin-bottom: 18px;">
            ${escapeHtml(loginCode)}
          </div>
          <a href="${loginUrl}" style="display: inline-block; padding: 12px 28px; background: #34d399; color: #0a1a0f; text-decoration: none; border-radius: 999px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;">
            Open Montree
          </a>
        </div>

        <p style="font-size: 15px; line-height: 1.65; color: #2d4a3e; margin: 0 0 14px;">
          You'll see ${escapeHtml(teacherName)}'s classroom — every child, every observation, every parent letter — through their eyes. <strong>Free for as long as you want to look.</strong>
        </p>
        <p style="font-size: 15px; line-height: 1.65; color: #2d4a3e; margin: 0 0 14px;">
          When you're ready to bring more classrooms or your other teachers on, you can upgrade and we'll set up the school plan together.
        </p>

        <p style="font-size: 14px; line-height: 1.65; color: #5a7a6c; margin: 32px 0 0; padding-top: 22px; border-top: 1px solid #d8e3da;">
          Kind regards,<br>
          Tredoux at Montree<br>
          <a href="https://montree.xyz" style="color: #34d399; text-decoration: none;">montree.xyz</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generatePrincipalInviteText(
  principalName: string,
  teacherName: string,
  schoolName: string,
  loginCode: string,
  loginUrl: string,
  optionalNote?: string,
): string {
  const noteBlock = optionalNote && optionalNote.trim().length > 0
    ? `\n\n"${optionalNote.trim()}"\n— ${teacherName}\n`
    : '';

  return `
Hello ${principalName},

${teacherName} at ${schoolName} invited you to see what they've been working on in Montree.${noteBlock}

Montree is the AI-powered classroom management system designed specifically for Montessori schools. ${teacherName} has been using it to track every child, every observation, every parent letter — and would like you to see what that looks like.

YOUR CODE: ${loginCode}

Open Montree: ${loginUrl}

You'll see ${teacherName}'s classroom — every child, every observation, every parent letter — through their eyes. Free for as long as you want to look.

When you're ready to bring more classrooms or your other teachers on, you can upgrade and we'll set up the school plan together.

Kind regards,
Tredoux at Montree
montree.xyz
  `.trim();
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================
// TRIAL → PAID CONVERSION (Stripe webhook → principal)
// ============================================

export async function sendTrialConvertedEmail(
  principalEmail: string,
  principalName: string,
  schoolName: string,
): Promise<EmailResult> {
  try {
    const subject = `Welcome to Montree, ${escapeHtml(schoolName)}`;
    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1a0f;">
  <div style="max-width:540px;margin:24px auto;padding:28px;background:#fff;border-radius:14px;border:1px solid rgba(52,211,153,0.18);">
    <h1 style="margin:0 0 12px;font-size:24px;font-family:Lora,Georgia,serif;font-weight:700;">Welcome to Montree</h1>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">Hi ${escapeHtml(principalName)},</p>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">Your 7-day trial has finished and billing has started — thank you for trusting Montree with ${escapeHtml(schoolName)}.</p>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">A few quick notes:</p>
    <ul style="font-size:14px;line-height:1.7;color:#1f2d24;padding-left:20px;margin:0 0 16px;">
      <li>Billing is $7 per active student, per month. Quantity syncs automatically as you add or remove children.</li>
      <li>Cancel any time from your <a href="https://montree.xyz/montree/admin/billing" style="color:#10b981;">billing page</a> — Stripe customer portal.</li>
      <li>Every AI feature (Tracy, photo identification, Weekly Wrap, parent narratives) is now unlocked.</li>
      <li>Questions or anything off? Reply to this email — it goes directly to me.</li>
    </ul>
    <p style="font-size:14px;line-height:1.55;margin:24px 0 0;color:#5b6b73;">Kind regards,<br/>Tredoux<br/><a href="https://montree.xyz" style="color:#10b981;">montree.xyz</a></p>
  </div>
</body></html>`;
    const text = `Hi ${principalName},\n\nYour 7-day trial has finished and billing has started — thank you for trusting Montree with ${schoolName}.\n\nQuick notes:\n- Billing is $7 per active student, per month. Quantity auto-syncs.\n- Cancel any time from your billing page (Stripe customer portal).\n- Every AI feature is now unlocked.\n- Reply to this email if you have questions — it goes directly to me.\n\nKind regards,\nTredoux\nmontree.xyz`;
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: principalEmail,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[sendTrialConvertedEmail] resend error', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[sendTrialConvertedEmail] unexpected', err);
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

// ============================================
// TRIAL DRIP — 7-day trial (CR-1).
// Fires at day 4 (T-3), day 6 (T-1), day 7 (T-0 / billing starts).
// ============================================

export type TrialDripDay = 'day4' | 'day6' | 'day7';

const DRIP_COPY: Record<TrialDripDay, { subject: string; greeting: string; body: string; cta: string }> = {
  day4: {
    subject: "How's your Montree trial going?",
    greeting: "Hi {name},",
    body: "You're partway through your 7-day trial of {school} on Montree. Two quick things worth trying if you haven't yet:\n\n1. **Snap a few photos** from your classroom in the Photo Audit screen — Tracy auto-identifies the work in seconds.\n2. **Generate your first Weekly Wrap** — every parent gets a personal narrative their child's teacher would have written.\n\nIf anything's getting in the way, reply to this email. I read everything personally.",
    cta: 'Open Montree → https://montree.xyz/montree/dashboard',
  },
  day6: {
    subject: 'Your trial ends tomorrow',
    greeting: "Hi {name},",
    body: "Your 7-day trial wraps tomorrow, and billing begins after that — $7 per active student, per month.\n\nIf Montree's been useful for {school}, there's nothing you need to do — everything continues seamlessly.\n\nIf you'd like to cancel before billing starts, you can do that from your billing page. And if it's not been useful, no hard feelings — reply and tell me what's missing. I want to know.",
    cta: 'Open billing → https://montree.xyz/montree/admin/billing',
  },
  day7: {
    subject: 'Your trial has ended',
    greeting: "Hi {name},",
    body: "Your 7-day trial of {school} has finished and billing has started — thank you for trusting Montree.\n\nA few quick notes:\n\n- Billing is **$7 per active student, per month** — quantity auto-syncs.\n- Cancel any time from your billing page (Stripe customer portal).\n- Every AI feature stays unlocked.\n\nReply to this email if you have questions — it comes straight to me.",
    cta: 'Open billing → https://montree.xyz/montree/admin/billing',
  },
};

export async function sendTrialDripEmail(
  principalEmail: string,
  principalName: string,
  schoolName: string,
  day: TrialDripDay,
): Promise<EmailResult> {
  try {
    const tpl = DRIP_COPY[day];
    const greeting = tpl.greeting.replace('{name}', principalName);
    const body = tpl.body.replace(/{school}/g, schoolName).replace(/{name}/g, principalName);
    // Markdown-ish bold → <strong>
    const htmlBody = body
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .split('\n\n')
      .map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#1f2d24;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');
    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1a0f;">
  <div style="max-width:540px;margin:24px auto;padding:28px;background:#fff;border-radius:14px;border:1px solid rgba(52,211,153,0.18);">
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px;color:#1f2d24;">${escapeHtml(greeting)}</p>
    ${htmlBody}
    <p style="font-size:14px;line-height:1.55;margin:24px 0 8px;color:#5b6b73;">Kind regards,<br/>Tredoux<br/><a href="https://montree.xyz" style="color:#10b981;">montree.xyz</a></p>
  </div>
</body></html>`;
    const text = `${greeting}\n\n${body.replace(/\*\*/g, '')}\n\n${tpl.cta}\n\nKind regards,\nTredoux\nmontree.xyz`;
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: principalEmail,
      subject: tpl.subject,
      html,
      text,
    });
    if (error) {
      console.error(`[sendTrialDripEmail ${day}] resend error`, error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error(`[sendTrialDripEmail ${day}] unexpected`, err);
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

// ============================================
// DEMO-REQUEST DRIP (day 3, 7, 14 after landing-page demo request)
// → fires only if super-admin hasn't marked the lead 'contacted' yet
// ============================================

export type DemoDripDay = 'day3' | 'day7' | 'day14';

const DEMO_DRIP_COPY: Record<DemoDripDay, { subject: string; greeting: string; body: string }> = {
  day3: {
    subject: 'Following up on your Montree demo request',
    greeting: 'Hi {name},',
    body: "Just a quick follow-up on your demo request from a few days ago. I've been working through the queue and want to make sure I get to you properly.\n\nIf you'd like to skip the wait, the fastest path is to **get started at montree.xyz** — full Montree, one classroom, your first 7 days are free while you set up. Card on file at signup, no charge for the first 7 days. You can poke around at your own pace and we can chat afterwards.\n\nOtherwise reply with a few times that work for you this week and I'll send a calendar invite.",
  },
  day7: {
    subject: "Haven't forgotten you — Montree",
    greeting: 'Hi {name},',
    body: "A week ago you asked for a Montree demo. I haven't forgotten you — life got in the way.\n\nIf the interest is still live, two ways forward:\n\n1. **Get started at montree.xyz** — one classroom, your first 7 days free, card on file at signup.\n2. **Reply with a 20-minute slot** and I'll come on a call.\n\nEither way, no pressure.",
  },
  day14: {
    subject: 'Last note from Montree',
    greeting: 'Hi {name},',
    body: "Two weeks since your demo request. I'll stop chasing after this email — promise.\n\nIf Montree isn't the right fit for {school}, no hard feelings. If you'd like to take another look, the door's always open: just reply or get started at montree.xyz.\n\nThank you for the look.",
  },
};

export async function sendDemoRequestDripEmail(
  recipientEmail: string,
  recipientName: string,
  schoolName: string,
  day: DemoDripDay,
): Promise<EmailResult> {
  try {
    const tpl = DEMO_DRIP_COPY[day];
    const greeting = tpl.greeting.replace('{name}', recipientName);
    const body = tpl.body.replace(/{school}/g, schoolName).replace(/{name}/g, recipientName);
    const htmlBody = body
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .split('\n\n')
      .map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#1f2d24;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');
    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1a0f;">
  <div style="max-width:540px;margin:24px auto;padding:28px;background:#fff;border-radius:14px;border:1px solid rgba(52,211,153,0.18);">
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px;color:#1f2d24;">${escapeHtml(greeting)}</p>
    ${htmlBody}
    <p style="font-size:14px;line-height:1.55;margin:24px 0 8px;color:#5b6b73;">Kind regards,<br/>Tredoux<br/><a href="https://montree.xyz" style="color:#10b981;">montree.xyz</a></p>
  </div>
</body></html>`;
    const text = `${greeting}\n\n${body.replace(/\*\*/g, '')}\n\nKind regards,\nTredoux\nmontree.xyz`;
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: recipientEmail,
      subject: tpl.subject,
      html,
      text,
    });
    if (error) {
      console.error(`[sendDemoRequestDripEmail ${day}] resend error`, error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error(`[sendDemoRequestDripEmail ${day}] unexpected`, err);
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

// ============================================
// DEMO REQUEST — BULK REPLY WITH TRIAL LINK
// ============================================
//
// Super-admin "Reply to all stale leads" action. Sends the same warm,
// personalised body that the per-row "Reply with trial link" mailto opens —
// just via Resend instead of the user's mail client. Keeps the copy
// identical so a lead reading both never feels they got a template.
//
// Used by /api/montree/super-admin/demo-requests/bulk-reply.

export async function sendDemoTrialLinkReply(
  recipientEmail: string,
  contactPerson: string | null,
  orgName: string,
): Promise<EmailResult> {
  try {
    const firstName = (contactPerson || '').split(/\s+/)[0] || 'there';
    const trialUrl = 'https://montree.xyz/montree/try';
    const subject = `Re: Montree — for ${orgName}`;
    const text =
      `Hi ${firstName},\n\n` +
      `Thanks for reaching out about Montree.\n\n` +
      `The fastest way to see it in action is to get started today — full Montree, one classroom, your first 7 days are free while you set up. ` +
      `Card on file at signup, no charge for the first 7 days. You can try every AI feature at your own pace and we can chat afterwards.\n\n` +
      `Get started here: ${trialUrl}\n\n` +
      `Or if you'd prefer a 20-minute walkthrough on a call first, reply with a few times that work for you this week and I'll send a calendar invite.\n\n` +
      `Kind regards,\nTredoux\nmontree.xyz`;
    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1a0f;">
  <div style="max-width:540px;margin:24px auto;padding:28px;background:#fff;border-radius:14px;border:1px solid rgba(52,211,153,0.18);">
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#1f2d24;">Hi ${escapeHtml(firstName)},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#1f2d24;">Thanks for reaching out about Montree.</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#1f2d24;">The fastest way to see it in action is to get started today — full Montree, one classroom, your first 7 days are free while you set up. Card on file at signup, no charge for the first 7 days. You can try every AI feature at your own pace and we can chat afterwards.</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#1f2d24;text-align:center;">
      <a href="${trialUrl}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#fff;font-weight:600;text-decoration:none;border-radius:10px;">Get started →</a>
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#1f2d24;">Or if you'd prefer a 20-minute walkthrough on a call first, reply with a few times that work for you this week and I'll send a calendar invite.</p>
    <p style="font-size:14px;line-height:1.55;margin:24px 0 8px;color:#5b6b73;">Kind regards,<br/>Tredoux<br/><a href="https://montree.xyz" style="color:#10b981;">montree.xyz</a></p>
  </div>
</body></html>`;
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: recipientEmail,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[sendDemoTrialLinkReply] resend error', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[sendDemoTrialLinkReply] unexpected', err);
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

// ============================================
// PAYOUT PAID NOTIFICATION (Phase 5 wire-out → agent)
// ============================================

export async function sendPayoutPaidEmail(
  agentEmail: string,
  agentName: string,
  amountUsd: number,
  schoolName: string,
  periodMonth: string,
  stripeTransferId: string | null,
): Promise<EmailResult> {
  try {
    const fmtAmount = `$${amountUsd.toFixed(2)} USD`;
    const subject = `Your Montree payout · ${fmtAmount} · ${periodMonth}`;
    const transferLine = stripeTransferId
      ? `<p style="font-size:13px;color:#5b6b73;">Stripe transfer reference: <code style="background:#f3f6f4;padding:2px 6px;border-radius:4px;">${escapeHtml(stripeTransferId)}</code></p>`
      : '';
    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1a0f;">
  <div style="max-width:540px;margin:24px auto;padding:24px;background:#fff;border-radius:14px;border:1px solid rgba(52,211,153,0.18);">
    <h1 style="margin:0 0 12px;font-size:22px;font-family:Lora,Georgia,serif;font-weight:700;color:#0a1a0f;">Your payout is on its way</h1>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;color:#1f2d24;">Hi ${escapeHtml(agentName)},</p>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;color:#1f2d24;">Montree just wired you <strong>${fmtAmount}</strong> for ${escapeHtml(schoolName)} (${escapeHtml(periodMonth)}). It should land in your bank within 1–3 working days depending on Stripe's payout schedule for your country.</p>
    ${transferLine}
    <p style="font-size:15px;line-height:1.55;margin:24px 0 0;color:#1f2d24;">You can see the full math at any time in your <a href="https://montree.xyz/montree/agent/earnings" style="color:#10b981;font-weight:600;text-decoration:none;">Earnings page</a> — every line is transparent (gross, Stripe fee, AI cost, net, your share).</p>
    <p style="font-size:14px;line-height:1.55;margin:24px 0 0;color:#5b6b73;">Kind regards,<br/>Tredoux<br/><a href="https://montree.xyz" style="color:#10b981;">montree.xyz</a></p>
  </div>
</body></html>`;
    const text = `Hi ${agentName},\n\nMontree just wired you ${fmtAmount} for ${schoolName} (${periodMonth}). It should land in your bank within 1–3 working days.\n\n${stripeTransferId ? `Stripe transfer reference: ${stripeTransferId}\n\n` : ''}You can see the full math at any time in your Earnings page: https://montree.xyz/montree/agent/earnings\n\nKind regards,\nTredoux\nmontree.xyz`;
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: agentEmail,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[sendPayoutPaidEmail] resend error', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[sendPayoutPaidEmail] unexpected', err);
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

// ============================================
// MONTHLY P&L SUMMARY (cron → Tredoux)
// ============================================

export interface MonthlyDigestSummary {
  period_month: string;
  revenue_usd: number;
  direct_cost_usd: number;
  commission_usd: number;
  op_expense_usd: number;
  margin_usd: number;
  payouts_pending_usd: number;
  payouts_paid_usd: number;
  rows_calculated: number;
  rows_inserted: number;
  rows_updated: number;
  errors: number;
}

export async function sendMonthlyDigestEmail(
  recipientEmail: string,
  summary: MonthlyDigestSummary,
): Promise<EmailResult> {
  try {
    const fmt = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
    const subject = `Montree · ${summary.period_month} P&L · margin ${fmt(summary.margin_usd)}`;
    const marginColor = summary.margin_usd >= 0 ? '#10b981' : '#dc2626';
    const errorsLine = summary.errors > 0
      ? `<p style="color:#d97706;font-size:13px;margin:8px 0;">⚠ Calculator reported ${summary.errors} error${summary.errors === 1 ? '' : 's'} — check Railway logs.</p>`
      : '';

    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1a0f;">
  <div style="max-width:600px;margin:24px auto;padding:28px;background:#fff;border-radius:14px;border:1px solid rgba(52,211,153,0.18);">
    <h1 style="margin:0 0 4px;font-size:22px;font-family:Lora,Georgia,serif;font-weight:700;">Monthly P&amp;L · ${escapeHtml(summary.period_month)}</h1>
    <p style="font-size:13px;color:#5b6b73;margin:0 0 20px;">Auto-generated by the payout calculator cron.</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f2f0;">Revenue</td><td style="padding:8px 0;border-bottom:1px solid #f0f2f0;text-align:right;color:#10b981;font-weight:600;">${fmt(summary.revenue_usd)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f2f0;">− Direct costs (Stripe + AI)</td><td style="padding:8px 0;border-bottom:1px solid #f0f2f0;text-align:right;">−${fmt(summary.direct_cost_usd)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f2f0;">− Commissions paid</td><td style="padding:8px 0;border-bottom:1px solid #f0f2f0;text-align:right;">−${fmt(summary.commission_usd)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f2f0;">− Op-expenses</td><td style="padding:8px 0;border-bottom:1px solid #f0f2f0;text-align:right;">−${fmt(summary.op_expense_usd)}</td></tr>
      <tr><td style="padding:12px 0;font-weight:700;">= Margin</td><td style="padding:12px 0;text-align:right;font-weight:700;font-size:18px;color:${marginColor};">${fmt(summary.margin_usd)}</td></tr>
    </table>

    <div style="margin-top:24px;padding:16px;background:#f7f9f8;border-radius:10px;font-size:13px;color:#1f2d24;">
      <p style="margin:0 0 4px;font-weight:600;">Payouts this period</p>
      <p style="margin:0;">⏳ Pending: ${fmt(summary.payouts_pending_usd)}</p>
      <p style="margin:0;">✓ Paid: ${fmt(summary.payouts_paid_usd)}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#5b6b73;">Calculator: ${summary.rows_calculated} rows · ${summary.rows_inserted} inserted · ${summary.rows_updated} updated</p>
    </div>

    ${errorsLine}

    <p style="margin:24px 0 0;font-size:14px;"><a href="https://montree.xyz/montree/super-admin" style="color:#10b981;font-weight:600;text-decoration:none;">→ Open Money tab</a></p>
  </div>
</body></html>`;

    const text = `Montree P&L — ${summary.period_month}

Revenue:                   ${fmt(summary.revenue_usd)}
− Direct costs:            ${fmt(summary.direct_cost_usd)}
− Commissions paid:        ${fmt(summary.commission_usd)}
− Op-expenses:             ${fmt(summary.op_expense_usd)}
= Margin:                  ${fmt(summary.margin_usd)}

Payouts pending: ${fmt(summary.payouts_pending_usd)}
Payouts paid:    ${fmt(summary.payouts_paid_usd)}

Calculator: ${summary.rows_calculated} rows · ${summary.rows_inserted} inserted · ${summary.rows_updated} updated${summary.errors > 0 ? ` · ⚠ ${summary.errors} errors` : ''}

Open Money tab: https://montree.xyz/montree/super-admin`;

    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: recipientEmail,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[sendMonthlyDigestEmail] resend error', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[sendMonthlyDigestEmail] unexpected', err);
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

// ============================================
// SEND ANNOUNCEMENT / NEWSLETTER (Phase 3)
// ============================================
//
// Fires alongside a Session 97 broadcast when the school has the
// `principal_newsletter` feature flag ON. Parents always see broadcasts
// in-app via /montree/parent/messages — this is the EXTRA email channel.
//
// Designed to be called per-recipient, fire-and-forget, from inside the
// broadcast route. Failures are logged but never block the broadcast
// itself.
export async function sendAnnouncementEmail(
  recipientEmail: string,
  args: {
    schoolName: string;
    senderName: string;
    subject: string;
    bodyPlain: string;
    threadUrl?: string; // deep link into /montree/parent/messages/<id>
  }
): Promise<EmailResult> {
  try {
    const emailSubject = `${args.schoolName} · ${args.subject}`;
    const cta = args.threadUrl
      ? `<p style="margin:28px 0 0;"><a href="${args.threadUrl}" style="display:inline-block;padding:12px 22px;background:#10b981;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;font-size:14px;">Open in Montree</a></p>`
      : '';

    // Preserve paragraph breaks in the plaintext body when rendering
    // as HTML. Escape every line, then wrap in <p> blocks.
    const htmlBody = args.bodyPlain
      .split(/\n\s*\n/)
      .map((para) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#0a1a0f;">${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1a0f;">
  <div style="max-width:600px;margin:24px auto;padding:32px 28px;background:#fff;border-radius:14px;border:1px solid rgba(52,211,153,0.18);">
    <div style="font-size:11px;color:#5b6b73;letter-spacing:0.8px;text-transform:uppercase;font-weight:600;margin-bottom:6px;">From ${escapeHtml(args.schoolName)}</div>
    <h1 style="margin:0 0 18px;font-size:22px;font-family:Lora,Georgia,serif;font-weight:600;color:#0a1a0f;">${escapeHtml(args.subject)}</h1>
    ${htmlBody}
    <div style="margin-top:24px;font-size:13px;color:#5b6b73;">— ${escapeHtml(args.senderName)}</div>
    ${cta}
  </div>
  <div style="text-align:center;padding:8px 16px 24px;color:#9ba9a3;font-size:11px;">Montree · montree.xyz</div>
</body></html>`;

    const text = `${args.subject}

${args.bodyPlain}

— ${args.senderName}
${args.threadUrl ? `\nOpen in Montree: ${args.threadUrl}` : ''}`;

    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: recipientEmail,
      subject: emailSubject,
      html,
      text,
    });
    if (error) {
      console.error('[sendAnnouncementEmail] resend error', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[sendAnnouncementEmail] unexpected', err);
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}
