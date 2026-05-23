// /api/montree/super-admin/campaign/route.ts
// Campaign Command Center — the video-marketing rollout tracker.
//
//   GET    — list all campaign items + progress stats + next-up + overdue
//   POST   — create a campaign item
//   PATCH  — update a campaign item (status, script, schedule, platforms…)
//   DELETE — remove a campaign item by id
//
// Auth: super-admin only on every method.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUSES = ['idea', 'scripted', 'filmed', 'scheduled', 'posted'] as const;
const VIDEO_TYPES = ['hero', 'feature'] as const;
const PLATFORMS = ['tiktok', 'reels', 'shorts', 'linkedin'] as const;

type Status = (typeof STATUSES)[number];

interface CampaignItem {
  id: string;
  title: string;
  feature_key: string | null;
  video_type: string;
  tier: number | null;
  script: string | null;
  status: string;
  platforms: string[];
  scheduled_for: string | null;
  posted_at: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Postgres "relation does not exist" — migration 231 not yet run. */
function isMissingTable(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '42P01';
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── GET ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_campaign_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({ items: [], stats: null, migration_pending: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data || []) as CampaignItem[];
    const today = todayISO();

    const statusCounts: Record<Status, number> = {
      idea: 0, scripted: 0, filmed: 0, scheduled: 0, posted: 0,
    };
    for (const it of items) {
      if ((STATUSES as readonly string[]).includes(it.status)) {
        statusCounts[it.status as Status]++;
      }
    }

    const total = items.length;
    const posted = statusCounts.posted;

    // Next up: the first non-posted item in rollout order.
    const nextUp = items.find((it) => it.status !== 'posted') || null;

    // Overdue: scheduled in the past but not yet posted.
    const overdue = items.filter(
      (it) => it.scheduled_for && it.scheduled_for < today && it.status !== 'posted'
    );

    return NextResponse.json({
      items,
      stats: {
        total,
        posted,
        progress_pct: total > 0 ? Math.round((posted / total) * 100) : 0,
        status_counts: statusCounts,
        next_up: nextUp,
        overdue,
        overdue_count: overdue.length,
      },
    });
  } catch (err) {
    console.error('[campaign GET]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ── POST ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const videoType =
      VIDEO_TYPES.includes(body.video_type) ? body.video_type : 'feature';
    const status = STATUSES.includes(body.status) ? body.status : 'idea';
    const platforms = Array.isArray(body.platforms)
      ? body.platforms.filter((p: unknown): p is string => typeof p === 'string' && PLATFORMS.includes(p as typeof PLATFORMS[number]))
      : [];

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_campaign_items')
      .insert({
        title,
        feature_key: typeof body.feature_key === 'string' ? body.feature_key : null,
        video_type: videoType,
        tier: Number.isInteger(body.tier) ? body.tier : null,
        script: typeof body.script === 'string' ? body.script : null,
        status,
        platforms,
        scheduled_for: typeof body.scheduled_for === 'string' && body.scheduled_for ? body.scheduled_for : null,
        sort_order: Number.isInteger(body.sort_order) ? body.sort_order : 0,
        notes: typeof body.notes === 'string' ? body.notes : null,
      })
      .select('*')
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({ error: 'Run migration 231 first', migration_pending: true }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ item: data });
  } catch (err) {
    console.error('[campaign POST]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ── PATCH ──────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Valid id required' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim();
    if (typeof body.feature_key === 'string') updates.feature_key = body.feature_key;
    if (VIDEO_TYPES.includes(body.video_type)) updates.video_type = body.video_type;
    if (Number.isInteger(body.tier)) updates.tier = body.tier;
    if (typeof body.script === 'string') updates.script = body.script;
    if (typeof body.notes === 'string') updates.notes = body.notes;
    if (Number.isInteger(body.sort_order)) updates.sort_order = body.sort_order;
    if (body.scheduled_for === null || typeof body.scheduled_for === 'string') {
      updates.scheduled_for = body.scheduled_for || null;
    }
    if (Array.isArray(body.platforms)) {
      updates.platforms = body.platforms.filter(
        (p: unknown): p is string => typeof p === 'string' && PLATFORMS.includes(p as typeof PLATFORMS[number])
      );
    }
    if (STATUSES.includes(body.status)) {
      updates.status = body.status;
      // Stamp posted_at the moment an item flips to 'posted'.
      if (body.status === 'posted') updates.posted_at = new Date().toISOString();
      if (body.status !== 'posted') updates.posted_at = null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_campaign_items')
      .update(updates as never)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({ error: 'Run migration 231 first', migration_pending: true }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ item: data });
  } catch (err) {
    console.error('[campaign PATCH]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ── DELETE ─────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Valid id required' }, { status: 400 });

    const supabase = getSupabase();
    const { error } = await supabase.from('montree_campaign_items').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[campaign DELETE]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
