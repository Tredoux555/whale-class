// app/api/story/projects/[id]/route.ts
//
// Personal platform — single project: update / delete. Story-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import {
  encryptDiaryField,
  encryptDiaryFieldOrNull,
  readDiaryField,
  isDiaryEncryptionConfigured,
} from '@/lib/story/diary-crypto';
import {
  coerceCiphertext,
  isMissingColumnError,
  E2E_CIPHER_VERSION,
} from '@/lib/sanctuary-e2e/content-store';

export const dynamic = 'force-dynamic';

const STATUSES = new Set(['active', 'paused', 'done', 'dropped']);
const MAX_TITLE = 300;
const MAX_WHY = 2000;
const MAX_NEXT = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  let body: {
    title?: string;
    why?: string | null;
    next_action?: string | null;
    status?: string;
    priority?: number | null;
    ciphertext?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getSupabase();

  // ── e2e update: replace the opaque blob VERBATIM (no server key). ──
  const ct = coerceCiphertext(body.ciphertext);
  if (ct) {
    const { data, error } = await supabase
      .from('story_projects')
      .update({ ciphertext: ct, cipher_version: E2E_CIPHER_VERSION })
      .eq('id', id)
      .eq('space', space)
      .select('id, updated_at')
      .maybeSingle();
    if (error && isMissingColumnError(error)) {
      return NextResponse.json(
        { error: 'End-to-end storage is not enabled on this server yet.' },
        { status: 503 },
      );
    }
    if (error) {
      console.error('[projects] e2e update error:', error.message);
      return NextResponse.json({ error: 'Could not save project' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      project: { id: data.id as string, ciphertext: ct, updated_at: data.updated_at as string },
    });
  }

  // ── legacy server-key update ──
  if (!isDiaryEncryptionConfigured()) {
    return NextResponse.json(
      { error: 'Encryption is not configured (STORY_DIARY_KEY).' },
      { status: 500 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') {
    const t = body.title.trim().slice(0, MAX_TITLE);
    if (!t) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    patch.title_enc = encryptDiaryField(t);
    patch.cipher_version = 1;
  }
  if ('why' in body) {
    const w = typeof body.why === 'string' ? body.why.slice(0, MAX_WHY) : null;
    patch.why_enc = encryptDiaryFieldOrNull(w);
    patch.cipher_version = 1;
  }
  if ('next_action' in body) {
    const n = typeof body.next_action === 'string' ? body.next_action.slice(0, MAX_NEXT) : null;
    patch.next_action_enc = encryptDiaryFieldOrNull(n);
    patch.cipher_version = 1;
  }
  if (typeof body.status === 'string' && STATUSES.has(body.status)) {
    patch.status = body.status;
    // Keep is_active coherent with status so the "active" partial index +
    // the Coach's load math stay correct.
    patch.is_active = body.status === 'active' || body.status === 'paused';
  }
  if ('priority' in body) {
    patch.priority =
      typeof body.priority === 'number' && Number.isFinite(body.priority)
        ? Math.max(1, Math.min(9, Math.round(body.priority)))
        : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('story_projects')
    .update(patch)
    .eq('id', id)
    .eq('space', space)
    .select('id, title_enc, why_enc, next_action_enc, status, priority, is_active, cipher_version, updated_at')
    .maybeSingle();

  if (error) {
    console.error('[projects] update error:', error.message);
    return NextResponse.json({ error: 'Could not save project' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    project: {
      id: data.id as string,
      title: readDiaryField(data.title_enc, data.cipher_version),
      why: readDiaryField(data.why_enc, data.cipher_version) || null,
      next_action: readDiaryField(data.next_action_enc, data.cipher_version) || null,
      status: data.status as string,
      priority: (data.priority as number | null) ?? null,
      is_active: !!data.is_active,
      updated_at: data.updated_at as string,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase.from('story_projects').delete().eq('id', id).eq('space', space);
  if (error) {
    console.error('[projects] delete error:', error.message);
    return NextResponse.json({ error: 'Could not delete project' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
