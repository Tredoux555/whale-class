import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { createAgentReferralCode } from '@/lib/montree/referral/create-agent-code';
import { issueAgentLogin } from '@/lib/montree/referral/issue-agent-login';
import { applyAiTier } from '@/lib/montree/billing/apply-ai-tier';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

// Super-admin control surface for the Founding 100.
// GET  → config (cap/wave/is_closed) + admitted/remaining counts + all rows
//        (each row includes signup_code + redeemed fields).
// PATCH → set_status (admit/decline/reset a row) OR update_config
//        (cap/wave/is_closed) OR generate_code (mint a FND- signup code for an
//        admitted row → the /montree/try?founding= link).

// FND- signup-code charset (migration 286). Excludes I/O/0/1 to avoid confusion
// when a code is read aloud or typed, matching the login-code convention.
const FND_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateFoundingCode(): string {
  let code = 'FND-';
  for (let i = 0; i < 6; i++) {
    code += FND_CHARS[Math.floor(Math.random() * FND_CHARS.length)];
  }
  return code;
}

export async function GET(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();

    const { data: config } = await supabase
      .from('montree_founding_config')
      .select('cap, wave, is_closed')
      .eq('id', 1)
      .maybeSingle();

    // grant_type only exists after migration 290. Select WITH it; if the column
    // is missing (42703) fall back to the pre-290 select so GET never 500s on a
    // lagging migration. Missing grant_type is treated as 'founding_3_life'.
    const BASE_ROW_FIELDS = 'id, school_name, contact_name, email, country, student_count, status, admitted_at, created_at, source, signup_code, code_generated_at, redeemed_by_school_id, redeemed_at';
    let rows: Record<string, unknown>[] | null = null;
    const withGrant = await supabase
      .from('montree_founding_waitlist')
      .select(`${BASE_ROW_FIELDS}, grant_type`)
      .order('created_at', { ascending: false })
      .limit(2000);
    if (withGrant.error) {
      // Only fall back for the missing-column case (42703 / grant_type). Any
      // OTHER error propagates to the outer catch as before (500), rather than
      // being silently swallowed into a partial fallback read.
      const isMissingColumn =
        withGrant.error.code === '42703' || (withGrant.error.message || '').includes('grant_type');
      if (!isMissingColumn) throw withGrant.error;
      const fallback = await supabase
        .from('montree_founding_waitlist')
        .select(BASE_ROW_FIELDS)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (fallback.error) throw fallback.error;
      rows = (fallback.data as Record<string, unknown>[] | null) || null;
    } else {
      rows = (withGrant.data as Record<string, unknown>[] | null) || null;
    }

    const cap = config?.cap ?? 100;
    const admitted = (rows || []).filter((r) => r.status === 'admitted').length;

    return NextResponse.json(
      {
        config: { cap, wave: config?.wave ?? 1, is_closed: config?.is_closed ?? false },
        admitted,
        remaining: Math.max(0, cap - admitted),
        total: (rows || []).length,
        rows: rows || [],
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[super-admin/founding GET] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'set_status') {
      const { id, status } = body;
      if (!id || !['waitlisted', 'admitted', 'declined'].includes(status)) {
        return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 });
      }
      const { error } = await supabase
        .from('montree_founding_waitlist')
        .update({
          status,
          admitted_at: status === 'admitted' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'update_config') {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (Number.isFinite(Number(body.cap))) patch.cap = Math.max(0, Math.round(Number(body.cap)));
      if (Number.isFinite(Number(body.wave))) patch.wave = Math.max(1, Math.round(Number(body.wave)));
      if (typeof body.is_closed === 'boolean') patch.is_closed = body.is_closed;
      const { error } = await supabase
        .from('montree_founding_config')
        .update(patch as never)
        .eq('id', 1);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Mint (or return the existing) FND- signup code for an admitted row.
    // 🚨 Idempotent: re-clicking returns the code already on the row — NEVER
    // rotates it (a rotated code would break a link already shared). Only
    // admitted rows are eligible; a waitlisted/declined row is rejected.
    if (action === 'generate_code') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
      }

      const { data: row, error: rowErr } = await supabase
        .from('montree_founding_waitlist')
        .select('id, status, signup_code, redeemed_at, redeemed_by_school_id')
        .eq('id', id)
        .maybeSingle();
      if (rowErr) throw rowErr;
      if (!row) {
        return NextResponse.json({ error: 'Row not found' }, { status: 404 });
      }
      if (row.status !== 'admitted') {
        return NextResponse.json({ error: 'Only admitted schools can be issued a signup code.' }, { status: 400 });
      }

      // Idempotent — already has a code, return it as-is.
      if (row.signup_code) {
        return NextResponse.json({
          success: true,
          signup_code: row.signup_code,
          redeemed_at: row.redeemed_at ?? null,
          redeemed_by_school_id: row.redeemed_by_school_id ?? null,
        });
      }

      // Generate a unique code. Retry on the rare UNIQUE collision (23505).
      // 🚨 REVIEW FIX (Jul 6): chain .select() so we can tell whether a row was
      // ACTUALLY stamped. Supabase returns { error: null, data: [] } — no error —
      // when the .is('signup_code', null) filter matches 0 rows (a concurrent
      // generate already minted the code). Without inspecting the returned rows
      // we'd hand the caller `candidate`, a code that was never persisted. So we
      // only accept the candidate when the update returned the row.
      let signupCode = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateFoundingCode();
        const { data: updated, error: updErr } = await supabase
          .from('montree_founding_waitlist')
          .update({
            signup_code: candidate,
            code_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', id)
          // Only stamp if it's still code-less — a concurrent generate for the
          // same row won't clobber an already-minted code.
          .is('signup_code', null)
          .select('signup_code');
        if (!updErr) {
          if (updated && updated.length > 0) {
            // We actually stamped the row.
            signupCode = candidate;
          }
          // else: 0 rows matched → the row already has a code (concurrent
          // generate won). Fall through to the re-read below.
          break;
        }
        if (updErr.code !== '23505') throw updErr; // real error, not a collision
        // else: code collided with another row — loop and try a fresh candidate
      }

      if (!signupCode) {
        // Either 5 collisions in a row (astronomically unlikely) OR a concurrent
        // generate won the row first. Re-read to surface whatever code landed.
        const { data: reread } = await supabase
          .from('montree_founding_waitlist')
          .select('signup_code')
          .eq('id', id)
          .maybeSingle();
        if (reread?.signup_code) {
          return NextResponse.json({ success: true, signup_code: reread.signup_code });
        }
        return NextResponse.json({ error: 'Could not generate a code. Try again.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, signup_code: signupCode });
    }

    // One-shot mint (Jul 6 launch): create an ALREADY-ADMITTED row + FND- code
    // in a single action. This matches the real workflow — founding schools
    // apply BY EMAIL, so there is usually no waitlist row to admit first.
    // Tredoux types school name + email → gets a shareable signup link.
    // Duplicate email: if the existing row is admitted + coded, return its code
    // (idempotent); otherwise 409 so we never silently clobber a real applicant.
    if (action === 'create_admitted') {
      const schoolName = String(body.school_name || '').trim().slice(0, 200);
      const email = String(body.email || '').trim().toLowerCase().slice(0, 320);
      const contactName = String(body.contact_name || '').trim().slice(0, 200) || null;
      const country = String(body.country || '').trim().slice(0, 100) || null;
      if (!schoolName || !email || !email.includes('@')) {
        return NextResponse.json({ error: 'School name and a valid email are required.' }, { status: 400 });
      }

      const now = new Date().toISOString();
      // Retry the INSERT on the (astronomically rare) signup_code UNIQUE
      // collision. An email collision (same UNIQUE code 23505) is detected by
      // re-reading the row for that email instead.
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateFoundingCode();
        const { data: inserted, error: insErr } = await supabase
          .from('montree_founding_waitlist')
          .insert({
            school_name: schoolName,
            contact_name: contactName,
            email,
            country,
            status: 'admitted',
            admitted_at: now,
            signup_code: candidate,
            code_generated_at: now,
            source: 'super_admin_manual',
          } as never)
          .select('id, signup_code')
          .maybeSingle();

        if (!insErr && inserted) {
          return NextResponse.json({ success: true, id: inserted.id, signup_code: inserted.signup_code });
        }
        if (insErr?.code === '23505') {
          // Which UNIQUE tripped? If a row already exists for this email,
          // surface it (with its code if admitted+coded). Otherwise it was a
          // signup_code collision — loop and mint a fresh candidate.
          const { data: existing } = await supabase
            .from('montree_founding_waitlist')
            .select('id, status, signup_code, redeemed_at')
            .eq('email', email)
            .maybeSingle();
          if (existing) {
            if (existing.status === 'admitted' && existing.signup_code) {
              return NextResponse.json({
                success: true,
                id: existing.id,
                signup_code: existing.signup_code,
                already_existed: true,
                redeemed_at: existing.redeemed_at ?? null,
              });
            }
            return NextResponse.json(
              { error: `That email already has a ${existing.status} application. Admit it from the list below instead.` },
              { status: 409 }
            );
          }
          continue; // signup_code collision — retry with a new code
        }
        if (insErr) throw insErr;
      }
      return NextResponse.json({ error: 'Could not mint a code. Try again.' }, { status: 500 });
    }

    // ── Partner Program one-shot mint (migration 290) ──
    // ONE form submission → three artifacts in one shot:
    //   1. A FND- signup code whose redemption grants the school Premium FREE
    //      FOR LIFE (grant_type='partner_free_life' → billing_override_usd=0 +
    //      permanent Sonnet tier, applied in try/instant redeemFoundingCode).
    //   2. A <FIRSTNAME>-XXXX referral code (default 20% share) → promo link.
    //   3. An agent dashboard login (6-char code + login_url) so the partner
    //      can watch their referrals/earnings.
    // Idempotent on email: re-minting returns the existing artifacts. The
    // one-time agent login code can NOT be recovered — if a login already
    // exists we return agent_login_code:null + a note to reissue via the 🔑
    // flow. grant_type hard-requires migration 290; if absent we return a clear
    // "run migration 290" message.
    if (action === 'create_partner') {
      const schoolName = String(body.school_name || '').trim().slice(0, 200);
      const email = String(body.email || '').trim().toLowerCase().slice(0, 320);
      const partnerName = String(body.partner_name || '').trim().slice(0, 200);
      let sharePct = body.revenue_share_pct === undefined ? 20 : Number(body.revenue_share_pct);
      if (!schoolName || !email || !email.includes('@')) {
        return NextResponse.json({ error: 'School name and a valid email are required.' }, { status: 400 });
      }
      if (!partnerName) {
        return NextResponse.json({ error: 'Partner name is required.' }, { status: 400 });
      }
      if (Number.isNaN(sharePct) || sharePct < 0 || sharePct > 100) {
        return NextResponse.json({ error: 'revenue_share_pct must be between 0 and 100.' }, { status: 400 });
      }
      sharePct = Math.round(sharePct * 100) / 100;

      const now = new Date().toISOString();
      const MIGRATION_290_MSG = 'Partner minting needs migration 290 — run it in Supabase first (adds grant_type to montree_founding_waitlist).';

      // ── (a) Admitted partner waitlist row (idempotent on email) ──
      let waitlistId = '';
      let signupCode = '';
      let waitlistExisted = false;
      // Set when the reused waitlist row was ALREADY redeemed — the school
      // exists + is provisioned, so the free-for-life grant is applied DIRECTLY
      // to it (below) and the signup link is returned as null (dead).
      let alreadyRedeemedSchoolId = '';

      const { data: existingRow, error: existingErr } = await supabase
        .from('montree_founding_waitlist')
        .select('id, status, signup_code, redeemed_at, redeemed_by_school_id')
        .eq('email', email)
        .maybeSingle();
      if (existingErr) {
        console.error('[create_partner] existing-row lookup failed:', existingErr.message);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
      }

      if (existingRow) {
        if (existingRow.status !== 'admitted' || !existingRow.signup_code) {
          return NextResponse.json(
            { error: `That email already has a ${existingRow.status} application without a code. Admit it + generate a code from the list below instead.` },
            { status: 409 }
          );
        }
        // Reuse the admitted+coded row. Re-mint is CORRECTIVE: refresh the
        // school + contact names to the submitted values and force
        // grant_type='partner_free_life' (a prior founding_3_life row would
        // otherwise only grant $3). The UPDATE is where a lagging migration 290
        // surfaces (42703).
        waitlistId = existingRow.id as string;
        signupCode = existingRow.signup_code as string;
        waitlistExisted = true;
        const { error: gtErr } = await supabase
          .from('montree_founding_waitlist')
          .update({
            grant_type: 'partner_free_life',
            school_name: schoolName,
            contact_name: partnerName,
            updated_at: now,
          } as never)
          .eq('id', waitlistId);
        if (gtErr) {
          if (gtErr.code === '42703') return NextResponse.json({ error: MIGRATION_290_MSG }, { status: 500 });
          console.error('[create_partner] waitlist row update failed:', gtErr.message);
          return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
        }

        // 🚨 HIGH review fix: an ALREADY-REDEEMED row means the school signed up
        // + is provisioned but never received the partner free-for-life grant
        // (the old code returned the dead signup link as "success" and left the
        // school on its trial billing). Apply the grant DIRECTLY to that school
        // now. This is a super-admin action, so a grant failure FAILS LOUDLY
        // (500) — never a silent half-grant.
        if (existingRow.redeemed_at && existingRow.redeemed_by_school_id) {
          const grantSchoolId = existingRow.redeemed_by_school_id as string;
          alreadyRedeemedSchoolId = grantSchoolId;

          const { data: sch, error: schReadErr } = await supabase
            .from('montree_schools')
            .select('founding_member')
            .eq('id', grantSchoolId)
            .maybeSingle();
          if (schReadErr) {
            console.error('[create_partner] direct-grant school read failed:', schReadErr.message);
            return NextResponse.json(
              { error: `The partner already signed up, but the free-for-life grant could not be applied (school lookup failed): ${schReadErr.message}` },
              { status: 500 }
            );
          }
          const schoolUpdate: Record<string, unknown> = {
            billing_override_usd: 0,
            billing_override_note: 'Partner — Premium free for life',
          };
          // Only set founding_member if it isn't already true (don't clobber).
          if (!sch?.founding_member) schoolUpdate.founding_member = true;
          const { error: grantErr } = await supabase
            .from('montree_schools')
            .update(schoolUpdate as never)
            .eq('id', grantSchoolId);
          if (grantErr) {
            console.error('[create_partner] direct free-for-life grant failed:', grantErr.message);
            return NextResponse.json(
              { error: `The partner already signed up, but the free-for-life billing override could not be applied: ${grantErr.message}` },
              { status: 500 }
            );
          }
          const tierResult = await applyAiTier(supabase, grantSchoolId, 'sonnet', 'partner_free_life_direct_grant');
          if (!tierResult.ok) {
            return NextResponse.json(
              { error: `The partner already signed up, but the Premium (Sonnet) tier could not be applied: ${tierResult.error}` },
              { status: 500 }
            );
          }
        }
      } else {
        // Fresh admitted partner row + FND- code. Retry on the rare signup_code
        // UNIQUE collision. Email collision is impossible (we just checked), but
        // a 23505 that ISN'T signup_code is re-read defensively.
        let inserted = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = generateFoundingCode();
          const { data: ins, error: insErr } = await supabase
            .from('montree_founding_waitlist')
            .insert({
              school_name: schoolName,
              contact_name: partnerName,
              email,
              status: 'admitted',
              admitted_at: now,
              signup_code: candidate,
              code_generated_at: now,
              source: 'super_admin_partner',
              grant_type: 'partner_free_life',
            } as never)
            .select('id, signup_code')
            .maybeSingle();
          if (!insErr && ins) {
            waitlistId = ins.id as string;
            signupCode = ins.signup_code as string;
            inserted = true;
            break;
          }
          if (insErr?.code === '42703') return NextResponse.json({ error: MIGRATION_290_MSG }, { status: 500 });
          if (insErr?.code === '23505') {
            const { data: race } = await supabase
              .from('montree_founding_waitlist')
              .select('id, status, signup_code')
              .eq('email', email)
              .maybeSingle();
            if (race?.status === 'admitted' && race.signup_code) {
              waitlistId = race.id as string;
              signupCode = race.signup_code as string;
              waitlistExisted = true;
              inserted = true;
              break;
            }
            continue; // signup_code collision — retry with a fresh code
          }
          if (insErr) {
            console.error('[create_partner] waitlist insert failed:', insErr.message);
            return NextResponse.json({ error: 'Could not create the partner record.' }, { status: 500 });
          }
        }
        if (!inserted) {
          return NextResponse.json({ error: 'Could not mint a signup code. Try again.' }, { status: 500 });
        }
      }

      // ── (b) Referral code + shell agent (idempotent on agent_email) ──
      let referralCode = '';
      let agentId = '';
      let referralExisted = false;
      const { data: existingRef } = await supabase
        .from('montree_referral_codes')
        .select('id, code, agent_id')
        .eq('agent_email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      if (existingRef && existingRef.length > 0 && existingRef[0].code) {
        referralCode = existingRef[0].code as string;
        agentId = (existingRef[0].agent_id as string) || '';
        referralExisted = true;
        // 🚨 HIGH review fix: re-mint is corrective. Refresh the still-PENDING
        // code's revenue_share_pct + agent_display_name to the submitted values
        // so the response/audit truthfully reflect STORED state (was: echoed the
        // submitted values without persisting them). An already-REDEEMED school
        // keeps its locked-in pct by design — this only rewrites a pending code.
        const { error: refUpdErr } = await supabase
          .from('montree_referral_codes')
          .update({ revenue_share_pct: sharePct, agent_display_name: partnerName })
          .eq('id', existingRef[0].id as string)
          .eq('status', 'pending');
        if (refUpdErr) {
          console.error('[create_partner] pending referral refresh failed:', refUpdErr.message);
          return NextResponse.json({ error: 'Could not update the existing referral code.' }, { status: 500 });
        }
      }
      if (!referralCode) {
        const refResult = await createAgentReferralCode(supabase, {
          displayName: partnerName,
          email,
          revenueSharePct: sharePct,
          pitchLabel: 'Partner Program',
          createdByLabel: 'super_admin_partner',
          notes: `Partner package for ${schoolName}`,
        });
        if (!refResult.ok) {
          return NextResponse.json({ error: refResult.error, detail: refResult.detail ?? undefined }, { status: refResult.status });
        }
        referralCode = refResult.code;
        agentId = refResult.agentId;
      }
      // Belt-and-braces: an existing pending code with a null agent_id → resolve
      // the payee by email so the login step has an agent to act on.
      if (!agentId) {
        const { data: t } = await supabase
          .from('montree_teachers')
          .select('id')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1);
        agentId = (t && t.length > 0 ? (t[0].id as string) : '') || '';
      }

      // Traceability: stamp partner_agent_id on the waitlist row (best-effort;
      // column is in migration 290 alongside grant_type).
      if (agentId) {
        await supabase
          .from('montree_founding_waitlist')
          .update({ partner_agent_id: agentId } as never)
          .eq('id', waitlistId)
          .then(({ error }) => {
            if (error && error.code !== '42703') console.error('[create_partner] partner_agent_id stamp failed:', error.message);
          });
      }

      // ── (c) Agent dashboard login (only if not already an agent) ──
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://montree.xyz';
      let agentLoginCode: string | null = null;
      let loginNote: string | null = null;
      if (agentId) {
        const { data: agentRow } = await supabase
          .from('montree_teachers')
          .select('is_agent, agent_password_hash')
          .eq('id', agentId)
          .maybeSingle();
        const alreadyAgent = Boolean(agentRow?.is_agent && agentRow?.agent_password_hash);
        if (alreadyAgent) {
          loginNote = 'This agent already has a login — the one-time code cannot be recovered. Reissue it via the 🔑 button in the Referrals tab if the partner needs it.';
        } else {
          const loginResult = await issueAgentLogin(supabase, agentId, {
            defaultSharePct: sharePct,
            ipAddress: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            auditSource: 'partner_program_mint',
          });
          if (loginResult.ok) {
            agentLoginCode = loginResult.code;
          } else {
            loginNote = `Could not issue the agent login (${loginResult.error}). Reissue via the 🔑 button in the Referrals tab.`;
          }
        }
      } else {
        loginNote = 'Could not resolve the agent record to issue a login. Issue it manually from the Referrals tab.';
      }

      const loginUrl = agentLoginCode
        ? `${baseUrl}/montree/login-select?code=${encodeURIComponent(agentLoginCode)}`
        : `${baseUrl}/montree/login-select`;

      // Audit (fire-and-forget). The plaintext agent login code is NEVER logged.
      logAudit(supabase, {
        adminIdentifier: 'super_admin',
        action: 'partner_package_mint',
        resourceType: 'founding_waitlist',
        resourceId: waitlistId,
        resourceDetails: {
          endpoint: '/api/montree/super-admin/founding',
          school_name: schoolName,
          partner_name: partnerName,
          email,
          revenue_share_pct: sharePct,
          signup_code: signupCode,
          referral_code: referralCode,
          agent_id: agentId || null,
          waitlist_existed: waitlistExisted,
          referral_existed: referralExisted,
          already_redeemed: Boolean(alreadyRedeemedSchoolId),
          redeemed_by_school_id: alreadyRedeemedSchoolId || null,
          login_issued: Boolean(agentLoginCode),
        },
        ipAddress: getClientIP(req.headers),
        userAgent: getUserAgent(req.headers),
        isSensitive: true,
      });

      // When the school ALREADY signed up with this code, the signup link is
      // dead — the free-for-life grant was applied directly above. Return null
      // for the link + a clear note so the UI never shows a usable-looking link.
      const alreadyRedeemed = Boolean(alreadyRedeemedSchoolId);
      const redeemedNote = alreadyRedeemed
        ? 'This school already signed up with this code — Premium free-for-life was applied directly to their account, so the signup link is no longer usable.'
        : null;
      const loginCodeNote = agentLoginCode
        ? 'The agent login code is shown once — copy it now, it cannot be retrieved later.'
        : null;

      return NextResponse.json({
        success: true,
        signup_code: alreadyRedeemed ? null : signupCode,
        signup_link: alreadyRedeemed ? null : `https://montree.xyz/montree/try?founding=${signupCode}`,
        referral_code: referralCode,
        referral_link: `https://montree.xyz/montree/try?ref=${referralCode}`,
        agent_id: agentId || null,
        agent_login_code: agentLoginCode, // plaintext, shown ONCE — null if a login already existed
        login_url: loginUrl,
        revenue_share_pct: sharePct,
        already_existed: waitlistExisted || referralExisted,
        already_redeemed: alreadyRedeemed,
        redeemed_by_school_id: alreadyRedeemedSchoolId || null,
        note: [redeemedNote, loginNote, loginCodeNote].filter(Boolean).join(' ') || null,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[super-admin/founding PATCH] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
