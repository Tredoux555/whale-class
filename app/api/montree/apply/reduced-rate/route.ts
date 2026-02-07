// /api/montree/apply/reduced-rate/route.ts
// Reduced rate application submission
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const {
      schoolName,
      country,
      city,
      contactName,
      contactEmail,
      estimatedStudents,
      reason,
      reasonDescription,
      monthlyBudget,
      requestedTier,
      documentationUrl,
    } = await request.json();

    // Validate required fields
    if (!schoolName?.trim()) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 });
    }
    if (!country?.trim()) {
      return NextResponse.json({ error: 'Country is required' }, { status: 400 });
    }
    if (!city?.trim()) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 });
    }
    if (!contactName?.trim()) {
      return NextResponse.json({ error: 'Contact name is required' }, { status: 400 });
    }
    if (!contactEmail?.trim()) {
      return NextResponse.json({ error: 'Contact email is required' }, { status: 400 });
    }
    if (!estimatedStudents || estimatedStudents < 1) {
      return NextResponse.json({ error: 'Valid estimated students is required' }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Reason for reduced rate is required' }, { status: 400 });
    }
    if (!reasonDescription?.trim()) {
      return NextResponse.json({ error: 'Reason description is required' }, { status: 400 });
    }
    if (!monthlyBudget || monthlyBudget < 0) {
      return NextResponse.json({ error: 'Valid monthly budget is required' }, { status: 400 });
    }
    if (!requestedTier?.trim()) {
      return NextResponse.json({ error: 'Requested tier is required' }, { status: 400 });
    }

    // Insert into montree_reduced_rate_applications table
    const { data: application, error: insertError } = await supabase
      .from('montree_reduced_rate_applications')
      .insert({
        school_name: schoolName.trim(),
        country: country.trim(),
        city: city.trim(),
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim().toLowerCase(),
        estimated_students: estimatedStudents,
        reason_code: reason.trim(),
        reason_description: reasonDescription.trim(),
        current_monthly_budget_usd: monthlyBudget,
        requested_rate_tier: requestedTier.trim(),
        documentation_url: documentationUrl?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Application submission error:', insertError);
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        schoolName: application.school_name,
        contactEmail: application.contact_email,
        status: application.status,
        submittedAt: application.submitted_at,
      },
    });

  } catch (error) {
    console.error('Reduced rate application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
