// /api/montree/curriculum/route.ts
// GET/POST curriculum works for a classroom

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default area definitions
const DEFAULT_AREAS = [
  { area_key: 'practical_life', name: 'Practical Life', name_chinese: '日常生活', icon: '🧹', color: '#10B981', sequence: 1 },
  { area_key: 'sensorial', name: 'Sensorial', name_chinese: '感官', icon: '👁️', color: '#F59E0B', sequence: 2 },
  { area_key: 'mathematics', name: 'Mathematics', name_chinese: '数学', icon: '🔢', color: '#3B82F6', sequence: 3 },
  { area_key: 'language', name: 'Language', name_chinese: '语言', icon: '📚', color: '#EC4899', sequence: 4 },
  { area_key: 'cultural', name: 'Cultural', name_chinese: '文化', icon: '🌍', color: '#8B5CF6', sequence: 5 },
];

// Default works by area_key
const DEFAULT_WORKS: Record<string, Array<{ name: string; name_chinese: string; age_range: string }>> = {
  practical_life: [
    { name: 'Pouring Water', name_chinese: '倒水', age_range: '2.5-4' },
    { name: 'Spooning Beans', name_chinese: '舀豆子', age_range: '2.5-4' },
    { name: 'Folding Clothes', name_chinese: '叠衣服', age_range: '3-5' },
    { name: 'Dressing Frames', name_chinese: '衣饰框', age_range: '3-5' },
    { name: 'Care of Environment', name_chinese: '照顾环境', age_range: '3-6' },
    { name: 'Flower Arranging', name_chinese: '插花', age_range: '3-6' },
    { name: 'Food Preparation', name_chinese: '食物制备', age_range: '3-6' },
    { name: 'Cutting with Scissors', name_chinese: '剪纸', age_range: '3-5' },
    { name: 'Braiding', name_chinese: '编辫子', age_range: '4-6' },
    { name: 'Washing Table', name_chinese: '洗桌子', age_range: '3-5' },
  ],
  sensorial: [
    { name: 'Pink Tower', name_chinese: '粉红塔', age_range: '2.5-4' },
    { name: 'Brown Stair', name_chinese: '棕色梯', age_range: '2.5-4' },
    { name: 'Red Rods', name_chinese: '红棒', age_range: '2.5-4' },
    { name: 'Color Tablets', name_chinese: '色板', age_range: '3-5' },
    { name: 'Geometric Cabinet', name_chinese: '几何图橱', age_range: '3-5' },
    { name: 'Binomial Cube', name_chinese: '二项式', age_range: '3.5-5' },
    { name: 'Trinomial Cube', name_chinese: '三项式', age_range: '4-6' },
    { name: 'Sound Cylinders', name_chinese: '音筒', age_range: '3-5' },
    { name: 'Smelling Bottles', name_chinese: '嗅觉瓶', age_range: '3-5' },
    { name: 'Tasting Bottles', name_chinese: '味觉瓶', age_range: '3-5' },
  ],
  mathematics: [
    { name: 'Number Rods', name_chinese: '数棒', age_range: '3-4' },
    { name: 'Sandpaper Numerals', name_chinese: '砂纸数字', age_range: '3-4' },
    { name: 'Spindle Box', name_chinese: '纺锤棒箱', age_range: '3.5-4.5' },
    { name: 'Cards and Counters', name_chinese: '数字与筹码', age_range: '3.5-4.5' },
    { name: 'Golden Beads', name_chinese: '金色珠子', age_range: '4-6' },
    { name: 'Teen Boards', name_chinese: '塞根板', age_range: '4-5' },
    { name: 'Hundred Board', name_chinese: '百数板', age_range: '4-6' },
    { name: 'Addition Snake Game', name_chinese: '加法蛇', age_range: '4.5-6' },
    { name: 'Stamp Game', name_chinese: '邮票游戏', age_range: '5-6' },
    { name: 'Bead Frame', name_chinese: '珠算架', age_range: '5-6' },
  ],
  language: [
    { name: 'Sandpaper Letters', name_chinese: '砂纸字母', age_range: '2.5-4' },
    { name: 'Moveable Alphabet', name_chinese: '活动字母', age_range: '3.5-5' },
    { name: 'Metal Insets', name_chinese: '金属嵌板', age_range: '3-5' },
    { name: 'Object Box', name_chinese: '实物盒', age_range: '3-4' },
    { name: 'Pink Series', name_chinese: '粉色系列', age_range: '4-5' },
    { name: 'Blue Series', name_chinese: '蓝色系列', age_range: '4.5-5.5' },
    { name: 'Green Series', name_chinese: '绿色系列', age_range: '5-6' },
    { name: 'Grammar Symbols', name_chinese: '语法符号', age_range: '5-6' },
    { name: 'Sentence Analysis', name_chinese: '句子分析', age_range: '5.5-6' },
    { name: 'Reading Classification', name_chinese: '阅读分类', age_range: '5-6' },
  ],
  cultural: [
    { name: 'Globe - Land & Water', name_chinese: '地球仪', age_range: '3-4' },
    { name: 'Puzzle Maps', name_chinese: '拼图地图', age_range: '3.5-6' },
    { name: 'Land & Water Forms', name_chinese: '陆地水域', age_range: '4-6' },
    { name: 'Botany Cabinet', name_chinese: '植物图橱', age_range: '3.5-5' },
    { name: 'Leaf Shapes', name_chinese: '叶形', age_range: '4-6' },
    { name: 'Parts of a Flower', name_chinese: '花的部分', age_range: '4-6' },
    { name: 'Life Cycles', name_chinese: '生命周期', age_range: '4-6' },
    { name: 'Animal Classification', name_chinese: '动物分类', age_range: '4-6' },
    { name: 'Science Experiments', name_chinese: '科学实验', age_range: '4-6' },
    { name: 'Art Activities', name_chinese: '艺术活动', age_range: '3-6' },
  ],
};

// GET - Fetch curriculum for classroom
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    const area = searchParams.get('area');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    // Fetch works with area info
    let query = supabase
      .from('montree_classroom_curriculum_works')
      .select(`
        *,
        area:montree_classroom_curriculum_areas!area_id (
          id, area_key, name, name_chinese, icon, color
        )
      `)
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('sequence');

    const { data, error } = await query;

    if (error) {
      console.error('Curriculum fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch curriculum' }, { status: 500 });
    }

    // Group by area_key for display
    const byArea: Record<string, any[]> = {};
    for (const work of data || []) {
      const areaKey = work.area?.area_key || 'other';
      if (!byArea[areaKey]) byArea[areaKey] = [];
      byArea[areaKey].push({
        ...work,
        area_id: work.area?.area_key // Use area_key for frontend compatibility
      });
    }

    return NextResponse.json({ 
      curriculum: data || [],
      byArea,
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Curriculum API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Seed curriculum OR add single work
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classroom_id, action } = body;

    if (!classroom_id) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    // SEED ACTION - Create areas and works
    if (action === 'seed') {
      // Check if already seeded
      const { data: existingAreas } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id')
        .eq('classroom_id', classroom_id)
        .limit(1);

      if (existingAreas && existingAreas.length > 0) {
        return NextResponse.json({ error: 'Curriculum already seeded', seeded: 0 }, { status: 400 });
      }

      // Step 1: Create areas
      const areasToInsert = DEFAULT_AREAS.map(area => ({
        classroom_id,
        ...area,
        is_active: true
      }));

      const { data: insertedAreas, error: areaError } = await supabase
        .from('montree_classroom_curriculum_areas')
        .insert(areasToInsert)
        .select();

      if (areaError) {
        console.error('Area seed error:', areaError);
        return NextResponse.json({ error: 'Failed to seed areas' }, { status: 500 });
      }

      // Build area_key -> UUID map
      const areaMap: Record<string, string> = {};
      for (const area of insertedAreas || []) {
        areaMap[area.area_key] = area.id;
      }

      // Step 2: Create works
      const worksToInsert: any[] = [];
      let seq = 1;
      for (const [areaKey, works] of Object.entries(DEFAULT_WORKS)) {
        const areaId = areaMap[areaKey];
        if (!areaId) continue;
        
        for (const work of works) {
          worksToInsert.push({
            classroom_id,
            area_id: areaId,
            work_key: work.name.toLowerCase().replace(/\s+/g, '_'),
            name: work.name,
            name_chinese: work.name_chinese,
            age_range: work.age_range,
            sequence: seq++,
            is_active: true
          });
        }
      }

      const { error: workError } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(worksToInsert);

      if (workError) {
        console.error('Work seed error:', workError);
        return NextResponse.json({ error: 'Failed to seed works' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        seeded: worksToInsert.length,
        areas: insertedAreas?.length || 0
      });
    }

    // ADD SINGLE WORK
    const { work_key, name, name_chinese, area_key, description } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    // Get area_id from area_key
    const { data: areaData } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', classroom_id)
      .eq('area_key', area_key || 'practical_life')
      .single();

    if (!areaData) {
      return NextResponse.json({ error: 'Area not found - seed curriculum first' }, { status: 400 });
    }

    // Get next sequence
    const { data: existingSeq } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('sequence')
      .eq('classroom_id', classroom_id)
      .order('sequence', { ascending: false })
      .limit(1);

    const nextSequence = (existingSeq?.[0]?.sequence || 0) + 1;

    const { data, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .insert({
        classroom_id,
        area_id: areaData.id,
        work_key: work_key || name.toLowerCase().replace(/\s+/g, '_'),
        name,
        name_chinese: name_chinese || null,
        description: description || null,
        sequence: nextSequence,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: 'Failed to add work' }, { status: 500 });
    }

    return NextResponse.json({ success: true, work: data });

  } catch (error) {
    console.error('Curriculum POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
