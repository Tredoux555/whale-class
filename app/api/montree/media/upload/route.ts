// app/api/montree/media/upload/route.ts
// Media upload endpoint - handles file upload to Supabase Storage + DB record
// Session 54: More forgiving, auto-detect school from child

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';

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

function generateStoragePath(params: {
  schoolId: string;
  childId?: string;
  year: number;
  month: number;
  filename: string;
}): string {
  const { schoolId, childId, year, month, filename } = params;
  const monthStr = month.toString().padStart(2, '0');
  const childFolder = childId || 'general';
  return `${schoolId}/${year}/${monthStr}/${childFolder}/${filename}`;
}

export async function POST(request: NextRequest) {
  try {
    // Get teacher from cookie
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value || 'unknown';

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

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Parse metadata (optional - we'll use defaults if missing)
    let meta: Record<string, any> = {};
    if (metadata) {
      try {
        meta = JSON.parse(metadata);
      } catch {
        // Ignore parse errors, use defaults
      }
    }

    const {
      school_id,
      classroom_id,
      child_id,
      child_ids,
      media_type = 'photo',
      captured_at,
      work_id,
      caption,
      tags,
      width,
      height,
    } = meta;

    const supabase = await createServerClient();

    // If no school_id provided, try to get it from the child
    let resolvedSchoolId = school_id;
    const targetChildId = child_id || child_ids?.[0];
    
    if (!resolvedSchoolId && targetChildId) {
      const { data: child } = await supabase
        .from('children')
        .select('classroom_id')
        .eq('id', targetChildId)
        .single();
      
      if (child?.classroom_id) {
        const { data: classroom } = await supabase
          .from('classrooms')
          .select('school_id')
          .eq('id', child.classroom_id)
          .single();
        
        resolvedSchoolId = classroom?.school_id;
      }
    }
    
    // Default school_id if still not found
    resolvedSchoolId = resolvedSchoolId || 'default-school';

    // Generate unique filename
    const ext = file.name.split('.').pop() || (media_type === 'video' ? 'mp4' : 'jpg');
    const uuid = crypto.randomUUID();
    const filename = `${uuid}.${ext}`;
    
    // Generate storage path
    const now = new Date(captured_at || Date.now());
    const storagePath = generateStoragePath({
      schoolId: resolvedSchoolId,
      childId: targetChildId,
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('whale-media')
      .getPublicUrl(storagePath);

    // Upload thumbnail if provided
    let thumbnailPath: string | null = null;
    if (thumbnail) {
      thumbnailPath = storagePath.replace(/\.[^.]+$/, '_thumb.jpg');
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
        thumbnailPath = null;
      }
    }

    // Create database record
    const mediaRecord = {
      school_id: resolvedSchoolId,
      classroom_id: classroom_id || null,
      child_id: targetChildId || null,
      media_type: media_type === 'video' ? 'video' : 'photo',
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
      caption: caption || 'Quick Capture',
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
      // Clean up uploaded file
      await supabase.storage.from('whale-media').remove([storagePath]);
      if (thumbnailPath) {
        await supabase.storage.from('whale-media').remove([thumbnailPath]);
      }
      return NextResponse.json(
        { success: false, error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Handle group photos
    if (child_ids && child_ids.length > 1) {
      const childLinks = child_ids.map((cid: string) => ({
        media_id: media.id,
        child_id: cid,
      }));

      await supabase
        .from('montree_media_children')
        .insert(childLinks);
    }

    return NextResponse.json({
      success: true,
      media: {
        ...media,
        public_url: urlData?.publicUrl,
      },
    });

  } catch (error) {
    console.error('Media upload API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
