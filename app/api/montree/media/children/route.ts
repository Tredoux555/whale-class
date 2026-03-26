// POST /api/montree/media/children — Manage child tags on a photo
// Supports add/remove/set operations on the montree_media_children junction table
// Also updates montree_media.child_id (primary child) when needed

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (!auth.classroomId) {
      return NextResponse.json({ success: false, error: 'No classroom associated' }, { status: 403 });
    }

    const body = await request.json();
    const { media_id, action, child_id, child_ids } = body;

    if (!media_id || typeof media_id !== 'string') {
      return NextResponse.json({ success: false, error: 'media_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify the media belongs to the same school
    const { data: media } = await supabase
      .from('montree_media')
      .select('id, child_id, school_id, classroom_id')
      .eq('id', media_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!media) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    if (action === 'add' && child_id) {
      // Verify child belongs to same school
      const { data: child } = await supabase
        .from('montree_children')
        .select('id')
        .eq('id', child_id)
        .eq('school_id', auth.schoolId)
        .maybeSingle();
      if (!child) {
        return NextResponse.json({ success: false, error: 'Child not found in school' }, { status: 404 });
      }

      // Insert into junction table (UNIQUE constraint handles duplicates)
      const { error } = await supabase
        .from('montree_media_children')
        .upsert({ media_id, child_id }, { onConflict: 'media_id,child_id' });

      if (error) {
        console.error('[Media Children] Add error:', error);
        return NextResponse.json({ success: false, error: 'Failed to add child' }, { status: 500 });
      }

      // If the media has no primary child_id, set this one
      if (!media.child_id) {
        const { error: updateErr } = await supabase.from('montree_media').update({ child_id }).eq('id', media_id);
        if (updateErr) console.error('[Media Children] Primary child_id update error:', updateErr);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'remove' && child_id) {
      const { error } = await supabase
        .from('montree_media_children')
        .delete()
        .eq('media_id', media_id)
        .eq('child_id', child_id);

      if (error) {
        console.error('[Media Children] Remove error:', error);
        return NextResponse.json({ success: false, error: 'Failed to remove child' }, { status: 500 });
      }

      // If removed child was the primary child_id, reassign to first remaining child
      if (media.child_id === child_id) {
        const { data: remaining } = await supabase
          .from('montree_media_children')
          .select('child_id')
          .eq('media_id', media_id)
          .limit(1)
          .maybeSingle();
        const { error: reassignErr } = await supabase
          .from('montree_media')
          .update({ child_id: remaining?.child_id || null })
          .eq('id', media_id);
        if (reassignErr) console.error('[Media Children] Reassign primary child_id error:', reassignErr);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'set' && Array.isArray(child_ids)) {
      // Validate all children belong to the school
      if (child_ids.length > 0) {
        const { data: validChildren } = await supabase
          .from('montree_children')
          .select('id')
          .eq('school_id', auth.schoolId)
          .in('id', child_ids);
        const validIds = new Set((validChildren || []).map((c: any) => c.id));
        const invalidIds = child_ids.filter((id: string) => !validIds.has(id));
        if (invalidIds.length > 0) {
          return NextResponse.json({ success: false, error: 'Some children not found in school' }, { status: 400 });
        }
      }

      // Delete all existing links, then insert new ones
      const { error: deleteErr } = await supabase.from('montree_media_children').delete().eq('media_id', media_id);
      if (deleteErr) {
        console.error('[Media Children] Delete existing links error:', deleteErr);
        return NextResponse.json({ success: false, error: 'Failed to clear existing children' }, { status: 500 });
      }

      if (child_ids.length > 0) {
        const links = child_ids.map((cid: string) => ({ media_id, child_id: cid }));
        const { error } = await supabase.from('montree_media_children').insert(links);
        if (error) {
          console.error('[Media Children] Set error:', error);
          return NextResponse.json({ success: false, error: 'Failed to set children' }, { status: 500 });
        }

        // Set primary child_id to first in list
        await supabase.from('montree_media').update({ child_id: child_ids[0] }).eq('id', media_id);
      } else {
        // No children — clear primary child_id
        await supabase.from('montree_media').update({ child_id: null }).eq('id', media_id);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use add, remove, or set.' }, { status: 400 });
  } catch (error) {
    console.error('[Media Children] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
