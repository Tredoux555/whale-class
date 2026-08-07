// /api/potato/parent-codes — one code per child, for the parent door.
//   GET  → every code in the class (they stay visible: kindergarten reality is
//          that a paper card gets lost and has to be re-read out loud)
//   POST { childId, regenerate? } → mint, or return the existing one

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher, UUID_RE } from '@/lib/potato/auth';
import { potatoDb, loadClass, listChildren, loadOwnedChild, isSetupPending, proxyUrl } from '@/lib/potato/db';
import { mintUniqueCode } from '@/lib/potato/codes';

export const dynamic = 'force-dynamic';

interface CodeRow {
  id: string;
  child_id: string;
  code: string;
  created_at: string;
  last_used_at: string | null;
}

export async function GET(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const supabase = potatoDb();
    // 🚨 Deactivating a class is the only revocation lever for a 10-year
    // teacher cookie — every route must re-check it, not just child ownership.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const children = await listChildren(supabase, session.classId);

    const { data, error } = await supabase
      .from('tp_parent_codes')
      .select('id, child_id, code, created_at, last_used_at')
      .eq('class_id', session.classId);
    if (error) throw error;

    const byChild = new Map<string, CodeRow>();
    for (const row of (data ?? []) as CodeRow[]) byChild.set(row.child_id, row);

    return NextResponse.json({
      ok: true,
      codes: children.map((child) => {
        const row = byChild.get(child.id);
        return {
          childId: child.id,
          childName: child.name,
          faceUrl: proxyUrl(child.photo_path),
          code: row?.code ?? null,
          lastUsedAt: row?.last_used_at ?? null,
        };
      }),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/parent-codes GET] error:', error);
    return NextResponse.json({ error: 'Could not load the codes.' }, { status: 500 });
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
  const payload = (body ?? {}) as { childId?: unknown; regenerate?: unknown };
  const childId = typeof payload.childId === 'string' ? payload.childId : '';
  if (!UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'Invalid child id' }, { status: 400 });
  }
  const regenerate = payload.regenerate === true;

  try {
    const supabase = potatoDb();
    // 🚨 Deactivating a class is the only revocation lever for a 10-year
    // teacher cookie — every route must re-check it, not just child ownership.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const child = await loadOwnedChild(supabase, session.classId, childId);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    const { data: existing, error: existingError } = await supabase
      .from('tp_parent_codes')
      .select('id, code')
      .eq('child_id', child.id)
      .eq('class_id', session.classId)
      .maybeSingle();
    if (existingError) throw existingError;

    // A code that already exists is handed back unchanged — rotating it would
    // silently lock out a parent who is already signed in.
    if (existing && !regenerate) {
      return NextResponse.json({ ok: true, code: existing.code, created: false });
    }

    const codeExists = async (candidate: string): Promise<boolean> => {
      const { data, error } = await supabase
        .from('tp_parent_codes')
        .select('id')
        .eq('code', candidate)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    };

    // A 23505 here means one of two things, and they need opposite answers:
    //   • the CODE collided        → mint another and try again
    //   • the CHILD already has one → another request won the race; read it back
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = await mintUniqueCode(codeExists);

      if (existing) {
        const { data, error } = await supabase
          .from('tp_parent_codes')
          .update({ code, created_at: new Date().toISOString(), last_used_at: null })
          .eq('id', existing.id)
          .eq('class_id', session.classId)
          .select('code')
          .maybeSingle();
        if (error) {
          if (error.code === '23505') continue; // code collision only
          throw error;
        }
        return NextResponse.json({ ok: true, code: data?.code ?? code, created: false });
      }

      const { data, error } = await supabase
        .from('tp_parent_codes')
        .insert({ class_id: session.classId, child_id: child.id, code })
        .select('code')
        .maybeSingle();
      if (error) {
        if (error.code === '23505') {
          const { data: winner } = await supabase
            .from('tp_parent_codes')
            .select('code')
            .eq('child_id', child.id)
            .eq('class_id', session.classId)
            .maybeSingle();
          if (winner?.code) {
            return NextResponse.json({ ok: true, code: winner.code, created: false });
          }
          continue; // no row → it was the code that collided
        }
        throw error;
      }
      return NextResponse.json({ ok: true, code: data?.code ?? code, created: true });
    }

    return NextResponse.json({ error: 'Could not make a code. Try again.' }, { status: 503 });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/parent-codes POST] error:', error);
    return NextResponse.json({ error: 'Could not make a code.' }, { status: 500 });
  }
}
