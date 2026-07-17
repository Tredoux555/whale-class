// /api/montree/super-admin/agent-applications/[id]/accept/route.ts
//
// One-shot accept endpoint — Tredoux clicks 'Accept' on a pending agent
// application and this route does everything at once:
//   1. Find or create the montree_teachers row for the applicant
//   2. Issue a 6-char agent login code (the code they use to log into
//      the agent dashboard — NOT the referral code agents share with
//      schools; those they generate themselves later)
//   3. Mark the application as 'sent'
//   4. Return the plaintext code + a ready-to-paste welcome message
//
// User feedback (Session 117 continued, May 18):
//   "my option here to accept is 'generate code' - why? The agent
//    should generate their own code - I need their login code
//    directly. Please change this to accept and when they get
//    accepted then I want an easy copy paste message including their
//    login code and instructions to log in"
//
// Architectural rules locked in:
// - The plaintext code is returned ONCE in the response. Never logged,
//   never persisted as plaintext.
// - is_agent=true is the marker. Without it, tryAgentLogin() refuses
//   to authenticate even if the hash matches.
// - Idempotent on re-click: if the application is already 'sent' and
//   has a linked agent, we read back the agent (without regenerating
//   the code — that would orphan the previously-issued one).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { legacySha256 } from '@/lib/montree/password';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';
import { generateSecureCode } from '@/lib/montree/secure-code';

export const dynamic = 'force-dynamic';

// 6-char code, alphabet excludes I/O/0/1 (matches the canonical agent +
// principal code alphabet from Session 84 architectural rules).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateAgentLoginCode(): string {
  // Crypto-safe; preserves the canonical no-I/O/0/1 alphabet.
  return generateSecureCode(6, CODE_ALPHABET);
}

function buildWelcomeMessage(opts: {
  firstName: string;
  loginCode: string;
  loginUrl: string;
}): string {
  const { firstName, loginCode, loginUrl } = opts;
  return [
    `Hi ${firstName},`,
    ``,
    `Welcome to Montree. You're now part of our agent network.`,
    ``,
    `Visit this link to log in: ${loginUrl}`,
    `Save this code so you can log in again: ${loginCode}`,
    ``,
    `Once you're in, you can generate referral codes for any school you pitch — every school that signs up under your code pays you a share of their subscription.`,
    ``,
    `— Tredoux`,
    `montree.xyz`,
  ].join('\n');
}

interface ApplicationRow {
  id: string;
  status: string;
  contact_person: string | null;
  email: string;
  org_name: string | null;
  application_details: Record<string, unknown> | null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: applicationId } = await ctx.params;
  if (!applicationId) {
    return NextResponse.json({ error: 'application id required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://montree.xyz';

  // ── 1. Load the application ─────────────────────────────────────
  const { data: appRow, error: appErr } = await supabase
    .from('montree_outreach_contacts')
    .select('id, status, contact_person, email, org_name, application_details, contact_type')
    .eq('id', applicationId)
    .maybeSingle();
  if (appErr) {
    console.error('[applications accept] load failed:', appErr.message);
    return NextResponse.json(
      { error: 'Could not load application', detail: appErr.message },
      { status: 500 }
    );
  }
  if (!appRow) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }
  const application = appRow as ApplicationRow & { contact_type?: string };
  if (application.contact_type !== 'agent_application') {
    return NextResponse.json(
      { error: 'Not an agent application' },
      { status: 400 }
    );
  }
  // Re-click safety. Accept is a one-time action. If the app is already
  // 'sent' / 'declined' / 'dead', refuse — re-running this route would
  // ROTATE the agent's login code, invalidating any code already
  // shared with them. To re-issue intentionally, use the Referrals tab
  // 🔑 reset button on the agent's row.
  if (application.status !== 'agent_applied') {
    const linkedId =
      (application.application_details as { linked_agent_id?: string } | null)
        ?.linked_agent_id || null;
    return NextResponse.json(
      {
        error: `This application is already ${application.status}.`,
        hint: linkedId
          ? 'The agent record exists. To reset their login code, open the Referrals tab and click 🔑 on their row.'
          : 'No action needed.',
        application_status: application.status,
        linked_agent_id: linkedId,
      },
      { status: 409 }
    );
  }
  const email = (application.email || '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: 'Application has no email; cannot create agent record' },
      { status: 400 }
    );
  }
  const displayName = (application.contact_person || application.org_name || email).trim();
  const firstName = displayName.split(/\s+/)[0] || 'there';

  // ── 2. Find or create the agent row ─────────────────────────────
  let agentId: string;
  // Session 119: track whether the existing row already has a default %.
  // For brand-new shell agents it's NULL by definition. For existing rows
  // we read the current value so we don't overwrite an operator-set %.
  let currentDefaultPct: number | null = null;
  {
    const { data: existing } = await supabase
      .from('montree_teachers')
      .select('id, agent_default_share_pct')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);
    if (existing && existing.length > 0 && existing[0].id) {
      agentId = existing[0].id as string;
      const raw = (existing[0] as { agent_default_share_pct?: string | number | null }).agent_default_share_pct;
      currentDefaultPct = raw === null || raw === undefined ? null : Number(raw);
    } else {
      // Shell agent: montree_teachers.school_id is NOT NULL in the
      // canonical schema, so we use the oldest school as a placeholder.
      // is_active=false because they're not a real teacher in any
      // classroom — pure identity holder for the agent role.
      const { data: anySchool, error: schoolErr } = await supabase
        .from('montree_schools')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1);
      if (schoolErr || !anySchool || anySchool.length === 0) {
        return NextResponse.json(
          {
            error: 'No schools in the system; cannot create agent record',
            detail: schoolErr?.message || 'no rows returned',
          },
          { status: 500 }
        );
      }
      const placeholderSchoolId = anySchool[0].id as string;
      const { data: shell, error: shellErr } = await supabase
        .from('montree_teachers')
        .insert({
          name: displayName,
          email,
          school_id: placeholderSchoolId,
          is_active: false,
          password_hash: 'SHELL_AGENT_NO_LOGIN',
        })
        .select('id')
        .single();
      if (shellErr || !shell) {
        console.error('[applications accept] shell create failed:', shellErr?.message);
        return NextResponse.json(
          {
            error: 'Could not create agent record',
            detail: shellErr?.message || 'unknown error',
          },
          { status: 500 }
        );
      }
      agentId = shell.id as string;
    }
  }

  // ── 3. Generate + persist agent login code ──────────────────────
  let plaintext = '';
  let codeHash = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    plaintext = generateAgentLoginCode();
    codeHash = legacySha256(plaintext);
    const { data: collide } = await supabase
      .from('montree_teachers')
      .select('id')
      .eq('agent_password_hash', codeHash)
      .neq('id', agentId)
      .maybeSingle();
    if (!collide) break;
    if (attempt === 5) {
      return NextResponse.json(
        { error: 'Could not generate unique code' },
        { status: 500 }
      );
    }
  }

  const acceptUpdatePayload: Record<string, unknown> = {
    is_agent: true,
    agent_password_hash: codeHash,
    agent_login_set_at: new Date().toISOString(),
    agent_suspended_at: null,
  };
  // Session 119: seed agent_default_share_pct to 20 if currently NULL.
  // Operator can change later via PATCH /agents/[id]/login. Never downgrades
  // an already-set %.
  if (currentDefaultPct === null || Number.isNaN(currentDefaultPct)) {
    acceptUpdatePayload.agent_default_share_pct = 20;
  }

  const { error: updateErr } = await supabase
    .from('montree_teachers')
    .update(acceptUpdatePayload)
    .eq('id', agentId);
  if (updateErr) {
    console.error('[applications accept] agent update failed:', updateErr.message);
    return NextResponse.json(
      { error: 'Could not save agent login', detail: updateErr.message },
      { status: 500 }
    );
  }

  // Audit. Fire-and-forget — never block on logging.
  void logAgentAudit(supabase, {
    agent_id: agentId,
    agent_display_name: displayName,
    agent_email: email,
    event_type: 'agent_login_issued',
    actor_role: 'super_admin',
    details: {
      source: 'agent_application_accept',
      application_id: application.id,
    },
  });

  // ── 4. Mark application as 'sent' + link the agent ─────────────
  // Awaited (not fire-and-forget) so a silent failure surfaces here
  // instead of leaving the application in 'agent_applied' — which would
  // make it re-appear in the pending banner, tempting Tredoux to click
  // Accept again and ROTATE the just-issued login code. The re-click
  // safety check above is the second line of defense; this is the first.
  const nextDetails: Record<string, unknown> = {
    ...(application.application_details || {}),
    accepted_at: new Date().toISOString(),
    linked_agent_id: agentId,
  };
  const { error: markSentErr } = await supabase
    .from('montree_outreach_contacts')
    .update({
      status: 'sent',
      application_details: nextDetails,
    })
    .eq('id', application.id);
  if (markSentErr) {
    // The agent record + login code are now persisted but the
    // application is still 'agent_applied'. Surface the failure so
    // Tredoux knows to reset the code manually rather than re-clicking
    // Accept (which would rotate the code).
    console.error('[applications accept] mark-sent failed', markSentErr);
    return NextResponse.json(
      {
        error:
          'Agent login code was issued, but the application status could not be updated. ' +
          'IMPORTANT: do NOT click Accept again — that would rotate the code. ' +
          'Save this code now, then mark the application as Sent manually via the Pending Applications panel.',
        detail: markSentErr.message,
        login_code: plaintext,
        agent_id: agentId,
      },
      { status: 500 }
    );
  }

  // ── 5. Build the welcome message + return the plaintext code ───
  const loginUrl = `${baseUrl}/montree/login-select?code=${encodeURIComponent(plaintext)}`;
  const welcomeMessage = buildWelcomeMessage({
    firstName,
    loginCode: plaintext,
    loginUrl,
  });

  return NextResponse.json({
    success: true,
    agent: {
      id: agentId,
      name: displayName,
      email,
    },
    login_code: plaintext,
    login_url: loginUrl,
    welcome_message: welcomeMessage,
  });
}
