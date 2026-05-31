// app/api/montree/admin/astra-thread/route.ts
//
// Server-side persistence for the principal's Astra chat thread, so the same
// conversation appears on EVERY login/device (not just the browser that
// created it). Backs migration 246 (montree_principal_conversations).
//
// Scoped to the authenticated user (auth.userId) — each principal has their
// own thread; multi-principal schools never bleed. EPISODIC storage (the
// literal turns), distinct from the SEMANTIC montree_principal_memory.
//
//   GET            -> the principal's active thread { conversation_id, turns }
//   PUT  { conversation_id, turns } -> upsert + mark active (save on change)
//   POST { conversation_id, action:'new' } -> archive current, open fresh
//
// Fail-soft: if migration 246 hasn't been applied yet (table missing), every
// handler degrades to a no-op success so the client falls back to its
// localStorage cache instead of erroring. Ship code first, apply migration
// when ready.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

const TABLE = 'montree_principal_conversations';
const MAX_TURNS = 30;

// Postgres / PostgREST signals that the table doesn't exist yet.
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    /does not exist|could not find the table|schema cache/i.test(err.message || '')
  );
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('conversation_key, turns, updated_at')
    .eq('principal_id', auth.userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) {
      // Migration 246 not applied yet — client uses its localStorage cache.
      return NextResponse.json({ persisted: false, conversation_id: null, turns: [] });
    }
    console.error('[astra-thread] GET error:', error.message);
    return NextResponse.json({ persisted: false, conversation_id: null, turns: [] });
  }

  if (!data) {
    return NextResponse.json({ persisted: true, conversation_id: null, turns: [] });
  }

  const turns = Array.isArray(data.turns) ? data.turns : [];
  return NextResponse.json({
    persisted: true,
    conversation_id: data.conversation_key,
    turns,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { conversation_id?: unknown; turns?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id.trim() : '';
  if (!conversationId || conversationId.length > 100) {
    return NextResponse.json({ error: 'conversation_id required' }, { status: 400 });
  }
  if (!Array.isArray(body.turns)) {
    return NextResponse.json({ error: 'turns must be an array' }, { status: 400 });
  }
  // Bound row size: keep only the most recent MAX_TURNS.
  const turns = body.turns.slice(-MAX_TURNS);

  // Derive a short title from the first user turn (best-effort, for history UI).
  let title: string | null = null;
  for (const t of turns) {
    if (t && typeof t === 'object' && (t as { role?: string }).role === 'user') {
      const txt = String((t as { text?: unknown }).text ?? '').trim();
      if (txt) { title = txt.slice(0, 120); break; }
    }
  }

  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).upsert(
    {
      school_id: auth.schoolId,
      principal_id: auth.userId,
      conversation_key: conversationId,
      turns,
      title,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'principal_id,conversation_key' }
  );

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ ok: true, persisted: false });
    console.error('[astra-thread] PUT error:', error.message);
    return NextResponse.json({ ok: false, persisted: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, persisted: true });
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (body.action !== 'new') {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }

  // Archive the current open thread(s) — kept as a record, just no longer
  // active. The fresh thread becomes active on its first PUT.
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLE)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('principal_id', auth.userId)
    .eq('is_active', true);

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ ok: true, persisted: false });
    console.error('[astra-thread] POST(new) error:', error.message);
    return NextResponse.json({ ok: false, persisted: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, persisted: true });
}
