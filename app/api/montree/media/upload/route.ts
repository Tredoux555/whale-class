// app/api/montree/media/upload/route.ts
// Media upload endpoint - handles file upload to Supabase Storage + DB record
// Phase 2 - Session 53

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { generateStoragePath, generateThumbnailPath } from '@/lib/montree/media/types';

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export async function POST(request: NextRequest) {
  try {
    // Get teacher from cookie
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;
    
    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - please log in as teacher' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    
    const file = formData.get('file') as File | null;
    const thumbnail = formData.get('thumbnail') as File | null;
    const metadata = formData.get('metadata') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!metadata) {
      return NextResponse.json(
        { success: false, error: 'No metadata provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Parse metadata
    let meta;
    try {
      meta = JSON.parse(metadata);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid metadata JSON' },
        { status: 400 }
      );
    }

    const {
      school_id,
      classroom_id,
      child_id,
      child_ids,  // For group photos
      media_type,
      captured_at,
      work_id,
      caption,
      tags,
      width,
      height,
    } = meta;

    // Validate required fields
    if (!school_id) {
      return NextResponse.json(
        { success: false, error: 'school_id is required' },
        { status: 400 }
      );
    }

    if (!media_type || !['photo', 'video'].includes(media_type)) {
      return NextResponse.json(
        { success: false, error: 'media_type must be "photo" or "video"' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Generate unique filename
    const ext = file.name.split('.').pop() || (media_type === 'photo' ? 'jpg' : 'mp4');
    const uuid = crypto.randomUUID();
    const filename = `${uuid}.${ext}`;
    
    // Generate storage path
    const now = new Date(captured_at || Date.now());
    const storagePath = generateStoragePath({
      schoolId: school_id,
      childId: child_id || (child_ids?.length > 1 ? 'group' : child_ids?.[0]),
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      filename,
    });

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Upload main file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('whale-media')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Upload thumbnail if provided
    let thumbnailPath: string | null = null;
    if (thumbnail) {
      thumbnailPath = generateThumbnailPath(storagePath);
      const thumbBuffer = new Uint8Array(await thumbnail.arrayBuffer());
      
      const { error: thumbError } = await supabase.storage
        .from('whale-media')
        .upload(thumbnailPath, thumbBuffer, {
          contentType: thumbnail.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (thumbError) {
        console.error('Thumbnail upload error:', thumbError);
        // Don't fail the whole upload, just log it
        thumbnailPath = null;
      }
    }

    // Create database record
    const mediaRecord = {
      school_id,
      classroom_id: classroom_id || null,
      child_id: child_id || (child_ids?.length === 1 ? child_ids[0] : null),
      media_type,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      file_size_bytes: file.size,
      width: width || null,
      height: height || null,
      captured_by: teacherName,
      captured_at: captured_at || new Date().toISOString(),
      uploaded_at: new Date().toISOString(),
      tags: tags || [],
      work_id: work_id || null,
      caption: caption || null,
      sync_status: 'synced',
      processing_status: 'complete',
    };

    const { data: media, error: dbError } = await supabase
      .from('montree_media')
      .insert(mediaRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('whale-media').remove([storagePath]);
      if (thumbnailPath) {
        await supabase.storage.from('whale-media').remove([thumbnailPath]);
      }
      return NextResponse.json(
        { success: false, error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    // If this is a group photo with multiple children, create child links
    if (child_ids && child_ids.length > 1) {
      const childLinks = child_ids.map((cid: string) => ({
        media_id: media.id,
        child_id: cid,
      }));

      const { error: linkError } = await supabase
        .from('montree_media_children')
        .insert(childLinks);

      if (linkError) {
        console.error('Child link error:', linkError);
        // Don't fail the whole upload, just log it
      }
    }

    return NextResponse.json({
      success: true,
      media,
    });

  } catch (error) {
    console.error('Media upload API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
