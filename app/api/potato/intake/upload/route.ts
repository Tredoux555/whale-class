// POST /api/potato/intake/upload — a family's photo or document.
//
// multipart/form-data: { kind, file, index? }
//
//   kind = face | pickup | vaccination | health_check | medical
//   index only applies to the two repeating kinds (pickup adults, extra
//   medical documents) and is clamped to a single digit server-side.
//
// 🚨 THE CHILD ID IS NOT IN THE BODY. It comes off the potato_parent cookie,
// so a family can only ever write under their own child's prefix:
//
//   class/<classId>/intake/<childId>/…
//
// The route returns the storage PATH (and its proxy URL for preview). Paths,
// never URLs, are what the form stores — a path means nothing outside the
// private bucket, and /api/potato/media/proxy is the only thing that turns one
// into bytes.
//
// Fixed object names + upsert: re-uploading a face or replacing pickup adult
// #2's photo overwrites in place, so a family that fixes a blurry shot never
// leaves an orphan behind.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoParent } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  loadOwnedChild,
  isSetupPending,
  proxyUrl,
  POTATO_BUCKET,
} from '@/lib/potato/db';
import {
  allowedExtension,
  intakeObjectPath,
  intakeReady,
  isUploadKind,
} from '@/lib/potato/intake';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await verifyPotatoParent(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }

  const kind = form.get('kind');
  if (!isUploadKind(kind)) {
    return NextResponse.json({ error: 'Unknown upload kind' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file was attached.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That file is too big (10MB max).' }, { status: 413 });
  }

  const mime = (file.type || '').toLowerCase();
  const extension = allowedExtension(kind, mime);
  if (!extension) {
    return NextResponse.json(
      {
        error:
          kind === 'face' || kind === 'pickup'
            ? 'Please attach a photo (JPG, PNG or WebP).'
            : 'Please attach a photo or a PDF.',
      },
      { status: 415 },
    );
  }

  const rawIndex = form.get('index');
  const index = typeof rawIndex === 'string' ? Number.parseInt(rawIndex, 10) : 0;

  try {
    const supabase = potatoDb();

    // A deactivated class is the only revocation lever for a 10-year cookie —
    // every mutation route re-checks it, not just child ownership.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const child = await loadOwnedChild(supabase, session.classId, session.childId);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    if (!(await intakeReady(supabase))) {
      return NextResponse.json({ error: 'migration_pending' }, { status: 503 });
    }

    const storagePath = intakeObjectPath(
      session.classId,
      session.childId,
      kind,
      extension,
      Number.isFinite(index) ? index : 0,
    );

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(POTATO_BUCKET)
      .upload(storagePath, bytes, { contentType: mime, upsert: true });
    if (uploadError) throw uploadError;

    return NextResponse.json({ ok: true, path: storagePath, url: proxyUrl(storagePath) });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'migration_pending' }, { status: 503 });
    }
    console.error('[potato/intake/upload] error:', error);
    return NextResponse.json({ error: 'That didn’t upload. Try again.' }, { status: 500 });
  }
}
