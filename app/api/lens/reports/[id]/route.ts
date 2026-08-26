// GET   /api/lens/reports/[id] — the report, its visit, its moments, its items.
// PATCH /api/lens/reports/[id] — save her edits.
//
// 🚨 THE EDITOR SAVES THE WHOLE CONTENT BLOCK, AND THAT IS THE SIMPLE CHOICE.
// Per-section PATCH endpoints would need optimistic concurrency to be correct,
// and there is exactly one person editing exactly one report at a time. What the
// client sends is re-validated against the same schema the draft goes through,
// so a hand-rolled request can no more corrupt a report than a model can.

import { NextRequest, NextResponse } from 'next/server';
import {
  asReportRow,
  lensDb,
  listActionItems,
  listMoments,
  lensProxyUrl,
  loadOwnedReport,
  loadOwnedSchool,
  REPORT_COLUMNS,
} from '@/lib/lens/db';
import { loadReportContext } from '@/lib/lens/guru/load-context';
import {
  readStoredContent,
  templateFor,
  validateReportContent,
} from '@/lib/lens/reports/schema';
import {
  badRequest,
  lensError,
  notFound,
  readJson,
  requireObserver,
  stringArray,
} from '@/lib/lens/route-helpers';
import { isLensLanguage, isVisitStatus } from '@/lib/lens/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  try {
    const supabase = lensDb();
    const owned = await loadOwnedReport(supabase, session.observerId, id);
    if (!owned) return notFound('That report isn’t yours.');

    const context = await loadReportContext(supabase, session.observerId, owned.report, owned.visit);
    if (!context) return notFound('That report isn’t yours.');

    const [actionItems, allMoments, school] = await Promise.all([
      listActionItems(supabase, owned.report.id),
      // The editor's evidence chips must resolve EVERY id a section cites,
      // including one captured before she picked a room — the scoped list in
      // the context would leave those chips dangling.
      listMoments(supabase, owned.visit.id),
      loadOwnedSchool(supabase, session.observerId, owned.visit.school_id),
    ]);

    return NextResponse.json({
      report: { ...owned.report, content: readStoredContent(owned.report) },
      visit: owned.visit,
      school,
      classroom: context.classroom,
      classrooms: context.classrooms,
      staff: context.staff,
      moments: allMoments.map((m) => ({ ...m, media_url: lensProxyUrl(m.media_path) })),
      actionItems,
      template: templateFor(owned.visit.engagement_type),
      carriedActions: context.carriedActions,
    });
  } catch (error) {
    return lensError('report:get', error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  try {
    const supabase = lensDb();
    const owned = await loadOwnedReport(supabase, session.observerId, id);
    if (!owned) return notFound('That report isn’t yours.');
    const { report, visit } = owned;

    const updates: Record<string, unknown> = {};

    if ('content' in body) {
      if (report.status === 'final') {
        return NextResponse.json(
          { error: 'That report is final. Reopen it before editing.' },
          { status: 409 },
        );
      }
      const template = templateFor(visit.engagement_type);
      // Whatever keys the stored report already carries stay legal, so a
      // per-staff subsection (`adults:<uuid>`) she is editing is not thrown away
      // by a validator that only knows the bare template.
      const existing = readStoredContent(report);
      const allowedSectionKeys = [
        ...template.filter((s) => s.source === 'model').map((s) => s.key),
        ...existing.sections.map((s) => s.key),
        ...(Array.isArray((body.content as { sections?: unknown })?.sections)
          ? ((body.content as { sections: unknown[] }).sections
              .map((s) => (s && typeof s === 'object' ? (s as { key?: unknown }).key : null))
              .filter((k): k is string => typeof k === 'string' && k.startsWith('adults:')))
          : []),
      ];
      const moments = await listMoments(supabase, visit.id);
      const { content, warnings } = validateReportContent(body.content, {
        allowedSectionKeys,
        allowedMomentIds: moments.map((m) => m.id),
      });
      updates.sections = content.sections;
      updates.ratings = content.ratings;
      updates.commendations = content.commendations;
      updates.recommendations = content.recommendations;
      updates.required_actions = content.required_actions;
      updates.next_steps = content.next_steps;
      // Editing a report that was still 'capturing' means she has started
      // composing; say so rather than leaving a stale status on the card.
      if (report.status === 'capturing') updates.status = 'drafting';

      const { error } = await supabase.from('lens_reports').update(updates).eq('id', report.id);
      if (error) throw error;
      const { data } = await supabase
        .from('lens_reports')
        .select(REPORT_COLUMNS)
        .eq('id', report.id)
        .maybeSingle();
      return NextResponse.json({
        ok: true,
        warnings,
        report: data ? { ...asReportRow(data), content: readStoredContent(asReportRow(data)) } : null,
      });
    }

    if ('languages' in body) {
      const langs = stringArray(body.languages, 4, 8).filter(isLensLanguage);
      if (langs.length === 0) return badRequest('Pick at least one language.');
      updates.languages = langs;
    }
    if ('status' in body) {
      if (!isVisitStatus(body.status)) return badRequest('That isn’t a status I know.');
      // Reopening a final report bumps the version: the copy the school holds
      // and the copy she is now editing are not the same document, and the
      // version number is how anyone can tell.
      if (report.status === 'final' && body.status !== 'final') {
        updates.version = report.version + 1;
        updates.finalised_at = null;
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) return badRequest('Nothing to update.');

    const { data, error } = await supabase
      .from('lens_reports')
      .update(updates)
      .eq('id', report.id)
      .select(REPORT_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({
      ok: true,
      report: { ...asReportRow(data), content: readStoredContent(asReportRow(data)) },
    });
  } catch (error) {
    return lensError('report:patch', error);
  }
}
