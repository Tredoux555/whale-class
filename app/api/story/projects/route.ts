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
  const { data, error } = await supabase
    .from('story_projects')
    .select('id, title_enc, why_enc, next_action_enc, status, priority, is_active, cipher_version, created_at, updated_at')
    .eq('space', space)
    // active first, then by priority (nulls last via the secondary sort), then newest
    .order('is_active', { ascending: false })
    .order('priority', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[projects] list error:', error.message);
    return NextResponse.json({ error: 'Could not load projects' }, { status: 500 });
  }

  const projects = (data || []).map((r) => ({
    id: r.id as string,
    title: readDiaryField(r.title_enc, r.cipher_version),
    why: readDiaryField(r.why_enc, r.cipher_version) || null,
    next_action: readDiaryField(r.next_action_enc, r.cipher_version) || null,
    status: r.status as string,
    priority: (r.priority as number | null) ?? null,
    is_active: !!r.is_active,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(req.headers.get('authorization'));
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isDiaryEncryptionConfigured()) {
    return NextResponse.json(
      { error: 'Encryption is not configured (STORY_DIARY_KEY).' },
      { status: 500 },
    );
  }

  let body: { title?: string; why?: string; next_action?: string; priority?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : '';
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const why = typeof body.why === 'string' ? body.why.slice(0, MAX_WHY) : null;
  const nextAction = typeof body.next_action === 'string' ? body.next_action.slice(0, MAX_NEXT) : null;
  const priority =
    typeof body.priority === 'number' && Number.isFinite(body.priority)
      ? Math.max(1, Math.min(9, Math.round(body.priority)))
      : null;

  const supabase = getSupabase();
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
