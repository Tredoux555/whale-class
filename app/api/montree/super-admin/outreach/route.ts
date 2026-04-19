// /api/montree/super-admin/outreach — Outreach CRM API
// GET: pipeline stats + contacts list
// POST: create/update contacts, log actions
// PATCH: bulk status update
import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { getSupabase } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  } catch (e: any) {
    console.error('[outreach] GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
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
    if (action === 'upsert_contact') {
      const { contact } = body;
      if (!contact?.org_name) return NextResponse.json({ error: 'org_name required' }, { status: 400 });

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
    if (action === 'bulk_import') {
      const { contacts } = body;
      if (!Array.isArray(contacts) || contacts.length === 0) {
        return NextResponse.json({ error: 'contacts array required' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const rows = contacts.map((c: any) => ({
        ...c,
        created_at: now,
        updated_at: now,
      }));

      // Insert in batches of 50
      let inserted = 0;
      let skipped = 0;
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { data, error } = await supabase
          .from('montree_outreach_contacts')
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: true })
          .select('id');
        if (error) {
          // Try inserting one by one to skip duplicates
          for (const row of batch) {
            const { error: singleErr } = await supabase
              .from('montree_outreach_contacts')
              .insert(row);
            if (singleErr) {
              skipped++;
            } else {
              inserted++;
            }
          }
        } else {
          inserted += data?.length || batch.length;
        }
      }

      // Log the import
      await supabase.from('montree_outreach_log').insert({
        action: 'bulk_import',
        details: { count: inserted, skipped, source: body.source || 'manual' },
      });

      return NextResponse.json({ inserted, skipped });
    }

    // Log an action (bounce detected, reply detected, etc.)
    if (action === 'log') {
      const { log_action, contact_id, details } = body;
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
      const update: any = { status, updated_at: new Date().toISOString() };
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
  } catch (e: any) {
    console.error('[outreach] POST error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
