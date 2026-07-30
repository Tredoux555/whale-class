// app/api/montree/paper-scan/upload/route.ts
// Upload a photographed handwritten record sheet. Fast path only — the photo
// goes to storage, a 'pending' scan row is created, and the id comes back.
// NO LLM work happens here; the client then calls
// POST /api/montree/paper-scan/[scanId]/extract and polls
// GET /api/montree/paper-scan/[scanId].

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { validateJpegPhoto } from '@/lib/montree/media/jpeg-validation';
import { PAPER_SCAN_BUCKET, PAPER_SCAN_FEATURE_KEY } from '@/lib/montree/paper-scan/types';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    if (!(await isFeatureEnabled(supabase, auth.schoolId, PAPER_SCAN_FEATURE_KEY))) {
      return NextResponse.json(
        { success: false, error: 'feature_disabled' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;
    const classroomId = (formData.get('classroom_id') as string) || auth.classroomId || null;
    const sheetDateRaw = (formData.get('sheet_date') as string) || null;

    if (!photo) {
      return NextResponse.json({ success: false, error: 'No photo provided' }, { status: 400 });
    }
    if (!classroomId) {
      return NextResponse.json({ success: false, error: 'classroom_id required' }, { status: 400 });
    }

    // JPEG-only gate — same validator media/upload runs. Anything else does
    // not survive our storage + vision path reliably, so reject at the door.
    const photoErr = validateJpegPhoto({ name: photo.name, type: photo.type });
    if (photoErr) {
      return NextResponse.json({ success: false, error: photoErr }, { status: 400 });
    }

    // A sheet_date is optional; when supplied it must be a plain ISO date.
    let sheetDate: string | null = null;
    if (sheetDateRaw) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(sheetDateRaw)) {
        return NextResponse.json(
          { success: false, error: 'sheet_date must be YYYY-MM-DD' },
          { status: 400 }
        );
      }
      sheetDate = sheetDateRaw;
    }

    // The classroom must belong to the caller's school — the scan row carries
    // both ids and every later route trusts them.
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroomId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroom) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Id first — the storage path is derived from it, so the photo and the row
    // are addressable by the same key.
    const scanId = crypto.randomUUID();
    const storagePath = `paper_scans/${auth.schoolId}/${scanId}.jpg`;

    const fileBuffer = await photo.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(PAPER_SCAN_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: photo.type || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[PaperScan] Upload error:', uploadError.message);
      return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }

    const { data: scan, error: insertError } = await supabase
      .from('montree_paper_scans')
      .insert({
        id: scanId,
        school_id: auth.schoolId,
        classroom_id: classroomId,
        teacher_id: auth.userId,
        storage_path: storagePath,
        sheet_date: sheetDate,
        status: 'pending',
      })
      .select('id')
      .maybeSingle();

    if (insertError || !scan) {
      console.error('[PaperScan] Scan insert error:', insertError?.message, insertError?.code);
      // Don't leave an orphaned photo in the bucket.
      await supabase.storage.from(PAPER_SCAN_BUCKET).remove([storagePath]);
      return NextResponse.json({ success: false, error: 'Insert failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      scan_id: scan.id,
      storage_path: storagePath,
    });
  } catch (error) {
    console.error('[PaperScan] Upload error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
