// /api/montree/principal/setup-stream/route.ts
// Real-time streaming setup with Server-Sent Events
import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { CURRICULUM } from '@/lib/montree/curriculum-data';
import { loadAllCurriculumWorks, loadCurriculumAreas } from '@/lib/montree/curriculum-loader';

function generateLoginCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
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
];

const BRAIN_AREA_MAPPING: Record<string, string> = {
  'practical_life': 'practical_life',
  'sensorial': 'sensorial',
  'mathematics': 'mathematics',
  'math': 'mathematics',
  'language': 'language',
  'cultural': 'cultural',
  'culture': 'cultural',
};

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
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

        const createdTeachers: any[] = [];
        const errors: string[] = [];
        const totalClassrooms = classrooms.filter((c: any) => c.name?.trim()).length;
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
            send('warning', { message: `Failed to create ${classroom.name}: ${classroomError?.message}` });
            errors.push(`Failed to create classroom "${classroom.name}"`);
            continue;
          }

          // Seed curriculum areas
          send('progress', {
            step: 'areas',
            message: `Setting up 5 curriculum areas for ${classroom.name}...`,
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

          // Seed curriculum works from Brain with timeout protection
          send('progress', {
            step: 'curriculum',
            message: `Loading Montessori curriculum from the Brain...`,
            emoji: '🧠'
          });

          // Fetch with timeout to prevent hanging
          let brainWorks: any[] | null = null;
          let brainError: any = null;

          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Brain fetch timeout')), 10000)
            );

            const fetchPromise = supabase
              .from('montessori_works')
              .select('*')
              .order('sequence_order');

            const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
            brainWorks = result.data;
            brainError = result.error;
          } catch (timeoutErr) {
            send('progress', {
              step: 'brain_timeout',
              message: `Brain connection slow, using built-in curriculum...`,
              emoji: '⏱️'
            });
            brainError = timeoutErr;
          }

          let worksCount = 0;

          if (brainError || !brainWorks?.length) {
            send('progress', {
              step: 'curriculum_fallback',
              message: `Using built-in curriculum (Brain unavailable)...`,
              emoji: '📚'
            });
            // Fallback to static curriculum
            worksCount = await seedFromStaticCurriculum(supabase, createdClassroom.id, areaMap, send);
          } else {
            send('progress', {
              step: 'curriculum_seed',
              message: `Seeding ${brainWorks.length} Montessori works...`,
              emoji: '🌱',
              total: brainWorks.length
            });

            const worksToInsert: any[] = [];
            for (const work of brainWorks) {
              const mappedAreaKey = BRAIN_AREA_MAPPING[work.curriculum_area] || 'practical_life';
              const areaUuid = areaMap[mappedAreaKey];
              if (!areaUuid) continue;

              worksToInsert.push({
                classroom_id: createdClassroom.id,
                area_id: areaUuid,
                work_key: work.slug || work.name.toLowerCase().replace(/\s+/g, '_'),
                name: work.name,
                name_chinese: work.name_chinese || null,
                description: work.parent_explanation_simple || null,
                age_range: work.age_min && work.age_max ? `${work.age_min}-${work.age_max}` : '3-6',
                sequence: work.sequence_order || 999,
                is_active: true,
                direct_aims: work.direct_aims || [],
                indirect_aims: work.indirect_aims || [],
                materials: work.materials_needed || [],
                control_of_error: work.control_of_error || null,
                prerequisites: work.readiness_indicators || [],
                quick_guide: work.quick_guide || null,
                presentation_steps: work.presentation_steps || [],
                presentation_notes: work.presentation_notes || null,
                parent_description: work.parent_explanation_detailed || null,
                why_it_matters: work.parent_why_it_matters || null,
                video_search_terms: work.video_search_term || null,
              });
            }

            // Batch insert in chunks with retry logic for reliability
            const BATCH_SIZE = 50;
            const MAX_RETRIES = 3;

            for (let i = 0; i < worksToInsert.length; i += BATCH_SIZE) {
              const batch = worksToInsert.slice(i, i + BATCH_SIZE);
              let success = false;

              for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
                const { error: worksError } = await supabase
                  .from('montree_classroom_curriculum_works')
                  .insert(batch);

                if (worksError) {
                  if (attempt < MAX_RETRIES) {
                    send('progress', {
                      step: 'retry',
                      message: `Retrying batch (attempt ${attempt + 1}/${MAX_RETRIES})...`,
                      emoji: '🔄'
                    });
                    await new Promise(r => setTimeout(r, 500 * attempt)); // Backoff
                  } else {
                    send('warning', { message: `Some works failed after ${MAX_RETRIES} attempts` });
                  }
                } else {
                  success = true;
                }
              }

              worksCount += batch.length;
              send('progress', {
                step: 'curriculum_progress',
                message: `Inserted ${worksCount}/${worksToInsert.length} works...`,
                emoji: '📝',
                current: worksCount,
                total: worksToInsert.length
              });
            }
          }

          send('progress', {
            step: 'curriculum_done',
            message: `✓ ${worksCount} curriculum works ready for ${classroom.name}`,
            emoji: '✅'
          });

          // Create teachers
          const teachersToCreate = classroom.teachers.filter((t: any) => t.name?.trim());

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
        send('error', { message: error instanceof Error ? error.message : 'Unknown error' });
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
  supabase: any,
  classroomId: string,
  areaMap: Record<string, string>,
  send: (event: string, data: any) => void
): Promise<number> {
  // Use the new curriculum loader that merges structure + guides
  const allWorks = loadAllCurriculumWorks();

  const worksToInsert: any[] = [];

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
