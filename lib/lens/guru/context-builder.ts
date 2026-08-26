// lib/lens/guru/context-builder.ts
// Turns a visit into the text the Lens Guru reasons over.
//
// 🚨 PURE ON PURPOSE. Every function here takes plain rows and returns a
// string. No supabase, no clock, no env. The route does the loading; this file
// does the shaping — which is what makes it testable, and what makes it
// possible to see exactly what the model was shown when a draft comes out wrong.
//
// 🚨 THE MOMENT ID IS THE POINT. Every moment is rendered with its id in square
// brackets, because the entire anti-fabrication design rests on the model being
// able to cite one. Change the format and lib/lens/reports/schema.ts's evidence
// filter starts throwing away perfectly good citations.

import {
  AREA_LABELS,
  ENGAGEMENT_LABELS,
  LEVEL_LABELS,
  RATING_LABELS,
  STAFF_ROLE_LABELS,
  SUBJECT_LABELS,
  ratingFromPip,
  type LensClassroom,
  type LensMoment,
  type LensObserver,
  type LensSchool,
  type LensStaff,
  type LensVisit,
} from '../types';

export interface VisitContextInput {
  observer: LensObserver;
  school: LensSchool;
  visit: LensVisit;
  /** Every classroom this visit covers. */
  classrooms: LensClassroom[];
  staff: LensStaff[];
  moments: LensMoment[];
  /** Open follow-ups carried in from the previous visit, if any. */
  carriedActions?: { text: string; owner: string | null; due_date: string | null }[];
}

/** HH:MM in the school's local reading of the timestamp. */
function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '??:??';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/**
 * 🚨 Timestamps are rendered in UTC, deliberately and visibly.
 *
 * A visit's moments are stamped by the device and read back on a server whose
 * timezone is not the school's. Rendering "09:42" from a server-local
 * conversion would be quietly wrong by up to a day in the direction nobody
 * checks. Until Lens carries a per-school timezone (it does not in v1), the
 * honest thing is one consistent frame, named in the header the model sees, so
 * a drafted line reading "at 01:42" is obviously a timezone question rather
 * than a fabricated hour.
 */
export const TIMESTAMP_NOTE =
  'Times below are UTC as recorded by the device. Use them for ORDER and for ' +
  'ELAPSED TIME between moments; quote a wall-clock time only when the observer ' +
  'has written one herself in a note.';

// --------------------------------------------------------------- the header --

export function buildVisitHeader(input: VisitContextInput): string {
  const { school, visit, classrooms, observer } = input;
  const lines: string[] = [];
  lines.push('THE VISIT');
  lines.push(`  Observer: ${observer.name}${observer.title ? `, ${observer.title}` : ''}${observer.credentials ? ` (${observer.credentials})` : ''}`);
  lines.push(`  School: ${school.name}${school.city ? `, ${school.city}` : ''}${school.country ? `, ${school.country}` : ''}`);
  if (school.affiliation) lines.push(`  Affiliation: ${school.affiliation}`);
  lines.push(`  Date: ${visit.visit_date}`);
  lines.push(`  Engagement: ${ENGAGEMENT_LABELS[visit.engagement_type] ?? visit.engagement_type}`);
  if (visit.purpose) lines.push(`  Stated purpose: ${visit.purpose}`);
  if (visit.started_at || visit.ended_at) {
    lines.push(
      `  Observed: ${visit.started_at ? clock(visit.started_at) : '?'}–${visit.ended_at ? clock(visit.ended_at) : '?'} UTC`,
    );
  }
  if (classrooms.length > 0) {
    lines.push('  Classrooms:');
    for (const c of classrooms) {
      const bits = [LEVEL_LABELS[c.level] ?? c.level];
      if (c.age_range) bits.push(`ages ${c.age_range}`);
      if (c.child_count != null) bits.push(`${c.child_count} children`);
      if (c.ratio) bits.push(`ratio ${c.ratio}`);
      lines.push(`    • ${c.name} — ${bits.join(', ')}`);
      if (c.room_notes) lines.push(`      notes: ${c.room_notes}`);
    }
  }
  return lines.join('\n');
}

export function buildStaffBlock(staff: LensStaff[], classrooms: LensClassroom[]): string {
  if (staff.length === 0) return 'THE STAFF\n  (none recorded for this visit)';
  const roomName = new Map(classrooms.map((c) => [c.id, c.name]));
  const lines: string[] = ['THE STAFF'];
  for (const s of staff) {
    const bits = [STAFF_ROLE_LABELS[s.role] ?? s.role];
    if (s.training) bits.push(s.training + (s.training_level ? ` ${s.training_level}` : ''));
    if (s.years_experience != null) bits.push(`${s.years_experience} yrs`);
    const room = roomName.get(s.classroom_id);
    lines.push(`  [staff:${s.id}] ${s.name} — ${bits.join(', ')}${room ? ` (${room})` : ''}`);
    if (s.notes) lines.push(`      notes: ${s.notes}`);
  }
  return lines.join('\n');
}

// -------------------------------------------------------------- the moments --

/** One moment as the model sees it. The id in brackets is the citation handle. */
export function renderMoment(
  moment: LensMoment,
  roomName?: string | null,
  staffName?: string | null,
): string {
  const tags: string[] = [];
  if (moment.subject) tags.push(SUBJECT_LABELS[moment.subject] ?? moment.subject);
  if (moment.area) tags.push(AREA_LABELS[moment.area] ?? moment.area);
  if (staffName) tags.push(`re: ${staffName}`);
  if (moment.child_alias) tags.push(moment.child_alias);
  const rating = ratingFromPip(moment.rating);
  if (rating) tags.push(`rated ${RATING_LABELS[rating]}`);

  const head = `[${moment.id}] ${clock(moment.ts)} ${moment.kind.toUpperCase()}${
    roomName ? ` · ${roomName}` : ''
  }${tags.length ? ` · ${tags.join(' · ')}` : ''}`;

  const body: string[] = [];
  if (moment.kind === 'photo') {
    // The report body may never carry a child's face, so the model is told what
    // a photo IS rather than being handed the image: the caption she wrote is
    // the evidence, and "a photograph exists" is itself a citable fact.
    body.push(`  photograph${moment.caption ? `: ${moment.caption}` : ' (no caption written)'}`);
  }
  if (moment.transcript) body.push(`  said: ${moment.transcript}`);
  if (moment.body) body.push(`  wrote: ${moment.body}`);
  if (moment.kind === 'chip' && !moment.body && !moment.transcript) {
    body.push('  (a tag with no words — the tags above are the whole moment)');
  }
  return [head, ...body].join('\n');
}

export function buildMomentsBlock(
  moments: LensMoment[],
  classrooms: LensClassroom[],
  staff: LensStaff[],
): string {
  if (moments.length === 0) {
    return (
      'THE MOMENTS\n' +
      '  (none captured — there is NOTHING to write a report from. Say so plainly\n' +
      '   rather than producing prose about a classroom nobody observed.)'
    );
  }
  const roomName = new Map(classrooms.map((c) => [c.id, c.name]));
  const staffName = new Map(staff.map((s) => [s.id, s.name]));
  const lines: string[] = [
    `THE MOMENTS — ${moments.length} captured, oldest first.`,
    `  ${TIMESTAMP_NOTE}`,
    '',
  ];
  for (const m of moments) {
    lines.push(
      renderMoment(
        m,
        m.classroom_id ? roomName.get(m.classroom_id) ?? null : null,
        m.staff_id ? staffName.get(m.staff_id) ?? null : null,
      ),
    );
  }
  return lines.join('\n');
}

/** A quick tally so the model can see the shape of the evidence before reading it. */
export function buildCoverageBlock(moments: LensMoment[]): string {
  const bySubject = new Map<string, number>();
  const byArea = new Map<string, number>();
  const byKind = new Map<string, number>();
  for (const m of moments) {
    byKind.set(m.kind, (byKind.get(m.kind) ?? 0) + 1);
    if (m.subject) bySubject.set(m.subject, (bySubject.get(m.subject) ?? 0) + 1);
    if (m.area) byArea.set(m.area, (byArea.get(m.area) ?? 0) + 1);
  }
  const fmt = (map: Map<string, number>, labels: Record<string, string>) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${labels[k] ?? k} ${n}`)
      .join(', ') || 'none';
  return [
    'COVERAGE',
    `  By kind: ${fmt(byKind, { photo: 'photos', voice: 'voice notes', text: 'notes', chip: 'tags' })}`,
    `  By subject: ${fmt(bySubject, SUBJECT_LABELS)}`,
    `  By area: ${fmt(byArea, AREA_LABELS)}`,
    '  A subject or area with no moments has NOT been observed. Write that it was',
    '  not observed; do not infer it from the others.',
  ].join('\n');
}

export function buildCarriedActionsBlock(
  carried: VisitContextInput['carriedActions'],
): string | null {
  if (!carried || carried.length === 0) return null;
  const lines = ['OPEN ACTION ITEMS CARRIED IN FROM THE PREVIOUS VISIT'];
  for (const a of carried) {
    const bits = [a.text];
    if (a.owner) bits.push(`owner: ${a.owner}`);
    if (a.due_date) bits.push(`due: ${a.due_date}`);
    lines.push(`  • ${bits.join(' — ')}`);
  }
  lines.push(
    '  Report on progress against these ONLY where a moment above bears on them.',
    '  An item nobody looked at this visit is still open; do not invent progress.',
  );
  return lines.join('\n');
}

// ---------------------------------------------------------------- the whole --

/** The full visit context, in the order the model should meet it. */
export function buildVisitContext(input: VisitContextInput): string {
  const blocks = [
    buildVisitHeader(input),
    buildStaffBlock(input.staff, input.classrooms),
    buildCoverageBlock(input.moments),
    buildCarriedActionsBlock(input.carriedActions),
    buildMomentsBlock(input.moments, input.classrooms, input.staff),
  ].filter((b): b is string => typeof b === 'string' && b.length > 0);
  return blocks.join('\n\n');
}

/** The set of ids a draft is allowed to cite. Feeds schema.validateReportContent. */
export function citableMomentIds(moments: LensMoment[]): string[] {
  return moments.map((m) => m.id);
}
