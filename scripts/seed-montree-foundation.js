// scripts/seed-montree-foundation.js
// Seeds the Montree Foundation tables with real Whale Class data
// Run: node scripts/seed-montree-foundation.js

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Whale Class children with Chinese names
const WHALE_CLASS_CHILDREN = [
  { name: 'Rachel', name_chinese: '蕊姗', age: 4 },
  { name: 'Leo', name_chinese: '狮昂', age: 3 },
  { name: 'Ines', name_chinese: '伊涅丝', age: 4 },
  { name: 'Eason', name_chinese: '奕森', age: 4 },
  { name: 'Candice', name_chinese: '坎迪斯', age: 3 },
  { name: 'Alex', name_chinese: '爱乐思', age: 4 },
  { name: 'Nicole', name_chinese: '倪可', age: 4 },
  { name: 'Lyla', name_chinese: '莱拉', age: 3 },
  { name: 'Maisy', name_chinese: '梅茜', age: 4 },
  { name: 'Ann', name_chinese: '安安', age: 4 },
  { name: 'Niuniu', name_chinese: '妞妞', age: 3 },
  { name: 'Joanna', name_chinese: '乔安娜', age: 4 },
  { name: 'Eva', name_chinese: '伊娃', age: 3 },
  { name: 'Mingxi', name_chinese: '明曦', age: 4 },
  { name: 'Tony', name_chinese: '托尼', age: 4 },
  { name: 'Choco', name_chinese: '巧克', age: 3 },
  { name: 'Yida', name_chinese: '怡达', age: 4 },
  { name: 'Stella', name_chinese: '斯特拉', age: 4 }
];

// Curriculum areas
const CURRICULUM_AREAS = [
  { area_key: 'practical_life', name: 'Practical Life', name_chinese: '日常生活', icon: '🏠', color: '#8B4513', sequence: 1 },
  { area_key: 'sensorial', name: 'Sensorial', name_chinese: '感官教育', icon: '👁️', color: '#4169E1', sequence: 2 },
  { area_key: 'math', name: 'Mathematics', name_chinese: '数学', icon: '🔢', color: '#228B22', sequence: 3 },
  { area_key: 'language', name: 'Language', name_chinese: '语言', icon: '📖', color: '#DC143C', sequence: 4 },
  { area_key: 'cultural', name: 'Cultural', name_chinese: '文化教育', icon: '🌍', color: '#9932CC', sequence: 5 }
];

// Sample works per area (for testing)
const SAMPLE_WORKS = {
  practical_life: [
    { work_key: 'pl_carrying_mat', name: 'Carrying a Mat', name_chinese: '搬运地垫', age_range: '2.5-4', sequence: 1 },
    { work_key: 'pl_pouring_dry', name: 'Pouring (Dry)', name_chinese: '干物倾倒', age_range: '2.5-3', sequence: 2 },
    { work_key: 'pl_pouring_water', name: 'Pouring Water', name_chinese: '水的倾倒', age_range: '3-4', sequence: 3 },
    { work_key: 'pl_spooning', name: 'Spooning', name_chinese: '舀物练习', age_range: '2.5-3.5', sequence: 4 },
    { work_key: 'pl_tweezers', name: 'Tweezers Transfer', name_chinese: '镊子夹物', age_range: '3-4', sequence: 5 },
    { work_key: 'pl_buttoning', name: 'Buttoning Frame', name_chinese: '扣纽扣框', age_range: '3-4', sequence: 6 },
    { work_key: 'pl_zipping', name: 'Zipping Frame', name_chinese: '拉链框', age_range: '3-4', sequence: 7 },
    { work_key: 'pl_snapping', name: 'Snapping Frame', name_chinese: '按扣框', age_range: '2.5-3.5', sequence: 8 }
  ],
  sensorial: [
    { work_key: 'se_pink_tower', name: 'Pink Tower', name_chinese: '粉红塔', age_range: '2.5-4', sequence: 1 },
    { work_key: 'se_brown_stair', name: 'Brown Stair', name_chinese: '棕色梯', age_range: '2.5-4', sequence: 2 },
    { work_key: 'se_red_rods', name: 'Red Rods', name_chinese: '红棒', age_range: '3-4', sequence: 3 },
    { work_key: 'se_cylinder_blocks', name: 'Cylinder Blocks', name_chinese: '圆柱体组', age_range: '2.5-4', sequence: 4 },
    { work_key: 'se_color_boxes', name: 'Color Boxes', name_chinese: '色板', age_range: '3-5', sequence: 5 },
    { work_key: 'se_geometric_solids', name: 'Geometric Solids', name_chinese: '几何立体组', age_range: '3.5-5', sequence: 6 }
  ],
  math: [
    { work_key: 'ma_number_rods', name: 'Number Rods', name_chinese: '数棒', age_range: '3.5-4.5', sequence: 1 },
    { work_key: 'ma_sandpaper_numbers', name: 'Sandpaper Numbers', name_chinese: '砂纸数字', age_range: '3.5-4.5', sequence: 2 },
    { work_key: 'ma_spindle_box', name: 'Spindle Box', name_chinese: '纺锤棒箱', age_range: '3.5-4.5', sequence: 3 },
    { work_key: 'ma_cards_counters', name: 'Cards and Counters', name_chinese: '数字与筹码', age_range: '4-5', sequence: 4 },
    { work_key: 'ma_golden_beads', name: 'Golden Beads Introduction', name_chinese: '金珠介绍', age_range: '4-5', sequence: 5 }
  ],
  language: [
    { work_key: 'la_sandpaper_letters', name: 'Sandpaper Letters', name_chinese: '砂纸字母', age_range: '3-5', sequence: 1 },
    { work_key: 'la_moveable_alphabet', name: 'Moveable Alphabet', name_chinese: '活动字母', age_range: '3.5-5', sequence: 2 },
    { work_key: 'la_sound_games', name: 'Sound Games (I Spy)', name_chinese: '声音游戏', age_range: '2.5-4', sequence: 3 },
    { work_key: 'la_metal_insets', name: 'Metal Insets', name_chinese: '金属嵌板', age_range: '3.5-5', sequence: 4 },
    { work_key: 'la_reading_phonetic', name: 'Reading Phonetic Words', name_chinese: '拼读单词', age_range: '4-6', sequence: 5 }
  ],
  cultural: [
    { work_key: 'cu_continent_map', name: 'Puzzle Map - Continents', name_chinese: '世界地图拼图', age_range: '3.5-6', sequence: 1 },
    { work_key: 'cu_land_water_forms', name: 'Land and Water Forms', name_chinese: '陆地水域模型', age_range: '3.5-5', sequence: 2 },
    { work_key: 'cu_botany_cabinet', name: 'Botany Cabinet', name_chinese: '植物学柜', age_range: '3.5-5', sequence: 3 },
    { work_key: 'cu_zoology_cards', name: 'Zoology Classification Cards', name_chinese: '动物分类卡', age_range: '3.5-5', sequence: 4 }
  ]
};

async function seedFoundation() {
  console.log('🐋 SEEDING MONTREE FOUNDATION TABLES');
  console.log('====================================\n');

  // Get the school ID
  const { data: schools } = await supabase
    .from('montree_schools')
    .select('id')
    .eq('slug', 'beijing-international')
    .single();
  
  if (!schools) {
    console.error('❌ Beijing International School not found!');
    return;
  }
  
  const schoolId = schools.id;
  console.log('✅ Found school:', schoolId);

  // STEP 1: Create Whale Class classroom
  console.log('\n📍 Creating Whale Class classroom...');
  
  const { data: classroom, error: classroomError } = await supabase
    .from('montree_classrooms')
    .upsert({
      school_id: schoolId,
      name: 'Whale Class',
      age_group: '3-6',
      is_active: true
    }, {
      onConflict: 'school_id,name',
      ignoreDuplicates: false
    })
    .select()
    .single();
  
  if (classroomError) {
    // Try insert without upsert
    const { data: newClassroom, error: insertError } = await supabase
      .from('montree_classrooms')
      .insert({
        school_id: schoolId,
        name: 'Whale Class',
        age_group: '3-6',
        is_active: true
      })
      .select()
      .single();
    
    if (insertError && !insertError.message.includes('duplicate')) {
      console.error('❌ Error creating classroom:', insertError.message);
      return;
    }
    
    // Get existing if duplicate
    if (insertError?.message.includes('duplicate')) {
      const { data: existingClassroom } = await supabase
        .from('montree_classrooms')
        .select('*')
        .eq('school_id', schoolId)
        .eq('name', 'Whale Class')
        .single();
      
      console.log('✅ Using existing classroom:', existingClassroom.id);
      await seedRest(schoolId, existingClassroom.id);
      return;
    }
    
    console.log('✅ Created classroom:', newClassroom.id);
    await seedRest(schoolId, newClassroom.id);
    return;
  }
  
  console.log('✅ Created/found classroom:', classroom.id);
  await seedRest(schoolId, classroom.id);
}

async function seedRest(schoolId, classroomId) {
  // STEP 2: Add name_chinese column to montree_children if it doesn't exist
  console.log('\n📍 Checking montree_children columns...');
  
  // Try to add the column (will fail silently if exists)
  await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE montree_children ADD COLUMN IF NOT EXISTS name_chinese TEXT;`
  }).catch(() => {
    // Column might already exist or RPC might not exist
    console.log('   (Column check via RPC failed, trying direct approach)');
  });
  
  // STEP 3: Upsert children with classroom assignment
  console.log('\n📍 Seeding Whale Class children...');
  
  for (const child of WHALE_CLASS_CHILDREN) {
    const { data, error } = await supabase
      .from('montree_children')
      .upsert({
        name: child.name,
        age: child.age,
        classroom_id: classroomId
      }, {
        onConflict: 'name'
      })
      .select();
    
    if (error && !error.message.includes('duplicate')) {
      // Try insert
      const { error: insertError } = await supabase
        .from('montree_children')
        .insert({
          name: child.name,
          age: child.age,
          classroom_id: classroomId
        });
      
      if (insertError && !insertError.message.includes('duplicate')) {
        console.log(`   ⚠️ ${child.name}: ${insertError.message}`);
      } else {
        console.log(`   ✅ ${child.name}`);
      }
    } else {
      console.log(`   ✅ ${child.name}`);
    }
  }
  
  // Update existing children without classroom to have classroom_id
  await supabase
    .from('montree_children')
    .update({ classroom_id: classroomId })
    .is('classroom_id', null);
  
  // STEP 4: Seed classroom curriculum areas
  console.log('\n📍 Seeding curriculum areas...');
  
  const areaIds = {};
  
  for (const area of CURRICULUM_AREAS) {
    const { data, error } = await supabase
      .from('montree_classroom_curriculum_areas')
      .insert({
        classroom_id: classroomId,
        area_key: area.area_key,
        name: area.name,
        name_chinese: area.name_chinese,
        icon: area.icon,
        color: area.color,
        sequence: area.sequence,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      if (error.message.includes('duplicate')) {
        // Get existing
        const { data: existing } = await supabase
          .from('montree_classroom_curriculum_areas')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('area_key', area.area_key)
          .single();
        
        areaIds[area.area_key] = existing?.id;
        console.log(`   ✅ ${area.name} (existing)`);
      } else {
        console.log(`   ❌ ${area.name}: ${error.message}`);
      }
    } else {
      areaIds[area.area_key] = data.id;
      console.log(`   ✅ ${area.name}`);
    }
  }
  
  // STEP 5: Seed curriculum works
  console.log('\n📍 Seeding curriculum works...');
  
  for (const [areaKey, works] of Object.entries(SAMPLE_WORKS)) {
    const areaId = areaIds[areaKey];
    if (!areaId) {
      console.log(`   ⚠️ Skipping ${areaKey} - no area ID`);
      continue;
    }
    
    for (const work of works) {
      const { error } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert({
          classroom_id: classroomId,
          area_id: areaId,
          work_key: work.work_key,
          name: work.name,
          name_chinese: work.name_chinese,
          age_range: work.age_range,
          sequence: work.sequence,
          is_active: true,
          category_key: areaKey,
          category_name: CURRICULUM_AREAS.find(a => a.area_key === areaKey)?.name
        });
      
      if (error && !error.message.includes('duplicate')) {
        console.log(`   ❌ ${work.name}: ${error.message}`);
      }
    }
    
    console.log(`   ✅ ${areaKey}: ${works.length} works`);
  }
  
  // STEP 6: Create sample assignments for first 3 children
  console.log('\n📍 Creating sample assignments...');
  
  // Get children
  const { data: children } = await supabase
    .from('montree_children')
    .select('id, name')
    .eq('classroom_id', classroomId)
    .limit(3);
  
  // Get some works
  const { data: works } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, area_id')
    .eq('classroom_id', classroomId)
    .limit(10);
  
  if (children && works) {
    for (const child of children) {
      // Assign 3-5 works to each child with varying statuses
      const statuses = ['mastered', 'practicing', 'presented', 'not_started'];
      
      for (let i = 0; i < Math.min(5, works.length); i++) {
        const work = works[i];
        const status = statuses[i % statuses.length];
        
        const { error } = await supabase
          .from('montree_child_assignments')
          .insert({
            child_id: child.id,
            work_id: work.id,
            status: status,
            presented_at: status !== 'not_started' ? new Date().toISOString() : null,
            mastered_at: status === 'mastered' ? new Date().toISOString() : null
          });
        
        if (error && !error.message.includes('duplicate')) {
          console.log(`   ⚠️ ${child.name} - ${work.name}: ${error.message}`);
        }
      }
      
      console.log(`   ✅ ${child.name}: 5 assignments`);
    }
  }
  
  console.log('\n====================================');
  console.log('🐋 SEEDING COMPLETE!');
  console.log('\nYou can now test the AI endpoints with:');
  console.log('  node scripts/test-montree-ai.js');
}

seedFoundation().catch(console.error);
