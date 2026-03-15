// /api/montree/media/upload/route.ts
// Upload photos to Supabase storage
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const thumbnail = formData.get('thumbnail') as File | null;
    const metadataStr = formData.get('metadata') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    let metadata;
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 });
    }

    const { school_id, classroom_id, child_id, child_ids, work_id, caption, tags, width, height, media_type, duration } = metadata;

    if (!school_id) {
      return NextResponse.json({ error: 'school_id required' }, { status: 400 });
    }

    // Verify school_id matches authenticated user's school
    if (school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'school_id mismatch' }, { status: 403 });
    }

    // Verify child belongs to the authenticated user's school
    if (child_id) {
      const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    // Verify all children in group photo belong to the authenticated user's school
    if (child_ids && Array.isArray(child_ids) && child_ids.length > 0) {
      for (const cid of child_ids) {
        const access = await verifyChildBelongsToSchool(cid, auth.schoolId);
        if (!access.allowed) {
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
      }
    }

    // Phase 6: Input length limits
    if (caption && caption.length > 1000) {
      return NextResponse.json({ error: 'Caption too long' }, { status: 400 });
    }
    if (tags && Array.isArray(tags) && tags.some((t: string) => t.length > 500)) {
      return NextResponse.json({ error: 'Tag too long' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || (media_type === 'video' ? 'webm' : 'jpg');
    const filename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Generate storage path: {school_id}/{child_id}/{videos|photos}/{timestamp}.{ext}
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const mediaFolder = media_type === 'video' ? 'videos' : 'photos';
    const childFolder = child_id || 'group';
    const storagePath = `${school_id}/${childFolder}/${mediaFolder}/${year}/${month}/${filename}`;
    
    // Upload main file to Supabase storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('montree-media')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError.message, uploadError.error);
      return NextResponse.json({
        error: 'Upload failed'
      }, { status: 500 });
    }

    // Upload thumbnail if provided
    let thumbnailPath = null;
    if (thumbnail) {
      const thumbFilename = filename.replace(`.${ext}`, `-thumb.${ext}`);
      thumbnailPath = `${school_id}/${childFolder}/${year}/${month}/${thumbFilename}`;
      
      const thumbBuffer = await thumbnail.arrayBuffer();
      await supabase.storage
        .from('montree-media')
        .upload(thumbnailPath, thumbBuffer, {
          contentType: thumbnail.type || 'image/jpeg',
          upsert: false
        });
    }

    // Create database record
    const mediaRecord = {
      school_id,
      classroom_id: classroom_id || null,
      child_id: child_id || null,
      media_type: media_type || 'photo',
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      file_size_bytes: file.size,
      width: width || null,
      height: height || null,
      duration_seconds: media_type === 'video' ? (duration || null) : null,
      captured_at: metadata.captured_at || new Date().toISOString(),
      work_id: work_id || null,
      caption: caption || null,
      tags: tags || [],
      sync_status: 'synced',
      processing_status: 'complete'
    };

    const { data: media, error: dbError } = await supabase
      .from('montree_media')
      .insert(mediaRecord)
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError.message, dbError.code);
      // Try to clean up uploaded file
      await supabase.storage.from('montree-media').remove([storagePath]);
      return NextResponse.json({
        error: 'Database error'
      }, { status: 500 });
    }

    // If group photo, link to multiple children
    if (child_ids && child_ids.length > 0) {
      const childLinks = child_ids.map((cid: string) => ({
        media_id: media.id,
        child_id: cid
      }));
      
      await supabase.from('montree_media_children').insert(childLinks);
    }

    return NextResponse.json({ 
      success: true, 
      media 
    });

  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({
      error: 'Server error'
    }, { status: 500 });
  }
}
