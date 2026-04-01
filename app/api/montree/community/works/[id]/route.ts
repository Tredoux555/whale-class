// /api/montree/community/works/[id]/route.ts
// GET: Single work detail (public) + PATCH: Admin edit

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';

// GET - Single work detail (public, no auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('montree_community_works')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    // Only show approved works to public (admin needs password to see unapproved)
    if (data.status !== 'approved') {
      const adminPw = request.headers.get('x-admin-password') || '';
      if (!adminPw || !verifySuperAdminPassword(adminPw).valid) {
        return NextResponse.json({ error: 'Work not found' }, { status: 404 });
      }
    }

    // Increment view count (fire and forget — race-safe via rpc or tolerate slight inaccuracy)
    supabase
      .from('montree_community_works')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id)
      .then(() => {});

    return NextResponse.json({ work: data }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' }
    });
  } catch (error) {
    console.error('Community work GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Admin edit work (approve/reject/edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify super admin
    const password = request.headers.get('x-admin-password') || '';
    if (!verifySuperAdminPassword(password).valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const body = await request.json();

    const allowedFields = [
      'title', 'description', 'detailed_description', 'area', 'category',
      'age_range', 'materials', 'direct_aims', 'indirect_aims', 'control_of_error',
      'prerequisites', 'presentation_steps', 'variations', 'extensions',
      'status', 'admin_notes', 'ai_guide', 'ai_guide_generated_at',
      'photos', 'videos', 'pdfs', 'cover_photo_index',
    ];

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Track approval
    if (body.status === 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = 'super-admin';
    }

    const { data, error } = await supabase
      .from('montree_community_works')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Community work PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update work' }, { status: 500 });
    }

    return NextResponse.json({ success: true, work: data });
  } catch (error) {
    console.error('Community work PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Admin delete work
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const password = request.headers.get('x-admin-password') || '';
    if (!verifySuperAdminPassword(password).valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Delete media files from storage first
    const { data: work } = await supabase
      .from('montree_community_works')
      .select('photos, videos, pdfs')
      .eq('id', id)
      .maybeSingle();

    if (work) {
      const paths: string[] = [];
      for (const p of (work.photos || [])) paths.push(p.storage_path);
      for (const v of (work.videos || [])) paths.push(v.storage_path);
      for (const d of (work.pdfs || [])) paths.push(d.storage_path);

      if (paths.length > 0) {
        await supabase.storage.from('montree-media').remove(paths);
      }
    }

    const { error } = await supabase
      .from('montree_community_works')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Community work DELETE error:', error);
      return NextResponse.json({ error: 'Failed to delete work' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Community work DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
