// /api/montree/super-admin/schools/[id]/payment-config
//
// Phase A of INBOUND_PAYMENTS_PLAN.md — three-rail inbound billing.
// Mirrors /api/montree/super-admin/agents/[id]/payout-config from Session 109.
//
// GET   — read the school's current payment_method + billing_cadence + manual_invoice_details
// PATCH — update any subset
//
// Super-admin only. Manual_invoice_details is a JSONB blob per migration 209.
//
// 🚨 ARCHITECTURAL RULE #80 (locked this build):
// Every school pays via exactly ONE payment_method at a time. Flipping requires
// explicit super-admin action with audit. Schools cannot self-flip.
//
// 🚨 ARCHITECTURAL RULE #70 MIRROR:
// Refuses to silently flip away from stripe_subscription if the school has an
// ACTIVE Stripe subscription (status='active' AND stripe_subscription_id IS NOT NULL).
// Caller must cancel Stripe FIRST, otherwise Stripe will keep auto-charging and
// state diverges. Override via { force: true } in the body (logged).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = new Set(['stripe_subscription', 'alipay_invoice', 'manual_invoice']);
const ALLOWED_CADENCES = new Set(['monthly', 'annual']);

// Limit on the encoded size of manual_invoice_details. Cap at 4KB so a runaway
// client can't blow up the row. Mirror of agents/[id]/payout-config.
const MAX_DETAILS_BYTES = 4 * 1024;

interface SchoolRow {
  id: string;
  name: string;
  payment_method: string | null;
  billing_cadence: string | null;
  manual_invoice_details: Record<string, unknown> | null;
  manual_invoice_details_updated_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  billing_quantity: number | null;
  next_invoice_due_at: string | null;
  billing_email: string | null;
  owner_email: string | null;
}

async function loadSchool(supabase: ReturnType<typeof getSupabase>, schoolId: string) {
  const { data, error } = await supabase
    .from('montree_schools')
    .select(
      'id, name, payment_method, billing_cadence, manual_invoice_details, manual_invoice_details_updated_at, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, billing_quantity, next_invoice_due_at, billing_email, owner_email'
    )
    .eq('id', schoolId)
    .maybeSingle();
  if (error) return { error: error.message, school: null as SchoolRow | null };
  if (!data) return { error: 'School not found', school: null as SchoolRow | null };
  return { error: null, school: data as SchoolRow };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: schoolId } = await ctx.params;
  const supabase = getSupabase();
  const { error, school } = await loadSchool(supabase, schoolId);
  if (error || !school) {
    return NextResponse.json({ error: error || 'School not found' }, { status: 404 });
  }

  return NextResponse.json({
    school_id: school.id,
    name: school.name,
    payment_method: school.payment_method || 'stripe_subscription',
    billing_cadence: school.billing_cadence || 'monthly',
    manual_invoice_details: school.manual_invoice_details,
    manual_invoice_details_updated_at: school.manual_invoice_details_updated_at,
    stripe_customer_id: school.stripe_customer_id,
    stripe_subscription_id: school.stripe_subscription_id,
    subscription_status: school.subscription_status,
    current_period_end: school.current_period_end,
    billing_quantity: school.billing_quantity,
    next_invoice_due_at: school.next_invoice_due_at,
    billing_email: school.billing_email || school.owner_email,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: schoolId } = await ctx.params;
  const supabase = getSupabase();
  const { error: loadErr, school } = await loadSchool(supabase, schoolId);
  if (loadErr || !school) {
    return NextResponse.json({ error: loadErr || 'School not found' }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const force = body.force === true;
  let changedMethod = false;
  let changedCadence = false;
  let changedDetails = false;
  let newMethod: string | undefined;
  let newCadence: string | undefined;

  // payment_method
  if (typeof body.payment_method === 'string') {
    const m = body.payment_method.trim();
    if (!ALLOWED_METHODS.has(m)) {
      return NextResponse.json(
        { error: `payment_method must be one of: ${Array.from(ALLOWED_METHODS).join(', ')}` },
        { status: 400 }
      );
    }
    const currentMethod = school.payment_method || 'stripe_subscription';
    if (m !== currentMethod) {
      // 🚨 Safety guard (rule #70 mirror): refuse to flip away from
      // stripe_subscription if the school has an ACTIVE Stripe subscription.
      // Stripe will keep auto-charging if we silently flip the rail; the
      // operator must cancel the Stripe sub FIRST. Override via force=true.
      if (
        currentMethod === 'stripe_subscription' &&
        school.stripe_subscription_id &&
        school.subscription_status === 'active' &&
        !force
      ) {
        return NextResponse.json(
          {
            error:
              "This school has an ACTIVE Stripe subscription. Cancel it in Stripe Dashboard or the Customer Portal FIRST, otherwise Stripe will keep auto-charging the card and the system state will diverge. Pass { force: true } to override (logged).",
            stripe_subscription_id: school.stripe_subscription_id,
            current_method: currentMethod,
            requested_method: m,
          },
          { status: 409 }
        );
      }
      updates.payment_method = m;
      changedMethod = true;
      newMethod = m;
    }
  }

  // billing_cadence
  if (typeof body.billing_cadence === 'string') {
    const c = body.billing_cadence.trim();
    if (!ALLOWED_CADENCES.has(c)) {
      return NextResponse.json(
        { error: `billing_cadence must be one of: ${Array.from(ALLOWED_CADENCES).join(', ')}` },
        { status: 400 }
      );
    }
    const currentCadence = school.billing_cadence || 'monthly';
    if (c !== currentCadence) {
      updates.billing_cadence = c;
      changedCadence = true;
      newCadence = c;
    }
  }

  // manual_invoice_details
  if ('manual_invoice_details' in body) {
    const d = body.manual_invoice_details;
    if (d === null) {
      updates.manual_invoice_details = null;
      updates.manual_invoice_details_updated_at = null;
      changedDetails = true;
    } else if (typeof d === 'object' && !Array.isArray(d)) {
      const serialized = JSON.stringify(d);
      if (serialized.length > MAX_DETAILS_BYTES) {
        return NextResponse.json(
          { error: `manual_invoice_details exceeds ${MAX_DETAILS_BYTES} bytes — trim fields.` },
          { status: 400 }
        );
      }
      updates.manual_invoice_details = d;
      updates.manual_invoice_details_updated_at = new Date().toISOString();
      changedDetails = true;
    } else {
      return NextResponse.json(
        { error: 'manual_invoice_details must be an object or null' },
        { status: 400 }
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  // Cast through `never` — the supabase client typing widens too aggressively
  // when the row helper isn't a generic. Runtime payload unchanged. Mirror of
  // agents/[id]/payout-config pattern.
  const { error: updateErr } = await supabase
    .from('montree_schools')
    .update(updates as never)
    .eq('id', schoolId);

  if (updateErr) {
    console.error('[payment-config PATCH] update failed:', updateErr.message);
    return NextResponse.json(
      { error: 'Could not update payment config', detail: updateErr.message },
      { status: 500 }
    );
  }

  // Audit fire-and-forget. Mirror of schools/route.ts logAudit pattern.
  if (changedMethod || changedCadence || changedDetails) {
    logAudit(supabase, {
      adminIdentifier: 'super_admin',
      action: 'school_payment_config_update',
      resourceType: 'school',
      resourceId: schoolId,
      resourceDetails: {
        endpoint: '/api/montree/super-admin/schools/[id]/payment-config',
        school_name: school.name,
        previous_method: school.payment_method || 'stripe_subscription',
        previous_cadence: school.billing_cadence || 'monthly',
        new_method: newMethod ?? school.payment_method ?? 'stripe_subscription',
        new_cadence: newCadence ?? school.billing_cadence ?? 'monthly',
        details_changed: changedDetails,
        force_override: force,
        had_active_stripe_sub:
          !!school.stripe_subscription_id && school.subscription_status === 'active',
      },
      ipAddress: getClientIP(req.headers),
      userAgent: getUserAgent(req.headers),
      isSensitive: true,
    });
  }

  return NextResponse.json({
    success: true,
    payment_method: newMethod ?? school.payment_method ?? 'stripe_subscription',
    billing_cadence: newCadence ?? school.billing_cadence ?? 'monthly',
    changed: { method: changedMethod, cadence: changedCadence, details: changedDetails },
  });
}
