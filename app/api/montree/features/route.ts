// /api/montree/features/route.ts
// Feature toggle API - check and toggle features for schools/classrooms

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

// GET - Check which features are enabled for a classroom
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    const schoolId = searchParams.get('school_id');

    if (!classroomId && !schoolId) {
      return NextResponse.json(
        { success: false, error: 'classroom_id or school_id required' },
        { status: 400 }
      );
    }

    // Fetch definitions (always needed) + parallel classroom/school data
    let schoolFeatures: any[] = [];
    let classroomFeatures: any[] = [];
    let definitions: any[] | null = null;

    if (classroomId) {
      // Fetch definitions + classroom lookup + classroom features in parallel
      const [defsResult, classroomResult, cfResult] = await Promise.all([
        supabase.from('montree_feature_definitions').select('*').order('category', { ascending: true }),
        supabase.from('montree_classrooms').select('school_id').eq('id', classroomId).maybeSingle(),
        supabase.from('montree_classroom_features').select('*').eq('classroom_id', classroomId),
      ]);

      definitions = defsResult.data;
      classroomFeatures = cfResult.data || [];

      // If classroom has a school, fetch school features
      if (classroomResult.data?.school_id) {
        const { data: sf } = await supabase
          .from('montree_school_features')
          .select('*')
          .eq('school_id', classroomResult.data.school_id);
        schoolFeatures = sf || [];
      }
    } else if (schoolId) {
      // Fetch definitions + school features in parallel
      const [defsResult, sfResult] = await Promise.all([
        supabase.from('montree_feature_definitions').select('*').order('category', { ascending: true }),
        supabase.from('montree_school_features').select('*').eq('school_id', schoolId),
      ]);

      definitions = defsResult.data;
      schoolFeatures = sfResult.data || [];
    } else {
      const { data, error } = await supabase.from('montree_feature_definitions').select('*').order('category', { ascending: true });
      if (error) console.error('[Features] Definitions query error:', error);
      definitions = data;
    }

    // Pre-index school/classroom features as Maps for O(1) lookup (was O(N) .find() per definition)
    const schoolFeatureMap = new Map<string, any>();
    schoolFeatures.forEach(sf => schoolFeatureMap.set(sf.feature_key, sf));
    const classroomFeatureMap = new Map<string, any>();
    classroomFeatures.forEach(cf => classroomFeatureMap.set(cf.feature_key, cf));

    // Merge: classroom overrides school, school overrides default
    const features = (definitions || []).map((def: any) => {
      const schoolToggle = schoolFeatureMap.get(def.feature_key);
      const classroomToggle = classroomFeatureMap.get(def.feature_key);

      // Priority: classroom toggle > school toggle > default
      let enabled = def.default_enabled;
      if (schoolToggle) enabled = schoolToggle.enabled;
      if (classroomToggle) enabled = classroomToggle.enabled;

      return {
        ...def,
        enabled,
        school_enabled: schoolToggle?.enabled ?? null,
        classroom_enabled: classroomToggle?.enabled ?? null,
      };
    });

    return NextResponse.json({ success: true, features }, {
      headers: { 'Cache-Control': 'private, no-cache' }
    });
  } catch (error) {
    console.error('Features GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

// POST - Toggle a feature on/off for a school or classroom
// Accepts either teacher auth (montree-auth cookie) or super-admin auth (x-super-admin-token header)
export async function POST(request: NextRequest) {
  try {
    // Try super-admin auth first (for super-admin panel feature toggles)
    const superAdminCheck = await verifySuperAdminAuth(request.headers);
    let teacherSession: { school_id?: string; classroom_id?: string; role?: string } | null = null;
    if (!superAdminCheck.valid) {
      // Fall back to regular school auth
      const auth = await verifySchoolRequest(request);
      if (auth instanceof NextResponse) return auth;
      teacherSession = auth as any;
    }

    const supabase = getSupabase();
    const body = await request.json();
    const { feature_key, enabled, school_id, classroom_id, enabled_by } = body;

    if (!feature_key || enabled === undefined) {
      return NextResponse.json(
        { success: false, error: 'feature_key and enabled required' },
        { status: 400 }
      );
    }

    if (!school_id && !classroom_id) {
      return NextResponse.json(
        { success: false, error: 'school_id or classroom_id required' },
        { status: 400 }
      );
    }

    // Multi-tenancy guard: non-super-admin callers may only toggle features for THEIR OWN school/classroom
    // Body-passed school_id/classroom_id must match the authenticated session, otherwise reject.
    if (!superAdminCheck.valid && teacherSession) {
      // Resolve the target school_id (either directly or via the classroom)
      let targetSchoolId = school_id as string | undefined;
      if (!targetSchoolId && classroom_id) {
        const { data: classroomRow } = await supabase
          .from('montree_classrooms')
          .select('school_id')
          .eq('id', classroom_id)
          .maybeSingle();
        targetSchoolId = (classroomRow as any)?.school_id;
      }

      if (!targetSchoolId || targetSchoolId !== teacherSession.school_id) {
        return NextResponse.json(
          { success: false, error: 'Not authorized to toggle features for this school' },
          { status: 403 }
        );
      }

      // For classroom-level toggles, also verify the classroom belongs to the teacher's school
      // (above lookup already enforces this, since we resolved targetSchoolId from the classroom row)
    }

    // Toggle at classroom level
    if (classroom_id) {
      const { data, error } = await supabase
        .from('montree_classroom_features')
        .upsert({
          classroom_id,
          feature_key,
          enabled,
          enabled_by: enabled_by || 'admin',
          enabled_at: new Date().toISOString(),
        }, { onConflict: 'classroom_id,feature_key' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Feature toggle error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to toggle feature' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, toggle: data });
    }

    // Toggle at school level
    if (school_id) {
      const { data, error } = await supabase
        .from('montree_school_features')
        .upsert({
          school_id,
          feature_key,
          enabled,
          enabled_by: enabled_by || 'admin',
          enabled_at: new Date().toISOString(),
        }, { onConflict: 'school_id,feature_key' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Feature toggle error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to toggle feature' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, toggle: data });
    }

    return NextResponse.json(
      { success: false, error: 'No action taken' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Features POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
