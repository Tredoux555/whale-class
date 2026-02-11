// /api/montree/super-admin/npo-applications/route.ts
// Session 106: Super Admin API - NPO Applications Management
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Phase 9: Rate limiting
    try {
      const ip = getClientIP(request.headers);
      const { allowed, retryAfterSeconds } = await checkRateLimit(
        supabase, ip, '/api/montree/super-admin/npo-applications', 10, 15
      );
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
        );
      }
    } catch (e) {
      console.error('[NPOApps] Rate limit check failed (non-blocking):', e);
    }

    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');

    // Phase 9: Timing-safe password verification
    const { valid } = verifySuperAdminPassword(password);
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all NPO applications
    const { data: applications, error: appsError } = await supabase
      .from('montree_npo_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (appsError) {
      console.error('NPO applications fetch error:', appsError);
      return NextResponse.json({ error: 'Failed to fetch NPO applications' }, { status: 500 });
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
    console.error('Super admin NPO applications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { applicationId, status, reviewNotes, rejectionReason, password } = body;

    // Phase 9: Timing-safe password verification
    const { valid: patchValid } = verifySuperAdminPassword(password);
    if (!patchValid) {
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
      .from('montree_npo_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // If approving, handle school updates
    if (status === 'approved') {
      if (application.school_id) {
        // Update existing school
        const { error: updateSchoolError } = await supabase
          .from('montree_schools')
          .update({
            account_type: 'community_impact',
            npo_verified: true,
            updated_at: now,
          })
          .eq('id', application.school_id);

        if (updateSchoolError) {
          console.error('Failed to update school:', updateSchoolError);
          return NextResponse.json({ error: 'Failed to update school' }, { status: 500 });
        }
      } else {
        // Create new school record
        const { data: newSchool, error: createSchoolError } = await supabase
          .from('montree_schools')
          .insert({
            account_type: 'community_impact',
            npo_verified: true,
            organization_name: application.organization_name,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (createSchoolError) {
          console.error('Failed to create school:', createSchoolError);
          return NextResponse.json({ error: 'Failed to create school' }, { status: 500 });
        }

        // Update application with new school_id
        if (newSchool) {
          const { error: updateAppError } = await supabase
            .from('montree_npo_applications')
            .update({
              school_id: newSchool.id,
            })
            .eq('id', applicationId);

          if (updateAppError) {
            console.error('Failed to link school to application:', updateAppError);
          }
        }
      }
    }

    // Update the application
    const updateData: Record<string, unknown> = {
      status,
      reviewed_by: 'super-admin',
      reviewed_at: now,
    };

    if (reviewNotes) {
      updateData.review_notes = reviewNotes;
    }

    if (rejectionReason && status === 'rejected') {
      updateData.rejection_reason = rejectionReason;
    }

    const { data: updatedApp, error: updateError } = await supabase
      .from('montree_npo_applications')
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
    console.error('PATCH NPO application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
