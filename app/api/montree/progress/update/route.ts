// /api/montree/progress/update/route.ts
// Update work progress status for a child in Montree
// FIXED: Uses UPSERT to prevent duplicate records

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Normalize status to standard string format
function normalizeStatus(status: any): string {
  if (typeof status === 'number') {
    const map: Record<number, string> = {
      0: 'not_started',
      1: 'presented',
      2: 'practicing',
      3: 'mastered'
    };
    return map[status] || 'not_started';
  }
  if (status === 'completed') return 'mastered';
  const valid = ['not_started', 'presented', 'practicing', 'mastered'];
  return valid.includes(status) ? status : 'not_started';
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { child_id, work_key, work_name, status, area, notes, is_focus } = body;

    if (!child_id || (!work_key && !work_name)) {
      return NextResponse.json({ error: 'child_id and work_key/work_name required' }, { status: 400 });
    }

    // Verify child exists and get classroom_id for curriculum sync
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', child_id)
      .single();

    if (childError || !child) {
      console.error('[progress/update] Child not found:', child_id);
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const classroomId = child.classroom_id;

    // Normalize status
    const statusStr = normalizeStatus(status);
    const workNameToSave = work_name || work_key;
    const now = new Date().toISOString();

    // Build the record for upsert
    const record: any = {
      child_id,
      work_name: workNameToSave,
      area: area || null,
      status: statusStr,
      updated_at: now,
    };

    // Only set presented_at if not already set (first time)
    // Only set mastered_at if status is mastered
    if (statusStr === 'mastered') {
      record.mastered_at = now;
    }
    if (notes !== undefined) {
      record.notes = notes;
    }
    // Note: is_focus triggers update to montree_child_focus_works table (see below)

    // Use UPSERT with ON CONFLICT
    // This requires the unique_child_work constraint from migration 111
    const { data, error } = await supabase
      .from('montree_child_progress')
      .upsert(record, {
        onConflict: 'child_id,work_name',
        ignoreDuplicates: false, // Update on conflict
      })
      .select('id, status')
      .single();

    if (error) {
      // If unique constraint doesn't exist yet, fall back to manual check
      if (error.code === '42P10' || error.message?.includes('constraint')) {

        // Check if exists
        const { data: existing } = await supabase
          .from('montree_child_progress')
          .select('id')
          .eq('child_id', child_id)
          .eq('work_name', workNameToSave)
          .single();

        if (existing) {
          // Update
          const { error: updateError } = await supabase
            .from('montree_child_progress')
            .update({
              status: statusStr,
              area: area || null,
              updated_at: now,
              mastered_at: statusStr === 'mastered' ? now : null,
              notes: notes !== undefined ? notes : undefined,
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('[progress/update] Fallback update error:', updateError);
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
          }
        } else {
          // Insert
          record.presented_at = now;
          const { error: insertError } = await supabase
            .from('montree_child_progress')
            .insert(record);

          if (insertError) {
            console.error('[progress/update] Fallback insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
          }
        }
      } else {
        console.error('[progress/update] Upsert error:', error);
        return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
      }
    }

    // AUTO-SYNC: Ensure work exists in curriculum (prevents orphaned progress records)
    if (classroomId && workNameToSave && area) {
      try {
        // Check if work exists in curriculum
        const { data: existingWork } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id')
          .eq('classroom_id', classroomId)
          .ilike('name', workNameToSave)
          .maybeSingle();

        if (!existingWork) {
          // Get area_id for this area
          const { data: areaData } = await supabase
            .from('montree_classroom_curriculum_areas')
            .select('id')
            .eq('classroom_id', classroomId)
            .eq('area_key', area)
            .maybeSingle();

          if (areaData) {
            // Get next sequence number
            const { data: maxSeq } = await supabase
              .from('montree_classroom_curriculum_works')
              .select('sequence')
              .eq('area_id', areaData.id)
              .order('sequence', { ascending: false })
              .limit(1)
              .maybeSingle();

            const nextSeq = (maxSeq?.sequence || 0) + 1;

            // Create curriculum entry for this work
            const workKey = `custom_${area}_${Date.now()}`;
            await supabase
              .from('montree_classroom_curriculum_works')
              .insert({
                classroom_id: classroomId,
                area_id: areaData.id,
                work_key: workKey,
                name: workNameToSave,
                sequence: nextSeq,
                is_custom: true,
                is_active: true,
              });
          }
        }
      } catch (syncErr) {
        // Don't fail the request if sync fails - progress was already saved
        console.error('[progress/update] Curriculum sync error (non-fatal):', syncErr);
      }
    }

    // If is_focus is true, also update the focus-works table
    if (is_focus && area) {
      try {
        const { error: focusError } = await supabase
          .from('montree_child_focus_works')
          .upsert({
            child_id,
            area: area,
            work_name: workNameToSave,
            set_at: now,
            set_by: 'teacher',
            updated_at: now,
          }, {
            onConflict: 'child_id,area',
          });

        if (focusError) {
          console.error('[progress/update] Focus works update failed:', focusError);
          // Don't fail the whole request, progress was saved successfully
        }
      } catch (focusErr) {
        console.error('[progress/update] Focus works error:', focusErr);
      }
    }

    return NextResponse.json({ success: true, status: statusStr, data });

  } catch (error) {
    console.error('[progress/update] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
