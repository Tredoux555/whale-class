// lib/montree/child-onboarding/types.ts
//
// The Montree ADAPTER layer for the shared onboarding core. Everything
// Montree-specific about Child Onboarding — the feature key, the bucket, the
// storage path convention, the row shape — lives here so the routes agree with
// each other and the core stays product-neutral.

import type { IntakeForm, IntakeStatus } from '@/lib/onboarding-core';

export const CHILD_ONBOARDING_FEATURE_KEY = 'child_onboarding' as const;

/** Same bucket as every other Montree media object. Nothing new to provision —
 *  and NEVER create a bucket from SQL (storage-schema writes roll back the
 *  whole migration; hard-won lesson from the potato-snaps bucket). */
export const INTAKE_BUCKET = 'montree-media';

/** Documents live under intake/<schoolId>/<childId>/… */
export const INTAKE_PATH_PREFIX = 'intake';

/** 10MB per file — a phone photo of a vaccination booklet fits comfortably. */
export const MAX_INTAKE_FILE_BYTES = 10 * 1024 * 1024;

export type IntakeUploadKind = 'face' | 'pickup' | 'vaccination' | 'health_check' | 'medical';

export const INTAKE_UPLOAD_KINDS: IntakeUploadKind[] = [
  'face',
  'pickup',
  'vaccination',
  'health_check',
  'medical',
];

/** Images everywhere; PDFs only for the document kinds (a face photo must be
 *  an image — it is rendered into a label). */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export const DOCUMENT_EXTENSIONS: Record<string, string> = {
  ...IMAGE_EXTENSIONS,
  pdf: 'application/pdf',
};

/** Build the storage path for an uploaded intake file.
 *  face        → intake/<school>/<child>/face.jpg          (stable, upsert)
 *  pickup      → intake/<school>/<child>/pickup-<n>.<ext>
 *  vaccination → intake/<school>/<child>/vaccination.<ext>
 *  health_check→ intake/<school>/<child>/health-check.<ext>
 *  medical     → intake/<school>/<child>/medical-<n>.<ext>
 */
export function intakeStoragePath(
  schoolId: string,
  childId: string,
  kind: IntakeUploadKind,
  ext: string,
  index?: number
): string {
  const base = `${INTAKE_PATH_PREFIX}/${schoolId}/${childId}`;
  switch (kind) {
    case 'face':
      // Always .jpg-named regardless of source extension so the avatar copy
      // target and this path stay predictable.
      return `${base}/face.${ext}`;
    case 'pickup':
      return `${base}/pickup-${index ?? Date.now()}.${ext}`;
    case 'vaccination':
      return `${base}/vaccination.${ext}`;
    case 'health_check':
      return `${base}/health-check.${ext}`;
    case 'medical':
      return `${base}/medical-${index ?? Date.now()}.${ext}`;
  }
}

/** The standard Montree avatar path — the same one
 *  /api/montree/children/[childId]/photo writes to. Commit copies the intake
 *  face photo here so the child's avatar is set everywhere at once. */
export function avatarStoragePath(schoolId: string, childId: string): string {
  return `${schoolId}/avatars/${childId}.jpg`;
}

/**
 * A document path is only ever accepted back from a client if it sits under
 * THIS child's own intake prefix. The form round-trips storage paths through
 * the browser, so without this a parent could submit any path in the
 * (public) montree-media bucket — another family's document, or something
 * outside this feature entirely — and have it saved into their own child's
 * record. Mirrors lib/potato/intake.ts's ownsPath().
 */
export function ownsIntakePath(schoolId: string, childId: string, path: unknown): boolean {
  if (typeof path !== 'string' || !path) return false;
  if (path.includes('..')) return false;
  return path.startsWith(`${INTAKE_PATH_PREFIX}/${schoolId}/${childId}/`);
}

export interface ParsedIntakePath {
  schoolId: string;
  childId: string;
}

/**
 * Parse a client-supplied storage path into its {schoolId, childId} intake
 * segments, or null if it doesn't match the `intake/<schoolId>/<childId>/…`
 * grammar. Does NOT check ownership — callers (e.g. the authenticated
 * document route) must compare the returned ids against the caller's own
 * session before trusting the path. Same shape as ownsIntakePath's own
 * grammar check, just returning the parsed ids instead of a boolean.
 */
export function parseIntakePath(path: unknown): ParsedIntakePath | null {
  if (typeof path !== 'string' || !path) return null;
  if (path.includes('..')) return null;
  const parts = path.split('/');
  if (parts.length < 4) return null;
  const [prefix, schoolId, childId, ...rest] = parts;
  if (prefix !== INTAKE_PATH_PREFIX) return null;
  if (!schoolId || !childId) return null;
  if (rest.length === 0 || !rest[rest.length - 1]) return null;
  return { schoolId, childId };
}

/** Strip any document path the caller does not own. Returns a new form. */
export function scrubForeignIntakePaths(form: IntakeForm, schoolId: string, childId: string): IntakeForm {
  const keep = (p: string | undefined) => (ownsIntakePath(schoolId, childId, p) ? p : undefined);
  return {
    ...form,
    pickup: {
      ...form.pickup,
      persons: (form.pickup.persons || []).map((p) => ({ ...p, photoPath: keep(p.photoPath) })),
    },
    documents: {
      facePhotoPath: keep(form.documents.facePhotoPath),
      vaccinationBookletPath: keep(form.documents.vaccinationBookletPath),
      healthCheckPath: keep(form.documents.healthCheckPath),
      medicalCertPaths: (form.documents.medicalCertPaths || []).filter((p) =>
        ownsIntakePath(schoolId, childId, p)
      ),
    },
  };
}

/** montree_child_intake row as the routes read it. */
export interface ChildIntakeRow {
  id: string;
  school_id: string;
  classroom_id: string;
  child_id: string;
  status: IntakeStatus;
  data: IntakeForm;
  submitted_at: string | null;
  committed_at: string | null;
  committed_by: string | null;
  created_at: string;
  updated_at: string;
}

/** What the teacher list view renders per row. */
export interface ChildIntakeListItem {
  id: string;
  child_id: string;
  child_name: string;
  classroom_id: string;
  status: IntakeStatus;
  submitted_at: string | null;
  committed_at: string | null;
  updated_at: string;
}

/** Sort key for the teacher list: submitted (needs action) first, then drafts,
 *  then committed. */
export const STATUS_SORT_WEIGHT: Record<IntakeStatus, number> = {
  submitted: 0,
  draft: 1,
  committed: 2,
};
