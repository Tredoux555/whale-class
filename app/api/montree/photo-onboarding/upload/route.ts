// app/api/montree/photo-onboarding/upload/route.ts
//
// Upload a class list (photo / PDF / DOCX / XLSX). Fast path only — the file
// goes to storage, a 'pending' import row is created, and the id comes back.
// NO model work happens here; the client then calls
// POST /api/montree/photo-onboarding/[importId]/extract and polls
// GET /api/montree/photo-onboarding/[importId].

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import {
  MAX_UPLOAD_BYTES,
  PHOTO_ONBOARDING_FEATURE_KEY,
  ROSTER_IMPORT_BUCKET,
  ROSTER_IMPORT_PATH_PREFIX,
  type RosterImportSourceType,
} from '@/lib/montree/photo-onboarding/types';

/** A large PDF/XLSX takes a moment to stream into storage. */
export const maxDuration = 60;

interface FormatSpec {
  source: RosterImportSourceType;
  ext: string;
  contentType: string;
}

/** Extension → what we treat it as. The extension is authoritative because
 *  browsers report wildly inconsistent mime types for docx/xlsx/heic. */
const BY_EXTENSION: Record<string, FormatSpec> = {
  jpg:  { source: 'photo', ext: 'jpg',  contentType: 'image/jpeg' },
  jpeg: { source: 'photo', ext: 'jpg',  contentType: 'image/jpeg' },
  png:  { source: 'photo', ext: 'png',  contentType: 'image/png' },
  webp: { source: 'photo', ext: 'webp', contentType: 'image/webp' },
  heic: { source: 'photo', ext: 'heic', contentType: 'image/heic' },
  heif: { source: 'photo', ext: 'heif', contentType: 'image/heif' },
  pdf:  { source: 'pdf',   ext: 'pdf',  contentType: 'application/pdf' },
  docx: { source: 'docx',  ext: 'docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  xlsx: { source: 'xlsx',  ext: 'xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  xlsm: { source: 'xlsx',  ext: 'xlsm', contentType: 'application/vnd.ms-excel.sheet.macroEnabled.12' },
};

const ACCEPTED_LIST = 'JPG, PNG, WEBP, HEIC, PDF, DOCX, XLSX';

function detectFormat(file: File): FormatSpec | null {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (BY_EXTENSION[ext]) return BY_EXTENSION[ext];

  // No usable extension (some camera/share sheets strip it) — fall back to mime.
  const type = (file.type || '').toLowerCase();
  if (type === 'application/pdf') return BY_EXTENSION.pdf;
  if (type.startsWith('image/')) {
    const sub = type.slice('image/'.length);
    return BY_EXTENSION[sub] || BY_EXTENSION.jpg;
  }
  if (type.includes('wordprocessingml')) return BY_EXTENSION.docx;
  if (type.includes('spreadsheetml')) return BY_EXTENSION.xlsx;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    if (!(await isFeatureEnabled(supabase, auth.schoolId, PHOTO_ONBOARDING_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const classroomId = (formData.get('classroomId') as string)
      || (formData.get('classroom_id') as string)
      || auth.classroomId
      || null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }
    if (!classroomId) {
      return NextResponse.json({ success: false, error: 'classroomId required' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: `File is too large (max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB)` },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ success: false, error: 'File is empty' }, { status: 400 });
    }

    const format = detectFormat(file);
    if (!format) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type. Accepted: ${ACCEPTED_LIST}` },
        { status: 400 }
      );
    }

    // 🚨 SECURITY: the classroom MUST belong to the caller's school. Deriving
    // a school from a client-supplied classroomId without this check is the
    // Jul 1 2026 "Marina in Whale Class" bug — existence is not ownership.
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroom) {
      console.error('[SECURITY] Cross-school roster import blocked:', {
        classroomId, authSchool: auth.schoolId, userId: auth.userId,
      });
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Id first — the storage path is derived from it, so the file and the row
    // are addressable by the same key.
    const importId = crypto.randomUUID();
    const storagePath = `${ROSTER_IMPORT_PATH_PREFIX}/${auth.schoolId}/${importId}.${format.ext}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(ROSTER_IMPORT_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || format.contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[PhotoOnboarding] Upload error:', uploadError.message);
      return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }

    const { data: row, error: insertError } = await supabase
      .from('montree_roster_imports')
      .insert({
        id: importId,
        school_id: auth.schoolId,
        classroom_id: classroomId,
        created_by: auth.userId,
        source_type: format.source,
        storage_path: storagePath,
        status: 'pending',
      })
      .select('id')
      .maybeSingle();

    if (insertError || !row) {
      console.error('[PhotoOnboarding] Import insert error:', insertError?.message, insertError?.code);
      // Don't leave an orphaned file in the bucket.
      await supabase.storage.from(ROSTER_IMPORT_BUCKET).remove([storagePath]);
      return NextResponse.json({ success: false, error: 'Insert failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      import_id: row.id,
      source_type: format.source,
    });
  } catch (error) {
    console.error('[PhotoOnboarding] Upload error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
