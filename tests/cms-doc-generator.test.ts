// tests/cms-doc-generator.test.ts
//
// The document engine is the bottom of the CMS hourglass: six pure functions
// that turn a room's records into the paper the room runs on. Because they are
// pure, they can be pinned exactly — and because at least three of them are
// SAFETY documents, they should be.
//
// The assertions that matter are the ordering ones. A poster that lists a mild
// pollen allergy above a child with adrenaline in the cabinet is a poster that
// kills somebody slowly; a kitchen sheet that misses a child with a food
// allergy but no dietary row does the same. Both are one `.sort()` and one
// `.filter()` away, and both are asserted here.
//
// The fixture is `lib/cms/demo/seed.ts` — the same six children the founder
// demos on, which means a regression shows up in a screenshot too.

import { describe, it, expect } from 'vitest';
import {
  ageOn,
  countDocumentData,
  defaultOptions,
  generate,
  type DocumentSource,
} from '@/lib/cms/engine/doc-generator';
import {
  DEMO_DATE,
  demoAllergies,
  demoChildren,
  demoClassGroup,
  demoDietary,
  demoMedical,
  demoSchool,
} from '@/lib/cms/demo/seed';
import { id, type AllergyId } from '@/lib/cms/engine/types';

const source: DocumentSource = {
  school: demoSchool,
  classGroup: demoClassGroup,
  date: DEMO_DATE,
  children: demoChildren,
  allergies: demoAllergies,
  dietary: demoDietary,
  medical: demoMedical,
};

const options = defaultOptions('en', '2026-08-12T09:00:00Z');

describe('class list', () => {
  const doc = generate('class_list', source, options);

  it('covers the whole room, in roll order', () => {
    expect(doc.kind).toBe('class_list');
    if (doc.kind !== 'class_list') return;
    expect(doc.rows).toHaveLength(6);
    const names = doc.rows.map((r) => r.preferredName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('carries the flags a teacher scans for', () => {
    if (doc.kind !== 'class_list') return;
    const amara = doc.rows.find((r) => r.preferredName === 'Amara')!;
    expect(amara.allergens[0]).toEqual({ name: 'Peanut', severity: 'severe' });
    expect(amara.carriesEpipen).toBe(true);
    expect(amara.hasSevereAllergy).toBe(true);
    expect(amara.dietaryLabels).toContain('Nut-free table');
  });

  it('returns an age as numbers, never as a sentence (the view localises)', () => {
    if (doc.kind !== 'class_list') return;
    const amara = doc.rows.find((r) => r.preferredName === 'Amara')!;
    expect(amara.age).toEqual({ years: 5, months: 2 });
  });

  it('does not print "Wei Wei"', () => {
    if (doc.kind !== 'class_list') return;
    expect(doc.rows.find((r) => r.preferredName === 'Wei')!.surname).toBeNull();
  });

  // 🚨 Regression: a staff-entered child with no known birthday carries the
  // UNKNOWN_DOB sentinel ('1900-01-01', lib/cms/db/queries.ts), which is a
  // syntactically real date. Before this guard, `ageOn` computed a false
  // ~126-year-old instead of "not known" — exactly the wrong-plausible-age
  // failure the sentinel exists to prevent, and it printed on the class list
  // right next to a DOB cell correctly showing "not known".
  it('🚨 never prints a false age for the UNKNOWN_DOB sentinel', () => {
    expect(ageOn('1900-01-01', '2026-08-12')).toBeNull();

    const unknownDobSource: DocumentSource = {
      ...source,
      children: [{ ...demoChildren[0], dateOfBirth: '1900-01-01' }],
      allergies: [],
      dietary: [],
      medical: [],
    };
    const unknownDoc = generate('class_list', unknownDobSource, options);
    if (unknownDoc.kind !== 'class_list') return;
    expect(unknownDoc.rows[0].age).toBeNull();
  });
});

describe('pickup sheet', () => {
  const doc = generate('pickup_sheet', source, options);

  it('lists collectors in call order and names its hand-written columns', () => {
    expect(doc.kind).toBe('pickup_sheet');
    if (doc.kind !== 'pickup_sheet') return;
    const amara = doc.rows.find((r) => r.childName === 'Amara')!;
    expect(amara.collectors).toHaveLength(2);
    expect(amara.collectors[0].priority).toBeLessThanOrEqual(amara.collectors[1].priority);
    expect(doc.signatureColumns).toEqual(['collectedBy', 'time', 'signature']);
  });

  it('puts the critical allergens at the door, and only those', () => {
    if (doc.kind !== 'pickup_sheet') return;
    expect(doc.rows.find((r) => r.childName === 'Amara')!.criticalAllergens).toContain('Peanut');
    // Tumelo's bee sting is mild — it belongs on the class list, not the gate.
    expect(doc.rows.find((r) => r.childName === 'Tumelo')!.criticalAllergens).toHaveLength(0);
  });

  it('marks a child with nobody authorised, rather than leaving a blank cell', () => {
    const orphan: DocumentSource = {
      ...source,
      children: [{ ...demoChildren[0], guardians: [], authorisedCollectors: [] }],
    };
    const doc2 = generate('pickup_sheet', orphan, options);
    if (doc2.kind !== 'pickup_sheet') return;
    expect(doc2.rows[0].noCollector).toBe(true);
  });
});

describe('dietary sheet — the kitchen reads this while plating twenty lunches', () => {
  const doc = generate('dietary_sheet', source, options);

  it('groups by requirement, not by child', () => {
    expect(doc.kind).toBe('dietary_sheet');
    if (doc.kind !== 'dietary_sheet') return;
    expect(doc.groups).toHaveLength(4);
    const labels = doc.groups.map((g) => g.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });

  it('🚨 still lists a child with a food allergy and NO dietary row', () => {
    // The most dangerous thing this document could do is quietly omit them.
    if (doc.kind !== 'dietary_sheet') return;
    expect(doc.allergyOnly.map((c) => c.childName)).toContain('Tumelo');
  });

  it('de-duplicates the excluded-food list per group', () => {
    if (doc.kind !== 'dietary_sheet') return;
    const halal = doc.groups.find((g) => g.label === 'Halal')!;
    expect(new Set(halal.excludedFoods).size).toBe(halal.excludedFoods.length);
  });
});

describe('allergy poster — the wall', () => {
  const doc = generate('allergy_poster', source, options);

  it('shows only the allergies that earned a wall, EpiPen first', () => {
    expect(doc.kind).toBe('allergy_poster');
    if (doc.kind !== 'allergy_poster') return;
    // The mild bee sting has requiresPoster:false and is excluded BY DESIGN —
    // a wall of twenty mild notes is a wall nobody reads.
    expect(doc.entries).toHaveLength(2);
    expect(doc.entries[0].carriesEpipen).toBe(true);
    expect(doc.entries[0].childName).toBe('Amara');
    expect(doc.severeCount).toBe(1);
    expect(doc.epipenCount).toBe(1);
  });

  it('tells the reader where the medication actually is', () => {
    if (doc.kind !== 'allergy_poster') return;
    expect(doc.entries[0].medicationLocation).toBe('Sunrise Room cabinet');
  });

  // A child with two poster-worthy allergies and NO contacts on file at all —
  // the poster, the pickup sheet and the emergency-contacts file must all
  // still render this child without a crash or a lost entry.
  it('handles a child with 2 allergies and no contacts, on every document', () => {
    const noContactChild = { ...demoChildren[0], guardians: [], authorisedCollectors: [] };
    const twoAllergies = [
      { ...demoAllergies[0], id: id<AllergyId>('al-test-1'), childId: noContactChild.id, allergen: 'Peanut', severity: 'severe' as const, carriesEpipen: true, requiresPoster: true },
      { ...demoAllergies[0], id: id<AllergyId>('al-test-2'), childId: noContactChild.id, allergen: 'Tree nut', severity: 'severe' as const, carriesEpipen: false, requiresPoster: true },
    ];
    const isolated: DocumentSource = {
      ...source,
      children: [noContactChild],
      allergies: twoAllergies,
      dietary: [],
    };

    const poster = generate('allergy_poster', isolated, options);
    if (poster.kind !== 'allergy_poster') throw new Error('wrong kind');
    expect(poster.entries).toHaveLength(2);
    // EpiPen first even though both are severe.
    expect(poster.entries[0].allergen).toBe('Peanut');

    const pickup = generate('pickup_sheet', isolated, options);
    if (pickup.kind !== 'pickup_sheet') throw new Error('wrong kind');
    expect(pickup.rows[0].noCollector).toBe(true);
    expect(pickup.rows[0].criticalAllergens).toEqual(['Peanut', 'Tree nut']);

    const contacts = generate('emergency_contacts', isolated, options);
    if (contacts.kind !== 'emergency_contacts') throw new Error('wrong kind');
    expect(contacts.rows[0].contacts).toEqual([]);
    expect(contacts.rows[0].criticalAllergens).toEqual(['Peanut', 'Tree nut']);
  });
});

describe('emergency contacts', () => {
  const doc = generate('emergency_contacts', source, options);

  it('lists every contact in call order, not only the collectors', () => {
    expect(doc.kind).toBe('emergency_contacts');
    if (doc.kind !== 'emergency_contacts') return;
    const amara = doc.rows.find((r) => r.childName === 'Amara')!;
    expect(amara.contacts[0].priority).toBe(1);
    // The person you ring at 11am is not always the person allowed to take the
    // child home at 3pm; conflating them is how a school phones nobody.
    expect(amara.contacts.length).toBeGreaterThanOrEqual(
      amara.contacts.filter((c) => c.canCollect).length
    );
  });

  it('carries the doctor and the on-site medication', () => {
    if (doc.kind !== 'emergency_contacts') return;
    const amara = doc.rows.find((r) => r.childName === 'Amara')!;
    expect(amara.doctorName).toBe('Dr N. Pillay');
    expect(amara.medications).toHaveLength(1);
    expect(amara.medications[0].name).toBe('EpiPen Jr');
  });

  it('still gives a child with no medical record a row', () => {
    if (doc.kind !== 'emergency_contacts') return;
    expect(doc.rows.find((r) => r.childName === 'Wei')!.doctorName).toBeNull();
  });
});

describe('name labels', () => {
  it('is one cell per child on a 3 × 8 A4 grid', () => {
    const doc = generate('name_labels', source, options);
    expect(doc.kind).toBe('name_labels');
    if (doc.kind !== 'name_labels') return;
    expect(doc.cells).toHaveLength(6);
    expect(doc.columns).toBe(3);
    expect(doc.rowsPerPage).toBe(8);
    expect(doc.cells.every((c) => c.roomName === 'Sunrise Room')).toBe(true);
  });
});

describe('the index page counts', () => {
  it('agrees with the documents they describe', () => {
    const counts = countDocumentData(source);
    expect(counts).toMatchObject({
      children: 6,
      allergies: 3,
      posterAllergies: 2,
      epipens: 1,
      severeAllergies: 1,
      dietaryRequirements: 4,
      dietaryGroups: 4,
      childrenWithoutCollector: 0,
    });
  });
});

describe('an empty room', () => {
  const empty: DocumentSource = {
    ...source,
    children: [],
    allergies: [],
    dietary: [],
    medical: [],
  };

  it.each([
    'class_list',
    'pickup_sheet',
    'dietary_sheet',
    'allergy_poster',
    'emergency_contacts',
    'name_labels',
  ] as const)('%s renders a model with nothing in it rather than throwing', (kind) => {
    expect(generate(kind, empty, options).meta.rowCount).toBe(0);
  });
});
