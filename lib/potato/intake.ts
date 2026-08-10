// lib/potato/intake.ts
// PSS Child Onboarding — the shared server-side pieces.
//
// The intake SHAPE, the validation and the printed paper all live in
// lib/onboarding-core (neutral: it imports nothing from lib/montree/* or
// lib/potato/*). This file is the PSS adapter's half: readiness probing,
// storage paths inside the private `potato-snaps` bucket, path→proxy-URL
// resolution, and the row→print-row projection.
//
// 🚨 ISOLATION. Nothing here imports from lib/montree/*. The only outside
// dependencies are @/lib/supabase-client (via ./db) and @/lib/onboarding-core.

import type { UntypedClient } from '@/lib/supabase-client';
import { proxyUrl, isSetupPending, errorCode } from '@/lib/potato/db';
import {
  criticalAllergens,
  displayName,
  normalizeIntake,
  type IntakeForm,
  type IntakeStatus,
} from '@/lib/onboarding-core';

export const INTAKE_TABLE = 'tp_child_intake';

export interface ChildIntakeRow {
  id: string;
  class_id: string;
  child_id: string;
  status: IntakeStatus;
  data: unknown;
  submitted_at: string | null;
  committed_at: string | null;
  updated_at: string | null;
}

export const INTAKE_COLUMNS =
  'id, class_id, child_id, status, data, submitted_at, committed_at, updated_at';

// ------------------------------------------------------- schema readiness --

/**
 * 🚨 WHY THIS IS A SIBLING PROBE AND NOT A NEW FIELD ON potatoCapabilities().
 *
 * `potatoCapabilities()` probes for missing COLUMNS on tables that already
 * exist, and its `probeColumn` helper deliberately RE-THROWS 42P01 ("no such
 * table") so a genuinely broken database surfaces instead of silently
 * degrading. Before migration 327 runs, `tp_child_intake` does not exist at
 * all — so folding this probe into `potatoCapabilities()` would make every
 * existing route throw, and `loadClass()` calls it on nearly every request.
 * The board, the films and the proxy would all go dark for a feature none of
 * them use.
 *
 * So onboarding gets its own probe with its own rule: a missing TABLE means
 * "this feature isn't switched on yet", which every onboarding route turns
 * into a clean 503 `{error:'migration_pending'}`. Nothing else in PSS notices.
 *
 * Cached like the sibling: `true` forever (a table cannot un-exist), `false`
 * re-checked every 30s so the feature lights up on its own within half a
 * minute of the migration running, with no redeploy.
 */
const NEGATIVE_TTL_MS = 30_000;
let readyCache: { value: boolean; at: number } | null = null;

export async function intakeReady(supabase: UntypedClient): Promise<boolean> {
  const now = Date.now();
  if (readyCache && (readyCache.value || now - readyCache.at < NEGATIVE_TTL_MS)) {
    return readyCache.value;
  }
  let value = false;
  try {
    const { error } = await supabase.from(INTAKE_TABLE).select('id').limit(0);
    if (error) {
      // 42P01 / 42703 → not migrated yet. Anything else is a real fault and
      // must not be cached as a permanent "off".
      if (!isSetupPending(error)) throw error;
      value = false;
    } else {
      value = true;
    }
  } catch (error) {
    if (!isSetupPending(error)) {
      console.error('[potato/intake] readiness probe failed:', errorCode(error), error);
    }
    value = false;
  }
  readyCache = { value, at: now };
  return value;
}

/** Test seam + a way to force a re-probe right after the migration. */
export function resetIntakeReady(): void {
  readyCache = null;
}

// ------------------------------------------------------------ storage paths --

/** Everything a family uploads lives under one per-child prefix. */
export function intakePrefix(classId: string, childId: string): string {
  return `class/${classId}/intake/${childId}`;
}

/** The canonical face path a committed intake promotes into — the SAME
 *  convention /api/potato/children/[id]/face writes, so the roster avatar,
 *  the board and the printed labels all read one object. */
export function canonicalFacePath(classId: string, childId: string): string {
  return `class/${classId}/faces/${childId}.jpg`;
}

export type UploadKind = 'face' | 'pickup' | 'vaccination' | 'health_check' | 'medical';

export const UPLOAD_KINDS: UploadKind[] = [
  'face',
  'pickup',
  'vaccination',
  'health_check',
  'medical',
];

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === 'string' && (UPLOAD_KINDS as string[]).includes(value);
}

/** Faces are photographs; documents may also be a scan or a PDF. */
const IMAGE_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const DOC_MIME: Record<string, string> = { ...IMAGE_MIME, 'application/pdf': 'pdf' };

export function allowedExtension(kind: UploadKind, mime: string): string | null {
  const table = kind === 'face' || kind === 'pickup' ? IMAGE_MIME : DOC_MIME;
  return table[mime.toLowerCase()] ?? null;
}

/**
 * The object name for one upload. `index` only matters for the two repeating
 * kinds and is clamped hard — it reaches this function from a request body,
 * so it is never allowed to shape the path beyond a single digit.
 */
export function intakeObjectPath(
  classId: string,
  childId: string,
  kind: UploadKind,
  extension: string,
  index = 0,
): string {
  const prefix = intakePrefix(classId, childId);
  const n = Math.min(Math.max(Math.floor(index) || 0, 0), 9);
  switch (kind) {
    // Fixed name + upsert: replacing a face never orphans an object.
    case 'face':
      return `${prefix}/face.jpg`;
    case 'pickup':
      return `${prefix}/pickup-${n}.jpg`;
    case 'vaccination':
      return `${prefix}/vaccination.${extension}`;
    case 'health_check':
      return `${prefix}/health-check.${extension}`;
    case 'medical':
    default:
      return `${prefix}/medical-${n}.${extension}`;
  }
}

/**
 * A path is only ever accepted back from a client if it sits under THIS
 * child's own prefix. The form round-trips storage paths through the browser,
 * so without this a parent could type another child's path into their own
 * documents and have the teacher's review screen resolve it.
 */
export function ownsPath(classId: string, childId: string, path: unknown): boolean {
  if (typeof path !== 'string' || !path) return false;
  if (path.includes('..')) return false;
  return path.startsWith(`${intakePrefix(classId, childId)}/`);
}

/** Strip any document path the caller does not own. Returns a new form. */
export function scrubForeignPaths(form: IntakeForm, classId: string, childId: string): IntakeForm {
  const keep = (p: string | undefined) => (ownsPath(classId, childId, p) ? p : undefined);
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
        ownsPath(classId, childId, p),
      ),
    },
  };
}

// ------------------------------------------------------------- url resolving --

/**
 * Every storage path in a form, mapped to its proxy URL. The client never
 * builds a media URL itself: it looks the path up in this map, so the day the
 * proxy's shape changes there is exactly one place to change it.
 */
export function urlsForForm(form: IntakeForm): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (path: string | undefined | null) => {
    if (!path) return;
    const url = proxyUrl(path);
    if (url) out[path] = url;
  };
  add(form.documents.facePhotoPath);
  add(form.documents.vaccinationBookletPath);
  add(form.documents.healthCheckPath);
  for (const p of form.documents.medicalCertPaths || []) add(p);
  for (const p of form.pickup.persons || []) add(p.photoPath);
  return out;
}

// --------------------------------------------------------------- print rows --

/** Exactly the shape lib/onboarding-core/print/PickupSheets wants, plus the
 *  child id the teacher's UI keys on. */
export interface IntakePrintChild {
  childId: string;
  childName: string;
  photoUrl: string | null;
  guardians: string[];
  pickupPersons: { name: string; relation: string; phone: string; photoUrl: string | null }[];
  allergies: string[];
}

/**
 * Project one committed intake into a printable row.
 *
 * The roster name wins over the form's: the label has to match the name the
 * teacher uses everywhere else in PSS. The intake face wins over the roster
 * face, because it is the photo the family chose FOR this purpose — and after
 * a commit the two are the same object anyway.
 */
export function toPrintChild(
  childId: string,
  rosterName: string,
  rosterPhotoPath: string | null,
  data: unknown,
): IntakePrintChild {
  const form = normalizeIntake(data);
  const face = proxyUrl(form.documents.facePhotoPath) ?? proxyUrl(rosterPhotoPath);
  return {
    childId,
    childName: (rosterName || '').trim() || displayName(form) || '—',
    photoUrl: face,
    guardians: (form.family.guardians || [])
      .filter((g) => g && g.name?.trim())
      .map((g) => {
        const bits = [g.relation?.trim(), g.phone?.trim()].filter(Boolean).join(' · ');
        return bits ? `${g.name.trim()} (${bits})` : g.name.trim();
      }),
    pickupPersons: (form.pickup.persons || [])
      .filter((p) => p && p.name?.trim())
      .map((p) => ({
        name: p.name.trim(),
        relation: (p.relation || '').trim(),
        phone: (p.phone || '').trim(),
        photoUrl: proxyUrl(p.photoPath),
      })),
    allergies: criticalAllergens(form),
  };
}
