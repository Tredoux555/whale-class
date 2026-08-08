// POST /api/potato/hq/classes/[id]/logo — HQ sets a class's SCHOOL logo.
//
// multipart/form-data: file (jpeg/png/webp, ≤2MB)
// Header: x-admin-password
//
// This is the mark that takes the hero slot on the parent's sign-in screen and
// the largest position on every film's end card. It belongs to HQ; the teacher
// sees it as a locked, read-only row.
//
// Stored at class/<classId>/branding/school-logo.<ext>, upsert.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoHq, checkPotatoRateLimit, clientKey, UUID_RE } from '@/lib/potato/auth';
import {
  potatoDb,
  potatoCapabilities,
  isSetupPending,
  proxyUrl,
  POTATO_BUCKET,
} from '@/lib/potato/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HQ_MAX_CALLS = 120;
const MAX_BYTES = 2 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkPotatoRateLimit(clientKey(request, 'hq'), HQ_MAX_CALLS)) {
    return NextResponse.json({ error: 'Too many tries.' }, { status: 429 });
  }
  if (!verifyPotatoHq(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid class id' }, { status: 400 });
  }

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
    return NextResponse.json({ error: 'Use a JPG, PNG or WebP image.' }, { status: 415 });
  }

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);
    if (!caps.classes) return NextResponse.json({ error: 'setup_pending' }, { status: 503 });

    const { data: klass, error: findError } = await supabase
      .from('tp_classes')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (findError) throw findError;
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const storagePath = `class/${id}/branding/school-logo.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(POTATO_BUCKET)
      .upload(storagePath, bytes, { contentType: mime, upsert: true });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from('tp_classes')
      .update({ school_logo_path: storagePath })
      .eq('id', id);
    if (updateError) throw updateError;

    const stale = Object.values(EXT_BY_MIME)
      .filter((e) => e !== ext)
      .map((e) => `class/${id}/branding/school-logo.${e}`);
    const { error: removeError } = await supabase.storage.from(POTATO_BUCKET).remove(stale);
    if (removeError) {
      console.error('[potato/hq/logo] stale logo cleanup failed:', removeError);
    }

    return NextResponse.json({
      ok: true,
      schoolLogoPath: storagePath,
      schoolLogoUrl: proxyUrl(storagePath),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/hq/logo] error:', error);
    return NextResponse.json({ error: 'That image didn’t save. Try again.' }, { status: 500 });
  }
}
