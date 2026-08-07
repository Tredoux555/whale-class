// /api/potato/children — the roster.
//   GET   → every active child in the teacher's class
//   POST  { name }                              → add a child
//   PATCH { id, name?, sortOrder?, isActive? }  → edit / retire a child
//
// Every mutation is scoped to the class in the cookie. The client never names
// a class.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher, UUID_RE } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  listChildren,
  loadOwnedChild,
  isSetupPending,
  proxyUrl,
} from '@/lib/potato/db';

export const dynamic = 'force-dynamic';

const MAX_NAME = 60;

function cleanName(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().slice(0, MAX_NAME) : '';
}

export async function GET(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const supabase = potatoDb();
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const children = await listChildren(supabase, session.classId);
    return NextResponse.json({
      ok: true,
      class: { id: klass.id, name: klass.name },
      children: children.map((child) => ({
        id: child.id,
        name: child.name,
        facePath: child.photo_path,
        faceUrl: proxyUrl(child.photo_path),
        sortOrder: child.sort_order ?? 0,
      })),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/children GET] error:', error);
    return NextResponse.json({ error: 'Could not load the children.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const name = cleanName((body as { name?: unknown } | null)?.name);
  if (!name) return NextResponse.json({ error: 'A name is needed.' }, { status: 400 });

  try {
    const supabase = potatoDb();
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // Append to the end of the roster.
    const { data: last, error: lastError } = await supabase
      .from('tp_children')
      .select('sort_order')
      .eq('class_id', session.classId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;

    const { data: child, error } = await supabase
      .from('tp_children')
      .insert({
        class_id: session.classId,
        name,
        sort_order: ((last?.sort_order as number | null) ?? 0) + 1,
      })
      .select('id, name, photo_path, sort_order')
      .maybeSingle();
    if (error) throw error;
    if (!child) throw new Error('Child row was not returned after insert');

    return NextResponse.json({
      ok: true,
      child: {
        id: child.id,
        name: child.name,
        facePath: child.photo_path,
        faceUrl: proxyUrl(child.photo_path),
        sortOrder: child.sort_order ?? 0,
      },
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/children POST] error:', error);
    return NextResponse.json({ error: 'Could not add that child.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const payload = (body ?? {}) as {
    id?: unknown;
    name?: unknown;
    sortOrder?: unknown;
    isActive?: unknown;
  };

  const id = typeof payload.id === 'string' ? payload.id : '';
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid child id' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (payload.name !== undefined) {
    const name = cleanName(payload.name);
    if (!name) return NextResponse.json({ error: 'A name is needed.' }, { status: 400 });
    patch.name = name;
  }
  if (payload.sortOrder !== undefined) {
    const order = Number(payload.sortOrder);
    if (!Number.isInteger(order) || order < 0 || order > 10_000) {
      return NextResponse.json({ error: 'Invalid sort order' }, { status: 400 });
    }
    patch.sort_order = order;
  }
  if (payload.isActive !== undefined) {
    if (typeof payload.isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isActive' }, { status: 400 });
    }
    patch.is_active = payload.isActive;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();

    // 🚨 Deactivating a class (tp_classes.is_active=false) is the ONLY way HQ
    // can revoke a teacher's session — cookies live 10 years and there is no
    // token-revocation list. Every mutation route must re-check the class is
    // still active, not just that the child row belongs to it.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // Ownership check reads the row inside the caller's class; the UPDATE then
    // repeats the class filter so a race can't widen the blast radius.
    const existing = await loadOwnedChild(supabase, session.classId, id);
    if (!existing) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    const { data: child, error } = await supabase
      .from('tp_children')
      .update(patch)
      .eq('id', id)
      .eq('class_id', session.classId)
      .select('id, name, photo_path, sort_order, is_active')
      .maybeSingle();
    if (error) throw error;
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      child: {
        id: child.id,
        name: child.name,
        facePath: child.photo_path,
        faceUrl: proxyUrl(child.photo_path),
        sortOrder: child.sort_order ?? 0,
        isActive: child.is_active !== false,
      },
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/children PATCH] error:', error);
    return NextResponse.json({ error: 'Could not save that change.' }, { status: 500 });
  }
}
