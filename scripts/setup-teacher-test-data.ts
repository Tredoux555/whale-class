// scripts/setup-teacher-test-data.ts
// Script to create test teacher and students for Teacher Dashboard testing

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupTestData() {
  try {
    console.log('🚀 Setting up test data for Teacher Dashboard...\n');

    // Step 1: Create teacher user
    console.log('1. Creating teacher user...');
    const teacherEmail = 'teacher@test.whale';
    const teacherPassword = 'test123456';

    // Check if teacher already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingTeacher = existingUsers?.users?.find(u => u.email === teacherEmail);

    let teacherId: string;

    if (existingTeacher) {
      console.log('   Teacher already exists, using existing user');
      teacherId = existingTeacher.id;
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: teacherEmail,
        password: teacherPassword,
        email_confirm: true,
        user_metadata: {
          name: 'Test Teacher',
        },
      });

      if (authError) {
        throw new Error(`Failed to create teacher: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create teacher user');
      }

      teacherId = authData.user.id;
      console.log(`   ✅ Teacher created: ${teacherEmail} (ID: ${teacherId})`);
    }

    // Step 2: Assign teacher role
    console.log('\n2. Assigning teacher role...');
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: teacherId,
        role_name: 'teacher',
      }, {
        onConflict: 'user_id',
      });

    if (roleError) {
      console.warn(`   ⚠️  Role assignment warning: ${roleError.message}`);
    } else {
      console.log('   ✅ Teacher role assigned');
    }

    // Step 3: Create test students
    console.log('\n3. Creating test students...');
    const testStudents = [
      { name: 'Alice Johnson', date_of_birth: '2019-05-15', age_group: '4-5' },
      { name: 'Bob Smith', date_of_birth: '2020-03-20', age_group: '3-4' },
      { name: 'Charlie Brown', date_of_birth: '2019-11-10', age_group: '4-5' },
      { name: 'Diana Prince', date_of_birth: '2020-07-25', age_group: '3-4' },
      { name: 'Emma Watson', date_of_birth: '2019-08-30', age_group: '4-5' },
    ];

    const studentIds: string[] = [];

    for (const student of testStudents) {
      // Check if student exists
      const { data: existing } = await supabase
        .from('children')
        .select('id')
        .eq('name', student.name)
        .single();

      if (existing) {
        console.log(`   Student "${student.name}" already exists, using existing`);
        studentIds.push(existing.id);
        continue;
      }

      const { data: childData, error: childError } = await supabase
        .from('children')
        .insert({
          name: student.name,
          date_of_birth: student.date_of_birth,
          age_group: student.age_group,
          parent_email: `${student.name.toLowerCase().replace(' ', '.')}@test.whale`,
          parent_name: `Parent of ${student.name}`,
          active_status: true,
        })
        .select('id')
        .single();

      if (childError) {
        console.error(`   ❌ Failed to create ${student.name}: ${childError.message}`);
        continue;
      }

      if (childData) {
        studentIds.push(childData.id);
        console.log(`   ✅ Created: ${student.name} (ID: ${childData.id})`);
      }
    }

    if (studentIds.length === 0) {
      throw new Error('No students were created');
    }

    // Step 4: Link students to teacher
    console.log('\n4. Linking students to teacher...');
    let linkedCount = 0;

    for (const studentId of studentIds) {
      const { error: linkError } = await supabase
        .from('teacher_students')
        .upsert({
          teacher_id: teacherId,
          student_id: studentId,
          is_active: true,
        }, {
          onConflict: 'teacher_id,student_id',
        });

      if (linkError) {
        console.warn(`   ⚠️  Failed to link student ${studentId}: ${linkError.message}`);
      } else {
        linkedCount++;
      }
    }

    console.log(`   ✅ Linked ${linkedCount} students to teacher`);

    // Step 5: Create some work completions for testing
    console.log('\n5. Creating sample work completions...');
    
    // Get some curriculum works
    const { data: works } = await supabase
      .from('curriculum_roadmap')
      .select('id, levels')
      .limit(10);

    if (works && works.length > 0) {
      let completionCount = 0;
      for (let i = 0; i < Math.min(studentIds.length, 3); i++) {
        const studentId = studentIds[i];
        const work = works[i % works.length];
        const maxLevel = work.levels?.length || 1;

        // Create some completed works
        const { error: completeError } = await supabase
          .from('child_work_completion')
          .upsert({
            child_id: studentId,
            work_id: work.id,
            status: i === 0 ? 'completed' : 'in_progress',
            current_level: i === 0 ? maxLevel : 1,
            max_level: maxLevel,
            started_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
            completed_at: i === 0 ? new Date().toISOString() : null,
            assigned_by: teacherId,
          }, {
            onConflict: 'child_id,work_id',
          });

        if (!completeError) {
          completionCount++;
        }
      }
      console.log(`   ✅ Created ${completionCount} work completions`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test Data Setup Complete!');
    console.log('='.repeat(50));
    console.log(`\n📧 Teacher Login:`);
    console.log(`   Email: ${teacherEmail}`);
    console.log(`   Password: ${teacherPassword}`);
    console.log(`\n👥 Students Created: ${studentIds.length}`);
    console.log(`\n🔗 Students Linked: ${linkedCount}`);
    console.log(`\n🌐 Login URL: http://localhost:3000/auth/teacher-login`);
    console.log(`\n📊 Dashboard URL: http://localhost:3000/teacher/dashboard`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error setting up test data:', error);
    process.exit(1);
  }
}

setupTestData();


