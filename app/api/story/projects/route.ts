// app/api/story/projects/route.ts
//
// Personal platform — Projects & ambitions: list + create. Story-admin only.
// title/why/next_action are AES-256-GCM encrypted at rest.

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
  rowIsE2e,
  isMissingColumnError,
  E2E_CIPHER_VERSION,
} from '@/lib/sanctuary-e2e/content-store';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 300;
const MAX_WHY = 2000;
const MAX_NEXT = 500;

export async function GET(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const COLS =
    'id, title_enc, why_enc, next_action_enc, status, priority, is_active, cipher_version, created_at, updated_at';
  const listQuery = (cols: string) =>
    supabase
      .from('story_projects')
      .select(cols)
      .eq('space', space)
      // active first, then by priority (nulls last via the secondary sort), then newest
      .order('is_active', { ascending: false })
      .order('priority', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(500);

  // Wide select adds the e2e `ciphertext` column; fall back if migration 265
  // hasn't been applied yet (column absent → 42703).
  let { data, error } = await listQuery(COLS + ', ciphertext');
  if (error && isMissingColumnError(error)) ({ data, error } = await listQuery(COLS));

  if (error) {
    console.error('[projects] list error:', error.message);
    return NextResponse.json({ error: 'Could not load projects' }, { status: 500 });
  }

  const projects = (data || []).map((r) => {
    // e2e row → return the opaque blob VERBATIM; never decrypt.
    if (rowIsE2e(r)) {
      return {
        id: r.id as string,
        ciphertext: r.ciphertext as string,
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
      };
    }
    return {
      id: r.id as string,
      title: readDiaryField(r.title_enc, r.cipher_version),
      why: readDiaryField(r.why_enc, r.cipher_version) || null,
      next_action: readDiaryField(r.next_action_enc, r.cipher_version) || null,
      status: r.status as string,
      priority: (r.priority as number | null) ?? null,
      is_active: !!r.is_active,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
    };
  });

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    title?: string;
    why?: string;
    next_action?: string;
    priority?: number;
    ciphertext?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getSupabase();

  // ── e2e write: store the client's opaque blob VERBATIM (no server key). ──
  const ct = coerceCiphertext(body.ciphertext);
  if (ct) {
    const { data, error } = await supabase
      .from('story_projects')
      .insert({ space, ciphertext: ct, cipher_version: E2E_CIPHER_VERSION })
      .select('id, created_at, updated_at')
      .single();
    if (error && isMissingColumnError(error)) {
      return NextResponse.json(
        { error: 'End-to-end storage is not enabled on this server yet.' },
        { status: 503 },
      );
    }
    if (error || !data) {
      console.error('[projects] e2e create error:', error?.message);
      return NextResponse.json({ error: 'Could not save project' }, { status: 500 });
    }
    return NextResponse.json({
      project: {
        id: data.id as string,
        ciphertext: ct,
        created_at: data.created_at as string,
        updated_at: data.updated_at as string,
      },
    });
  }

  // ── legacy server-key write ──
  if (!isDiaryEncryptionConfigured()) {
    return NextResponse.json(
      { error: 'Encryption is not configured (STORY_DIARY_KEY).' },
      { status: 500 },
    );
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : '';
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const why = typeof body.why === 'string' ? body.why.slice(0, MAX_WHY) : null;
  const nextAction = typeof body.next_action === 'string' ? body.next_action.slice(0, MAX_NEXT) : null;
  const priority =
    typeof body.priority === 'number' && Number.isFinite(body.priority)
      ? Math.max(1, Math.min(9, Math.round(body.priority)))
      : null;

  const { data, error } = await supabase
    .from('story_projects')
    .insert({
      space,
      title_enc: encryptDiaryField(title),
      why_enc: encryptDiaryFieldOrNull(why),
      next_action_enc: encryptDiaryFieldOrNull(nextAction),
      status: 'active',
      priority,
      is_active: true,
      cipher_version: 1,
    })
    .select('id, status, priority, is_active, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('[projects] create error:', error?.message);
    return NextResponse.json({ error: 'Could not save project' }, { status: 500 });
  }

  return NextResponse.json({
    project: {
      id: data.id as string,
      title,
      why,
      next_action: nextAction,
      status: data.status as string,
      priority: (data.priority as number | null) ?? null,
      is_active: !!data.is_active,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
    },
  });
}
