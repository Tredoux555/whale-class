// app/api/students/[studentId]/quick-place/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST: Quick place student - sets progress for all areas
export async function POST(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params;
    const { placements, recordedBy } = await request.json();

    if (!placements || typeof placements !== 'object') {
      return NextResponse.json({ success: false, error: 'placements object required' }, { status: 400 });
    }

    // 🚨 Audit fix M3 (Jun 2026): this legacy route is gated by the Whale
    // admin JWT in middleware, but used to forward ANY studentId straight
    // into the quick_place_student RPC — a token holder could forge
    // child_work_progress rows for arbitrary ids (including ids from other
    // tenants' tables). Cheap per-tenant scoping: the student must be a real
    // row in the legacy Whale `children` table (single-school by design;
    // Montree children live in montree_children and are now unreachable from
    // here), and every work id must at least be a UUID.
    if (!UUID_RE.test(studentId)) {
      return NextResponse.json({ success: false, error: 'Valid studentId required' }, { status: 400 });
    }
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('id', studentId)
      .maybeSingle();
    if (childError) {
      console.error('[quick-place POST] child lookup failed:', childError.message);
      return NextResponse.json({ success: false, error: 'Child lookup failed' }, { status: 500 });
    }
    if (!child) {
      console.warn(`[quick-place POST] student ${studentId} not found in Whale children — rejected`);
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const results: any = {};
    let totalWorksSet = 0;

    for (const [area, workId] of Object.entries(placements)) {
      if (!workId) continue;
      if (typeof workId !== 'string' || !UUID_RE.test(workId)) {
        console.warn(`[quick-place POST] non-UUID workId for area ${area} — skipped`);
        results[area] = { success: false, error: 'Invalid work id' };
        continue;
      }

      const { data, error } = await supabase.rpc('quick_place_student', {
        p_child_id: studentId,
        p_classroom_work_id: workId,
        p_recorded_by: recordedBy || null
      });
      
      if (error) {
        results[area] = { success: false, error: error.message };
      } else {
        results[area] = { success: true, worksSet: data };
        totalWorksSet += data || 0;
      }
    }
    
    return NextResponse.json({ 
      success: true, results, totalWorksSet,
      message: `Set progress for ${totalWorksSet} works`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Get current placement status
export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params;
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');

    if (!classroomId) {
      return NextResponse.json({ success: false, error: 'classroomId required' }, { status: 400 });
    }

    // Audit fix M3 (Jun 2026): cheap id validation on the read path too.
    if (!UUID_RE.test(studentId) || !UUID_RE.test(classroomId)) {
      return NextResponse.json({ success: false, error: 'Valid studentId and classroomId required' }, { status: 400 });
    }
    
    // Get all progress
    const { data: progress } = await supabase
      .from('child_work_progress')
      .select('id, status, classroom_work_id')
      .eq('child_id', studentId);
    
    // Get curriculum
    const { data: curriculum } = await supabase
      .from('classroom_curriculum')
      .select('id, area, name, sequence')
      .eq('classroom_id', classroomId)
      .eq('is_active', true);
    
    // Find current position per area
    const areas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const positions: any = {};
    
    for (const area of areas) {
      const areaWorks = curriculum?.filter(w => w.area === area) || [];
      const areaProgress = progress?.filter(p => 
        areaWorks.some(w => w.id === p.classroom_work_id)
      ) || [];
      
      const current = areaProgress.find(p => p.status === 2);
      const lastMastered = areaProgress
        .filter(p => p.status === 3)
        .sort((a, b) => {
          const aSeq = areaWorks.find(w => w.id === a.classroom_work_id)?.sequence || 0;
          const bSeq = areaWorks.find(w => w.id === b.classroom_work_id)?.sequence || 0;
          return bSeq - aSeq;
        })[0];
      
      const currentWork = current ? areaWorks.find(w => w.id === current.classroom_work_id) : null;
      const masteredWork = lastMastered ? areaWorks.find(w => w.id === lastMastered.classroom_work_id) : null;
      
      positions[area] = {
        currentWorkId: current?.classroom_work_id || null,
        currentWorkName: currentWork?.name || null,
        lastMasteredId: lastMastered?.classroom_work_id || null,
        lastMasteredName: masteredWork?.name || null,
        masteredCount: areaProgress.filter(p => p.status === 3).length
      };
    }
    
    return NextResponse.json({ success: true, studentId, classroomId, positions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


