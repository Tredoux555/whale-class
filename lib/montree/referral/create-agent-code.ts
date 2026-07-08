// lib/montree/referral/create-agent-code.ts
//
// Shared core for minting an agent referral code + resolving/creating the
// agent's payee record. Extracted from POST /api/montree/super-admin/
// referral-codes so BOTH that route AND the Partner Program mint action
// (create_partner in the founding route) share ONE implementation and can
// never drift.
//
// Resolution order for the agent id:
//   1. explicit agentId (caller supplied) → used as-is
//   2. an existing montree_teachers row matching the email → reused
//   3. otherwise a shell teacher row (is_active=false, no login) is created as
//      the payee identity holder.
//
// Returns a discriminated union — callers translate { ok:false, status } into
// their own HTTP response.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { generateUniqueReferralCode } from '@/lib/montree/referral/code-gen';

export interface CreateAgentCodeParams {
  displayName: string;
  email: string;
  revenueSharePct: number;         // 0–100
  agentId?: string | null;         // existing montree_teachers.id, optional
  pitchLabel?: string | null;
  expiresAt?: string | null;       // ISO date, optional
  notes?: string | null;
  createdByLabel?: string;         // audit label on the referral row
}

export interface CreateAgentCodeSuccess {
  ok: true;
  code: string;
  agentId: string;
  referral: {
    id: string;
    code: string;
    agent_id: string | null;
    agent_display_name: string;
    agent_email: string;
    agent_pitch_label: string | null;
    revenue_share_pct: number;
    status: string;
    created_at: string;
  };
}

export interface CreateAgentCodeFailure {
  ok: false;
  error: string;
  detail?: string | null;
  hint?: string | null;
  status: number;
}

export async function createAgentReferralCode(
  supabase: SupabaseClient,
  params: CreateAgentCodeParams
): Promise<CreateAgentCodeSuccess | CreateAgentCodeFailure> {
  const displayName = (params.displayName || '').trim();
  const email = (params.email || '').trim().toLowerCase();
  const pctRaw = Number(params.revenueSharePct);

  if (!displayName) return { ok: false, error: 'agent_display_name is required', status: 400 };
  if (!email || !email.includes('@')) return { ok: false, error: 'Valid agent_email is required', status: 400 };
  if (Number.isNaN(pctRaw) || pctRaw < 0 || pctRaw > 100) {
    return { ok: false, error: 'revenue_share_pct must be between 0 and 100', status: 400 };
  }
  // 🚨 Single source of truth for 2dp rounding (review fix). BOTH callers — the
  // super-admin referral-codes POST and the Partner Program mint (create_partner)
  // — round here so the stored revenue_share_pct can never drift between paths.
  const pct = Math.round(pctRaw * 100) / 100;

  // ── Resolve agent id ──
  let agentId: string | null = params.agentId || null;

  if (!agentId) {
    // limit(1) + take-first (NOT maybeSingle) so duplicate teacher rows for the
    // same email don't error out; we take the most recent.
    const { data: existing } = await supabase
      .from('montree_teachers')
      .select('id')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);
    if (existing && existing.length > 0 && existing[0].id) {
      agentId = existing[0].id as string;
    } else {
      // Shell agent record. montree_teachers.school_id is NOT NULL, so anchor
      // to the OLDEST school (Whale Class / Tredoux's primary). The shell never
      // logs in (is_active=false) — pure identity holder for the payee.
      const { data: anySchool, error: schoolErr } = await supabase
        .from('montree_schools')
        .select('id, name')
        .order('created_at', { ascending: true })
        .limit(1);
      if (schoolErr || !anySchool || anySchool.length === 0) {
        console.error('[createAgentReferralCode] no school available for shell agent:', schoolErr?.message);
        return {
          ok: false,
          error: 'No schools exist in the system; cannot create agent record',
          detail: schoolErr?.message || 'no rows returned',
          status: 500,
        };
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
        .select()
        .single();
      if (shellErr || !shell) {
        console.error('[createAgentReferralCode] shell agent creation failed:', shellErr?.message, shellErr?.details);
        return {
          ok: false,
          error: 'Could not create agent record',
          detail: shellErr?.message || 'unknown error',
          hint: shellErr?.details || shellErr?.hint || null,
          status: 500,
        };
      }
      agentId = shell.id as string;
    }
  }

  // ── Mint a unique code derived from the display name ──
  let code: string;
  try {
    code = await generateUniqueReferralCode(displayName);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[createAgentReferralCode] code generation failed:', msg);
    return { ok: false, error: 'Could not generate unique code', status: 500 };
  }

  // ── Insert the referral code row ──
  const { data: row, error: insertErr } = await supabase
    .from('montree_referral_codes')
    .insert({
      code,
      agent_id: agentId,
      agent_display_name: displayName,
      agent_email: email,
      agent_pitch_label: params.pitchLabel?.trim() || null,
      revenue_share_pct: pct,
      status: 'pending',
      expires_at: params.expiresAt || null,
      created_by_label: params.createdByLabel || 'super_admin',
      notes: params.notes?.trim() || null,
    })
    .select()
    .single();

  if (insertErr || !row) {
    console.error('[createAgentReferralCode] insert failed:', insertErr?.message, insertErr?.details);
    return { ok: false, error: 'Could not create referral code', status: 500 };
  }

  return {
    ok: true,
    code: row.code as string,
    agentId: agentId as string,
    referral: {
      id: row.id as string,
      code: row.code as string,
      agent_id: (row.agent_id as string | null) ?? null,
      agent_display_name: row.agent_display_name as string,
      agent_email: row.agent_email as string,
      agent_pitch_label: (row.agent_pitch_label as string | null) ?? null,
      revenue_share_pct: Number(row.revenue_share_pct),
      status: row.status as string,
      created_at: row.created_at as string,
    },
  };
}
