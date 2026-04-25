import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dmfncjjtsoxrnvcdnvjq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';
const AMY_ID = 'ddf3d943-6517-4250-9080-794e1e11303c';

if (!SUPABASE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Step 1: Get Amy from children table
  const { data: children, error: childErr } = await supabase
    .from('montree_children')
    .select('id, name, classroom_id')
    .eq('classroom_id', CLASSROOM_ID)
    .eq('is_active', true)
    .order('name');

  const amy = children?.find(c => c.name === 'Amy');
  console.log('Amy from DB:', amy);
  console.log('Amy ID matches hardcoded:', amy?.id === AMY_ID);

  const childId = amy?.id ?? AMY_ID;
  const classroomId = amy?.classroom_id ?? CLASSROOM_ID;

  // Step 2: Language area
  const { data: langArea, error: e2 } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_key', 'language')
    .maybeSingle();
  console.log('langArea:', langArea, 'error:', e2?.message);

  if (!langArea) { console.log('NO LANG AREA — returning []'); return; }

  // Step 3: Language works
  const { data: langWorks, error: e3 } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name')
    .eq('classroom_id', classroomId)
    .eq('area_id', langArea.id);
  console.log('langWorks count:', langWorks?.length, 'error:', e3?.message);
  if (!langWorks || langWorks.length === 0) { console.log('NO LANG WORKS — returning []'); return; }

  const workIdToName = new Map();
  for (const w of langWorks) workIdToName.set(w.id, w.name);
  const langWorkIds = Array.from(workIdToName.keys());
  console.log('langWorkIds count:', langWorkIds.length);

  // Step 4: Direct photos
  const { data: directPhotos, error: e4 } = await supabase
    .from('montree_media')
    .select('work_id, captured_at')
    .eq('child_id', childId)
    .in('work_id', langWorkIds)
    .or('identification_status.is.null,identification_status.neq.pending_review')
    .not('work_id', 'is', null);
  console.log('directPhotos count:', directPhotos?.length, 'error:', e4?.message);
  if (directPhotos?.length > 0) {
    console.log('Sample direct photos:', directPhotos.slice(0, 3));
  }

  // Step 5: Group links
  const { data: groupLinks, error: e5 } = await supabase
    .from('montree_media_children')
    .select('media_id')
    .eq('child_id', childId);
  console.log('groupLinks count:', groupLinks?.length, 'error:', e5?.message);

  // Step 6: Group photos
  if (groupLinks && groupLinks.length > 0) {
    const mediaIds = groupLinks.map(l => l.media_id);
    const { data: gPhotos, error: e6 } = await supabase
      .from('montree_media')
      .select('work_id, captured_at')
      .in('id', mediaIds)
      .in('work_id', langWorkIds)
      .or('identification_status.is.null,identification_status.neq.pending_review')
      .not('work_id', 'is', null);
    console.log('groupPhotos count:', gPhotos?.length, 'error:', e6?.message);
    if (gPhotos?.length > 0) {
      console.log('Sample group photos:', gPhotos.slice(0, 3));
    }
  }
}

main().catch(console.error);
