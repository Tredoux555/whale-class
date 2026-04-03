/**
 * CLIP-Only Test Endpoint
 *
 * Lightweight endpoint for testing CLIP classification on individual photos.
 * No Haiku, no Sonnet — just CLIP/SigLIP classification with visual memory boost.
 * Used by the photo audit page's batch "Run CLIP" feature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest, type VerifiedRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { tryClassify } from '@/lib/montree/classifier/classify-orchestrator';
import type { VisualMemory } from '@/lib/montree/classifier';

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth as VerifiedRequest;

  let body: { media_id: string; child_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { media_id, child_id } = body;
  if (!media_id || !child_id) {
    return NextResponse.json({ error: 'media_id and child_id required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // 1. Look up photo URL + child's classroom_id in parallel
  const [mediaRes, childRes] = await Promise.all([
    supabase
      .from('montree_media')
      .select('url, storage_path')
      .eq('id', media_id)
      .maybeSingle(),
    supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', child_id)
      .eq('school_id', schoolId)
      .maybeSingle(),
  ]);

  if (mediaRes.error || !mediaRes.data) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }
  if (childRes.error || !childRes.data) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const photoUrl = mediaRes.data.url || mediaRes.data.storage_path;
  const classroomId = childRes.data.classroom_id;

  if (!photoUrl) {
    return NextResponse.json({ error: 'Photo has no URL' }, { status: 400 });
  }

  // 2. Fetch visual memories for this classroom
  let visualMemories: VisualMemory[] = [];
  if (classroomId) {
    const { data: vmData } = await supabase
      .from('montree_visual_memory')
      .select('work_name, work_key, visual_description, description_confidence')
      .eq('classroom_id', classroomId)
      .gt('times_used', 0);

    if (vmData) {
      visualMemories = vmData.map((vm) => ({
        work_name: vm.work_name,
        work_key: vm.work_key,
        visual_description: vm.visual_description,
        confidence: vm.description_confidence ?? 0,
      }));
    }
  }

  // 3. Run CLIP classification
  const startMs = Date.now();
  const decision = await tryClassify(photoUrl, classroomId, visualMemories);
  const elapsedMs = Date.now() - startMs;

  return NextResponse.json({
    classified: decision.classified,
    action: decision.action,
    reason: decision.reason,
    clipResult: decision.clipResult,
    elapsed_ms: elapsedMs,
    visual_memories_count: visualMemories.length,
  });
}
