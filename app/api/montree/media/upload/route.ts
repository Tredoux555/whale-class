// /api/montree/media/upload/route.ts
// Upload photos to Supabase storage
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
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

    const { school_id, child_id, child_ids, work_id, caption, tags, width, height } = metadata;

    if (!school_id) {
      return NextResponse.json({ error: 'school_id required' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    
    // Generate storage path
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const childFolder = child_id || 'group';
    const storagePath = `${school_id}/${childFolder}/${year}/${month}/${filename}`;
    
    // Upload main file to Supabase storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('montree-media')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        error: `Upload failed: ${uploadError.message}` 
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
      child_id: child_id || null,
      media_type: 'photo',
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      file_size_bytes: file.size,
      width: width || null,
      height: height || null,
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
      console.error('DB error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('montree-media').remove([storagePath]);
      return NextResponse.json({ 
        error: `Database error: ${dbError.message}` 
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
      error: error instanceof Error ? error.message : 'Server error' 
    }, { status: 500 });
  }
}
