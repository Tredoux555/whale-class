// /api/montree/super-admin/agents/[id]/tax-form
//
// Phase B5 — Tax form (W-8BEN / W-8BEN-E / W-9 / jurisdiction-other) management.
//
// For v1, super-admin uploads the form on behalf of the agent (agent emails
// the signed PDF, Tredoux stores it here). Agent-side self-upload is a
// future enhancement.
//
// GET   — read current status + metadata + signed download URL (1h expiry)
// PATCH — update tax_form_url, tax_form_type, tax_residency_country, is_us_person
//
// Auth: super-admin only.
// PDF storage: Supabase Storage bucket 'agent-tax-forms' (must exist;
// create manually in Supabase Dashboard → Storage → New bucket → private).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['w8ben', 'w8ben_e', 'w9', 'jurisdiction_other', 'declaration_attached']);

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_agent: boolean | null;
  tax_form_url: string | null;
  tax_form_type: string | null;
  tax_form_uploaded_at: string | null;
  tax_residency_country: string | null;
  is_us_person: boolean | null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: agentId } = await ctx.params;
  const supabase = getSupabase();

  const { data: agentRaw, error } = await supabase
    .from('montree_teachers')
    .select('id, name, email, is_agent, tax_form_url, tax_form_type, tax_form_uploaded_at, tax_residency_country, is_us_person')
    .eq('id', agentId)
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === '42703') {
      return NextResponse.json(
        { error: 'Migration 207 not yet run — tax_form columns missing on montree_teachers.', migration_pending: true },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!agentRaw) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  const agent = agentRaw as AgentRow;
  if (!agent.is_agent) return NextResponse.json({ error: 'Not an agent' }, { status: 404 });

  let downloadUrl: string | null = null;
  if (agent.tax_form_url) {
    // tax_form_url is the path within the bucket; mint a signed URL.
    const path = agent.tax_form_url.replace(/^agent-tax-forms\//, '');
    const { data: signed } = await supabase.storage
      .from('agent-tax-forms')
      .createSignedUrl(path, 3600);
    downloadUrl = signed?.signedUrl || null;
  }

  return NextResponse.json({
    agent_id: agent.id,
    name: agent.name,
    email: agent.email,
    tax_form_status: agent.tax_form_url ? 'on_file' : 'missing',
    tax_form_type: agent.tax_form_type,
    tax_form_uploaded_at: agent.tax_form_uploaded_at,
    tax_residency_country: agent.tax_residency_country,
    is_us_person: agent.is_us_person,
    download_url: downloadUrl,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: agentId } = await ctx.params;
  const supabase = getSupabase();

  let body: {
    tax_form_url?: string | null;
    tax_form_type?: string | null;
    tax_residency_country?: string | null;
    is_us_person?: boolean | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if ('tax_form_url' in body) {
    updates.tax_form_url = body.tax_form_url || null;
    updates.tax_form_uploaded_at = body.tax_form_url ? new Date().toISOString() : null;
  }
  if ('tax_form_type' in body) {
    if (body.tax_form_type !== null && body.tax_form_type !== undefined) {
      if (!ALLOWED_TYPES.has(body.tax_form_type)) {
        return NextResponse.json(
          { error: `tax_form_type must be one of: ${Array.from(ALLOWED_TYPES).join(', ')}` },
          { status: 400 }
        );
      }
      updates.tax_form_type = body.tax_form_type;
    } else {
      updates.tax_form_type = null;
    }
  }
  if ('tax_residency_country' in body) {
    if (body.tax_residency_country && !/^[A-Z]{2}$/.test(body.tax_residency_country.toUpperCase())) {
      return NextResponse.json(
        { error: 'tax_residency_country must be ISO 3166-1 alpha-2 (e.g. ZA, GB, US)' },
        { status: 400 }
      );
    }
    updates.tax_residency_country = body.tax_residency_country
      ? body.tax_residency_country.toUpperCase()
      : null;
  }
  if ('is_us_person' in body) {
    updates.is_us_person = body.is_us_person === null ? null : !!body.is_us_person;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data: agentRaw, error: lookupErr } = await supabase
    .from('montree_teachers')
    .select('id, name, email, is_agent')
    .eq('id', agentId)
    .maybeSingle();
  if (lookupErr || !agentRaw) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  const agent = agentRaw as AgentRow;

  const { error: updateErr } = await supabase
    .from('montree_teachers')
    .update(updates)
    .eq('id', agentId);

  if (updateErr) {
    if ((updateErr as { code?: string }).code === '42703') {
      return NextResponse.json(
        { error: 'Migration 207 not yet run.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  void logAgentAudit(supabase, {
    agent_id: agent.id,
    agent_display_name: agent.name,
    agent_email: agent.email,
    event_type: 'agent_profile_changed',
    actor_role: 'super_admin',
    details: { fields: Object.keys(updates), tax_form_metadata_updated: true },
  });

  return NextResponse.json({ success: true });
}
