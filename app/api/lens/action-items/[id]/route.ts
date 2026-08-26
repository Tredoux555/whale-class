// PATCH  /api/lens/action-items/[id] — text, owner, due date, status.
// DELETE /api/lens/action-items/[id]
//
// Ownership runs through the item's REPORT (and from there the visit and the
// observer), so an id from another consultant's account reads exactly like an
// id that does not exist.

import { NextRequest, NextResponse } from 'next/server';
import { ACTION_ITEM_COLUMNS, lensDb, loadOwnedReport } from '@/lib/lens/db';
import { normaliseDue } from '@/lib/lens/reports/action-items';
import {
  badRequest,
  lensError,
  notFound,
  readJson,
  requireObserver,
  text,
} from '@/lib/lens/route-helpers';
import { isActionItemStatus } from '@/lib/lens/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function loadOwnedItem(
  supabase: ReturnType<typeof lensDb>,
  observerId: string,
  itemId: string,
) {
  const { data, error } = await supabase
    .from('lens_action_items')
    .select(ACTION_ITEM_COLUMNS)
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  const item = data as { id: string; report_id: string } | null;
  if (!item) return null;
  const owned = await loadOwnedReport(supabase, observerId, item.report_id);
  return owned ? item : null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  try {
    const supabase = lensDb();
    const item = await loadOwnedItem(supabase, session.observerId, id);
    if (!item) return notFound('I can’t find that action item.');

    const updates: Record<string, unknown> = {};
    if ('text' in body) {
      const value = text(body.text, 2000);
      if (!value) return badRequest('An action item needs some text.');
      updates.text = value;
    }
    if ('owner' in body) updates.owner = text(body.owner, 200);
    if ('due_date' in body) {
      updates.due_date = normaliseDue(typeof body.due_date === 'string' ? body.due_date : null);
    }
    if ('status' in body) {
      if (!isActionItemStatus(body.status)) return badRequest('That isn’t a status I know.');
      updates.status = body.status;
    }
    if (Object.keys(updates).length === 0) return badRequest('Nothing to update.');

    const { data, error } = await supabase
      .from('lens_action_items')
      .update(updates)
      .eq('id', item.id)
      .select(ACTION_ITEM_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, actionItem: data });
  } catch (error) {
    return lensError('action-item:patch', error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  try {
    const supabase = lensDb();
    const item = await loadOwnedItem(supabase, session.observerId, id);
    if (!item) return notFound('I can’t find that action item.');
    const { error } = await supabase.from('lens_action_items').delete().eq('id', item.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return lensError('action-item:delete', error);
  }
}
