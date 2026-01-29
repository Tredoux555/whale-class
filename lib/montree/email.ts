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
  } catch (err: any) {
    console.error('Email exception:', err);
    return { success: false, error: err.message };
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
  } catch (err: any) {
    console.error('Email exception:', err);
    return { success: false, error: err.message };
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
  } catch (err: any) {
    console.error('Email exception:', err);
    return { success: false, error: err.message };
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
