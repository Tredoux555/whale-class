// DEPRECATED: Use /api/media instead
// This route is kept for backwards compatibility and proxies to child_work_media table

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  // Redirect to /api/media
  try {
    const supabase = getSupabase();
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const childId = formData.get('childId') as string;
    const assignmentId = formData.get('assignmentId') as string;
    const workId = formData.get('workId') as string;
    const workName = formData.get('workName') as string;
    const weekNumber = formData.get('weekNumber') as string;
    const year = formData.get('year') as string;

    if (!file || !childId || !workName) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${childId}/${timestamp}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('work-photos')
      .upload(filename, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ success: false, error: 'Failed to upload photo' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('work-photos').getPublicUrl(filename);
    const photoUrl = urlData.publicUrl;

    // Save to NEW table (child_work_media)
    const { data: photo, error: dbError } = await supabase
      .from('child_work_media')
      .insert({
        child_id: childId,
        assignment_id: assignmentId || null,
        work_id: workId || null,
        work_name: workName,
        media_type: 'photo',
        media_url: photoUrl,
        file_size_bytes: file.size,
        week_number: weekNumber ? parseInt(weekNumber) : null,
        year: year ? parseInt(year) : null,
        taken_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: 'Failed to save photo record' }, { status: 500 });
    }

    // Return in old format for compatibility
    return NextResponse.json({
      success: true,
      photo: { ...photo, photo_url: photo.media_url },
      url: photoUrl
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId');
    const assignmentId = url.searchParams.get('assignmentId');
    const weekNumber = url.searchParams.get('week');
    const year = url.searchParams.get('year');

    let query = supabase
      .from('child_work_media')
      .select('*')
      .eq('media_type', 'photo') // Only photos for this legacy endpoint
      .order('taken_at', { ascending: false });

    if (childId) query = query.eq('child_id', childId);
    if (assignmentId) query = query.eq('assignment_id', assignmentId);
    if (weekNumber) query = query.eq('week_number', parseInt(weekNumber));
    if (year) query = query.eq('year', parseInt(year));

    const { data: media, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch photos' }, { status: 500 });
    }

    // Transform to old format
    const photos = (media || []).map(m => ({
      ...m,
      photo_url: m.media_url
    }));

    return NextResponse.json({ success: true, photos });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
