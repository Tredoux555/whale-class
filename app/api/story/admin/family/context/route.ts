// app/api/story/admin/family/context/route.ts
//
// The PARENT's surface for the one-way context channel into a child's coach.
//   GET   ?child=<space>           → the parent's OWN notes for that child.
//   POST  { child, observation, skill_tag? }            → add a note.
//   PATCH { id, observation?, skill_tag?, archived? }   → edit / archive / restore.
//
// 🔒 THE SEAL
//   • author_space is ALWAYS the verified caller's space (the token), never the
//     client body. A parent can only ever read/write notes THEY authored.
//   • Every write requires canWriteContext(captain → target): a real link in
//     story_coach_context_links. No link, no write.
//   • This route touches ONLY story_coach_context_notes. There is no path here
//     to a child's diary, coach memory, or coach log. A parent cannot read one
//     word the child said to their coach.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import {
  getFamilyRole,
  canWriteContext,
  addContextNote,
  listContextNotesForAuthor,
  editContextNote,
  setContextNoteArchived,
  isValidSpace,
} from '@/lib/story/coach';

export const dynamic = 'force-dynamic';

async function requireParent(auth: string | null): Promise<
  { ok: true; space: string; supabase: ReturnType<typeof getSupabase> } | { ok: false; status: number; error: string }
> {
  if (!(await verifyAdminToken(auth))) return { ok: false, status: 401, error: 'Unauthorized' };
  const space = await getAdminSpace(auth);
  if (!space) return { ok: false, status: 401, error: 'Unauthorized' };
  const supabase = getSupabase();
  const role = await getFamilyRole(supabase, space);
  if (role !== 'parent') return { ok: false, status: 403, error: 'This area is for parents.' };
  return { ok: true, space, supabase };
}

export async function GET(req: NextRequest) {
  const ctx = await requireParent(req.headers.get('authorization'));
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const child = req.nextUrl.searchParams.get('child') || '';
  if (!isValidSpace(child)) return NextResponse.json({ error: 'child space required' }, { status: 400 });
  if (!(await canWriteContext(ctx.supabase, ctx.space, child))) {
    return NextResponse.json({ error: 'Not linked to this child.' }, { status: 403 });
  }
  const includeArchived = req.nextUrl.searchParams.get('archived') === '1';
  const notes = await listContextNotesForAuthor(ctx.supabase, ctx.space, child, { includeArchived });
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const ctx = await requireParent(req.headers.get('authorization'));
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: { child?: string; observation?: string; skill_tag?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const child = (body.child || '').trim();
  if (!isValidSpace(child)) return NextResponse.json({ error: 'child space required' }, { status: 400 });
  if (!(await canWriteContext(ctx.supabase, ctx.space, child))) {
    return NextResponse.json({ error: 'Not linked to this child.' }, { status: 403 });
  }
  const res = await addContextNote(ctx.supabase, {
    author_space: ctx.space, // SEAL: from the token, not the body
    target_space: child,
    observation: body.observation || '',
    skill_tag: body.skill_tag ?? null,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true, id: res.id });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireParent(req.headers.get('authorization'));
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: { id?: string; observation?: string; skill_tag?: string | null; archived?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const id = (body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Archive / restore takes precedence when present.
  if (typeof body.archived === 'boolean') {
    const res = await setContextNoteArchived(ctx.supabase, { id, author_space: ctx.space, archived: body.archived });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ ok: true, id: res.id });
  }

  if (typeof body.observation !== 'string' && !('skill_tag' in body)) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }
  const res = await editContextNote(ctx.supabase, {
    id,
    author_space: ctx.space, // SEAL: only your own note
    observation: typeof body.observation === 'string' ? body.observation : undefined,
    skill_tag: 'skill_tag' in body ? (body.skill_tag ?? null) : undefined,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true, id: res.id });
}
