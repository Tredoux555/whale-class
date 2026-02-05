import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_PASSWORD = '870602';

// GET - Fetch all outreach entries
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('password');

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: outreach, error } = await supabase
      .from('montree_npo_outreach')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching outreach:', error);
      throw error;
    }

    // Count by status
    const counts = {
      not_contacted: 0,
      contacted: 0,
      interested: 0,
      applied: 0,
      approved: 0
    };

    (outreach || []).forEach(o => {
      if (counts[o.outreach_status as keyof typeof counts] !== undefined) {
        counts[o.outreach_status as keyof typeof counts]++;
      }
    });

    return NextResponse.json({
      outreach: outreach || [],
      counts
    });
  } catch (error) {
    console.error('Error in outreach GET:', error);
    return NextResponse.json({ error: 'Failed to fetch outreach data' }, { status: 500 });
  }
}

// POST - Add a new outreach entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, organizationName, organizationType, country, region, city, website, contactEmail, contactName, description, communityServed, source, priority } = body;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!organizationName || !country) {
      return NextResponse.json({ error: 'Organization name and country are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('montree_npo_outreach')
      .insert({
        organization_name: organizationName,
        organization_type: organizationType || null,
        country,
        region: region || null,
        city: city || null,
        website: website || null,
        contact_email: contactEmail || null,
        contact_name: contactName || null,
        description: description || null,
        community_served: communityServed || null,
        source: source || 'manual',
        priority: priority || 'medium',
        outreach_status: 'not_contacted'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating outreach entry:', error);
      throw error;
    }

    return NextResponse.json({ outreach: data });
  } catch (error) {
    console.error('Error in outreach POST:', error);
    return NextResponse.json({ error: 'Failed to create outreach entry' }, { status: 500 });
  }
}

// PATCH - Update outreach status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, outreachId, status, contactNotes } = body;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!outreachId) {
      return NextResponse.json({ error: 'Outreach ID is required' }, { status: 400 });
    }

    const updateData: any = {};

    if (status) {
      updateData.outreach_status = status;
      if (status === 'contacted' || status === 'interested') {
        updateData.last_contacted_at = new Date().toISOString();
        if (status === 'contacted') {
          updateData.first_contacted_at = new Date().toISOString();
        }
      }
    }

    if (contactNotes) {
      updateData.contact_notes = contactNotes;
    }

    const { data, error } = await supabase
      .from('montree_npo_outreach')
      .update(updateData)
      .eq('id', outreachId)
      .select()
      .single();

    if (error) {
      console.error('Error updating outreach:', error);
      throw error;
    }

    return NextResponse.json({ outreach: data });
  } catch (error) {
    console.error('Error in outreach PATCH:', error);
    return NextResponse.json({ error: 'Failed to update outreach entry' }, { status: 500 });
  }
}
