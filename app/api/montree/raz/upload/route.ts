// /api/montree/raz/upload/route.ts
// Upload photos for RAZ reading records (book, signature, or new_book photo)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const childId = formData.get('childId') as string;
    const date = formData.get('date') as string || new Date().toISOString().split('T')[0];
    const photoType = formData.get('photoType') as string; // 'book', 'signature', or 'new_book'
    const classroomId = formData.get('classroomId') as string;

    if (!file || !childId || !photoType) {
      return NextResponse.json(
        { success: false, error: 'file, childId, and photoType required' },
        { status: 400 }
      );
    }

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Validate photoType BEFORE uploading file
    const VALID_PHOTO_TYPES: Record<string, string> = {
      book: 'book_photo_url',
      signature: 'signature_photo_url',
      new_book: 'new_book_photo_url',
    };
    const updateField = VALID_PHOTO_TYPES[photoType];
    if (!updateField) {
      return NextResponse.json(
        { success: false, error: 'Invalid photoType (must be book, signature, or new_book)' },
        { status: 400 }
      );
    }

    // Validate file extension
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: jpg, png, gif, webp, heic' },
        { status: 400 }
      );
    }

    // Verify child belongs to school
    const childCheck = await verifyChildBelongsToSchool(childId, auth.schoolId!);
    if (!childCheck.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `raz-reading/${childId}/${date}/${photoType}-${filename}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('montree-media')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('RAZ storage upload error:', uploadError.message, uploadError.error, uploadError.statusCode);
      return NextResponse.json(
        { success: false, error: `Storage upload failed: ${uploadError.message || 'unknown'}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('montree-media')
      .getPublicUrl(storagePath);

    const photoUrl = urlData.publicUrl;

    // Race condition fix: setStatus() and uploadPhoto() fire nearly simultaneously.
    // Always try UPDATE first — the status POST creates the record via UPSERT.
    // If UPDATE matches 0 rows (status POST hasn't completed yet), try INSERT.
    // If INSERT hits a duplicate key (status POST completed between our checks), retry UPDATE.
    let data = null;
    let dbError = null;

    // Step 1: Try UPDATE (most common path — record already exists from status POST)
    const updateResult = await supabase.from('raz_reading_records')
      .update({ [updateField]: photoUrl })
      .eq('child_id', childId)
      .eq('record_date', date)
      .select()
      .maybeSingle();

    if (updateResult.error) {
      // UPDATE itself failed (connection error, etc.) — don't try INSERT, just fail
      dbError = updateResult.error;
    } else if (updateResult.data) {
      data = updateResult.data;
    } else {
      // Step 2: Record doesn't exist yet — try INSERT
      const insertResult = await supabase.from('raz_reading_records')
        .insert({
          child_id: childId,
          classroom_id: classroomId,
          record_date: date,
          status: 'not_read',
          [updateField]: photoUrl,
        })
        .select()
        .single();

      if (insertResult.error?.code === '23505') {
        // Step 3: Duplicate key — status POST completed between our checks. Retry UPDATE.
        const retryResult = await supabase.from('raz_reading_records')
          .update({ [updateField]: photoUrl })
          .eq('child_id', childId)
          .eq('record_date', date)
          .select()
          .single();
        data = retryResult.data;
        dbError = retryResult.error;
      } else {
        data = insertResult.data;
        dbError = insertResult.error;
      }
    }

    if (dbError) {
      console.error('RAZ DB update error:', dbError.message, dbError.code, dbError.details);
      return NextResponse.json(
        { success: false, error: `DB error: ${dbError.message || 'unknown'}` },
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
