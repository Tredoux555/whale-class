import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// Types for request validation
interface StudentInput {
  name: string;
  age?: number;
  gender?: 'boy' | 'girl';
  tenure?: string;
  notes?: string;
  progress?: Record<string, string | null>;
}

interface BulkImportRequest {
  classroomId: string;
  students: StudentInput[];
}

interface BulkImportResponse {
  success: boolean;
  created: number;
  failed?: number;
  errors?: string[];
  children: Array<{ id: string; name: string }>;
}

// Tenure to months mapping for enrollment date calculation
const TENURE_MONTHS: Record<string, number> = {
  'new': 0,
  'few_weeks': 1,
  '1_3_months': 2,
  '3_6_months': 4,
  '6_12_months': 9,
  '1_year_plus': 15,
};


function getEnrolledAtFromTenure(tenure?: string): string {
  const months = tenure ? TENURE_MONTHS[tenure] || 0 : 0;
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}

function validateRequest(body: unknown): BulkImportRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const { classroomId, students } = body as Record<string, unknown>;

  // Validate classroomId
  if (!classroomId || typeof classroomId !== 'string') {
    throw new Error('classroomId is required and must be a UUID string');
  }

  // Validate students array
  if (!Array.isArray(students)) {
    throw new Error('students must be an array');
  }

  if (students.length === 0) {
    throw new Error('At least 1 student is required');
  }

  if (students.length > 30) {
    throw new Error('Maximum 30 students per bulk import');
  }

  // Validate each student
  students.forEach((student, index) => {
    if (!student || typeof student !== 'object') {
      throw new Error(`Student at index ${index} must be an object`);
    }

    const { name, age, gender, tenure, notes, progress } = student as Record<string, unknown>;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error(`Student at index ${index} must have a non-empty name`);
    }

    if (age !== undefined && (typeof age !== 'number' || age < 0 || age > 100)) {
      throw new Error(`Student at index ${index} has invalid age`);
    }

    if (gender !== undefined && !['boy', 'girl'].includes(gender as string)) {
      throw new Error(`Student at index ${index} has invalid gender`);
    }

    if (tenure !== undefined && !TENURE_MONTHS.hasOwnProperty(tenure as string)) {
      throw new Error(`Student at index ${index} has invalid tenure`);
    }

    if (notes !== undefined && typeof notes !== 'string') {
      throw new Error(`Student at index ${index} notes must be a string`);
    }

    if (progress !== undefined && typeof progress !== 'object') {
      throw new Error(`Student at index ${index} progress must be an object`);
    }
  });

  return { classroomId, students: students as StudentInput[] };
}

async function getCurriculumWorks(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string
) {
  try {
    // Fetch curriculum areas for this classroom
    const { data: areas, error: areasError } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', classroomId);

    if (areasError) throw areasError;
    if (!areas || areas.length === 0) {
      // No curriculum yet - return empty so students can still be created without progress
      return { areaMap: {}, works: [] };
    }

    const areaMap = Object.fromEntries(areas.map((a) => [a.area_key, a.id]));

    // Fetch all curriculum works for this classroom
    const { data: works, error: worksError } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, work_key, name, name_chinese, area_id, sequence')
      .eq('classroom_id', classroomId)
      .order('sequence', { ascending: true });

    if (worksError) throw worksError;

    return { areaMap, works: works || [] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(
      `Failed to fetch curriculum: ${message}`
    );
  }
}

async function buildProgressRecords(
  works: Array<{
    id: string;
    work_key: string;
    name: string;
    name_chinese: string | null;
    area_id: string;
    sequence: number;
  }>,
  studentProgress: Record<string, string | null> | undefined,
  areaMap: Record<string, string>,
  childId: string
) {
  const progressRecords: Array<{
    child_id: string;
    work_name: string;
    work_name_chinese: string | null;
    area: string;
    status: 'presented' | 'mastered';
    presented_at: string;
    mastered_at: string | null;
  }> = [];

  if (!studentProgress) return progressRecords;

  const now = new Date().toISOString();

  // Build a reverse map from area UUID to area_key
  const areaIdToKey: Record<string, string> = {};
  for (const [key, uuid] of Object.entries(areaMap)) {
    areaIdToKey[uuid] = key;
  }

  // Group works by area_id
  const worksByArea: Record<string, typeof works> = {};
  for (const w of works) {
    const key = String(w.area_id);
    if (!worksByArea[key]) worksByArea[key] = [];
    worksByArea[key].push(w);
  }

  // Process each area the student has progress in
  for (const [areaKey, selectedWorkId] of Object.entries(studentProgress)) {
    if (selectedWorkId === null || selectedWorkId === undefined) continue;

    const areaUuid = areaMap[areaKey];
    if (!areaUuid) continue;

    const areaWorks = (worksByArea[areaUuid] || []).sort((a, b) => a.sequence - b.sequence);
    const selectedWorkIndex = areaWorks.findIndex((w) => w.id === selectedWorkId || w.work_key === selectedWorkId);

    if (selectedWorkIndex === -1) continue;

    // Mark all prior works as mastered
    for (let i = 0; i < selectedWorkIndex; i++) {
      const work = areaWorks[i];
      progressRecords.push({
        child_id: childId,
        work_name: work.name,
        work_name_chinese: work.name_chinese,
        area: areaKey,
        status: 'mastered',
        presented_at: now,
        mastered_at: now,
      });
    }

    // Mark selected work as presented
    const selectedWork = areaWorks[selectedWorkIndex];
    progressRecords.push({
      child_id: childId,
      work_name: selectedWork.name,
      work_name_chinese: selectedWork.name_chinese,
      area: areaKey,
      status: 'presented',
      presented_at: now,
      mastered_at: null,
    });
  }

  return progressRecords;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { classroomId, students } = validateRequest(body);

    const supabase = getSupabase();

    // Fetch curriculum data (non-fatal: students can still be created without progress)
    let areaMap: Record<string, string> = {};
    let works: Array<{ id: string; work_key: string; name: string; name_chinese: string | null; area_id: string; sequence: number }> = [];
    try {
      const curriculum = await getCurriculumWorks(supabase, classroomId);
      areaMap = curriculum.areaMap;
      works = curriculum.works;
    } catch (currErr: any) {
      console.warn('Curriculum fetch failed (non-fatal, students will still be created):', currErr?.message);
    }

    // Prepare data structures
    // Note: Only insert columns known to exist on the live DB
    // Safe columns: id, classroom_id, name, age, notes, enrolled_at
    // Risky columns (may not exist): settings, is_active, gender
    const childrenToInsert: Array<Record<string, any>> = [];

    const studentMap: Map<string, StudentInput> = new Map();
    const errors: string[] = [];
    let createdCount = 0;

    // Prepare children records
    students.forEach((student, index) => {
      try {
        const childId = crypto.randomUUID();
        const enrolledAt = getEnrolledAtFromTenure(student.tenure);

        const childRecord: Record<string, any> = {
          id: childId,
          classroom_id: classroomId,
          name: student.name.trim(),
          age: student.age ? Math.round(student.age) : null,
          notes: student.notes ?? null,
          enrolled_at: enrolledAt,
        };
        // Only include settings if gender provided (column may not exist on older DBs)
        if (student.gender) {
          childRecord.settings = { gender: student.gender };
        }

        childrenToInsert.push(childRecord);
        studentMap.set(childId, student);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Student at index ${index} ("${student.name}"): ${msg}`);
      }
    });

    // If no valid students, return error
    if (childrenToInsert.length === 0) {
      return NextResponse.json(
        {
          success: false,
          created: 0,
          failed: students.length,
          errors,
          children: [],
        },
        { status: 400 }
      );
    }

    // Batch insert children
    const { data: insertedChildren, error: insertError } = await supabase
      .from('montree_children')
      .insert(childrenToInsert)
      .select('id, name');

    if (insertError) {
      throw new Error(`Failed to insert children: ${insertError.message}`);
    }

    if (!insertedChildren || insertedChildren.length === 0) {
      throw new Error('No children were inserted');
    }

    createdCount = insertedChildren.length;

    // Build all progress records
    let progressRecordsToInsert: Array<{
      child_id: string;
      work_name: string;
      work_name_chinese: string | null;
      area: string;
      status: 'presented' | 'mastered';
      presented_at: string;
      mastered_at: string | null;
    }> = [];

    for (const child of insertedChildren) {
      const student = studentMap.get(child.id);
      if (!student) continue;

      const records = await buildProgressRecords(
        works,
        student.progress,
        areaMap,
        child.id
      );

      progressRecordsToInsert = progressRecordsToInsert.concat(records);
    }

    // Batch insert progress records if any
    if (progressRecordsToInsert.length > 0) {
      const { error: progressError } = await supabase
        .from('montree_child_progress')
        .upsert(progressRecordsToInsert, { onConflict: 'child_id,work_name' });

      if (progressError) {
        console.error('Warning: Failed to insert some progress records', progressError);
        errors.push(`Progress records warning: ${progressError.message}`);
      }
    }

    const response: BulkImportResponse = {
      success: true,
      created: createdCount,
      children: insertedChildren,
    };

    if (errors.length > 0) {
      response.failed = students.length - createdCount;
      response.errors = errors;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Bulk import error:', errorMsg);

    // Validation errors (from validateRequest) should be 400
    // Database/server errors should be 500
    const isValidation = errorMsg.includes('must have') ||
                         errorMsg.includes('must be') ||
                         errorMsg.includes('is required') ||
                         errorMsg.includes('At least') ||
                         errorMsg.includes('Maximum');

    return NextResponse.json(
      {
        success: false,
        created: 0,
        errors: [errorMsg],
        children: [],
      },
      { status: isValidation ? 400 : 500 }
    );
  }
}
