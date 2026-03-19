// /api/montree/principal/setup-stream/route.ts
// Real-time streaming setup with Server-Sent Events
import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks, loadCurriculumAreas } from '@/lib/montree/curriculum-loader';
import { legacySha256 } from '@/lib/montree/password';

function generateLoginCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const DEFAULT_AREAS = [
  { area_key: 'practical_life', name: 'Practical Life', name_chinese: '日常生活', icon: '🧹', color: '#10B981', sequence: 1 },
  { area_key: 'sensorial', name: 'Sensorial', name_chinese: '感官', icon: '👁️', color: '#F59E0B', sequence: 2 },
  { area_key: 'mathematics', name: 'Mathematics', name_chinese: '数学', icon: '🔢', color: '#3B82F6', sequence: 3 },
  { area_key: 'language', name: 'Language', name_chinese: '语言', icon: '📚', color: '#EC4899', sequence: 4 },
  { area_key: 'cultural', name: 'Cultural', name_chinese: '文化', icon: '🌍', color: '#8B5CF6', sequence: 5 },
  { area_key: 'special_events', name: 'Special Events', name_chinese: '特别活动', icon: '🎉', color: '#E11D48', sequence: 6 },
];

// Brain area mapping removed — using static curriculum exclusively

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const supabase = getSupabase();
        const { schoolId, classrooms } = await request.json();

        if (!schoolId || !classrooms?.length) {
          send('error', { message: 'Missing schoolId or classrooms' });
          controller.close();
          return;
        }

        // Verify school
        send('progress', { step: 'verify', message: 'Verifying school...', emoji: '🔍' });

        const { data: school, error: schoolError } = await supabase
          .from('montree_schools')
          .select('id, name')
          .eq('id', schoolId)
          .single();

        if (schoolError || !school) {
          send('error', { message: 'School not found' });
          controller.close();
          return;
        }

        send('progress', { step: 'verified', message: `Found ${school.name}`, emoji: '✅' });

        const createdTeachers: Array<{
          id: string;
          name: string;
          email: string | null;
          login_code: string;
          classroom_id: string;
          classroom_name: string;
          classroom_icon: string;
        }> = [];
        const errors: string[] = [];
        const totalClassrooms = classrooms.filter((c: { name?: string }) => c.name?.trim()).length;
        let classroomIndex = 0;

        for (const classroom of classrooms) {
          if (!classroom.name?.trim()) continue;
          classroomIndex++;

          // Create classroom
          send('progress', {
            step: 'classroom',
            message: `Creating classroom ${classroomIndex}/${totalClassrooms}: ${classroom.name}`,
            emoji: classroom.icon || '🏫',
            detail: `${classroom.icon} ${classroom.name}`
          });

          const { data: createdClassroom, error: classroomError } = await supabase
            .from('montree_classrooms')
            .insert({
              school_id: schoolId,
              name: classroom.name.trim(),
              icon: classroom.icon || '📚',
              color: classroom.color || '#10b981',
              is_active: true,
            })
            .select()
            .single();

          if (classroomError || !createdClassroom) {
            console.error('[Setup] Classroom creation failed:', classroomError?.message, classroomError?.code);
            send('warning', { message: `Failed to create ${classroom.name}` });
            errors.push(`Failed to create classroom "${classroom.name}"`);
            continue;
          }

          // Seed curriculum areas
          send('progress', {
            step: 'areas',
            message: `Setting up 6 curriculum areas for ${classroom.name}...`,
            emoji: '📋'
          });

          const areasToInsert = DEFAULT_AREAS.map(area => ({
            classroom_id: createdClassroom.id,
            ...area,
            is_active: true
          }));

          const { data: insertedAreas, error: areaError } = await supabase
            .from('montree_classroom_curriculum_areas')
            .insert(areasToInsert)
            .select();

          if (areaError) {
            send('warning', { message: `Areas failed for ${classroom.name}` });
            errors.push(`Failed to create areas for ${classroom.name}`);
          }

          const areaMap: Record<string, string> = {};
          for (const area of insertedAreas || []) {
            areaMap[area.area_key] = area.id;
          }

          // Seed curriculum from AUTHORITATIVE static JSON files
          // DO NOT use Brain database — it has stale/incomplete data (220 vs 329 works)
          send('progress', {
            step: 'curriculum',
            message: `Loading Montessori curriculum...`,
            emoji: '📚'
          });

          let worksCount = 0;
          worksCount = await seedFromStaticCurriculum(supabase, createdClassroom.id, areaMap, send);

          send('progress', {
            step: 'curriculum_done',
            message: `✓ ${worksCount} curriculum works ready for ${classroom.name}`,
            emoji: '✅'
          });

          // Create teachers
          const teachersToCreate = classroom.teachers.filter((t: { name?: string }) => t.name?.trim());

          if (teachersToCreate.length > 0) {
            send('progress', {
              step: 'teachers',
              message: `Creating ${teachersToCreate.length} teacher account(s)...`,
              emoji: '👩‍🏫'
            });

            for (const teacher of teachersToCreate) {
              const loginCode = generateLoginCode();

              const { data: createdTeacher, error: teacherError } = await supabase
                .from('montree_teachers')
                .insert({
                  school_id: schoolId,
                  classroom_id: createdClassroom.id,
                  name: teacher.name.trim(),
                  email: teacher.email?.trim() || null,
                  login_code: loginCode,
                  password_hash: legacySha256(loginCode),
                  role: 'teacher',
                  is_active: true,
                })
                .select()
                .single();

              if (teacherError || !createdTeacher) {
                send('warning', { message: `Failed to create teacher ${teacher.name}` });
                errors.push(`Failed to create teacher "${teacher.name}"`);
                continue;
              }

              send('progress', {
                step: 'teacher_created',
                message: `Created account for ${teacher.name}`,
                emoji: '🔑',
                detail: teacher.name
              });

              createdTeachers.push({
                id: createdTeacher.id,
                name: createdTeacher.name,
                email: createdTeacher.email,
                login_code: loginCode,
                classroom_id: createdClassroom.id,
                classroom_name: createdClassroom.name,
                classroom_icon: createdClassroom.icon,
              });
            }
          }
        }

        // Done!
        send('complete', {
          teachers: createdTeachers,
          warnings: errors.length > 0 ? errors : undefined,
          message: `Setup complete! Created ${createdTeachers.length} teacher account(s).`
        });

      } catch (error) {
        console.error('[Setup] Fatal error:', error);
        send('error', { message: 'An error occurred during setup' });
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Fallback function for static curriculum - NOW WITH GUIDE DATA!
async function seedFromStaticCurriculum(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
  areaMap: Record<string, string>,
  send: (event: string, data: Record<string, unknown>) => void
): Promise<number> {
  // Use the new curriculum loader that merges structure + guides
  const allWorks = loadAllCurriculumWorks();

  const worksToInsert: Array<Record<string, unknown>> = [];

  for (const work of allWorks) {
    const areaUuid = areaMap[work.area_key];
    if (!areaUuid) continue;

    worksToInsert.push({
      classroom_id: classroomId,
      area_id: areaUuid,
      work_key: work.work_key,
      name: work.name,
      description: work.description || null,
      age_range: work.age_range || '3-6',
      sequence: work.sequence,
      materials: work.materials || [],
      direct_aims: work.direct_aims || [],
      indirect_aims: work.indirect_aims || [],
      control_of_error: work.control_of_error || null,
      prerequisites: work.prerequisites || [],
      is_active: true,
      // NEW: Guide data from comprehensive-guides
      quick_guide: work.quick_guide || null,
      presentation_steps: work.presentation_steps || [],
      parent_description: work.parent_description || null,
      why_it_matters: work.why_it_matters || null,
    });
  }

  send('progress', {
    step: 'curriculum_with_guides',
    message: `Seeding ${worksToInsert.length} works with AMI presentation guides...`,
    emoji: '📚'
  });

  const BATCH_SIZE = 50;
  let count = 0;

  for (let i = 0; i < worksToInsert.length; i += BATCH_SIZE) {
    const batch = worksToInsert.slice(i, i + BATCH_SIZE);
    await supabase.from('montree_classroom_curriculum_works').insert(batch);
    count += batch.length;

    send('progress', {
      step: 'curriculum_progress',
      message: `Inserted ${count}/${worksToInsert.length} works...`,
      emoji: '📝',
      current: count,
      total: worksToInsert.length
    });
  }

  return worksToInsert.length;
}
