// app/api/montree/parent/intake/upload/route.ts
//
// One file at a time from the parent's phone into the intake folder:
//   intake/<schoolId>/<childId>/…
//
// Returns the STORAGE PATH only. The client stores that path in the form; the
// core never sees a URL, and neither does the DB.
//
// 🚨 Ownership: the child must be in the authenticated parent's authorized set.
// 🚨 The face photo must be an image — it is rendered onto printed labels.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import {
  CHILD_ONBOARDING_FEATURE_KEY,
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  INTAKE_BUCKET,
  INTAKE_UPLOAD_KINDS,
  MAX_INTAKE_FILE_BYTES,
  intakeStoragePath,
  type IntakeUploadKind,
} from '@/lib/montree/child-onboarding/types';

/** A 10MB phone photo over a school's wifi is not instant. */
export const maxDuration = 60;

const IMAGE_ONLY_KINDS: IntakeUploadKind[] = ['face', 'pickup'];

function extensionOf(file: File): string {
  const fromName = (file.name.split('.').pop() || '').toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const type = (file.type || '').toLowerCase();
  if (type === 'application/pdf') return 'pdf';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    const session = await resolveAuthorizedParent(supabase);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ success: false, error: 'invalid_form_data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const kindRaw = (formData.get('kind') as string) || '';
    const childId = ((formData.get('childId') as string) || session.childId || '').trim();
    const indexRaw = (formData.get('index') as string) || '';

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }
    if (!INTAKE_UPLOAD_KINDS.includes(kindRaw as IntakeUploadKind)) {
      return NextResponse.json(
        { success: false, error: `kind must be one of: ${INTAKE_UPLOAD_KINDS.join(', ')}` },
        { status: 400 }
      );
    }
    const kind = kindRaw as IntakeUploadKind;

    // 🚨 Ownership check. Existence is not ownership.
    if (!childId || !session.authorizedChildIds.includes(childId)) {
      console.error('[SECURITY] child-onboarding upload: unauthorized child', {
        childId,
        parentId: session.parentId,
        inviteId: session.inviteId,
      });
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (file.size > MAX_INTAKE_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: `File is too large (max ${Math.round(MAX_INTAKE_FILE_BYTES / (1024 * 1024))}MB)` },
        { status: 400 }
      );
    }

    const ext = extensionOf(file);
    const allowed = IMAGE_ONLY_KINDS.includes(kind) ? IMAGE_EXTENSIONS : DOCUMENT_EXTENSIONS;
    const contentType = allowed[ext];
    if (!contentType) {
      return NextResponse.json(
        {
          success: false,
          error: IMAGE_ONLY_KINDS.includes(kind)
            ? 'Photos must be JPG, PNG or WEBP.'
            : 'Files must be JPG, PNG, WEBP or PDF.',
        },
        { status: 400 }
      );
    }

    const { data: child } = await supabase
      .from('montree_children')
      .select('id, school_id')
      .eq('id', childId)
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }
    const schoolId = (child as { school_id: string }).school_id;

    if (!(await isFeatureEnabled(supabase, schoolId, CHILD_ONBOARDING_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const parsedIndex = Number.parseInt(indexRaw, 10);
    const index = Number.isFinite(parsedIndex) && parsedIndex >= 0 ? parsedIndex : undefined;
    const storagePath = intakeStoragePath(schoolId, childId, kind, ext, index);

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(INTAKE_BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadError) {
      console.error('[child-onboarding/parent] upload failed:', uploadError.message);
      return NextResponse.json(
        { success: false, error: 'Upload failed', detail: uploadError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, path: storagePath });
  } catch (error) {
    console.error('[child-onboarding/parent] upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
