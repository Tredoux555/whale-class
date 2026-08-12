// lib/cms/db/mappers.ts
// ============================================================================
// snake_case row → camelCase engine record. The ONLY place in CMS where the
// database's spelling and TypeScript's spelling meet.
// ============================================================================
// db/cms-schema.sql's opening comment says it plainly: the schema and
// lib/cms/engine/types.ts are one artefact split across two languages. This
// file is the seam. Every function here is pure — give it a row, get a record;
// no I/O, no clock, no locale — so the engine stays testable and the pages stay
// unaware that a database exists at all.
//
// Rows arrive as `any` because the repo has no generated Supabase types (see
// the type note at the top of lib/supabase-client.ts). That untyped edge stops
// HERE: everything downstream of these functions is a fully-typed engine record.
// ============================================================================

import type {
  Allergy,
  AllergyId,
  Child,
  ChildId,
  ClassGroup,
  ClassGroupId,
  DietaryRequirement,
  DietaryRequirementId,
  Guardian,
  GuardianId,
  MedicalRecord,
  MedicalRecordId,
  Medication,
  Organisation,
  OrganisationId,
  School,
  SchoolId,
} from '@/lib/cms/engine/types';
import { id } from '@/lib/cms/engine/types';
import type { DailyFacts } from '@/lib/cms/engine/roster';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

export function mapOrganisation(row: Row): Organisation {
  return {
    id: id<OrganisationId>(row.id),
    name: row.name,
    slug: row.slug,
    countryCode: row.country_code,
    defaultLocale: row.default_locale ?? 'en',
    createdAt: row.created_at,
  };
}

export function mapSchool(row: Row): School {
  return {
    id: id<SchoolId>(row.id),
    organisationId: id<OrganisationId>(row.organisation_id),
    name: row.name,
    slug: row.slug,
    timezone: row.timezone ?? 'UTC',
    addressLine: row.address_line ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    createdAt: row.created_at,
  };
}

export function mapClassGroup(row: Row): ClassGroup {
  return {
    id: id<ClassGroupId>(row.id),
    schoolId: id<SchoolId>(row.school_id),
    name: row.name,
    // numeric(3,1) comes back as a string from PostgREST — Number() it here so
    // an age band never renders as "3.0" or sorts as a string.
    ageMin: Number(row.age_min),
    ageMax: Number(row.age_max),
    capacity: Number(row.capacity ?? 0),
    leadTeacherName: row.lead_teacher_name ?? null,
  };
}

export function mapGuardian(row: Row): Guardian {
  return {
    id: id<GuardianId>(row.id),
    fullName: row.full_name,
    relationship: row.relationship,
    phone: row.phone ?? null,
    email: row.email ?? null,
    preferredLocale: row.preferred_locale ?? 'en',
    canCollect: row.can_collect ?? true,
    contactPriority: Number(row.contact_priority ?? 1),
    restrictionNote: row.restriction_note ?? null,
  };
}

/**
 * A child, with the guardians already resolved.
 *
 * `authorisedCollectors` is DERIVED, exactly as the engine's docstring demands:
 * a guardian may collect only if the link says so, the guardian record says so,
 * AND there is no restriction note. A court order beats every other row —
 * that precedence is a safety rule, not a formatting choice, so it lives here
 * where every caller inherits it rather than at each call site.
 */
export function mapChild(
  row: Row,
  guardianRows: Row[],
  linkRows: Row[]
): Child {
  const linkByGuardian = new Map(linkRows.map((l) => [l.guardian_id, l]));
  const guardians = guardianRows.map(mapGuardian);
  return {
    id: id<ChildId>(row.id),
    schoolId: id<SchoolId>(row.school_id),
    classGroupId: row.class_group_id ? id<ClassGroupId>(row.class_group_id) : null,
    legalName: row.legal_name,
    preferredName: row.preferred_name || row.legal_name,
    dateOfBirth: row.date_of_birth,
    homeLanguage: row.home_language ?? 'en',
    guardians,
    authorisedCollectors: guardians
      .filter((g) => {
        if (g.restrictionNote) return false;
        if (!g.canCollect) return false;
        const link = linkByGuardian.get(g.id as unknown as string);
        return link ? link.can_collect !== false : true;
      })
      .map((g) => g.id),
    photoUrl: row.photo_url ?? null,
    createdAt: row.created_at,
  };
}

export function mapAllergy(row: Row): Allergy {
  return {
    id: id<AllergyId>(row.id),
    childId: id<ChildId>(row.child_id),
    allergen: row.allergen,
    severity: row.severity,
    reaction: row.reaction ?? '',
    responsePlan: row.response_plan ?? '',
    requiresPoster: row.requires_poster ?? true,
    // Phase 3 column (migration 330). `?? false` is not a default so much as the
    // pre-migration reading: before the column existed, "carries a pen" lived
    // inside response_plan, and claiming a pen that is not there would be worse
    // than claiming none.
    carriesEpipen: row.carries_epipen ?? false,
  };
}

export function mapDietary(row: Row): DietaryRequirement {
  return {
    id: id<DietaryRequirementId>(row.id),
    childId: id<ChildId>(row.child_id),
    label: row.label,
    reason: row.reason,
    excludedFoods: Array.isArray(row.excluded_foods) ? row.excluded_foods : [],
    notes: row.notes ?? null,
  };
}

/** `medications` is jsonb — trust nothing about its shape. */
function mapMedications(raw: unknown): Medication[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Row => !!m && typeof m === 'object')
    .map((m) => ({
      name: String(m.name ?? ''),
      dose: String(m.dose ?? ''),
      schedule: String(m.schedule ?? ''),
      heldOnSite: Boolean(m.heldOnSite ?? m.held_on_site ?? false),
      storageLocation: m.storageLocation ?? m.storage_location ?? null,
    }))
    .filter((m) => m.name);
}

export function mapMedical(row: Row): MedicalRecord {
  return {
    id: id<MedicalRecordId>(row.id),
    childId: id<ChildId>(row.child_id),
    conditions: Array.isArray(row.conditions) ? row.conditions : [],
    medications: mapMedications(row.medications),
    doctorName: row.doctor_name ?? null,
    doctorPhone: row.doctor_phone ?? null,
    emergencyNote: row.emergency_note ?? null,
    lastReviewedAt: row.last_reviewed_at ?? null,
    reviewedByName: row.reviewed_by_name ?? null,
  };
}

/** One attendance row → the engine's per-day facts. */
export function mapDailyFacts(row: Row): DailyFacts {
  return {
    childId: id<ChildId>(row.child_id),
    attendance: row.state ?? 'expected',
    // `time` columns come back as 'HH:MM:SS'; the engine's ClockTime is 'HH:MM'.
    arrivedAt: row.arrived_at ? String(row.arrived_at).slice(0, 5) : null,
    absenceReason: row.absence_reason ?? null,
    collectorGuardianId: row.collector_guardian_id
      ? id<GuardianId>(row.collector_guardian_id)
      : null,
    collectionTime: row.collection_time
      ? String(row.collection_time).slice(0, 5)
      : null,
  };
}
