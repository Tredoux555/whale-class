// /api/montree/satpin-media/route.ts
// Week songs for the SATPIN library page (/montree/library/satpin).
//
// The page's song slots are drop zones: a teacher drags an mp3 onto a week
// and it plays for everyone on the next load — no deploy, no repo copy.
// Files live in the public `dark-phonics` bucket (same bucket as the Dark
// Phonics lesson songs and videos), FLAT under one prefix:
//
//   satpin-songs/<slug>-<timestamp>.<ext>     e.g. satpin-songs/p-1785200000000.mp3
//
// Flat on purpose: GET discovers every week's song with ONE storage list
// call. The timestamp both busts the Supabase CDN cache on replace and picks
// the winner when several files exist for a slug (latest wins; older ones
// are best-effort deleted on upload).
//
// Music videos follow the same convention under satpin-videos/ — produced by
// the mvgen pipeline and copied into the bucket by hand/session (too big for
// a route upload), discovered here exactly like songs:
//
//   satpin-videos/<slug>-<timestamp>.mp4    e.g. satpin-videos/p-1785200000000.mp4
//
// GET  -> { songs: { [slug]: publicUrl }, videos: { [slug]: publicUrl } }
// POST multipart { slug, file } -> { url }   (songs only)
//
// 🚨 PUBLIC ENDPOINT — no login required, same posture as
// /api/montree/photo-bank (the library is a shared community resource).
// Spam controls: IP rate-limit, audio-only content check, 25MB cap,
// slug allow-list (nothing outside the 27-week series can be written).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

const BUCKET = 'dark-phonics';
const PREFIX = 'satpin-songs';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — generous for a week song

/** The 27-week series slugs — keep in step with WEEKS in the satpin page. */
const SLUGS = new Set([
  's', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck',
  'e', 'u', 'r', 'h', 'b', 'f', 'l', 'j', 'v', 'w', 'x', 'y', 'z', 'qu',
]);

const EXT_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
};
const ALLOWED_EXTS = new Set(['mp3', 'm4a', 'wav', 'ogg']);

/** satpin-songs file name convention: <slug>-<ms-timestamp>.<ext> */
const NAME_RE = /^([a-z]{1,2})-(\d{10,16})\.(mp3|m4a|wav|ogg)$/;

const VIDEO_PREFIX = 'satpin-videos';
/** satpin-videos file name convention: <slug>-<ms-timestamp>.<ext> */
const VIDEO_NAME_RE = /^([a-z]{1,2})-(\d{10,16})\.(mp4|webm)$/;

/** One flat-prefix listing → { slug: publicUrl }, latest timestamp wins. */
async function discover(
  supabase: ReturnType<typeof getSupabase>,
  prefix: string,
  nameRe: RegExp
): Promise<Record<string, string>> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 500 });
  if (error) throw error;

  const latest: Record<string, { ts: number; name: string }> = {};
  for (const f of data || []) {
    const m = (f.name || '').match(nameRe);
    if (!m || !SLUGS.has(m[1])) continue;
    const ts = Number(m[2]);
    if (!latest[m[1]] || ts > latest[m[1]].ts) latest[m[1]] = { ts, name: f.name };
  }

  const out: Record<string, string> = {};
  for (const [slug, { name }] of Object.entries(latest)) {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${prefix}/${name}`);
    if (urlData?.publicUrl) out[slug] = urlData.publicUrl;
  }
  return out;
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const [songs, videos] = await Promise.all([
      discover(supabase, PREFIX, NAME_RE),
      discover(supabase, VIDEO_PREFIX, VIDEO_NAME_RE),
    ]);

    return NextResponse.json(
      { songs, videos },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    );
  } catch (err) {
    console.error('[satpin-media] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Same IP rate-limit posture as the photo-bank uploader.
    const { checkRateLimit } = await import('@/lib/rate-limiter');
    const { getClientIP } = await import('@/lib/montree/audit-logger');
    const ip = getClientIP(request.headers);
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/satpin-media',
      10,
      15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again in a few minutes.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const formData = await request.formData();
    const slug = String(formData.get('slug') || '').trim().toLowerCase();
    const file = formData.get('file') as File | null;

    if (!SLUGS.has(slug)) {
      return NextResponse.json({ error: 'Unknown week slug' }, { status: 400 });
    }
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 });
    }

    // Resolve the extension from the mime type, falling back to the file
    // name — some browsers hand over audio files with a blank/generic type.
    const nameExt = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
    const ext = EXT_BY_MIME[file.type] || (ALLOWED_EXTS.has(nameExt) ? nameExt : '');
    if (!ext) {
      return NextResponse.json(
        { error: 'Not an audio file — mp3, m4a, wav or ogg only' },
        { status: 400 }
      );
    }

    const path = `${PREFIX}/${slug}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: EXT_BY_MIME[file.type] ? file.type : `audio/${ext === 'mp3' ? 'mpeg' : ext}`,
        upsert: false, // timestamped name — collisions can't happen
      });
    if (uploadError) {
      console.error('[satpin-media] upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Best-effort cleanup of older songs for this slug — replace semantics.
    // Never fails the request: GET picks the latest timestamp regardless.
    try {
      const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list(PREFIX, { limit: 500 });
      const stale = (existing || [])
        .map((f) => f.name || '')
        .filter((name) => {
          const m = name.match(NAME_RE);
          return m && m[1] === slug && `${PREFIX}/${name}` !== path;
        })
        .map((name) => `${PREFIX}/${name}`);
      if (stale.length > 0) {
        await supabase.storage.from(BUCKET).remove(stale);
      }
    } catch {
      /* stale copies are harmless */
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: urlData.publicUrl, slug });
  } catch (err) {
    console.error('[satpin-media] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
