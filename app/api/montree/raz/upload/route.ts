// /api/montree/raz/upload/route.ts
// Upload photos for RAZ reading records (book photo or signature photo)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const childId = formData.get('childId') as string;
    const date = formData.get('date') as string || new Date().toISOString().split('T')[0];
    const photoType = formData.get('photoType') as string; // 'book' or 'signature'
    const classroomId = formData.get('classroomId') as string;

    if (!file || !childId || !photoType) {
      return NextResponse.json(
        { success: false, error: 'file, childId, and photoType required' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `raz-reading/${childId}/${date}/${photoType}-${filename}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('child-photos')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('RAZ upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Upload failed' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('child-photos')
      .getPublicUrl(storagePath);

    const photoUrl = urlData.publicUrl;

    // Upsert the RAZ record with the photo URL
    const updateField = photoType === 'book' ? 'book_photo_url' : 'signature_photo_url';
    
    // Check if record exists first
    const { data: existing } = await supabase
      .from('raz_reading_records')
      .select('id')
      .eq('child_id', childId)
      .eq('record_date', date)
      .maybeSingle();

    if (!existing) {
      // Create new record (only if doesn't exist)
      await supabase.from('raz_reading_records').insert({
        child_id: childId,
        classroom_id: classroomId,
        record_date: date,
        status: 'not_read',
        [updateField]: photoUrl,
      });
    }

    // Update ONLY the photo URL (never overwrite status)
    const { data, error: dbError } = await supabase
      .from('raz_reading_records')
      .update({ [updateField]: photoUrl })
      .eq('child_id', childId)
      .eq('record_date', date)
      .select()
      .single();

    if (dbError) {
      console.error('RAZ DB update error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to save photo reference' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      photoUrl,
      photoType,
      record: data
    });
  } catch (error) {
    console.error('RAZ upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
