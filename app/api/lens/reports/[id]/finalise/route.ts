// POST /api/lens/reports/[id]/finalise — she signs it.
//
// Three things happen, in this order:
//   1. the report's status becomes 'final' and finalised_at is stamped
//   2. its recommendations (and required actions, and anything she chose to
//      carry forward) become lens_action_items rows
//   3. the visit is marked final once every one of its reports is
//
// 🚨 SEEDING IS IDEMPOTENT AND ADDITIVE. Finalise can be pressed twice — a lost
// response, a double tap, a reopen-and-refinalise. lib/lens/reports/action-items
// matches on item TEXT within the report, so a second finalise adds nothing and,
// critically, does not resurrect an item she has since marked done. It never
// updates or deletes: an item she edited by hand is hers.
//
// 🚨 THE ORDER MATTERS. The status is written FIRST, so a crash between the two
// leaves a finalised report with no follow-ups (visible, fixable by pressing
// finalise again) rather than follow-ups attached to a report that is still
// officially a draft.

import { NextRequest, NextResponse } from 'next/server';
import {
  ACTION_ITEM_COLUMNS,
  asReportRow,
  lensDb,
  listActionItems,
  listReportsForVisit,
  loadOwnedReport,
  REPORT_COLUMNS,
} from '@/lib/lens/db';
import { seedActionItems, normaliseDue } from '@/lib/lens/reports/action-items';
import { readStoredContent } from '@/lib/lens/reports/schema';
import { lensError, notFound, readJson, requireObserver, text } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** What the client passes through from the visit-start carry-forward. */
interface CarriedInput {
  id: string;
  text: string;
  owner: string | null;
  due_date: string | null;
}

function readCarried(raw: unknown): CarriedInput[] {
  if (!Array.isArray(raw)) return [];
  const out: CarriedInput[] = [];
  for (const item of raw.slice(0, 50)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = text(o.id, 64);
    const itemText = text(o.text, 2000);
    if (!id || !itemText) continue;
    out.push({
      id,
      text: itemText,
      owner: text(o.owner, 200),
      due_date: normaliseDue(typeof o.due_date === 'string' ? o.due_date : null),
    });
  }
  return out;
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await readJson(request);
  const carriedInput = body instanceof NextResponse ? [] : readCarried(body.carried);

  try {
    const supabase = lensDb();
    const owned = await loadOwnedReport(supabase, session.observerId, id);
    if (!owned) return notFound('That report isn’t yours.');
    const { report, visit } = owned;

    const content = readStoredContent(report);
    if (content.sections.length === 0) {
      return NextResponse.json(
        { error: 'There is nothing in this report to finalise yet.' },
        { status: 409 },
      );
    }

    // (1) Status first.
    if (report.status !== 'final') {
      const { error } = await supabase
        .from('lens_reports')
        .update({ status: 'final', finalised_at: new Date().toISOString() })
        .eq('id', report.id);
      if (error) throw error;
    }

    // 🚨 A CARRIED ITEM IS RE-PROVED, NOT TRUSTED. The client sends ids it read
    // out of sessionStorage; each one must be an action item on a report of a
    // classroom this observer owns, or a hand-rolled request could staple a
    // stranger's follow-up onto her client's report.
    let carried: CarriedInput[] = [];
    if (carriedInput.length > 0) {
      const { data, error } = await supabase
        .from('lens_action_items')
        .select('id, report_id, classroom_id, text, owner, due_date')
        .in('id', carriedInput.map((c) => c.id));
      if (error) throw error;
      const rows = (data ?? []) as {
        id: string;
        report_id: string;
        classroom_id: string | null;
        text: string;
        owner: string | null;
        due_date: string | null;
      }[];
      const reportIds = [...new Set(rows.map((r) => r.report_id))];
      const ownedReportIds = new Set<string>();
      for (const reportId of reportIds) {
        const check = await loadOwnedReport(supabase, session.observerId, reportId);
        if (check) ownedReportIds.add(reportId);
      }
      carried = rows
        .filter((r) => ownedReportIds.has(r.report_id) && r.report_id !== report.id)
        // Use the STORED text, not the client's copy: what gets carried forward
        // has to be what the previous report actually said.
        .map((r) => ({ id: r.id, text: r.text, owner: r.owner, due_date: r.due_date }));
    }

    // (2) Seed.
    const existing = await listActionItems(supabase, report.id);
    const rows = seedActionItems({
      reportId: report.id,
      classroomId: report.classroom_id,
      recommendations: content.recommendations,
      requiredActions: content.required_actions,
      existing,
      carried,
    });

    if (rows.length > 0) {
      const { error } = await supabase.from('lens_action_items').insert(rows);
      if (error) throw error;
    }

    // Mark the originals as carried, so the next visit's "still open" list does
    // not show the same item twice under two reports.
    if (carried.length > 0) {
      const { error } = await supabase
        .from('lens_action_items')
        .update({ status: 'carried' })
        .in('id', carried.map((c) => c.id));
      if (error) throw error;
    }

    // (3) The visit is final once every report on it is.
    const reports = await listReportsForVisit(supabase, visit.id);
    const allFinal = reports.every((r) => r.id === report.id || r.status === 'final');
    if (allFinal && visit.status !== 'final') {
      await supabase
        .from('lens_visits')
        .update({ status: 'final' })
        .eq('id', visit.id)
        .eq('observer_id', session.observerId);
    }

    const [fresh, actionItems] = await Promise.all([
      supabase.from('lens_reports').select(REPORT_COLUMNS).eq('id', report.id).maybeSingle(),
      supabase
        .from('lens_action_items')
        .select(ACTION_ITEM_COLUMNS)
        .eq('report_id', report.id)
        .order('sort_order', { ascending: true }),
    ]);

    return NextResponse.json({
      ok: true,
      seeded: rows.length,
      visitFinal: allFinal,
      report: fresh.data
        ? { ...asReportRow(fresh.data), content: readStoredContent(asReportRow(fresh.data)) }
        : null,
      actionItems: actionItems.data ?? [],
    });
  } catch (error) {
    return lensError('report:finalise', error);
  }
}
