// /api/home/media/upload/route.ts
// Upload photos/videos to Supabase storage

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

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

    const { family_id, child_id, work_name, area, caption, tags, width, height, media_type, duration } = metadata;

    if (!family_id) {
      return NextResponse.json({ error: 'family_id required' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || (media_type === 'video' ? 'webm' : 'jpg');
    const filename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Generate storage path: {family_id}/{child_id}/{videos|photos}/{year}/{month}/{filename}
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const mediaFolder = media_type === 'video' ? 'videos' : 'photos';
    const childFolder = child_id || 'group';
    const storagePath = `${family_id}/${childFolder}/${mediaFolder}/${year}/${month}/${filename}`;

    // Upload main file to Supabase storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('home-media')
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
      thumbnailPath = `${family_id}/${childFolder}/${year}/${month}/${thumbFilename}`;

      const thumbBuffer = await thumbnail.arrayBuffer();
      await supabase.storage
        .from('home-media')
        .upload(thumbnailPath, thumbBuffer, {
          contentType: thumbnail.type || 'image/jpeg',
          upsert: false
        });
    }

    // Create database record
    const mediaRecord = {
      family_id,
      child_id: child_id || null,
      media_type: media_type || 'photo',
      file_path: storagePath,
      thumbnail_path: thumbnailPath,
      file_size: file.size,
      width: width || null,
      height: height || null,
      duration: media_type === 'video' ? (duration || null) : null,
      work_name: work_name || null,
      area: area || null,
      caption: caption || null,
      tags: tags || [],
      original_filename: file.name,
      storage_bucket: 'home-media'
    };

    const { data: media, error: dbError } = await supabase
      .from('home_media')
      .insert(mediaRecord)
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('home-media').remove([storagePath]);
      return NextResponse.json({
        error: `Database error: ${dbError.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      media
    });

  } catch (error: unknown) {
    console.error('Media upload error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 });
  }
}
