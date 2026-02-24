// /api/montree/curriculum/photo/route.ts
// POST: Upload a photo for a curriculum work
// Returns the public URL of the uploaded photo

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const formData = await request.formData();
    const workId = formData.get('work_id') as string;
    const photo = formData.get('photo') as File | null;

    if (!workId) {
      return NextResponse.json({ error: 'work_id required' }, { status: 400 });
    }
    if (!photo) {
      return NextResponse.json({ error: 'photo required' }, { status: 400 });
    }
    if (photo.size > MAX_PHOTO_SIZE) {
      return NextResponse.json({ error: 'Photo too large (max 10MB)' }, { status: 400 });
    }

    // Verify the work exists and belongs to the user's school
    const { data: work, error: workErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, classroom_id')
      .eq('id', workId)
      .single();

    if (workErr || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    // Upload to Supabase Storage
    const ext = (photo.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `curriculum/${workId}/${filename}`;

    const buffer = await photo.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from('montree-media')
      .upload(storagePath, buffer, {
        contentType: photo.type || 'image/jpeg',
        upsert: false,
      });

    if (uploadErr) {
      console.error('Curriculum photo upload error:', uploadErr);
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    // Build public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const photoUrl = `${supabaseUrl}/storage/v1/object/public/montree-media/${storagePath}`;

    // Update the work record
    const { error: updateErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
      .eq('id', workId);

    if (updateErr) {
      console.error('Curriculum photo update error:', updateErr);
      return NextResponse.json({ error: 'Failed to save photo URL' }, { status: 500 });
    }

    return NextResponse.json({ success: true, photo_url: photoUrl });
  } catch (error) {
    console.error('Curriculum photo API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove photo from a curriculum work
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { work_id } = await request.json();

    if (!work_id) {
      return NextResponse.json({ error: 'work_id required' }, { status: 400 });
    }

    // Get current photo URL to delete from storage
    const { data: work } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('photo_url')
      .eq('id', work_id)
      .single();

    if (work?.photo_url) {
      // Extract storage path from URL
      const match = work.photo_url.match(/montree-media\/(.+)$/);
      if (match) {
        await supabase.storage.from('montree-media').remove([match[1]]);
      }
    }

    // Clear the photo_url
    await supabase
      .from('montree_classroom_curriculum_works')
      .update({ photo_url: null, updated_at: new Date().toISOString() })
      .eq('id', work_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Curriculum photo DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
