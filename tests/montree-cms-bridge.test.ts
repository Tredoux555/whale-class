// tests/montree-cms-bridge.test.ts
// ============================================================================
// The bridge, pinned. CMS phase 6.
// ============================================================================
// `lib/montree/cms-bridge/document-source.ts` is the one place Montree's rows
// become the CMS engine's `DocumentSource`, so it is the one place a mapping
// mistake can silently print a wrong allergy on a wall poster. These tests walk
// the whole path — Montree fixture → adapter → PURE engine → document model —
// rather than asserting the adapter's output shape in isolation, because what
// matters is what ends up on the paper.
//
// The sparse cases are not edge cases. On the day this ships, the founder's own
// room has twenty children and zero committed intakes.

import { describe, it, expect } from 'vitest';
import {
  buildDocumentSource,
  summariseIntakeCoverage,
  toRelationship,
  carriesEpipenFrom,
  UNKNOWN_DOB,
  type DocumentSourceInput,
  type MontreeChildRow,
  type MontreeIntakeRow,
} from '@/lib/montree/cms-bridge/document-source';
import {
  countDocumentData,
  defaultOptions,
  generateAllergyPoster,
  generateClassList,
  generateDietarySheet,
  generateEmergencyContacts,
  generateNameLabels,
  generatePickupSheet,
  hasData,
} from '@/lib/cms/engine/doc-generator';
import { emptyIntake, type IntakeForm } from '@/lib/onboarding-core';

const DATE = '2026-08-12';
const OPTIONS = defaultOptions('en', '2026-08-12T08:00:00.000Z');

const SCHOOL = { id: 'school-1', name: 'Whale Class Montessori', timezone: 'Asia/Shanghai' };
const CLASSROOM = { id: 'room-1', school_id: 'school-1', name: 'Whale Class', age_group: '3-6' };

function child(over: Partial<MontreeChildRow> & { id: string }): MontreeChildRow {
  return {
    name: 'Unnamed Child',
    nickname: null,
    date_of_birth: '2021-05-03',
    notes: null,
    photo_url: null,
    classroom_id: 'room-1',
    school_id: 'school-1',
    is_active: true,
    ...over,
  };
}

/** A realistic committed intake: two guardians, a grandmother who may only be
 *  phoned, one authorised pickup adult, one severe nut allergy with an EpiPen
 *  plan, one mild allergy, a dietary line, a doctor and a medication. */
function fullIntake(): IntakeForm {
  const form = emptyIntake();
  form.identity.legalName = 'Zhang Wei';
  form.identity.preferredName = 'Wei';
  form.identity.homeLanguages = ['Mandarin'];
  form.family.guardians = [
    { name: 'Li Mei', relation: '妈妈', phone: '13800000001', email: 'limei@example.com' },
    { name: 'Zhang Qiang', relation: 'Father', phone: '13800000002' },
  ];
  form.emergency.contacts = [{ name: 'Wang Nai', relation: '奶奶', phone: '13800000003' }];
  form.pickup.persons = [{ name: 'Chen Ayi', relation: 'nanny', phone: '13800000004' }];
  form.health.allergies = [
    { allergen: 'Peanut', severity: 'severe', action: 'EpiPen in the red bag, then call 120' },
    { allergen: 'Pollen', severity: 'mild', action: 'Antihistamine if sneezing' },
  ];
  form.health.dietaryRestrictions = 'No dairy, no egg';
  form.health.conditions = 'Mild asthma';
  form.health.medications = 'Salbutamol inhaler';
  form.health.physicianName = 'Dr Sun';
  form.health.physicianPhone = '010-1234-5678';
  form.health.bloodType = 'O+';
  return form;
}

function input(over: Partial<DocumentSourceInput> = {}): DocumentSourceInput {
  return {
    school: SCHOOL,
    classroom: CLASSROOM,
    children: [],
    intakes: [],
    date: DATE,
    ...over,
  };
}

// ── 1 · the full path, with a real committed intake ─────────────────────────

describe('bridge · a committed intake reaches the paper', () => {
  const rows: MontreeChildRow[] = [
    child({ id: 'c1', name: 'Zhang Wei', nickname: 'Wei', notes: 'Naps after lunch' }),
  ];
  const intakes: MontreeIntakeRow[] = [
    { child_id: 'c1', status: 'committed', data: fullIntake(), committed_at: '2026-08-01T02:00:00Z' },
  ];
  const source = buildDocumentSource(input({ children: rows, intakes }));

  it('maps school and room from Montree tables', () => {
    expect(source.school.name).toBe('Whale Class Montessori');
    expect(source.school.timezone).toBe('Asia/Shanghai');
    expect(source.classGroup.name).toBe('Whale Class');
    expect(source.classGroup.ageMin).toBe(3);
    expect(source.classGroup.ageMax).toBe(6);
  });

  it('class list carries names, age, language, allergens with severity and the staff note', () => {
    const doc = generateClassList(source, OPTIONS);
    expect(doc.rows).toHaveLength(1);
    const row = doc.rows[0];
    expect(row.preferredName).toBe('Wei');
    expect(row.legalName).toBe('Zhang Wei');
    expect(row.age).toEqual({ years: 5, months: 3 });
    expect(row.homeLanguage).toBe('Mandarin');
    // Severe first — the engine's ordering, fed by the bridge's severities.
    expect(row.allergens).toEqual([
      { name: 'Peanut', severity: 'severe' },
      { name: 'Pollen', severity: 'mild' },
    ]);
    expect(row.hasSevereAllergy).toBe(true);
    expect(row.carriesEpipen).toBe(true);
    expect(row.dietaryLabels).toEqual(['No dairy, no egg']);
    // montree_children.notes IS the teacher's own line, and it prints.
    expect(row.staffNote).toBe('Naps after lunch');
  });

  it('allergy poster carries ONLY the severe/EpiPen allergy, with the response plan', () => {
    const doc = generateAllergyPoster(source, OPTIONS);
    expect(doc.entries).toHaveLength(1);
    expect(doc.entries[0].allergen).toBe('Peanut');
    expect(doc.entries[0].carriesEpipen).toBe(true);
    expect(doc.entries[0].responsePlan).toContain('EpiPen');
    expect(doc.epipenCount).toBe(1);
    expect(doc.severeCount).toBe(1);
  });

  it('pickup sheet lists guardians and authorised pickup people, never phone-only contacts', () => {
    const doc = generatePickupSheet(source, OPTIONS);
    const names = doc.rows[0].collectors.map((c) => c.name);
    expect(names).toEqual(['Li Mei', 'Zhang Qiang', 'Chen Ayi']);
    // The grandmother is on the emergency list only — you ring her, she does
    // not take the child home.
    expect(names).not.toContain('Wang Nai');
    expect(doc.rows[0].noCollector).toBe(false);
    expect(doc.rows[0].criticalAllergens).toEqual(['Peanut']);
  });

  it('emergency contacts keep EVERYBODY, in call order, with relationships typed', () => {
    const doc = generateEmergencyContacts(source, OPTIONS);
    const row = doc.rows[0];
    expect(row.contacts.map((c) => c.name)).toEqual([
      'Li Mei',
      'Zhang Qiang',
      'Wang Nai',
      'Chen Ayi',
    ]);
    expect(row.contacts.map((c) => c.relationship)).toEqual([
      'mother',
      'father',
      'grandparent',
      'other',
    ]);
    expect(row.contacts.map((c) => c.canCollect)).toEqual([true, true, false, true]);
    expect(row.doctorName).toBe('Dr Sun');
    expect(row.doctorPhone).toBe('010-1234-5678');
    expect(row.conditions).toEqual(['Mild asthma']);
    // Medications must NOT be dropped off the sheet an ambulance crew reads.
    expect(row.medications).toHaveLength(1);
    expect(row.medications[0].name).toBe('Salbutamol inhaler');
    expect(row.emergencyNote).toBe('O+');
    expect(row.criticalAllergens).toEqual(['Peanut']);
  });

  it('dietary sheet groups the free-text answer and splits it into excluded foods', () => {
    const doc = generateDietarySheet(source, OPTIONS);
    expect(doc.groups).toHaveLength(1);
    expect(doc.groups[0].label).toBe('No dairy, no egg');
    expect(doc.groups[0].reason).toBe('medical');
    expect(doc.groups[0].excludedFoods).toEqual(['No dairy', 'no egg']);
    // Covered by a dietary row, so NOT repeated in the allergy-only block.
    expect(doc.allergyOnly).toHaveLength(0);
  });
});

// ── 2 · sparse: no intake at all (the Whale Class day-one case) ─────────────

describe('bridge · no committed intake anywhere', () => {
  const rows: MontreeChildRow[] = [
    child({ id: 'c1', name: 'Amara Nkosi', date_of_birth: '2021-03-05' }),
    child({ id: 'c2', name: 'Bo Chen', nickname: 'Bo', date_of_birth: '2020-11-20' }),
  ];
  const source = buildDocumentSource(input({ children: rows }));

  it('every child still appears, with empty health collections', () => {
    expect(source.children).toHaveLength(2);
    expect(source.allergies).toHaveLength(0);
    expect(source.dietary).toHaveLength(0);
    expect(source.medical).toHaveLength(0);
  });

  it('the class list is fully useful from names and birthdays alone', () => {
    const doc = generateClassList(source, OPTIONS);
    expect(doc.rows.map((r) => r.preferredName)).toEqual(['Amara', 'Bo']);
    expect(doc.rows[0].age).toEqual({ years: 5, months: 5 });
    expect(doc.rows[0].allergens).toEqual([]);
    expect(doc.rows[0].staffNote).toBeNull();
  });

  it('name labels print for the whole room', () => {
    const doc = generateNameLabels(source, OPTIONS);
    expect(doc.cells.map((c) => c.name)).toEqual(['Amara', 'Bo']);
    expect(doc.cells[0].surname).toBe('Nkosi');
    expect(doc.cells[0].roomName).toBe('Whale Class');
  });

  it('the health documents are honestly empty, and the index knows it', () => {
    expect(generateAllergyPoster(source, OPTIONS).entries).toHaveLength(0);
    expect(generateDietarySheet(source, OPTIONS).groups).toHaveLength(0);
    expect(generatePickupSheet(source, OPTIONS).rows.every((r) => r.noCollector)).toBe(true);

    const counts = countDocumentData(source);
    expect(hasData('class_list', counts)).toBe(true);
    expect(hasData('name_labels', counts)).toBe(true);
    expect(hasData('allergy_poster', counts)).toBe(false);
    expect(hasData('dietary_sheet', counts)).toBe(false);
    expect(hasData('pickup_sheet', counts)).toBe(false);
    expect(hasData('emergency_contacts', counts)).toBe(false);
  });

  it('none of the six generators throws on sparse data', () => {
    expect(() => generateClassList(source, OPTIONS)).not.toThrow();
    expect(() => generatePickupSheet(source, OPTIONS)).not.toThrow();
    expect(() => generateAllergyPoster(source, OPTIONS)).not.toThrow();
    expect(() => generateDietarySheet(source, OPTIONS)).not.toThrow();
    expect(() => generateEmergencyContacts(source, OPTIONS)).not.toThrow();
    expect(() => generateNameLabels(source, OPTIONS)).not.toThrow();
  });
});

// ── 3 · no date of birth ────────────────────────────────────────────────────

describe('bridge · a child with no birthday on file', () => {
  it('carries the sentinel rather than a fabricated date, and prints no age', () => {
    const source = buildDocumentSource(
      input({ children: [child({ id: 'c1', name: 'Roman', date_of_birth: null, age: 4 })] })
    );
    expect(source.children[0].dateOfBirth).toBe(UNKNOWN_DOB);
    const doc = generateClassList(source, OPTIONS);
    // `montree_children.age` is deliberately NOT converted into a birthday:
    // an integer cannot produce a date, and a plausible wrong age is worse
    // than "Not known".
    expect(doc.rows[0].age).toBeNull();
    expect(doc.rows[0].dateOfBirth).toBe(UNKNOWN_DOB);
  });

  it('an empty-string date is treated the same as no date', () => {
    const source = buildDocumentSource(
      input({ children: [child({ id: 'c1', name: 'Roman', date_of_birth: '' })] })
    );
    expect(source.children[0].dateOfBirth).toBe(UNKNOWN_DOB);
  });
});

// ── 4 · the review gate ─────────────────────────────────────────────────────

describe('bridge · review-gated intake', () => {
  const rows = [child({ id: 'c1', name: 'Zhang Wei' })];

  it('a DRAFT intake never reaches a document', () => {
    const source = buildDocumentSource(
      input({ children: rows, intakes: [{ child_id: 'c1', status: 'draft', data: fullIntake() }] })
    );
    expect(source.allergies).toHaveLength(0);
    expect(source.children[0].guardians).toHaveLength(0);
  });

  it('a SUBMITTED but unreviewed intake never reaches a document', () => {
    const source = buildDocumentSource(
      input({
        children: rows,
        intakes: [{ child_id: 'c1', status: 'submitted', data: fullIntake() }],
      })
    );
    expect(source.allergies).toHaveLength(0);
  });

  it('the newest committed intake wins when a child somehow has two', () => {
    const older = fullIntake();
    older.identity.preferredName = 'Old';
    const newer = fullIntake();
    newer.identity.preferredName = 'New';
    const source = buildDocumentSource(
      input({
        children: [child({ id: 'c1', name: 'Zhang Wei', nickname: null })],
        intakes: [
          { child_id: 'c1', status: 'committed', data: older, committed_at: '2026-01-01T00:00:00Z' },
          { child_id: 'c1', status: 'committed', data: newer, committed_at: '2026-08-01T00:00:00Z' },
        ],
      })
    );
    expect(source.children[0].preferredName).toBe('New');
  });
});

// ── 5 · archived children ───────────────────────────────────────────────────

describe('bridge · archived children', () => {
  it('an is_active=false child never prints', () => {
    const source = buildDocumentSource(
      input({
        children: [
          child({ id: 'c1', name: 'Active Child' }),
          child({ id: 'c2', name: 'Archived Child', is_active: false }),
        ],
      })
    );
    expect(source.children.map((c) => c.legalName)).toEqual(['Active Child']);
  });
});

// ── 6 · the small honest converters ─────────────────────────────────────────

describe('bridge · relationship mapping', () => {
  it('reads English and Chinese relations, and refuses to guess', () => {
    expect(toRelationship('Mother')).toBe('mother');
    expect(toRelationship('妈妈')).toBe('mother');
    expect(toRelationship('爸爸')).toBe('father');
    expect(toRelationship('grandmother')).toBe('grandparent');
    expect(toRelationship('外婆')).toBe('grandparent');
    expect(toRelationship('阿姨')).toBe('aunt');
    expect(toRelationship('Legal guardian')).toBe('guardian');
    // Regression: "nanny" once matched the British "nan" and printed a paid
    // carer as the child's grandmother on the emergency sheet.
    expect(toRelationship('nanny')).toBe('other');
    expect(toRelationship('Nan')).toBe('grandparent');
    expect(toRelationship('Nana')).toBe('grandparent');
    // An unrecognised relation prints as "Other" — never promoted to a word
    // that implies legal standing nobody claimed.
    expect(toRelationship('driver')).toBe('other');
    expect(toRelationship('')).toBe('other');
    expect(toRelationship(undefined)).toBe('other');
  });
});

describe('bridge · adrenaline detection', () => {
  it('reads the auto-injector out of the response text, in several languages', () => {
    expect(carriesEpipenFrom('EpiPen in the red bag')).toBe(true);
    expect(carriesEpipenFrom('epi-pen then call 120')).toBe(true);
    expect(carriesEpipenFrom('Jext in the office')).toBe(true);
    expect(carriesEpipenFrom('肾上腺素笔在红包里')).toBe(true);
    expect(carriesEpipenFrom('Antihistamine if sneezing')).toBe(false);
    expect(carriesEpipenFrom('')).toBe(false);
  });

  it('does not flag a plain negative — the parent said NO', () => {
    // Regression: "no epipen needed" once matched the bare pattern and printed
    // a child at the top of the poster despite the parent's answer being "no".
    expect(carriesEpipenFrom('no epipen needed')).toBe(false);
    expect(carriesEpipenFrom('No EpiPen required, just antihistamine')).toBe(false);
    expect(carriesEpipenFrom('Child does NOT carry an epipen')).toBe(false);
    expect(carriesEpipenFrom('EpiPen not required')).toBe(false);
    expect(carriesEpipenFrom("Doesn't carry an EpiPen")).toBe(false);
    // A negation far from the mention must not swallow a real EpiPen.
    expect(carriesEpipenFrom('No other allergies. Carries an EpiPen daily in the red bag.')).toBe(
      true
    );
  });

  it('an unreadable severity fails to SEVERE, never to mild', () => {
    const form = emptyIntake();
    // A row whose severity was lost must not quietly become a mild note.
    form.health.allergies = [
      { allergen: 'Shellfish', severity: 'unknown' as unknown as 'mild', action: '' },
    ];
    const source = buildDocumentSource(
      input({
        children: [child({ id: 'c1', name: 'Test Child' })],
        intakes: [{ child_id: 'c1', status: 'committed', data: form }],
      })
    );
    expect(source.allergies[0].severity).toBe('severe');
    expect(source.allergies[0].requiresPoster).toBe(true);
  });
});

// ── 7 · the dietary allergy-only safety block ───────────────────────────────

describe('bridge · a food allergy with no dietary line', () => {
  it('still reaches the kitchen through the allergy-only block', () => {
    const form = emptyIntake();
    form.health.allergies = [{ allergen: 'Sesame', severity: 'severe', action: '' }];
    const source = buildDocumentSource(
      input({
        children: [child({ id: 'c1', name: 'Ana Silva' })],
        intakes: [{ child_id: 'c1', status: 'committed', data: form }],
      })
    );
    const doc = generateDietarySheet(source, OPTIONS);
    expect(doc.groups).toHaveLength(0);
    expect(doc.allergyOnly).toHaveLength(1);
    expect(doc.allergyOnly[0].allergens).toEqual(['Sesame']);
  });
});

// ── 8 · coverage, the honest half of the empty state ────────────────────────

describe('bridge · intake coverage', () => {
  it('counts what is missing, not only what is there', () => {
    const coverage = summariseIntakeCoverage(
      input({
        children: [
          child({ id: 'c1', name: 'A One' }),
          child({ id: 'c2', name: 'B Two', date_of_birth: null }),
          child({ id: 'c3', name: 'C Three' }),
          child({ id: 'c4', name: 'D Archived', is_active: false }),
        ],
        intakes: [
          { child_id: 'c1', status: 'committed', data: fullIntake() },
          { child_id: 'c2', status: 'submitted', data: fullIntake() },
        ],
      })
    );
    expect(coverage.children).toBe(3);
    expect(coverage.withCommittedIntake).toBe(1);
    expect(coverage.withoutCommittedIntake).toBe(2);
    expect(coverage.withoutDateOfBirth).toBe(1);
    expect(coverage.anyIntake).toBe(true);
  });

  it('reports a room that has never used intake at all', () => {
    const coverage = summariseIntakeCoverage(
      input({ children: [child({ id: 'c1', name: 'A One' })] })
    );
    expect(coverage.anyIntake).toBe(false);
    expect(coverage.withoutCommittedIntake).toBe(1);
  });
});

// ── 9 · duplicate people ────────────────────────────────────────────────────

describe('bridge · the same adult typed twice', () => {
  it('merges rather than printing two people at the door', () => {
    const form = emptyIntake();
    form.family.guardians = [{ name: 'Li Mei', relation: 'Mother', phone: '138 0000 0001' }];
    form.emergency.contacts = [{ name: 'Li Mei', relation: 'Mother', phone: '13800000001' }];
    form.pickup.persons = [{ name: 'Li Mei', relation: 'Mother', phone: '138-0000-0001' }];
    const source = buildDocumentSource(
      input({
        children: [child({ id: 'c1', name: 'Zhang Wei' })],
        intakes: [{ child_id: 'c1', status: 'committed', data: form }],
      })
    );
    expect(source.children[0].guardians).toHaveLength(1);
    expect(source.children[0].authorisedCollectors).toHaveLength(1);
  });
});
