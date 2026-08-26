// GET  /api/lens/reports/[id]/action-items
// POST /api/lens/reports/[id]/action-items — add one by hand.
//
// Most items arrive by seeding at finalise time; this is the door for the one
// she agrees verbally in the debrief and wants tracked without reopening the
// report to add a recommendation for it.

import { NextRequest, NextResponse } from 'next/server';
import { ACTION_ITEM_COLUMNS, lensDb, listActionItems, loadOwnedReport } from '@/lib/lens/db';
import { normaliseDue } from '@/lib/lens/reports/action-items';
import {
  badRequest,
  lensError,
  notFound,
  readJson,
  requireObserver,
  requiredText,
  text,
} from '@/lib/lens/route-helpers';

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
    return NextResponse.json({ actionItems: await listActionItems(supabase, owned.report.id) });
  } catch (error) {
    return lensError('action-items:get', error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  const itemText = requiredText(body.text, 2000);
  if (!itemText) return badRequest('An action item needs some text.');

  try {
    const supabase = lensDb();
    const owned = await loadOwnedReport(supabase, session.observerId, id);
    if (!owned) return notFound('That report isn’t yours.');

    const existing = await listActionItems(supabase, owned.report.id);
    const sortOrder = existing.reduce((max, e) => Math.max(max, e.sort_order), -1) + 1;

    const { data, error } = await supabase
      .from('lens_action_items')
      .insert({
        report_id: owned.report.id,
        // Denormalised from the report, never from the body: the follow-up recall
        // query runs off the classroom, and letting a request name one would let
        // a mis-paste file an item against a stranger's room.
        classroom_id: owned.report.classroom_id,
        text: itemText,
        owner: text(body.owner, 200),
        due_date: normaliseDue(typeof body.due_date === 'string' ? body.due_date : null),
        sort_order: sortOrder,
      })
      .select(ACTION_ITEM_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, actionItem: data }, { status: 201 });
  } catch (error) {
    return lensError('action-items:post', error);
  }
}
