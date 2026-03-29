// /api/montree/leads/route.ts
// Lead capture + management for personal onboarding

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

// POST - Submit a new lead (public)
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const { name, email, school_name, role, interest_type, message } = body;

    // Validate required fields
    if (!interest_type || !['try', 'info'].includes(interest_type)) {
      return NextResponse.json(
        { error: 'interest_type must be "try" or "info"' },
        { status: 400 }
      );
    }

    // For "try" we want at least a name
    if (interest_type === 'try' && !name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // For "info" we want at least email or name
    if (interest_type === 'info' && !name?.trim() && !email?.trim()) {
      return NextResponse.json(
        { error: 'Please provide at least your name or email' },
        { status: 400 }
      );
    }

    // Validate role if provided
    const validRoles = ['teacher', 'principal', 'other'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Basic email format validation if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email?.trim() && !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email' },
        { status: 400 }
      );
    }

    // Phase 6: Input length limits
    if (name && name.length > 200) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 });
    }
    if (school_name && school_name.length > 200) {
      return NextResponse.json({ error: 'School name too long' }, { status: 400 });
    }
    if (email && email.length > 254) {
      return NextResponse.json({ error: 'Email too long' }, { status: 400 });
    }
    if (message && message.length > 10000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    // Prepare normalized email for duplicate check
    const normalizedEmail = email?.trim()?.toLowerCase() || null;

    // Check for existing lead with same email (duplicate protection)
    let existingLead = null;
    if (normalizedEmail) {
      const { data: existing } = await supabase
        .from('montree_leads')
        .select('id, status')
        .eq('email', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(1);

      existingLead = existing?.[0];
    }

    // If email exists, decide whether to upsert or create new
    if (existingLead) {
      const { status: existingStatus } = existingLead;

      // If status is 'new' or 'contacted', update the existing record (upsert)
      if (['new', 'contacted'].includes(existingStatus)) {
        const { data, error } = await supabase
          .from('montree_leads')
          .update({
            name: name?.trim() || null,
            school_name: school_name?.trim() || null,
            role: role || null,
            interest_type,
            message: message?.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id)
          .select()
          .single();

        if (error) {
          console.error('Lead update error:', error);
          return NextResponse.json(
            { error: 'Failed to submit. Please try again.' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          lead_id: data.id,
          action: 'updated'
        });
      }
      // If status is 'onboarded' or 'declined', create a new lead (they may be trying again)
    }

    // Insert new lead
    const { data, error } = await supabase
      .from('montree_leads')
      .insert({
        name: name?.trim() || null,
        email: normalizedEmail,
        school_name: school_name?.trim() || null,
        role: role || null,
        interest_type,
        message: message?.trim() || null,
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Lead insert error:', error);
      return NextResponse.json(
        { error: 'Failed to submit. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lead_id: data.id
    });

  } catch (error) {
    console.error('Lead POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET - Retrieve leads (super admin only)
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();

    // Verify super admin (JWT token or password fallback)
    const { valid } = await verifySuperAdminAuth(req.headers);
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabase
      .from('montree_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      // Phase 8: Sanitized — omit details/hint from log, never return error.message to client
      console.error('[Leads.GET]', { message: error.message, code: (error as Record<string, unknown>).code });
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    // Count new leads
    const { count: newCount } = await supabase
      .from('montree_leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new');

    // Enrich leads that have notes with login codes but no email —
    // look up the teacher's email from the notes (contains "Code: XXXXX")
    const enriched = data || [];
    const leadsNeedingEmail = enriched.filter((l: Record<string, unknown>) => !l.email && l.notes && typeof l.notes === 'string' && l.notes.includes('Code:'));
    if (leadsNeedingEmail.length > 0) {
      const codeMap = new Map<string, string>();
      for (const lead of leadsNeedingEmail) {
        const match = (lead.notes as string).match(/Code:\s*([A-Z0-9]+)/i);
        if (match) codeMap.set(match[1].toUpperCase(), lead.id as string);
      }
      if (codeMap.size > 0) {
        const codes = Array.from(codeMap.keys());
        const { data: teachers } = await supabase
          .from('montree_teachers')
          .select('login_code, email')
          .in('login_code', codes);
        if (teachers) {
          for (const t of teachers) {
            if (t.email && !t.email.endsWith('@montree.app')) {
              const leadId = codeMap.get(t.login_code);
              const lead = enriched.find((l: Record<string, unknown>) => l.id === leadId);
              if (lead) (lead as Record<string, unknown>).email = t.email;
            }
          }
        }
      }
    }

    return NextResponse.json({
      leads: enriched,
      new_count: newCount || 0
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
    });

  } catch (error) {
    console.error('Leads GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Update lead status/notes (super admin only)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();

    // Verify super admin (JWT token or password fallback)
    const { valid: patchValid } = await verifySuperAdminAuth(req.headers);
    if (!patchValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { lead_id, status, notes, provisioned_school_id } = body;

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id required' }, { status: 400 });
    }

    const validStatuses = ['new', 'contacted', 'onboarded', 'declined'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (provisioned_school_id) updates.provisioned_school_id = provisioned_school_id;

    const { error } = await supabase
      .from('montree_leads')
      .update(updates)
      .eq('id', lead_id);

    if (error) {
      console.error('Lead update error:', error);
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Lead PATCH error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Remove a lead (super admin only)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabase();

    // Verify super admin (JWT token or password fallback)
    const { valid: deleteValid } = await verifySuperAdminAuth(req.headers);
    if (!deleteValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('lead_id');

    if (!leadId) {
      return NextResponse.json({ error: 'lead_id required' }, { status: 400 });
    }

    // Also clean up any DM messages for this lead
    await supabase.from('montree_dm').delete().eq('conversation_id', leadId);

    const { error } = await supabase
      .from('montree_leads')
      .delete()
      .eq('id', leadId);

    if (error) {
      console.error('Lead delete error:', error);
      return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Lead DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
