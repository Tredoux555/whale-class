// /api/montree/leads/route.ts
// Lead capture + management for personal onboarding

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

    // Verify super admin
    const superAdminPassword = req.headers.get('x-super-admin-password');
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
    const fallbackPassword = '870602';

    const isValid = superAdminPassword === expectedPassword ||
                    superAdminPassword === fallbackPassword;

    if (!isValid) {
      console.error('Super admin auth failed:', {
        receivedPassword: superAdminPassword ? superAdminPassword.substring(0, 2) + '***' : 'none',
        expectedPassword: expectedPassword ? 'set' : 'not set',
        fallbackPassword: fallbackPassword ? 'set' : 'not set'
      });
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
      console.error('Leads fetch error:', {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details
      });
      return NextResponse.json({
        error: 'Failed to fetch leads',
        details: error.message
      }, { status: 500 });
    }

    // Count new leads
    const { count: newCount } = await supabase
      .from('montree_leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new');

    return NextResponse.json({
      leads: data || [],
      new_count: newCount || 0
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

    // Verify super admin
    const superAdminPassword = req.headers.get('x-super-admin-password');
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
    const fallbackPassword = '870602';

    const isValid = superAdminPassword === expectedPassword ||
                    superAdminPassword === fallbackPassword;

    if (!isValid) {
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
    const updates: any = { updated_at: new Date().toISOString() };
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

    // Verify super admin
    const superAdminPassword = req.headers.get('x-super-admin-password');
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
    const fallbackPassword = '870602';

    const isValid = superAdminPassword === expectedPassword ||
                    superAdminPassword === fallbackPassword;

    if (!isValid) {
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
