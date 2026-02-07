// /api/media/route.ts
// Media endpoint for classroom photo/video uploads
// Uses child_work_media table (for weekly planning flow)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// POST - Upload media from classroom
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await request.formData();

    // Extract fields from classroom page FormData
    const file = formData.get('file') as File;
    const childId = formData.get('childId') as string;
    const assignmentId = formData.get('assignmentId') as string;
    const workId = formData.get('workId') as string;
    const workName = formData.get('workName') as string;
    const weekNumber = formData.get('weekNumber') as string;
    const year = formData.get('year') as string;
    const parentVisible = formData.get('parentVisible') === 'true';

    if (!file || !childId) {
      return NextResponse.json(
        { success: false, error: 'file and childId are required' },
        { status: 400 }
      );
    }

    if (!workName) {
      return NextResponse.json(
        { success: false, error: 'workName is required' },
        { status: 400 }
      );
    }

    // Determine media type
    const isVideo = file.type.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'photo';

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const filename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Storage path: child-work-media/{childId}/{year}/{week}/{filename}
    const storagePath = `child-work-media/${childId}/${year || 'unknown'}/${weekNumber || 'unknown'}/${filename}`;

    // Check if running on Vercel (use Supabase Storage) or local
    const isVercel = process.env.VERCEL === '1';
    let mediaUrl: string;

    if (isVercel) {
      // Upload to Supabase Storage
      const fileBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('child-photos')
        .upload(storagePath, fileBuffer, {
          contentType: file.type || 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json(
          { success: false, error: `Upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('child-photos')
        .getPublicUrl(storagePath);

      mediaUrl = urlData.publicUrl;
    } else {
      // Local development - save to public folder
      const { writeFile, mkdir } = await import('fs/promises');
      const path = await import('path');

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'child-work-media');

      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (err: any) {
        if (err.code !== 'EEXIST') throw err;
      }

      const fileBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(fileBuffer);
      const filePath = path.join(uploadDir, filename);
      await writeFile(filePath, buffer);

      mediaUrl = `/uploads/child-work-media/${filename}`;
    }

    // Create database record in child_work_media
    const mediaRecord = {
      child_id: childId,
      assignment_id: assignmentId || null,
      work_id: workId || null,
      work_name: workName,
      media_type: mediaType,
      media_url: mediaUrl,
      file_size_bytes: file.size,
      taken_at: new Date().toISOString(),
      week_number: weekNumber ? parseInt(weekNumber) : null,
      year: year ? parseInt(year) : null,
      parent_visible: parentVisible,
      is_featured: false,
    };

    const { data: media, error: dbError } = await supabase
      .from('child_work_media')
      .insert(mediaRecord)
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      // Try to clean up uploaded file
      if (isVercel) {
        await supabase.storage.from('child-photos').remove([storagePath]);
      }
      return NextResponse.json(
        { success: false, error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: media
    });

  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

// GET - Get media for a child
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const week = searchParams.get('week');
    const year = searchParams.get('year');
    const workId = searchParams.get('workId');

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'childId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('child_work_media')
      .select('*')
      .eq('child_id', childId)
      .order('taken_at', { ascending: false });

    // Filter by week/year if provided
    if (week && year) {
      query = query
        .eq('week_number', parseInt(week))
        .eq('year', parseInt(year));
    }

    // Filter by work_id if provided
    if (workId) {
      query = query.eq('work_id', workId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      media: data || []
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete media
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('id');

    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    // Get media to find URL for cleanup
    const { data: media } = await supabase
      .from('child_work_media')
      .select('media_url, thumbnail_url')
      .eq('id', mediaId)
      .single();

    // Delete from database
    const { error: dbError } = await supabase
      .from('child_work_media')
      .delete()
      .eq('id', mediaId);

    if (dbError) {
      console.error('Delete error:', dbError);
      return NextResponse.json(
        { success: false, error: dbError.message },
        { status: 500 }
      );
    }

    // TODO: Clean up from storage if using Supabase Storage
    // (Would need to extract path from URL and call storage.remove)

    return NextResponse.json({
      success: true,
      message: 'Media deleted'
    });

  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update media (e.g., toggle parent visibility)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { mediaId, parentVisible } = body;

    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: 'mediaId is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};

    if (typeof parentVisible === 'boolean') {
      updateData.parent_visible = parentVisible;
      if (parentVisible) {
        updateData.shared_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('child_work_media')
      .update(updateData)
      .eq('id', mediaId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
