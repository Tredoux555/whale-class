// lib/cms/engine/roster.ts
// ============================================================================
// THE ONE ENGINE MODULE THAT IS ACTUALLY IMPLEMENTED (phase 1).
// ============================================================================
// It exists to prove the hourglass end-to-end: parent-entered records
// (Child / Allergy / DietaryRequirement / MedicalRecord / Guardian) go in,
// a teacher-shaped DailyRoster comes out, and the Today page renders it
// without knowing anything about the intake forms.
//
// Pure function. No I/O, no clock, no locale — the caller supplies the day and
// localises labels it owns. That is what makes it testable and portable.

import type {
  Allergy,
  AttendanceState,
  Child,
  ChildFlag,
  ClassGroup,
  ClockTime,
  DailyRoster,
  DailyRosterEntry,
  DietaryRequirement,
  GuardianId,
  IsoDate,
  MedicalRecord,
  School,
} from './types';

/** Severe allergies must out-sort everything else in a dense flag row. */
const SEVERITY_WEIGHT: Record<Allergy['severity'], number> = {
  severe: 100,
  moderate: 80,
  mild: 60,
};

/** What the caller knows about one child on one day, beyond the standing record. */
export interface DailyFacts {
  childId: Child['id'];
  attendance: AttendanceState;
  arrivedAt?: ClockTime | null;
  absenceReason?: string | null;
  /** Set only when today's collector differs from the default guardian. */
  collectorGuardianId?: GuardianId | null;
  collectionTime?: ClockTime | null;
}

export interface RosterInput {
  school: School;
  classGroup: ClassGroup;
  date: IsoDate;
  children: Child[];
  allergies: Allergy[];
  dietary: DietaryRequirement[];
  medical: MedicalRecord[];
  daily: DailyFacts[];
}

/** Localised label fragments the caller passes in, so the engine stays i18n-free. */
export interface RosterLabels {
  severity: Record<Allergy['severity'], string>;
  pickup: (time: string, person: string) => string;
  droppedOff: (time: string) => string;
  absent: (reason: string) => string;
  noFlags: string;
}

/**
 * Derive every flag that should appear next to a child today.
 *
 * Order is deliberate and is a safety decision, not a style one: allergies
 * first (severe → mild), then medical, then dietary, then logistics. A teacher
 * scanning a row must hit the thing that can kill before the thing about lunch.
 */
export function deriveFlags(
  child: Child,
  facts: DailyFacts | undefined,
  allergies: Allergy[],
  dietary: DietaryRequirement[],
  medical: MedicalRecord | undefined,
  labels: RosterLabels
): ChildFlag[] {
  const flags: ChildFlag[] = [];

  for (const a of allergies) {
    flags.push({
      category: 'allergy',
      label: a.allergen,
      detail: labels.severity[a.severity],
      weight: SEVERITY_WEIGHT[a.severity],
    });
  }

  if (medical && medical.medications.some((m) => m.heldOnSite)) {
    const held = medical.medications.filter((m) => m.heldOnSite);
    flags.push({
      category: 'medical',
      label: held.map((m) => m.name).join(', '),
      weight: 55,
    });
  }

  for (const d of dietary) {
    flags.push({ category: 'dietary', label: d.label, weight: 40 });
  }

  if (facts?.collectorGuardianId && facts.collectionTime) {
    const collector = child.guardians.find((g) => g.id === facts.collectorGuardianId);
    if (collector) {
      flags.push({
        category: 'pickup',
        label: labels.pickup(facts.collectionTime, collector.fullName),
        weight: 30,
      });
    }
  }

  if (facts?.attendance === 'present' && facts.arrivedAt) {
    flags.push({ category: 'neutral', label: labels.droppedOff(facts.arrivedAt), weight: 20 });
  }
  if (facts?.attendance === 'absent') {
    flags.push({
      category: 'neutral',
      label: labels.absent(facts.absenceReason ?? '—'),
      weight: 20,
    });
  }

  if (flags.length === 0) {
    flags.push({ category: 'neutral', label: labels.noFlags, weight: 0 });
  }

  return flags.sort((a, b) => b.weight - a.weight);
}

/** Assemble the whole Today page from standing records + today's facts. */
export function buildDailyRoster(input: RosterInput, labels: RosterLabels): DailyRoster {
  const factsByChild = new Map(input.daily.map((d) => [d.childId, d]));
  const medicalByChild = new Map(input.medical.map((m) => [m.childId, m]));

  const entries: DailyRosterEntry[] = input.children.map((child) => {
    const facts = factsByChild.get(child.id);
    const childAllergies = input.allergies.filter((a) => a.childId === child.id);
    const childDietary = input.dietary.filter((d) => d.childId === child.id);
    const childMedical = medicalByChild.get(child.id);

    const collector =
      facts?.collectorGuardianId
        ? child.guardians.find((g) => g.id === facts.collectorGuardianId) ?? null
        : null;

    return {
      child,
      attendance: facts?.attendance ?? 'expected',
      arrivedAt: facts?.arrivedAt ?? null,
      absenceReason: facts?.absenceReason ?? null,
      expectedCollector: collector
        ? {
            guardianId: collector.id,
            name: collector.fullName,
            relationship: collector.relationship,
          }
        : null,
      expectedCollectionTime: facts?.collectionTime ?? null,
      flags: deriveFlags(child, facts, childAllergies, childDietary, childMedical, labels),
    };
  });

  return {
    school: input.school,
    classGroup: input.classGroup,
    date: input.date,
    entries,
    presentCount: entries.filter((e) => e.attendance === 'present').length,
    totalCount: entries.length,
  };
}

/** Count flags of one category across a roster — drives the Today stat tiles. */
export function countFlags(roster: DailyRoster, category: ChildFlag['category']): number {
  return roster.entries.reduce(
    (sum, entry) => sum + entry.flags.filter((f) => f.category === category).length,
    0
  );
}
