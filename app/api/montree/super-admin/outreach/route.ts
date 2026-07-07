// /api/montree/super-admin/outreach — Outreach CRM API
// GET: pipeline stats + contacts list
// POST: create/update contacts, log actions
// PATCH: bulk status update
import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { getSupabase } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 🚨 Session 113 V2 Outreach audit MED F-7.2 — whitelist of columns that
// upsert_contact and bulk_import are allowed to write. Without this, the
// route was upserting the request body verbatim, meaning any future
// sensitive column (stripe_customer_id, internal_priority_score, etc.)
// could be set or overwritten by anything in a request body. The DB-level
// CHECK constraints on contact_type / status / priority / email_status
// still apply on top of the whitelist; this is defense in depth at the
// route layer.
const ALLOWED_CONTACT_COLUMNS = new Set<string>([
  'id',
  'org_name',
  'contact_person',
  'email',
  'phone',
  'website',
  'country',
  'region',
  'contact_type',
  'priority',
  'est_schools_reached',
  'status',
  'email_subject',
  'gmail_draft_id',
  'draft_date',
  'sent_date',
  'bounce_date',
  'reply_date',
  'follow_up_count',
  'last_follow_up',
  'next_follow_up',
  'email_status',
  'mx_verified',
  'notes',
  'reply_summary',
  'source',
  'batch_tag',
  // Social outreach channel (migration 289). Parallel to the email `status`
  // flow. Safe to whitelist even before 289 runs: if the columns don't exist,
  // an insert carrying them 42703s and the row lands in error_samples — every
  // non-social row imports normally.
  'facebook_url',
  'instagram_url',
  'linkedin_url',
  'x_url',
  'social_status',
  'social_invited_at',
  'social_replied_at',
  'social_notes',
  'created_at',
  'updated_at',
]);

function pickContactColumns(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (ALLOWED_CONTACT_COLUMNS.has(key)) {
      out[key] = raw[key];
    }
  }
  return out;
}

// GET — dashboard stats + contacts with optional filters
export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const url = new URL(request.url);
  const view = url.searchParams.get('view') || 'stats'; // stats | contacts | log
  const status = url.searchParams.get('status');
  const contactType = url.searchParams.get('type');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    if (view === 'stats') {
      // Pipeline funnel counts
      const { data: contacts, error } = await supabase
        .from('montree_outreach_contacts')
        .select('status, contact_type, priority, email_status');
      if (error) throw error;

      const stats = {
        total: contacts?.length || 0,
        by_status: {} as Record<string, number>,
        by_type: {} as Record<string, number>,
        by_priority: {} as Record<string, number>,
        with_email: 0,
        bounced: 0,
        reply_rate: 0,
      };

      for (const c of contacts || []) {
        stats.by_status[c.status] = (stats.by_status[c.status] || 0) + 1;
        stats.by_type[c.contact_type] = (stats.by_type[c.contact_type] || 0) + 1;
        stats.by_priority[c.priority] = (stats.by_priority[c.priority] || 0) + 1;
        if (c.email) stats.with_email++;
        if (c.email_status === 'bounced') stats.bounced++;
      }

      const sent = stats.by_status['sent'] || 0;
      const replied = stats.by_status['replied'] || 0;
      const meetings = stats.by_status['meeting_booked'] || 0;
      stats.reply_rate = sent > 0 ? ((replied + meetings) / sent) * 100 : 0;

      // Recent log entries
      const { data: recentLog } = await supabase
        .from('montree_outreach_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Contacts needing follow-up (next_follow_up <= now)
      const { data: needsFollowUp } = await supabase
        .from('montree_outreach_contacts')
        .select('id, org_name, email, status, sent_date, follow_up_count, next_follow_up')
        .not('next_follow_up', 'is', null)
        .lte('next_follow_up', new Date().toISOString())
        .order('next_follow_up', { ascending: true })
        .limit(20);

      return NextResponse.json({
        stats,
        recent_log: recentLog || [],
        needs_follow_up: needsFollowUp || [],
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (view === 'contacts') {
      let query = supabase
        .from('montree_outreach_contacts')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (contactType) query = query.eq('contact_type', contactType);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ contacts: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (view === 'log') {
      const { data, error } = await supabase
        .from('montree_outreach_log')
        .select('*, montree_outreach_contacts(org_name, email)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return NextResponse.json({ log: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[outreach] GET error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create or upsert contacts + log actions
export async function POST(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const body = await request.json();
  const { action } = body;

  try {
    // Upsert a single contact
    //
    // 🚨 Session 113 V2 Outreach audit MED F-7.2 — pickContactColumns()
    // narrows the body to the whitelist BEFORE the upsert. Without this,
    // the route was writing the raw body verbatim and any future sensitive
    // column on the table could be set/overwritten by anything in the body.
    if (action === 'upsert_contact') {
      const rawContact = body.contact as Record<string, unknown> | undefined;
      if (!rawContact?.org_name) return NextResponse.json({ error: 'org_name required' }, { status: 400 });

      const contact = pickContactColumns(rawContact);
      contact.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('montree_outreach_contacts')
        .upsert(contact, { onConflict: 'id' })
        .select()
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ contact: data });
    }

    // Bulk import contacts
    //
    // 🚨 Session 113 V2 Outreach audit MED F-7.2 + MED F-7.3 — narrow body
    // to whitelist, and split the per-row error count by Postgres error code
    // so real DB errors (anything other than 23505 unique_violation) are
    // surfaced rather than silently bucketed as "skipped duplicate".
    if (action === 'bulk_import') {
      const { contacts } = body;
      if (!Array.isArray(contacts) || contacts.length === 0) {
        return NextResponse.json({ error: 'contacts array required' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const rows = contacts.map((c: Record<string, unknown>) => ({
        ...pickContactColumns(c),
        created_at: now,
        updated_at: now,
      }));

      // Insert in batches of 50
      let inserted = 0;
      let duplicates = 0;
      let errors = 0;
      const errorSamples: Array<{ code: string | null; message: string }> = [];
      const MAX_ERROR_SAMPLES = 5;

      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { data, error } = await supabase
          .from('montree_outreach_contacts')
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: true })
          .select('id');
        if (error) {
          // Try inserting one by one to classify each failure.
          for (const row of batch) {
            const { error: singleErr } = await supabase
              .from('montree_outreach_contacts')
              .insert(row);
            if (singleErr) {
              const code = (singleErr as { code?: string }).code || null;
              if (code === '23505') {
                // Unique violation — legitimate duplicate skip.
                duplicates++;
              } else {
                errors++;
                if (errorSamples.length < MAX_ERROR_SAMPLES) {
                  errorSamples.push({
                    code,
                    message: singleErr.message || 'unknown DB error',
                  });
                }
              }
            } else {
              inserted++;
            }
          }
        } else {
          inserted += data?.length || batch.length;
        }
      }

      // Log the import. If real errors occurred, log a separate row so the
      // operator can see partial-failure imports in the activity log.
      await supabase.from('montree_outreach_log').insert({
        action: 'bulk_import',
        details: { count: inserted, duplicates, errors, source: body.source || 'manual' },
      });
      if (errors > 0) {
        await supabase
          .from('montree_outreach_log')
          .insert({
            action: 'import_partial',
            details: {
              inserted,
              duplicates,
              errors,
              error_samples: errorSamples,
              source: body.source || 'manual',
            },
          })
          .then(({ error: logErr }) => {
            if (logErr) console.error('[outreach] import_partial log failed:', logErr);
          });
      }

      // legacy `skipped` retained for backward-compat with existing UI consumers.
      return NextResponse.json({
        inserted,
        duplicates,
        errors,
        error_samples: errorSamples,
        skipped: duplicates,
      });
    }

    // Log an action (bounce detected, reply detected, etc.).
    //
    // 🚨 Session 113 V2 Outreach audit MED F-7.6 — whitelist log_action.
    // Without this, any string the caller supplied went into the action
    // column. Idempotency checks in drip crons match on exact action
    // strings, so a misnamed/forged entry was invisible to them — and a
    // typo'd 'demo_request_drip_day3' could cause infinite drip loops.
    // Whitelist is the canonical-action set used elsewhere in this surface.
    if (action === 'log') {
      const { log_action, contact_id, details } = body;
      const ALLOWED_LOG_ACTIONS = new Set([
        'bulk_import',
        'import_partial',
        'bounce_detected',
        'reply_detected',
        'status_promoted',
        'demo_requested',
        'demo_request_drip_day3',
        'demo_request_drip_day7',
        'demo_request_drip_day14',
        'trial_drip_day4',
        'trial_drip_day6',
        'trial_drip_day7',
        'leads_bulk_deleted',
        'manual_note',
        'reply_drafted',
        'demo_call_scheduled',
        'follow_up_scheduled',
        'pitch_sent',
        'partnership_offered',
      ]);
      if (typeof log_action !== 'string' || !ALLOWED_LOG_ACTIONS.has(log_action)) {
        return NextResponse.json(
          {
            error:
              'log_action must be one of the whitelisted canonical actions. ' +
              'See ALLOWED_LOG_ACTIONS in app/api/montree/super-admin/outreach/route.ts.',
            received: typeof log_action === 'string' ? log_action : null,
          },
          { status: 400 }
        );
      }
      const { error } = await supabase.from('montree_outreach_log').insert({
        action: log_action,
        contact_id,
        details: details || {},
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // Update contact status
    if (action === 'update_status') {
      const { contact_id, status, extra } = body;
      const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === 'bounced') update.bounce_date = new Date().toISOString();
      if (status === 'replied') update.reply_date = new Date().toISOString();
      if (status === 'sent') update.sent_date = new Date().toISOString();
      if (extra) Object.assign(update, extra);

      const { error } = await supabase
        .from('montree_outreach_contacts')
        .update(update)
        .eq('id', contact_id);
      if (error) throw error;

      await supabase.from('montree_outreach_log').insert({
        action: `status_${status}`,
        contact_id,
        details: extra || {},
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[outreach] POST error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
