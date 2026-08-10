// GET|PATCH /api/potato/teacher/intake/[childId]
//
//   GET   → one family's whole submission, for the teacher to read.
//   PATCH → { action: 'commit' } — the teacher accepts it.
//
// 🚨 OWNERSHIP, NOT EXISTENCE. `childId` is a URL parameter, so it is exactly
// the kind of value a caller can change. Every branch resolves it through
// loadOwnedChild(classId FROM THE COOKIE, childId), which returns null unless
// that child sits in the caller's own class.
//
// 🚨 WHAT COMMIT ACTUALLY DOES, AND WHAT IT DELIBERATELY DOES NOT.
// It promotes the intake face photo to the child's canonical face object
// (class/<classId>/faces/<childId>.jpg — the same path the teacher's own face
// upload writes), points tp_children.photo_path at it, and stamps the intake
// committed. It does NOT rename the child: the teacher chose the roster name
// and uses it everywhere in PSS, and silently replacing it with whatever a
// parent typed in "full legal name" would rewrite her class list behind her
// back. The review screen shows the legal name so she can rename by hand on
// the Children screen if she wants to.
//
// Committing is idempotent-safe in the way that matters: a second commit of an
// already-committed row is refused with a clear 409 rather than re-promoting a
// photo the family may have since changed.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher, UUID_RE } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  loadOwnedChild,
  isSetupPending,
  proxyUrl,
  POTATO_BUCKET,
} from '@/lib/potato/db';
import {
  INTAKE_TABLE,
  INTAKE_COLUMNS,
  canonicalFacePath,
  intakeReady,
  urlsForForm,
  type ChildIntakeRow,
} from '@/lib/potato/intake';
import { normalizeIntake } from '@/lib/onboarding-core';

export const dynamic = 'force-dynamic';
/** Commit copies a photo object between paths — give it room. */
export const maxDuration = 60;

const PENDING = () => NextResponse.json({ error: 'migration_pending' }, { status: 503 });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> },
) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { childId } = await params;
  if (!childId || !UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'Invalid child id' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();

    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const child = await loadOwnedChild(supabase, session.classId, childId);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    if (!(await intakeReady(supabase))) return PENDING();

    const { data, error } = await supabase
      .from(INTAKE_TABLE)
      .select(INTAKE_COLUMNS)
      .eq('child_id', childId)
      .eq('class_id', session.classId)
      .maybeSingle();
    if (error) throw error;

    const row = (data as ChildIntakeRow | null) ?? null;
    if (!row) {
      return NextResponse.json({
        child: { id: child.id, name: child.name, faceUrl: proxyUrl(child.photo_path) },
        className: klass.name,
        status: 'none',
        form: null,
        urls: {},
      });
    }

    const form = normalizeIntake(row.data);
    return NextResponse.json({
      child: { id: child.id, name: child.name, faceUrl: proxyUrl(child.photo_path) },
      className: klass.name,
      status: row.status,
      submittedAt: row.submitted_at,
      committedAt: row.committed_at,
      updatedAt: row.updated_at,
      form,
      urls: urlsForForm(form),
    });
  } catch (error) {
    if (isSetupPending(error)) return PENDING();
    console.error('[potato/teacher/intake] GET error:', error);
    return NextResponse.json({ error: 'Could not load the form.' }, { status: 500 });
  }
}

/**
 * Promote the family's face photo to the child's canonical face object.
 *
 * Download-then-upload rather than storage `.copy()`: copy refuses when the
 * destination already exists (a child who already has a roster face — the
 * common case), and upsert is exactly the semantics wanted here.
 *
 * Returns the canonical path on success, or null when there is nothing to
 * promote. A failure THROWS — a commit that silently left the roster avatar
 * stale would be the worst kind of half-success.
 */
async function promoteFace(
  supabase: ReturnType<typeof potatoDb>,
  classId: string,
  childId: string,
  facePhotoPath: string | undefined,
): Promise<string | null> {
  if (!facePhotoPath) return null;

  const target = canonicalFacePath(classId, childId);
  if (facePhotoPath === target) return target;

  const { data: blob, error: downloadError } = await supabase.storage
    .from(POTATO_BUCKET)
    .download(facePhotoPath);
  if (downloadError) throw downloadError;
  if (!blob) throw new Error(`face object missing at ${facePhotoPath}`);

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(POTATO_BUCKET)
    .upload(target, bytes, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;

  return target;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> },
) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { childId } = await params;
  if (!childId || !UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'Invalid child id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const action = (body as { action?: unknown } | null)?.action;
  if (action !== 'commit') {
    return NextResponse.json({ error: "action must be 'commit'" }, { status: 400 });
  }

  try {
    const supabase = potatoDb();

    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const child = await loadOwnedChild(supabase, session.classId, childId);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    if (!(await intakeReady(supabase))) return PENDING();

    const { data, error } = await supabase
      .from(INTAKE_TABLE)
      .select(INTAKE_COLUMNS)
      .eq('child_id', childId)
      .eq('class_id', session.classId)
      .maybeSingle();
    if (error) throw error;

    const row = (data as ChildIntakeRow | null) ?? null;
    if (!row) {
      return NextResponse.json({ error: 'There is no form to accept yet.' }, { status: 404 });
    }
    if (row.status === 'committed') {
      return NextResponse.json({ error: 'This form has already been accepted.' }, { status: 409 });
    }
    if (row.status !== 'submitted') {
      return NextResponse.json(
        { error: 'This family is still filling their form in.' },
        { status: 409 },
      );
    }

    const form = normalizeIntake(row.data);

    // The photo moves BEFORE the status changes. If the copy fails the intake
    // is still 'submitted' and the teacher can simply press Accept again —
    // whereas a committed row pointing at a face that was never promoted is a
    // state nothing in the app would ever repair.
    const facePath = await promoteFace(
      supabase,
      session.classId,
      childId,
      form.documents.facePhotoPath,
    );

    if (facePath && facePath !== child.photo_path) {
      const { error: childError } = await supabase
        .from('tp_children')
        .update({ photo_path: facePath })
        .eq('id', childId)
        .eq('class_id', session.classId);
      if (childError) throw childError;
    }

    const { error: commitError } = await supabase
      .from(INTAKE_TABLE)
      .update({ status: 'committed', committed_at: new Date().toISOString() })
      .eq('id', row.id)
      // Belt and braces: the row was read under this class, and it is written
      // under it too.
      .eq('class_id', session.classId);
    if (commitError) throw commitError;

    return NextResponse.json({
      ok: true,
      status: 'committed',
      child: { id: childId, facePath, faceUrl: proxyUrl(facePath) },
    });
  } catch (error) {
    if (isSetupPending(error)) return PENDING();
    console.error('[potato/teacher/intake] PATCH error:', error);
    return NextResponse.json({ error: 'That didn’t save. Try again.' }, { status: 500 });
  }
}
