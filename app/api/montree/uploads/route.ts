// app/api/montree/uploads/route.ts
// General-purpose "Uploads" drop-zone: store ANY file type (images, video,
// PDFs, docs, zips — anything) in the public montree-media bucket under
// uploads/{school_id}/, list them, and delete them. School-wide shared.
//
// Deliberately SEPARATE from /api/montree/media/upload — that route is the
// child-tagging photo/video pipeline and is JPEG-gated (it rejects PNG/PDF/
// docs by design). This one has NO DB table and NO child linkage: it's a plain
// per-school filing cabinet backed entirely by Supabase Storage listing, so it
// needs no migration.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getProxyUrl, getThumbnailUrl } from '@/lib/montree/media/proxy-url';

const BUCKET = 'montree-media';
const MAX_LIST = 500;

function folderFor(schoolId: string): string {
  return `uploads/${schoolId}`;
}

// Encode the original filename into the stored object key so we can recover it
// on list without a DB. base64url yields only [A-Za-z0-9_-] → all storage-safe
// and unicode-safe (Chinese filenames survive round-trip).
function encodeName(name: string): string {
  return Buffer.from(name, 'utf8').toString('base64url');
}
function decodeName(segment: string): string {
  try {
    return Buffer.from(segment, 'base64url').toString('utf8');
  } catch {
    return segment;
  }
}

// stored key tail form: {timestamp}-{rand}-{b64urlName}
function parseOriginalName(objectName: string): string {
  const m = objectName.match(/^\d+-[a-z0-9]+-(.+)$/);
  return m ? decodeName(m[1]) : objectName;
}

// ── POST: upload one file ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const originalName = file.name || 'file';
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 10);
    const key = `${folderFor(auth.schoolId)}/${timestamp}-${rand}-${encodeName(originalName)}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('[uploads] Upload error:', uploadError.message);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file: {
        path: key,
        name: originalName,
        size: file.size,
        type: file.type || 'application/octet-stream',
        createdAt: new Date(timestamp).toISOString(),
        url: getProxyUrl(key),
        thumbUrl: (file.type || '').startsWith('image/') ? getThumbnailUrl(key, 480) : null,
      },
    });
  } catch (error) {
    console.error('[uploads] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── GET: list this school's uploads (newest first) ──────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const folder = folderFor(auth.schoolId);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, {
        limit: MAX_LIST,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('[uploads] List error:', error.message);
      return NextResponse.json({ error: 'List failed' }, { status: 500 });
    }

    const files = (data || [])
      // Supabase returns a placeholder row (id === null) for empty prefixes.
      .filter((o: { id: string | null; name?: string }) => o.id !== null && !!o.name)
      .map((o: { name: string; created_at?: string; updated_at?: string; metadata?: Record<string, unknown> | null }) => {
        const path = `${folder}/${o.name}`;
        const type = (o.metadata?.mimetype as string) || 'application/octet-stream';
        const size = (o.metadata?.size as number) ?? 0;
        const isImage = type.startsWith('image/');
        return {
          path,
          name: parseOriginalName(o.name),
          size,
          type,
          createdAt: o.created_at || o.updated_at || null,
          url: getProxyUrl(path),
          thumbUrl: isImage ? getThumbnailUrl(path, 480) : null,
        };
      });

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('[uploads] GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── DELETE: remove one file (must be inside this school's folder) ────────────
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    if (!path) {
      return NextResponse.json({ error: 'path required' }, { status: 400 });
    }

    // Guard: only allow deleting within THIS school's uploads folder.
    const folderPrefix = `${folderFor(auth.schoolId)}/`;
    if (!path.startsWith(folderPrefix) || path.includes('..')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error('[uploads] Delete error:', error.message);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[uploads] DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
