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

    // Get all feature definitions
    const { data: definitions } = await supabase
      .from('montree_feature_definitions')
      .select('*')
      .order('category', { ascending: true });

    // Get school-level toggles
    let schoolFeatures: any[] = [];
    if (schoolId) {
      const { data } = await supabase
        .from('montree_school_features')
        .select('*')
        .eq('school_id', schoolId);
      schoolFeatures = data || [];
    }

    // Get classroom-level toggles
    let classroomFeatures: any[] = [];
    if (classroomId) {
      // Also get school_id from classroom
      const { data: classroom } = await supabase
        .from('montree_classrooms')
        .select('school_id')
        .eq('id', classroomId)
        .single();

      if (classroom?.school_id) {
        const { data: sf } = await supabase
          .from('montree_school_features')
          .select('*')
          .eq('school_id', classroom.school_id);
        schoolFeatures = sf || [];
      }

      const { data: cf } = await supabase
        .from('montree_classroom_features')
        .select('*')
        .eq('classroom_id', classroomId);
      classroomFeatures = cf || [];
    }

    // Merge: classroom overrides school, school overrides default
    const features = (definitions || []).map((def: any) => {
      const schoolToggle = schoolFeatures.find((sf: any) => sf.feature_key === def.feature_key);
      const classroomToggle = classroomFeatures.find((cf: any) => cf.feature_key === def.feature_key);
      
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
