// POST /api/potato/children/[id]/face — the child's face photo.
//
// multipart/form-data: file
//
// Stored at a FIXED path per child (class/<classId>/faces/<childId>.jpg) with
// upsert, so replacing a face never leaves an orphan and never needs a cache
// bust beyond the proxy's short private cache. The stored object carries the
// real content type even though the path says .jpg — the extension is an
// addressing convention here, not a format claim.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher, UUID_RE } from '@/lib/potato/auth';
import { potatoDb, loadClass, loadOwnedChild, isSetupPending, proxyUrl, POTATO_BUCKET } from '@/lib/potato/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid child id' }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No photo was attached.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That photo is too big (10MB max).' }, { status: 413 });
  }
  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: 'That file type isn’t a photo we can use.' }, { status: 415 });
  }

  try {
    const supabase = potatoDb();
    // 🚨 Deactivating a class is the only revocation lever for a 10-year
    // teacher cookie — every mutation route must re-check it, not just child
    // ownership.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const child = await loadOwnedChild(supabase, session.classId, id);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    const storagePath = `class/${session.classId}/faces/${child.id}.jpg`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(POTATO_BUCKET)
      .upload(storagePath, bytes, { contentType: mime, upsert: true });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from('tp_children')
      .update({ photo_path: storagePath })
      .eq('id', child.id)
      .eq('class_id', session.classId);
    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      child: { id: child.id, facePath: storagePath, faceUrl: proxyUrl(storagePath) },
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/children/face] error:', error);
    return NextResponse.json({ error: 'That photo didn’t save. Try again.' }, { status: 500 });
  }
}
