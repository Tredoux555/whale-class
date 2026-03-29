// GET  /api/montree/pulse         — Check pulse lock status for classroom
// POST /api/montree/pulse         — Start pulse generation (acquire lock)
// PATCH /api/montree/pulse        — Complete pulse generation (release lock)
//
// Data sources:
//   montree_pulse_lock — Concurrent generation prevention (30-min timeout)
//   montree_children — Classroom roster
//   montree_child_progress — Per-child work progress for insight generation
//   RPCs: acquire_pulse_lock, complete_pulse_lock
import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    // Fetch current pulse lock status for this classroom
    const { data: lock, error: lockErr } = await supabase
      .from('montree_pulse_lock')
      .select('classroom_id, locked_by, locked_at, batch_index, total_children, status, completed_at')
      .eq('classroom_id', auth.classroomId)
      .maybeSingle();

    if (lockErr) {
      console.error('[Pulse] Lock status error:', lockErr);
      return NextResponse.json({ error: 'Failed to check pulse status' }, { status: 500 });
    }

    if (!lock) {
      return NextResponse.json({
        status: 'idle',
        batch_index: 0,
        total_children: 0,
        locked_by: null,
        completed_at: null,
      });
    }

    // Check if lock is stale (>30 min)
    const lockedAt = new Date(lock.locked_at).getTime();
    const isStale = lock.status === 'in_progress' && (Date.now() - lockedAt > 30 * 60 * 1000);

    return NextResponse.json({
      status: isStale ? 'stale' : lock.status,
      batch_index: lock.batch_index,
      total_children: lock.total_children,
      locked_by: lock.locked_by,
      completed_at: lock.completed_at,
    }, {
      headers: { 'Cache-Control': 'private, no-cache' },
    });
  } catch (err) {
    console.error('[Pulse] GET unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    // Count children in this classroom
    const { data: children, error: childrenErr } = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', auth.classroomId)
      .order('name');

    if (childrenErr) {
      console.error('[Pulse] Children fetch error:', childrenErr);
      return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
    }

    if (!children || children.length === 0) {
      return NextResponse.json({ error: 'No children in classroom' }, { status: 400 });
    }

    // Acquire pulse lock via RPC (atomic — prevents concurrent generation)
    const { data: acquired, error: lockErr } = await supabase
      .rpc('acquire_pulse_lock', {
        p_classroom_id: auth.classroomId,
        p_teacher_id: auth.userId,
        p_total_children: children.length,
      });

    if (lockErr) {
      console.error('[Pulse] Lock acquire error:', lockErr);
      return NextResponse.json({ error: 'Failed to start pulse generation' }, { status: 500 });
    }

    if (!acquired) {
      return NextResponse.json({ error: 'Pulse generation already in progress' }, { status: 409 });
    }

    // Fetch progress data for all children in classroom
    const childIds = children.map((c: { id: string }) => c.id);
    const { data: progress, error: progressErr } = await supabase
      .from('montree_child_progress')
      .select('child_id, work_name, status, updated_at, evidence_photo_count')
      .in('child_id', childIds)
      .order('updated_at', { ascending: false });

    if (progressErr) {
      console.error('[Pulse] Progress fetch error:', progressErr);
      // Release lock so teacher can retry
      await supabase.rpc('complete_pulse_lock', { p_classroom_id: auth.classroomId }).catch((err) => {
        console.error('[Pulse] Lock release failed:', err);
      });
      return NextResponse.json({ error: 'Failed to load progress data' }, { status: 500 });
    }

    // Build per-child summary
    const progressMap = new Map<string, Array<{ work_name: string; status: string; updated_at: string; evidence_photo_count: number }>>();
    if (progress) {
      for (const p of progress) {
        const existing = progressMap.get(p.child_id) || [];
        existing.push({
          work_name: p.work_name,
          status: p.status,
          updated_at: p.updated_at,
          evidence_photo_count: p.evidence_photo_count || 0,
        });
        progressMap.set(p.child_id, existing);
      }
    }

    const childSummaries = children.map((c: { id: string; name: string }) => {
      const works = progressMap.get(c.id) || [];
      const mastered = works.filter(w => w.status === 'mastered').length;
      const practicing = works.filter(w => w.status === 'practicing').length;
      const presented = works.filter(w => w.status === 'presented').length;
      const totalPhotos = works.reduce((sum, w) => sum + w.evidence_photo_count, 0);

      // Find stale works (not updated in 7+ days)
      const now = Date.now();
      const staleWorks = works.filter(w => {
        const updatedAt = new Date(w.updated_at).getTime();
        return (now - updatedAt) > 7 * 24 * 60 * 60 * 1000 && w.status !== 'mastered';
      });

      return {
        id: c.id,
        name: c.name,
        mastered,
        practicing,
        presented,
        total_works: works.length,
        total_photos: totalPhotos,
        stale_works: staleWorks.length,
        recent_work: works.length > 0 ? works[0].work_name : null,
      };
    });

    return NextResponse.json({
      success: true,
      total_children: children.length,
      children: childSummaries,
    });
  } catch (err) {
    console.error('[Pulse] POST unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'complete') {
      // Complete pulse generation via RPC
      const { error: completeErr } = await supabase
        .rpc('complete_pulse_lock', {
          p_classroom_id: auth.classroomId,
        });

      if (completeErr) {
        console.error('[Pulse] Complete error:', completeErr);
        return NextResponse.json({ error: 'Failed to complete pulse' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'complete' });

    } else if (action === 'increment') {
      const { expected_index } = body;

      if (typeof expected_index !== 'number' || expected_index < 0) {
        return NextResponse.json({ error: 'expected_index is required' }, { status: 400 });
      }

      // Increment batch index via RPC (atomic counter)
      const { data: newIndex, error: incrementErr } = await supabase
        .rpc('increment_pulse_progress', {
          p_classroom_id: auth.classroomId,
          p_expected_index: expected_index,
        });

      if (incrementErr) {
        console.error('[Pulse] Increment error:', incrementErr);
        return NextResponse.json({ error: 'Failed to increment progress' }, { status: 500 });
      }

      if (newIndex === -1) {
        return NextResponse.json({ error: 'Progress increment failed — stale index' }, { status: 409 });
      }

      return NextResponse.json({ success: true, action: 'increment', new_index: newIndex });

    } else if (action === 'fail') {
      // Mark pulse as failed
      const { error: failErr } = await supabase
        .from('montree_pulse_lock')
        .update({ status: 'failed' })
        .eq('classroom_id', auth.classroomId)
        .eq('status', 'in_progress');

      if (failErr) {
        console.error('[Pulse] Fail error:', failErr);
        return NextResponse.json({ error: 'Failed to mark pulse as failed' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'fail' });

    } else {
      return NextResponse.json({ error: 'Invalid action. Use: complete, increment, fail' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Pulse] PATCH unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
