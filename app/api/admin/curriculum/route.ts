import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// CLASSROOM CURRICULUM CRUD API
// Manages works in montree_classroom_curriculum_works

const WHALE_CLASSROOM_ID = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/curriculum - List all curriculum works for the classroom
export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  // Get areas
  const { data: areas } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id, area_key, name, icon, color, sequence')
    .eq('classroom_id', WHALE_CLASSROOM_ID)
    .eq('is_active', true)
    .order('sequence');

  // Get all works
  const { data: works, error } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, work_key, name, area_id, category_key, category_name, sequence')
    .eq('classroom_id', WHALE_CLASSROOM_ID)
    .order('sequence');

  if (error) {
    console.error('Error fetching curriculum:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map area_id to area_key for frontend
  const areaIdToKey = new Map(areas?.map(a => [a.id, a.area_key]) || []);
  
  const worksWithArea = (works || []).map(w => ({
    ...w,
    area: areaIdToKey.get(w.area_id) || 'unknown'
  }));

  return NextResponse.json({ 
    works: worksWithArea,
    areas: areas || [],
    classroomId: WHALE_CLASSROOM_ID
  });
}

// POST /api/admin/curriculum - Add a new work
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const body = await request.json();

  const { name, area, linkOrphans } = body;

  if (!name || !area) {
    return NextResponse.json({ error: 'Name and area are required' }, { status: 400 });
  }

  // Get area ID
  const { data: areaData } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', WHALE_CLASSROOM_ID)
    .eq('area_key', area)
    .single();

  if (!areaData) {
    return NextResponse.json({ error: 'Invalid area' }, { status: 400 });
  }

  // Get max sequence order for this area
  const { data: maxSeqData } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('sequence')
    .eq('classroom_id', WHALE_CLASSROOM_ID)
    .eq('area_id', areaData.id)
    .order('sequence', { ascending: false })
    .limit(1);

  const maxSequence = maxSeqData?.[0]?.sequence || 0;

  // Generate work_key
  const workKey = `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50)}_${Date.now()}`;

  // Insert new work
  const newWorkId = uuidv4();
  const { error: insertError } = await supabase
    .from('montree_classroom_curriculum_works')
    .insert({
      id: newWorkId,
      classroom_id: WHALE_CLASSROOM_ID,
      area_id: areaData.id,
      work_key: workKey,
      name: name.trim(),
      sequence: maxSequence + 1
    });

  if (insertError) {
    console.error('Error adding work:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // If linkOrphans is true, link all weekly_assignments with this work_name
  if (linkOrphans) {
    const { data: orphans } = await supabase
      .from('weekly_assignments')
      .select('id')
      .is('work_id', null)
      .ilike('work_name', name.trim());

    if (orphans && orphans.length > 0) {
      await supabase
        .from('weekly_assignments')
        .update({ work_id: newWorkId })
        .is('work_id', null)
        .ilike('work_name', name.trim());
      
      console.log(`[Curriculum] Linked ${orphans.length} orphaned assignments to "${name}"`);
    }
  }

  return NextResponse.json({ 
    success: true, 
    work: { id: newWorkId, name, area, work_key: workKey, sequence: maxSequence + 1 }
  });
}
