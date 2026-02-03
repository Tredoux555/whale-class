// /api/montree/admin/backfill-curriculum/route.ts
// One-time backfill: Assign curriculum to classrooms that don't have it
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CURRICULUM } from '@/lib/montree/curriculum-data';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Build curriculum records for a classroom
function buildCurriculumRecords(classroomId: string) {
  const records: any[] = [];
  let globalSequence = 0;

  for (const area of CURRICULUM) {
    for (const category of area.categories) {
      for (const work of category.works) {
        globalSequence++;
        records.push({
          classroom_id: classroomId,
          area_id: area.id,
          work_key: work.id,
          name: work.name,
          name_chinese: work.chineseName || null,
          description: work.description || null,
          age_range: work.ageRange || '3-6',
          sequence: globalSequence,
          materials: work.materials || [],
          levels: work.levels || [],
          is_active: true,
        });
      }
    }
  }

  return records;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // SECURITY: Require authentication
    const headerSchoolId = request.headers.get('x-school-id');
    if (!headerSchoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const { classroomId, schoolId: bodySchoolId } = await request.json();
    const schoolId = bodySchoolId || headerSchoolId;
    
    // SECURITY: Verify classroom belongs to authenticated school
    if (classroomId) {
      const { data: classroom } = await supabase
        .from('montree_classrooms')
        .select('school_id')
        .eq('id', classroomId)
        .single();
      
      if (!classroom || classroom.school_id !== headerSchoolId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const results: any[] = [];

    // If specific classroom provided, just backfill that one
    if (classroomId) {
      // Check if classroom already has curriculum
      const { count } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('*', { count: 'exact', head: true })
        .eq('classroom_id', classroomId);

      if (count && count > 0) {
        return NextResponse.json({
          message: `Classroom already has ${count} curriculum items`,
          skipped: true
        });
      }

      const records = buildCurriculumRecords(classroomId);
      const { error } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(records);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        classroomId,
        worksAssigned: records.length
      });
    }

    // If school provided, backfill all classrooms in that school
    if (schoolId) {
      // SECURITY: Can only backfill own school
      if (schoolId !== headerSchoolId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      const { data: classrooms } = await supabase
        .from('montree_classrooms')
        .select('id, name')
        .eq('school_id', schoolId);

      for (const classroom of classrooms || []) {
        // Check existing
        const { count } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('*', { count: 'exact', head: true })
          .eq('classroom_id', classroom.id);

        if (count && count > 0) {
          results.push({ classroom: classroom.name, skipped: true, existing: count });
          continue;
        }

        const records = buildCurriculumRecords(classroom.id);
        const { error } = await supabase
          .from('montree_classroom_curriculum_works')
          .insert(records);

        if (error) {
          results.push({ classroom: classroom.name, error: error.message });
        } else {
          results.push({ classroom: classroom.name, worksAssigned: records.length });
        }
      }

      return NextResponse.json({ success: true, results });
    }

    // SECURITY: Prevent backfilling ALL classrooms globally - only allow specific school
    // Default to authenticated school
    const { data: allClassrooms } = await supabase
      .from('montree_classrooms')
      .select('id, name, school_id')
      .eq('school_id', headerSchoolId);

    for (const classroom of allClassrooms || []) {
      const { count } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('*', { count: 'exact', head: true })
        .eq('classroom_id', classroom.id);

      if (count && count > 0) {
        results.push({ classroom: classroom.name, skipped: true, existing: count });
        continue;
      }

      const records = buildCurriculumRecords(classroom.id);
      const { error } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(records);

      if (error) {
        results.push({ classroom: classroom.name, error: error.message });
      } else {
        results.push({ classroom: classroom.name, worksAssigned: records.length });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
