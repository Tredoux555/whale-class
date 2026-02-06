// /api/montree/applications/npo/route.ts
// NPO Community Impact Application endpoint
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
      organizationName,
      organizationType,
      registrationNumber,
      country,
      city,
      contactName,
      contactEmail,
      contactPhone,
      missionStatement,
      communityServed,
      estimatedStudents,
      tuitionModel,
      documentationUrl,
      additionalNotes,
    } = await request.json();

    // Validate required fields
    if (!organizationName?.trim()) {
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
    if (!contactName?.trim()) {
      return NextResponse.json(
        { error: 'Contact name is required' },
        { status: 400 }
      );
    }
    if (!contactEmail?.trim()) {
      return NextResponse.json(
        { error: 'Contact email is required' },
        { status: 400 }
      );
    }
    if (!missionStatement?.trim()) {
      return NextResponse.json(
        { error: 'Mission statement is required' },
        { status: 400 }
      );
    }
    if (!communityServed?.trim()) {
      return NextResponse.json(
        { error: 'Community description is required' },
        { status: 400 }
      );
    }
    if (!estimatedStudents || estimatedStudents < 1) {
      return NextResponse.json(
        { error: 'Estimated number of students is required' },
        { status: 400 }
      );
    }

    // Check for duplicate applications by email
    const { data: existingApplication } = await supabase
      .from('montree_npo_applications')
      .select('id')
      .eq('contact_email', contactEmail.trim().toLowerCase())
      .single();

    if (existingApplication) {
      return NextResponse.json(
        { error: 'An application from this email already exists' },
        { status: 400 }
      );
    }

    // Insert application into database
    const { data: application, error: insertError } = await supabase
      .from('montree_npo_applications')
      .insert({
        organization_name: organizationName.trim(),
        organization_type: organizationType,
        registration_number: registrationNumber?.trim() || null,
        country: country.trim(),
        city: city?.trim() || null,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim().toLowerCase(),
        contact_phone: contactPhone?.trim() || null,
        mission_statement: missionStatement.trim(),
        community_served: communityServed.trim(),
        estimated_students: estimatedStudents,
        tuition_model: tuitionModel,
        documentation_url: documentationUrl?.trim() || null,
        additional_notes: additionalNotes?.trim() || null,
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

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully. We will review it within 5 business days.',
        applicationId: application.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('NPO application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
