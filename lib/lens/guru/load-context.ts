// lib/lens/guru/load-context.ts
// The I/O half of the context builder: load a report's world out of the
// database and hand it to the pure functions in ./context-builder.ts.
//
// Kept separate from context-builder on purpose. That file is pure and is what
// the tests exercise; this one is where supabase lives. When a draft comes out
// wrong, the question "what was the model shown?" is answered by running the
// pure builder over these rows, which is only possible while the two are apart.

import type { UntypedClient } from '@/lib/supabase-client';
import {
  listMoments,
  listOpenActionItemsForClassroom,
  listStaff,
  listStaffForClassrooms,
  loadClassroomsByIds,
  loadObserver,
  loadOwnedSchool,
  visitClassroomIds,
  type LensReportRow,
} from '../db';
import type { LensClassroom, LensObserver, LensSchool, LensVisit } from '../types';
import type { VisitContextInput } from './context-builder';

export interface ReportContextBundle extends VisitContextInput {
  observer: LensObserver;
  school: LensSchool;
  /** null for the whole-school level report. */
  classroom: LensClassroom | null;
  report: LensReportRow;
}

/**
 * Everything a draft, a regenerate, a translation or a chat needs.
 *
 * 🚨 THE SCOPE RULE. A CLASSROOM report sees only that room's moments and only
 * that room's staff; the LEVEL report (classroom_id NULL) sees everything. This
 * is not a performance decision — it is what stops a per-classroom report citing
 * an observation from the room next door, which would be a factual error in a
 * document a school files.
 *
 * 🚨 MOMENTS WITH NO ROOM. A moment captured before she picked a classroom has
 * classroom_id NULL. Those belong to the visit as a whole, so they reach the
 * LEVEL report and are deliberately withheld from a per-room one: attributing an
 * untagged observation to a specific classroom is exactly the kind of quiet
 * fabrication the guardrails exist to prevent.
 */
export async function loadReportContext(
  supabase: UntypedClient,
  observerId: string,
  report: LensReportRow,
  visit: LensVisit,
): Promise<ReportContextBundle | null> {
  const [observer, school, allRoomIds] = await Promise.all([
    loadObserver(supabase, observerId),
    loadOwnedSchool(supabase, observerId, visit.school_id),
    visitClassroomIds(supabase, visit.id),
  ]);
  if (!observer || !school) return null;

  const isLevelReport = report.classroom_id === null;
  const roomIds = isLevelReport ? allRoomIds : [report.classroom_id as string];
  const classrooms = await loadClassroomsByIds(supabase, roomIds);
  const classroom = isLevelReport ? null : classrooms[0] ?? null;

  const [staff, moments] = await Promise.all([
    isLevelReport
      ? listStaffForClassrooms(supabase, allRoomIds)
      : listStaff(supabase, report.classroom_id as string),
    listMoments(supabase, visit.id, isLevelReport ? null : report.classroom_id),
  ]);

  const carriedRows = report.classroom_id
    ? await listOpenActionItemsForClassroom(supabase, report.classroom_id)
    : [];
  // Only items from OTHER reports are "carried in" — this report's own seeded
  // items are its output, not its input, and feeding them back would have the
  // model report progress against recommendations it is in the middle of making.
  const carriedActions = carriedRows
    .filter((a) => a.report_id !== report.id)
    .map((a) => ({ text: a.text, owner: a.owner, due_date: a.due_date }));

  return {
    observer,
    school,
    visit,
    classroom,
    classrooms,
    staff,
    moments,
    carriedActions,
    report,
  };
}
