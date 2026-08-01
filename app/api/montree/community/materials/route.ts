// /api/montree/community/materials
// GET  — the public drop box, newest first, paginated. No login required.
// POST — share a file. Requires a CONFIRMED, non-banned account.
//
// Files land in the PUBLIC `community-materials` bucket under
// shared/<userId>/<timestamp>-<safe-name>. The user id in the path keeps one
// teacher's uploads from colliding with another's and makes an author's files
// greppable in the storage browser; the timestamp makes every path unique, so
// upsert is never needed and a re-upload can never overwrite someone's work.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { getCommunityUser, requireConfirmedUser } from '@/lib/montree/community/auth';
import {
  badRequest,
  isMissingTable,
  migrationPending,
  rateLimited,
  readPaging,
  serverError,
} from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

const BUCKET = 'community-materials';
const PREFIX = 'shared';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 500;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;

/**
 * Extension allow-list — the real gate. MIME types are checked as a second
 * opinion only: browsers are wildly inconsistent about zip/docx/pptx (often
 * application/octet-stream or blank), so a mismatch is tolerated as long as
 * the extension is on this list and the declared type isn't something we
 * actively refuse (see FORBIDDEN_MIME).
 */
const ALLOWED_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * Types we refuse outright regardless of extension. A file the browser itself
 * calls HTML or a script must never be served from a bucket on our origin's
 * CDN — that's how a public drop box turns into a hosted-XSS surface.
 */
const FORBIDDEN_MIME = /^(text\/html|application\/xhtml|image\/svg|text\/javascript|application\/javascript|application\/x-)/i;

interface MaterialRow {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  file_size: number | null;
  mime_type: string | null;
  download_count: number;
  created_at: string;
  user_id: string;
}

async function resolveNames(
  supabase: ReturnType<typeof getSupabase>,
  userIds: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return {};
  const { data, error } = await supabase
    .from('montree_community_users')
    .select('id, display_name')
    .in('id', unique);
  if (error) {
    console.error('[community/materials] name lookup failed:', error);
    return {};
  }
  const map: Record<string, string> = {};
  for (const row of data || []) {
    map[row.id as string] = (row.display_name as string) || 'A teacher';
  }
  return map;
}

/**
 * Reduce a user-supplied file name to [a-z0-9._-]. The extension is validated
 * separately and re-appended by the caller, so nothing here can smuggle a
 * second extension, a path separator, or a leading dot-file.
 */
function sanitizeBaseName(name: string): string {
  const base = name.replace(/\.[^.]*$/, '');
  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[.\-_]+/, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60)
    .replace(/[-_.]+$/, '');
  return safe || 'file';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { offset, limit } = readPaging(new URL(request.url), DEFAULT_LIMIT, MAX_LIMIT);

    const { data, error, count } = await supabase
      .from('montree_community_materials')
      .select(
        'id, title, description, filename, file_size, mime_type, download_count, created_at, user_id',
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('materials.GET', error);
    }

    const rows = (data || []) as MaterialRow[];
    const names = await resolveNames(supabase, rows.map((r) => r.user_id));
    const viewer = await getCommunityUser(request);

    const total = count || 0;
    return NextResponse.json({
      materials: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        filename: r.filename,
        fileSize: r.file_size,
        mimeType: r.mime_type,
        downloadCount: r.download_count,
        displayName: names[r.user_id] || 'A teacher',
        createdAt: r.created_at,
        mine: !!viewer && viewer.id === r.user_id,
      })),
      total,
      hasMore: offset + rows.length < total,
    });
  } catch (err) {
    return serverError('materials.GET', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/community/materials',
      6,
      15
    );
    if (!allowed) return rateLimited(retryAfterSeconds);

    const gate = await requireConfirmedUser(request);
    if ('error' in gate) return gate.error;
    const user = gate.user;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return badRequest('Malformed upload.');
    }

    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const file = formData.get('file') as File | null;

    if (!title) return badRequest('Please give it a title.');
    if (title.length > MAX_TITLE) {
      return badRequest(`Please keep the title under ${MAX_TITLE} characters.`);
    }
    if (description.length > MAX_DESCRIPTION) {
      return badRequest(`Please keep the description under ${MAX_DESCRIPTION} characters.`);
    }
    if (!file || typeof file.arrayBuffer !== 'function') {
      return badRequest('Please choose a file.');
    }
    if (file.size === 0) return badRequest('That file is empty.');
    if (file.size > MAX_FILE_SIZE) return badRequest('That file is too large (max 25MB).');

    // A dragged Blob can arrive without a usable .name — don't let a property
    // access on undefined become a 500.
    const rawName = typeof file.name === 'string' ? file.name : '';
    const ext = (rawName.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
    if (!ALLOWED_EXT[ext]) {
      return badRequest('PDF, image, ZIP, Word or PowerPoint files only.');
    }
    if (file.type && FORBIDDEN_MIME.test(file.type)) {
      return badRequest('That file type cannot be shared here.');
    }

    // Always store OUR mime type for the extension, never the browser's claim
    // — the stored value is what Supabase serves the file back as.
    const contentType = ALLOWED_EXT[ext];
    const safeName = `${sanitizeBaseName(rawName)}.${ext}`;
    const storagePath = `${PREFIX}/${user.id}/${Date.now()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: false });

    if (uploadError) {
      // The bucket is created by migration 309 — a missing bucket is the same
      // "not set up yet" state as a missing table.
      if (isMissingTable(uploadError) || /bucket/i.test(uploadError.message || '')) {
        return migrationPending();
      }
      return serverError('materials.POST', uploadError);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return serverError('materials.POST', new Error('no public url for uploaded object'));
    }

    const { data: row, error: insertError } = await supabase
      .from('montree_community_materials')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        filename: safeName,
        storage_path: storagePath,
        public_url: publicUrl,
        file_size: file.size,
        mime_type: contentType,
      })
      .select('id, title, description, filename, file_size, mime_type, download_count, created_at')
      .maybeSingle();

    if (insertError || !row) {
      // Don't leave an orphan object behind when the row can't be written.
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([storagePath]);
      if (cleanupError) {
        console.error('[community/materials] orphan cleanup failed:', cleanupError);
      }
      if (insertError && isMissingTable(insertError)) return migrationPending();
      return serverError('materials.POST', insertError || new Error('insert returned no row'));
    }

    return NextResponse.json({
      material: {
        id: row.id as string,
        title: row.title as string,
        description: (row.description as string) || null,
        filename: row.filename as string,
        fileSize: row.file_size as number | null,
        mimeType: row.mime_type as string | null,
        downloadCount: (row.download_count as number) || 0,
        displayName: user.displayName,
        createdAt: row.created_at as string,
        mine: true,
      },
    });
  } catch (err) {
    return serverError('materials.POST', err);
  }
}
