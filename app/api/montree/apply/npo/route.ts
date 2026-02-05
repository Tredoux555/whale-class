// /api/montree/apply/npo/route.ts
// NPO Community Impact Program Application Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const {
      organization_name,
      organization_type,
      registration_number,
      country,
      city,
      mission_statement,
      community_served,
      estimated_students,
      tuition_model,
      contact_name,
      contact_email,
      contact_phone,
      documentation_url,
      additional_notes,
    } = await request.json();

    // Validate required fields
    if (!organization_name?.trim()) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    if (!country?.trim()) {
      return NextResponse.json(
        { error: 'Country is required' },
        { status: 400 }
      );
    }

    if (!contact_name?.trim()) {
      return NextResponse.json(
        { error: 'Contact name is required' },
        { status: 400 }
      );
    }

    if (!contact_email?.trim()) {
      return NextResponse.json(
        { error: 'Contact email is required' },
        { status: 400 }
      );
    }

    if (!mission_statement?.trim()) {
      return NextResponse.json(
        { error: 'Mission statement is required' },
        { status: 400 }
      );
    }

    if (!community_served?.trim()) {
      return NextResponse.json(
        { error: 'Community description is required' },
        { status: 400 }
      );
    }

    // Insert application into database
    const { data: application, error: insertError } = await supabase
      .from('montree_npo_applications')
      .insert({
        organization_name: organization_name.trim(),
        organization_type: organization_type || 'NPO',
        registration_number: registration_number?.trim() || null,
        country: country.trim(),
        city: city?.trim() || null,
        mission_statement: mission_statement.trim(),
        community_served: community_served.trim(),
        estimated_students: estimated_students || null,
        tuition_model: tuition_model || 'Free',
        contact_name: contact_name.trim(),
        contact_email: contact_email.trim().toLowerCase(),
        contact_phone: contact_phone?.trim() || null,
        documentation_url: documentation_url?.trim() || null,
        additional_notes: additional_notes?.trim() || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Application insertion error:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        organization_name: application.organization_name,
        contact_email: application.contact_email,
        status: application.status,
        created_at: application.created_at,
      },
      message: 'Application submitted successfully. We will review it within 5-7 business days.',
    });

  } catch (error) {
    console.error('NPO application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
