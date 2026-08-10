// app/api/montree/child-onboarding/[intakeId]/route.ts
//
// GET   → one intake in full, for the teacher's review screen. Document
//         storage paths come back with proxy URLs already resolved.
// PATCH → { action: 'commit' } — the ONLY thing in this feature that writes to
//         montree_children.
//
// What commit applies:
//   • name          ← preferredName || legalName (teacher-visible name)
//   • date_of_birth ← identity.dob (the column exists — cf. migration 325's
//                     commit route, which writes it)
//   • age           ← derived whole years from dob
//   • photo_url     ← the intake face photo, COPIED to the standard avatar path
//                     (<schoolId>/avatars/<childId>.jpg) so every existing
//                     avatar consumer picks it up, with a ?v= cache-buster —
//                     the exact convention of /api/montree/children/[childId]/photo.
//
// What commit deliberately does NOT do: touch montree_children.notes. Notes are
// months of a teacher's own observation and are APPEND-only by house rule; the
// intake has its own home in montree_child_intake.data and its own reader
// (the Guru context builder), so there is nothing to gain by copying text in.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { ageFromDob, displayName, normalizeIntake, type IntakeForm } from '@/lib/onboarding-core';
import {
  CHILD_ONBOARDING_FEATURE_KEY,
  INTAKE_BUCKET,
  avatarStoragePath,
} from '@/lib/montree/child-onboarding/types';

/** Commit copies a photo between storage paths and patches a child. */
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ intakeId: string }>;
}

interface IntakeRecord {
  id: string;
  school_id: string;
  classroom_id: string;
  child_id: string;
  status: string;
  data: unknown;
  submitted_at: string | null;
  committed_at: string | null;
  committed_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Resolve every document path in the form to a URL the teacher's browser can
 *  actually open. Paths that are empty are skipped.
 *
 *  Face photo + pickup-person photos → the standard public proxy (getProxyUrl)
 *  — they're needed for label/print rendering, same as every other child
 *  photo already on that path.
 *
 *  Vaccination booklet / health check / medical certs → the authenticated
 *  document route. These are sensitive medical documents and must never ride
 *  the public, CDN-cached proxy. */
function resolveDocumentUrls(form: IntakeForm): Record<string, string> {
  const out: Record<string, string> = {};
  const putPublic = (key: string, path?: string) => {
    if (path && path.trim()) out[key] = getProxyUrl(path.trim(), INTAKE_BUCKET);
  };
  const putPrivate = (key: string, path?: string) => {
    if (path && path.trim()) {
      out[key] = `/api/montree/child-onboarding/document?path=${encodeURIComponent(path.trim())}`;
    }
  };
  putPublic('facePhoto', form.documents.facePhotoPath);
  putPrivate('vaccinationBooklet', form.documents.vaccinationBookletPath);
  putPrivate('healthCheck', form.documents.healthCheckPath);
  (form.documents.medicalCertPaths || []).forEach((p, i) => putPrivate(`medical-${i}`, p));
  (form.pickup.persons || []).forEach((p, i) => putPublic(`pickup-${i}`, p.photoPath));
  return out;
}

async function loadOwnedIntake(
  supabase: ReturnType<typeof getSupabase>,
  intakeId: string,
  schoolId: string
): Promise<IntakeRecord | null> {
  const { data } = await supabase
    .from('montree_child_intake')
    .select('id, school_id, classroom_id, child_id, status, data, submitted_at, committed_at, committed_by, created_at, updated_at')
    .eq('id', intakeId)
    .maybeSingle();
  if (!data) return null;
  const row = data as IntakeRecord;
  // 🚨 Ownership, re-checked on every hit. Existence is not ownership.
  if (row.school_id !== schoolId) return null;
  return row;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { intakeId } = await context.params;

    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    if (!(await isFeatureEnabled(supabase, auth.schoolId, CHILD_ONBOARDING_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const row = await loadOwnedIntake(supabase, intakeId, auth.schoolId);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Intake not found' }, { status: 404 });
    }

    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, photo_url')
      .eq('id', row.child_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    const form = normalizeIntake(row.data);

    return NextResponse.json({
      success: true,
      intake: {
        id: row.id,
        child_id: row.child_id,
        classroom_id: row.classroom_id,
        status: row.status,
        submitted_at: row.submitted_at,
        committed_at: row.committed_at,
        updated_at: row.updated_at,
      },
      child: child
        ? {
            id: (child as { id: string }).id,
            name: (child as { name: string }).name,
            photo_url: (child as { photo_url: string | null }).photo_url,
          }
        : null,
      data: form,
      documentUrls: resolveDocumentUrls(form),
    });
  } catch (error) {
    console.error('[child-onboarding] GET one error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Copy the intake face photo onto the standard avatar path and return the
 * public URL (with cache-buster) to write into montree_children.photo_url.
 *
 * Returns null when there is nothing to copy or the copy fails — a failed
 * avatar copy must never fail the commit. The teacher can always set the photo
 * the usual way afterwards.
 */
async function copyFaceToAvatar(
  supabase: ReturnType<typeof getSupabase>,
  schoolId: string,
  childId: string,
  facePhotoPath: string | undefined
): Promise<string | null> {
  const source = (facePhotoPath || '').trim();
  if (!source) return null;

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(INTAKE_BUCKET)
      .download(source);
    if (downloadError || !blob) {
      console.error('[child-onboarding] face photo download failed:', downloadError?.message);
      return null;
    }

    const target = avatarStoragePath(schoolId, childId);
    const buffer = await blob.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(INTAKE_BUCKET)
      .upload(target, buffer, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) {
      console.error('[child-onboarding] avatar upload failed:', uploadError.message);
      return null;
    }

    // Same convention as /api/montree/children/[childId]/photo — a FULL public
    // URL with a ?v= cache-buster. getProxyUrl() normalizes this back to a
    // storage path at render time, so both consumers keep working.
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${INTAKE_BUCKET}/${target}`;
    return `${base}?v=${Date.now()}`;
  } catch (err) {
    console.error('[child-onboarding] avatar copy threw:', err);
    return null;
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { intakeId } = await context.params;

    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    if (!(await isFeatureEnabled(supabase, auth.schoolId, CHILD_ONBOARDING_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const action = body && typeof body === 'object' ? (body as { action?: string }).action : undefined;
    if (action !== 'commit') {
      return NextResponse.json({ success: false, error: "action must be 'commit'" }, { status: 400 });
    }

    const row = await loadOwnedIntake(supabase, intakeId, auth.schoolId);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Intake not found' }, { status: 404 });
    }
    if (row.status === 'draft') {
      return NextResponse.json(
        { success: false, error: 'This family has not submitted their form yet.' },
        { status: 409 }
      );
    }

    // The child must still be in this school. Re-checked, not assumed.
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('id', row.child_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
    if (!child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    const form = normalizeIntake(row.data);
    const patch: Record<string, unknown> = {};

    const name = displayName(form);
    if (name && name !== (child as { name: string }).name) patch.name = name;

    const dob = (form.identity.dob || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      patch.date_of_birth = dob;
      const years = ageFromDob(dob);
      if (years !== null) patch.age = years;
    }

    const photoUrl = await copyFaceToAvatar(
      supabase,
      auth.schoolId,
      row.child_id,
      form.documents.facePhotoPath
    );
    if (photoUrl) patch.photo_url = photoUrl;

    let childUpdated = false;
    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await supabase
        .from('montree_children')
        .update(patch)
        .eq('id', row.child_id)
        .eq('school_id', auth.schoolId);
      if (updateError) {
        console.error('[child-onboarding] child update failed:', updateError.message, updateError.code);
        return NextResponse.json(
          { success: false, error: 'Could not apply the form to the child record', detail: updateError.message },
          { status: 500 }
        );
      }
      childUpdated = true;
    }

    const { error: statusError } = await supabase
      .from('montree_child_intake')
      .update({
        status: 'committed',
        committed_at: new Date().toISOString(),
        committed_by: auth.userId,
      })
      .eq('id', row.id)
      .eq('school_id', auth.schoolId);

    if (statusError) {
      console.error('[child-onboarding] commit stamp failed:', statusError.message, statusError.code);
      return NextResponse.json(
        {
          success: false,
          error: 'The child record was updated but the form could not be marked committed. Try again.',
          detail: statusError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'committed',
      childUpdated,
      photoApplied: !!photoUrl,
      applied: Object.keys(patch),
    });
  } catch (error) {
    console.error('[child-onboarding] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
