import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// File size limits
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

// POST - Upload photo or video
export async function POST(request: NextRequest) {
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
    const notes = formData.get('notes') as string;
    const parentVisible = formData.get('parentVisible') === 'true';
    const category = (formData.get('category') as string) || 'work'; // 'work', 'life', or 'shared'

    if (!file || !childId || !workName) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Determine media type from file
    const isVideo = file.type.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'photo';
    const bucket = isVideo ? 'work-videos' : 'work-photos';

    // Validate file size
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_PHOTO_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = isVideo ? '50MB' : '10MB';
      return NextResponse.json({ 
        success: false, 
        error: `File too large. Maximum size is ${maxSizeMB} for ${mediaType}s.` 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const filename = `${childId}/${timestamp}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ success: false, error: 'Failed to upload media: ' + uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    const mediaUrl = urlData.publicUrl;

    // Save to database
    // Note: work_id must be null if it doesn't exist in works table to avoid FK constraint violation
    let validWorkId = null;
    if (workId && workId.length > 10) {
      // Verify work_id exists in works table
      const { data: workExists } = await supabase
        .from('works')
        .select('id')
        .eq('id', workId)
        .single();
      
      if (workExists) {
        validWorkId = workId;
      }
    }
    
    const { data: media, error: dbError } = await supabase
      .from('child_work_media')
      .insert({
        child_id: childId,
        assignment_id: assignmentId || null,
        work_id: validWorkId,
        work_name: workName,
        category: category,
        media_type: mediaType,
        media_url: mediaUrl,
        file_size_bytes: file.size,
        notes: notes || null,
        week_number: weekNumber ? parseInt(weekNumber) : null,
        year: year ? parseInt(year) : null,
        parent_visible: parentVisible,
        taken_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from(bucket).remove([filename]);
      return NextResponse.json({ success: false, error: 'Failed to save media record: ' + dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      media,
      url: mediaUrl,
      mediaType
    });

  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// GET - Fetch media for a child/assignment/week
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId');
    const assignmentId = url.searchParams.get('assignmentId');
    const weekNumber = url.searchParams.get('week');
    const year = url.searchParams.get('year');
    const mediaType = url.searchParams.get('type'); // 'photo', 'video', or null for all
    const category = url.searchParams.get('category'); // 'work', 'life', 'shared', or null for all
    const parentOnly = url.searchParams.get('parentOnly') === 'true';
    const featuredOnly = url.searchParams.get('featured') === 'true';
    const reportDate = url.searchParams.get('date'); // For daily reports
    const todayOnly = url.searchParams.get('today') === 'true'; // Filter to today's media

    let query = supabase
      .from('child_work_media')
      .select(`
        *,
        children:child_id (name)
      `)
      .order('taken_at', { ascending: false });

    if (childId) query = query.eq('child_id', childId);
    if (assignmentId) query = query.eq('assignment_id', assignmentId);
    if (weekNumber) query = query.eq('week_number', parseInt(weekNumber));
    if (year) query = query.eq('year', parseInt(year));
    if (mediaType) query = query.eq('media_type', mediaType);
    if (category) query = query.eq('category', category);
    if (parentOnly) query = query.eq('parent_visible', true);
    if (featuredOnly) query = query.eq('is_featured', true);
    if (reportDate) query = query.eq('report_date', reportDate);
    
    // Filter to today's media only
    if (todayOnly) {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      query = query.gte('taken_at', startOfDay).lt('taken_at', endOfDay);
    }

    const { data: mediaRaw, error } = await query.limit(100);

    if (error) {
      console.error('Fetch media error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch media' }, { status: 500 });
    }

    // Transform to include child_name at top level
    const media = (mediaRaw || []).map(m => ({
      ...m,
      child_name: m.children?.name || 'Unknown',
      children: undefined // Remove nested object
    }));

    return NextResponse.json({ 
      success: true, 
      media,
      counts: {
        total: media?.length || 0,
        photos: media?.filter(m => m.media_type === 'photo').length || 0,
        videos: media?.filter(m => m.media_type === 'video').length || 0
      }
    });

  } catch (error) {
    console.error('Get media error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Update media (parent visibility, featured, notes)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { mediaId, parentVisible, isFeatured, notes } = body;

    if (!mediaId) {
      return NextResponse.json({ success: false, error: 'mediaId required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (parentVisible !== undefined) {
      updates.parent_visible = parentVisible;
      if (parentVisible) updates.shared_at = new Date().toISOString();
    }
    if (isFeatured !== undefined) updates.is_featured = isFeatured;
    if (notes !== undefined) updates.notes = notes;

    const { data: media, error } = await supabase
      .from('child_work_media')
      .update(updates)
      .eq('id', mediaId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update media' }, { status: 500 });
    }

    return NextResponse.json({ success: true, media });

  } catch (error) {
    console.error('Patch media error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Remove media
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const mediaId = url.searchParams.get('id');

    if (!mediaId) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }

    // Get media first to delete from storage
    const { data: media } = await supabase
      .from('child_work_media')
      .select('media_url, media_type')
      .eq('id', mediaId)
      .single();

    if (media) {
      // Extract path from URL and delete from storage
      const bucket = media.media_type === 'video' ? 'work-videos' : 'work-photos';
      const urlParts = media.media_url.split(`/${bucket}/`);
      if (urlParts[1]) {
        await supabase.storage.from(bucket).remove([urlParts[1]]);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('child_work_media')
      .delete()
      .eq('id', mediaId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete media' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete media error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
