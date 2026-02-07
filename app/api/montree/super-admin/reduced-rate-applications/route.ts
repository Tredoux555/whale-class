// /api/montree/super-admin/reduced-rate-applications/route.ts
// Session 106: Super Admin API - Reduced Rate Applications Management
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');

    // Verify super admin password
    if (password !== '870602') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all reduced rate applications
    const { data: applications, error: appsError } = await supabase
      .from('montree_reduced_rate_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (appsError) {
      console.error('Reduced rate applications fetch error:', appsError);
      return NextResponse.json({ error: 'Failed to fetch reduced rate applications' }, { status: 500 });
    }

    // Calculate counts by status
    const statusCounts = {
      pending: (applications || []).filter(app => app.status === 'pending').length,
      approved: (applications || []).filter(app => app.status === 'approved').length,
      rejected: (applications || []).filter(app => app.status === 'rejected').length,
    };

    return NextResponse.json({
      applications: applications || [],
      counts: statusCounts,
    });

  } catch (error) {
    console.error('Super admin reduced rate applications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const {
      applicationId,
      status,
      reviewNotes,
      approvedTier,
      approvedAmountCents,
      approvedDurationMonths,
      password,
    } = body;

    // Verify super admin password
    if (password !== '870602') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    if (!applicationId || !status) {
      return NextResponse.json(
        { error: 'applicationId and status are required' },
        { status: 400 }
      );
    }

    // Fetch the application
    const { data: application, error: fetchError } = await supabase
      .from('montree_reduced_rate_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // If approving, handle school updates
    if (status === 'approved') {
      if (!application.school_id) {
        return NextResponse.json(
          { error: 'School ID is required for approved applications' },
          { status: 400 }
        );
      }

      // Calculate approved_until date
      let approvedUntil = null;
      if (approvedDurationMonths && approvedDurationMonths > 0) {
        const approveDate = new Date();
        approveDate.setMonth(approveDate.getMonth() + approvedDurationMonths);
        approvedUntil = approveDate.toISOString();
      }

      // Update school with reduced rate approval
      const { error: updateSchoolError } = await supabase
        .from('montree_schools')
        .update({
          reduced_rate_approved: true,
          reduced_rate_amount_cents: approvedAmountCents,
          approved_until: approvedUntil,
          updated_at: now,
        })
        .eq('id', application.school_id);

      if (updateSchoolError) {
        console.error('Failed to update school reduced rate:', updateSchoolError);
        return NextResponse.json(
          { error: 'Failed to update school reduced rate' },
          { status: 500 }
        );
      }
    }

    // Update the application
    const updateData: any = {
      status,
      reviewed_by: 'super-admin',
      reviewed_at: now,
    };

    if (reviewNotes) {
      updateData.review_notes = reviewNotes;
    }

    if (status === 'approved') {
      if (approvedTier) {
        updateData.approved_tier = approvedTier;
      }
      if (approvedAmountCents !== undefined) {
        updateData.approved_amount_cents = approvedAmountCents;
      }
      if (approvedDurationMonths !== undefined) {
        updateData.approved_duration_months = approvedDurationMonths;
      }

      // Calculate approved_until date
      if (approvedDurationMonths && approvedDurationMonths > 0) {
        const approveDate = new Date();
        approveDate.setMonth(approveDate.getMonth() + approvedDurationMonths);
        updateData.approved_until = approveDate.toISOString();
      }
    }

    const { data: updatedApp, error: updateError } = await supabase
      .from('montree_reduced_rate_applications')
      .update(updateData)
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update application:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    return NextResponse.json({ application: updatedApp });

  } catch (error) {
    console.error('PATCH reduced rate application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
