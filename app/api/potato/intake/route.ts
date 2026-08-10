// GET|POST /api/potato/intake — the parent's own end of Child Onboarding.
//
//   GET  → this family's intake (or a blank one), plus the URLs for whatever
//          they have already uploaded.
//   POST → save a draft, or submit.
//
// 🚨 THE CHILD ID NEVER COMES FROM THE BODY. It comes off the potato_parent
// cookie, which was minted against one child's parent code. There is no
// `childId` field in this route's request shape at all, so there is nothing to
// tamper with — the strongest version of "existence is not ownership".
//
// 🚨 THE SERVER VALIDATES. A submission runs validateIntake() here, not just
// in the browser. A client that skips the form and POSTs `{status:'submitted'}`
// with an empty body gets a 400, not a submitted row.
//
// 🚨 A COMMITTED INTAKE CAN BE RE-OPENED but never re-applies itself. Families
// move house and allergies appear; a new submission puts the row back to
// 'submitted' and the teacher has to read and commit it again.
//
// Middleware gives /api/potato/* zero protection — this route does its own
// auth, on every request.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoParent } from '@/lib/potato/auth';
import { potatoDb, loadClass, loadOwnedChild, isSetupPending } from '@/lib/potato/db';
import {
  INTAKE_TABLE,
  INTAKE_COLUMNS,
  intakeReady,
  scrubForeignPaths,
  urlsForForm,
  type ChildIntakeRow,
} from '@/lib/potato/intake';
import {
  emptyIntake,
  normalizeIntake,
  validateIntake,
  type IntakeForm,
} from '@/lib/onboarding-core';

export const dynamic = 'force-dynamic';
/** The form is long and carries several sections; give the write room. */
export const maxDuration = 60;

const PENDING = () => NextResponse.json({ error: 'migration_pending' }, { status: 503 });

export async function GET(request: NextRequest) {
  const session = await verifyPotatoParent(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const supabase = potatoDb();

    // A deactivated class is the only revocation lever for a 10-year cookie.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const child = await loadOwnedChild(supabase, session.classId, session.childId);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    if (!(await intakeReady(supabase))) return PENDING();

    const { data, error } = await supabase
      .from(INTAKE_TABLE)
      .select(INTAKE_COLUMNS)
      .eq('child_id', session.childId)
      .eq('class_id', session.classId)
      .maybeSingle();
    if (error) throw error;

    const row = (data as ChildIntakeRow | null) ?? null;
    const form: IntakeForm = row ? normalizeIntake(row.data) : emptyIntake();

    return NextResponse.json({
      child: { id: child.id, name: child.name },
      className: klass.name,
      status: row?.status ?? 'draft',
      submittedAt: row?.submitted_at ?? null,
      committedAt: row?.committed_at ?? null,
      updatedAt: row?.updated_at ?? null,
      form,
      urls: urlsForForm(form),
    });
  } catch (error) {
    if (isSetupPending(error)) return PENDING();
    console.error('[potato/intake] GET error:', error);
    return NextResponse.json({ error: 'Could not load your form.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyPotatoParent(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { form, status } = body as { form?: unknown; status?: unknown };
  if (status !== 'draft' && status !== 'submitted') {
    return NextResponse.json({ error: "status must be 'draft' or 'submitted'" }, { status: 400 });
  }

  try {
    const supabase = potatoDb();

    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const child = await loadOwnedChild(supabase, session.classId, session.childId);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    if (!(await intakeReady(supabase))) return PENDING();

    // Normalize first (an old client's shape still renders), then strip any
    // storage path that does not sit under this child's own prefix.
    const normalized = scrubForeignPaths(normalizeIntake(form), session.classId, session.childId);

    // A draft may be anything at all — that is the entire point of a draft.
    if (status === 'submitted') {
      const result = validateIntake(normalized);
      if (!result.ok) {
        return NextResponse.json(
          { error: 'validation_failed', errors: result.errors },
          { status: 400 },
        );
      }
    }

    const { data: existing, error: readError } = await supabase
      .from(INTAKE_TABLE)
      .select('id, status')
      .eq('child_id', session.childId)
      .eq('class_id', session.classId)
      .maybeSingle();
    if (readError) throw readError;

    const patch: Record<string, unknown> = {
      class_id: session.classId,
      child_id: session.childId,
      data: normalized,
      status,
    };
    if (status === 'submitted') patch.submitted_at = new Date().toISOString();

    const prior = existing as { id: string; status: string } | null;

    if (prior) {
      const { error: updateError } = await supabase
        .from(INTAKE_TABLE)
        .update(patch)
        .eq('id', prior.id);
      if (updateError) throw updateError;
      return NextResponse.json({
        ok: true,
        status,
        // Honest about what a re-submission over a committed intake means: it
        // is a request for another look, not a change to the child's record.
        reopened: prior.status === 'committed' && status === 'submitted',
      });
    }

    const { error: insertError } = await supabase.from(INTAKE_TABLE).insert(patch);
    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, status, reopened: false });
  } catch (error) {
    if (isSetupPending(error)) return PENDING();
    console.error('[potato/intake] POST error:', error);
    return NextResponse.json({ error: 'That didn’t save. Try again.' }, { status: 500 });
  }
}
