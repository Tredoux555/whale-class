// tests/lens-context-builder.test.ts
// The moments → prompt context builder.
//
// This is the file that decides what the Lens Guru is allowed to know. Two
// properties are load-bearing and are what these tests pin:
//
//   1. EVERY moment is rendered with its id in square brackets. That bracket is
//      the citation handle the whole anti-fabrication design rests on — change
//      the format and lib/lens/reports/schema.ts starts silently discarding
//      perfectly good citations.
//
//   2. An empty visit says SO, loudly. A context builder that quietly produced
//      an empty MOMENTS block would hand the model a clean sheet and an
//      instruction to write a report, which is the exact conditions under which
//      a language model invents one.

import { describe, expect, it } from 'vitest';
import {
  buildCoverageBlock,
  buildMomentsBlock,
  buildStaffBlock,
  buildVisitContext,
  buildVisitHeader,
  citableMomentIds,
  renderMoment,
  type VisitContextInput,
} from '@/lib/lens/guru/context-builder';
import type {
  LensClassroom,
  LensMoment,
  LensObserver,
  LensSchool,
  LensStaff,
  LensVisit,
} from '@/lib/lens/types';

const ROOM_ID = '11111111-1111-4111-8111-111111111111';
const STAFF_ID = '22222222-2222-4222-8222-222222222222';
const M1 = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const M2 = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const M3 = 'cccccccc-3333-4333-8333-cccccccccccc';

const observer: LensObserver = {
  id: 'obs',
  name: 'Ana Ruiz',
  title: 'AMI Consultant',
  credentials: 'AMI 3–6',
  organisation: 'Ruiz Montessori Consulting',
  letterhead_name: null,
  letterhead_line1: null,
  letterhead_line2: null,
  letterhead_email: null,
  letterhead_phone: null,
  signature_text: null,
  default_languages: ['en'],
  style_profile: {},
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const school: LensSchool = {
  id: 'sch',
  observer_id: 'obs',
  name: 'Willowbank Montessori',
  city: 'Beijing',
  country: 'China',
  contact_name: null,
  contact_email: null,
  logo_path: null,
  affiliation: 'AMI',
  age_bands: [],
  notes: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const classroom: LensClassroom = {
  id: ROOM_ID,
  school_id: 'sch',
  name: 'Cedar',
  level: 'casa',
  age_range: '3–6',
  child_count: 24,
  ratio: '1:12',
  room_notes: 'South-facing, opens onto the garden.',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const staff: LensStaff = {
  id: STAFF_ID,
  classroom_id: ROOM_ID,
  name: 'Miss Chen',
  role: 'lead_guide',
  training: 'AMI',
  training_level: '3–6',
  years_experience: 7,
  notes: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const visit: LensVisit = {
  id: 'vis',
  observer_id: 'obs',
  school_id: 'sch',
  visit_date: '2026-03-12',
  engagement_type: 'consultation',
  purpose: 'Termly consultation.',
  started_at: '2026-03-12T01:30:00Z',
  ended_at: '2026-03-12T04:30:00Z',
  status: 'drafting',
  created_at: '2026-03-12T01:00:00Z',
};

function moment(overrides: Partial<LensMoment> & { id: string }): LensMoment {
  return {
    visit_id: 'vis',
    classroom_id: ROOM_ID,
    ts: '2026-03-12T01:42:00Z',
    kind: 'text',
    media_path: null,
    transcript: null,
    body: null,
    caption: null,
    area: null,
    subject: null,
    staff_id: null,
    child_alias: null,
    rating: null,
    client_id: null,
    created_at: '2026-03-12T01:42:00Z',
    ...overrides,
  };
}

const moments: LensMoment[] = [
  moment({
    id: M1,
    kind: 'text',
    body: 'Child A (4;3) built the Pink Tower three times.',
    subject: 'children',
    area: 'sensorial',
    child_alias: 'Child A (4;3)',
    rating: 4,
  }),
  moment({
    id: M2,
    kind: 'photo',
    ts: '2026-03-12T02:05:00Z',
    media_path: 'obs/vis/2026-03-12/x.jpg',
    caption: 'Maths shelf, second row incomplete.',
    subject: 'environment',
    area: 'mathematics',
  }),
  moment({
    id: M3,
    kind: 'voice',
    ts: '2026-03-12T02:20:00Z',
    transcript: 'The guide interrupted a presentation twice.',
    subject: 'adult',
    staff_id: STAFF_ID,
  }),
];

const input: VisitContextInput = {
  observer,
  school,
  visit,
  classrooms: [classroom],
  staff: [staff],
  moments,
};

describe('renderMoment', () => {
  it('puts the id in square brackets — the citation handle', () => {
    const line = renderMoment(moments[0], 'Cedar', null);
    expect(line.startsWith(`[${M1}]`)).toBe(true);
  });

  it('renders the clock, the kind, the room and every tag', () => {
    const line = renderMoment(moments[0], 'Cedar', null);
    expect(line).toContain('01:42');
    expect(line).toContain('TEXT');
    expect(line).toContain('Cedar');
    expect(line).toContain('The children');
    expect(line).toContain('Sensorial');
    expect(line).toContain('Child A (4;3)');
    expect(line).toContain('Exemplary'); // rating pip 4
  });

  it('says a photograph EXISTS and gives its caption, not an image', () => {
    // The report body may never carry a child's face, so the model is handed
    // what the photo IS rather than the photo itself. "A photograph exists" is
    // a citable fact in its own right.
    const line = renderMoment(moments[1], 'Cedar', null);
    expect(line).toContain('photograph: Maths shelf, second row incomplete.');
  });

  it('marks an uncaptioned photo as uncaptioned rather than pretending', () => {
    const line = renderMoment(moment({ id: M2, kind: 'photo' }), null, null);
    expect(line).toContain('no caption written');
  });

  it('labels a voice transcript as something she said', () => {
    const line = renderMoment(moments[2], 'Cedar', 'Miss Chen');
    expect(line).toContain('said: The guide interrupted a presentation twice.');
    expect(line).toContain('re: Miss Chen');
  });

  it('explains a bare chip instead of rendering a blank moment', () => {
    const line = renderMoment(moment({ id: M1, kind: 'chip', area: 'language' }), null, null);
    expect(line).toContain('a tag with no words');
  });

  it('does not crash on an unparseable timestamp', () => {
    const line = renderMoment(moment({ id: M1, ts: 'not a date' }), null, null);
    expect(line).toContain('??:??');
  });
});

describe('buildMomentsBlock', () => {
  it('renders every moment, oldest first, each with its id', () => {
    const block = buildMomentsBlock(moments, [classroom], [staff]);
    expect(block).toContain('3 captured, oldest first');
    for (const m of moments) expect(block).toContain(`[${m.id}]`);
    expect(block.indexOf(M1)).toBeLessThan(block.indexOf(M2));
    expect(block.indexOf(M2)).toBeLessThan(block.indexOf(M3));
  });

  it('names the timezone frame so a strange hour reads as a timezone question', () => {
    expect(buildMomentsBlock(moments, [classroom], [staff])).toContain('UTC');
  });

  it('SAYS SO when a visit has no moments at all', () => {
    const block = buildMomentsBlock([], [classroom], [staff]);
    expect(block).toContain('none captured');
    expect(block).toMatch(/NOTHING to write a report from/i);
  });
});

describe('buildCoverageBlock', () => {
  it('tallies by kind, subject and area', () => {
    const block = buildCoverageBlock(moments);
    expect(block).toContain('notes 1');
    expect(block).toContain('photos 1');
    expect(block).toContain('voice notes 1');
    expect(block).toContain('The children 1');
    expect(block).toContain('Sensorial 1');
  });

  it('tells the model that an unobserved area is unobserved, not inferable', () => {
    expect(buildCoverageBlock(moments)).toMatch(/has NOT been observed/);
  });

  it('reads "none" rather than blank when nothing is tagged', () => {
    const untagged = [moment({ id: M1, body: 'x' })];
    const block = buildCoverageBlock(untagged);
    expect(block).toContain('By subject: none');
    expect(block).toContain('By area: none');
  });
});

describe('buildVisitHeader and buildStaffBlock', () => {
  it('names the observer, the school, the date and the engagement', () => {
    const header = buildVisitHeader(input);
    expect(header).toContain('Ana Ruiz');
    expect(header).toContain('AMI Consultant');
    expect(header).toContain('Willowbank Montessori');
    expect(header).toContain('2026-03-12');
    expect(header).toContain('Consultation visit');
    expect(header).toContain('Cedar');
    expect(header).toContain('24 children');
    expect(header).toContain('ratio 1:12');
  });

  it('gives each staff member a [staff:id] handle and their training', () => {
    const block = buildStaffBlock([staff], [classroom]);
    expect(block).toContain(`[staff:${STAFF_ID}]`);
    expect(block).toContain('Miss Chen');
    expect(block).toContain('Lead guide');
    expect(block).toContain('AMI 3–6');
    expect(block).toContain('Cedar');
  });

  it('says plainly when no staff were recorded', () => {
    expect(buildStaffBlock([], [classroom])).toContain('none recorded');
  });
});

describe('buildVisitContext', () => {
  it('assembles header, staff, coverage and moments in that order', () => {
    const context = buildVisitContext(input);
    expect(context.indexOf('THE VISIT')).toBeLessThan(context.indexOf('THE STAFF'));
    expect(context.indexOf('THE STAFF')).toBeLessThan(context.indexOf('COVERAGE'));
    expect(context.indexOf('COVERAGE')).toBeLessThan(context.indexOf('THE MOMENTS'));
  });

  it('omits the carried-actions block entirely when there is nothing carried', () => {
    expect(buildVisitContext(input)).not.toContain('CARRIED IN');
  });

  it('includes carried actions, and tells the model not to invent progress', () => {
    const context = buildVisitContext({
      ...input,
      carriedActions: [
        { text: 'Complete the maths shelf.', owner: 'Miss Chen', due_date: '2026-04-01' },
      ],
    });
    expect(context).toContain('CARRIED IN FROM THE PREVIOUS VISIT');
    expect(context).toContain('Complete the maths shelf.');
    expect(context).toContain('Miss Chen');
    expect(context).toContain('due: 2026-04-01');
    expect(context).toMatch(/do not invent progress/i);
  });
});

describe('citableMomentIds', () => {
  it('is exactly the ids of the moments in scope — the validator\'s allow-list', () => {
    expect(citableMomentIds(moments)).toEqual([M1, M2, M3]);
    expect(citableMomentIds([])).toEqual([]);
  });
});
