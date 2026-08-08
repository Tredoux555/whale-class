// POST /api/potato/branding/emblem — the class's own emblem.
//
// multipart/form-data: file (jpeg/png/webp, ≤2MB)
//
// The teacher owns the CLASS emblem. She can never touch the SCHOOL logo —
// that is HQ's, and a teacher breaking school branding is not a failure mode
// this product allows. See /api/potato/hq/classes/[id]/logo for that side.
//
// Stored at a fixed path per class with upsert, so replacing the emblem leaves
// no orphan: class/<classId>/branding/emblem.<ext>

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  potatoCapabilities,
  isSetupPending,
  proxyUrl,
  POTATO_BUCKET,
} from '@/lib/potato/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** 2MB — a logo, not a photograph. */
const MAX_BYTES = 2 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No image was attached.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That image is too big (2MB max).' }, { status: 413 });
  }
  const mime = (file.type || '').toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) {
    return NextResponse.json(
      { error: 'Use a JPG, PNG or WebP image.' },
      { status: 415 },
    );
  }

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);
    if (!caps.classes) return NextResponse.json({ error: 'setup_pending' }, { status: 503 });

    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const storagePath = `class/${session.classId}/branding/emblem.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(POTATO_BUCKET)
      .upload(storagePath, bytes, { contentType: mime, upsert: true });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from('tp_classes')
      .update({ emblem_path: storagePath })
      .eq('id', session.classId);
    if (updateError) throw updateError;

    // A previous emblem in a DIFFERENT format is now unreferenced — clear it up
    // best-effort so the bucket does not collect dead marks.
    const stale = Object.values(EXT_BY_MIME)
      .filter((e) => e !== ext)
      .map((e) => `class/${session.classId}/branding/emblem.${e}`);
    const { error: removeError } = await supabase.storage.from(POTATO_BUCKET).remove(stale);
    if (removeError) {
      console.error('[potato/branding/emblem] stale emblem cleanup failed:', removeError);
    }

    return NextResponse.json({
      ok: true,
      emblemPath: storagePath,
      emblemUrl: proxyUrl(storagePath),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/branding/emblem] error:', error);
    return NextResponse.json({ error: 'That image didn’t save. Try again.' }, { status: 500 });
  }
}
