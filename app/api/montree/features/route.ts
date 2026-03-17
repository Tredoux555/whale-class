// /api/montree/features/route.ts
// Feature toggle API - check and toggle features for schools/classrooms

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

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
        supabase.from('montree_classrooms').select('school_id').eq('id', classroomId).single(),
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
      const { data } = await supabase.from('montree_feature_definitions').select('*').order('category', { ascending: true });
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
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' }
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
export async function POST(request: NextRequest) {
  try {
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
        .single();

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
        .single();

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
