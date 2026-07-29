// /api/montree/media/crop/route.ts
// Crop a photo. TWO request shapes, one behaviour:
//
//  A) JSON   { media_id, crop: { x, y, width, height }, replace_original? }
//     `crop` is in ORIGINAL-IMAGE PIXEL coordinates. The server downloads the
//     original from storage, crops it itself, and writes the result to a NEW path.
//
//  B) multipart { file, media_id, width, height, replace_original? }   ← legacy
//     The client already cropped and hands over the finished JPEG. Kept because
//     `app/montree/dashboard/[childId]/gallery/page.tsx:558` posts this shape;
//     without `replace_original` its behaviour is byte-identical to before.
//
// In BOTH shapes the cropped image goes to a NEW storage path (same folder, new
// timestamped filename). We NEVER overwrite an existing storage object: an
// overwritten path keeps serving the old bytes from the Cloudflare edge cache for
// up to 7 days, so "the crop didn't apply" would be the guaranteed outcome.
//
// `replace_original: true` additionally repoints montree_media.storage_path at the
// crop, which is what makes the crop reach every surface that resolves
// storage_path — the picker grid, the lightbox, the media page, parent reports and
// the montage film — with zero worker change and zero schema change. The original
// FILE stays in the bucket, unreferenced, at a derivable path (strip the
// `_cropped_<ts>` suffix). Accepted, documented storage leak; no GC in this round.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

// Downloading + re-encoding a full-resolution photo is slower than a metadata write.
export const maxDuration = 60;

const BUCKET = 'montree-media';
/** Anything smaller than this is a mis-drag, not a crop. */
const MIN_CROP_PX = 50;
const CROP_JPEG_QUALITY = 90;

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Minimal structural type for the only sharp calls we make. Declared locally and
 * cast at the import site so this route never depends on sharp's own type surface
 * (`export =` vs `export default` interop differs between versions, and the repo
 * runs with `typescript.ignoreBuildErrors`, so a bad augmentation would ship silently).
 */
interface SharpInstance {
  metadata(): Promise<{ width?: number; height?: number }>;
  extract(region: { left: number; top: number; width: number; height: number }): SharpInstance;
  jpeg(options: { quality: number }): SharpInstance;
  toBuffer(): Promise<Buffer>;
}
type SharpFactory = (input: Buffer) => SharpInstance;

/**
 * sharp is loaded lazily and cached per process.
 *
 * It is only needed for the JSON (server-side crop) shape — the legacy multipart
 * shape never touches it, so an environment without sharp still serves the child
 * gallery exactly as before instead of failing wholesale.
 */
let sharpFactory: SharpFactory | null | undefined;
async function loadSharp(): Promise<SharpFactory | null> {
  if (sharpFactory !== undefined) return sharpFactory;
  // Resolved locally so the return type narrows cleanly — the outer
  // module-scoped `sharpFactory` variable doesn't narrow across the `await`
  // above, even after assignment below.
  let resolved: SharpFactory | null = null;
  try {
    const mod: unknown = await import('sharp');
    const candidate = (mod as { default?: unknown }).default ?? mod;
    resolved = typeof candidate === 'function' ? (candidate as SharpFactory) : null;
    if (!resolved) console.error('[Crop] sharp imported but no callable export found');
  } catch (err) {
    console.error(
      '[Crop] sharp is not available in this runtime — server-side cropping is disabled. ' +
      'Move "sharp" from devDependencies to dependencies if this fires in production.',
      err
    );
  }
  sharpFactory = resolved;
  return resolved;
}

/** Coerce one crop field to a finite integer, or null if it is not a number. */
function toInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(n);
}

/**
 * Clamp a client-supplied rect into the real image. Never trusts the client:
 * the origin is pulled back inside the frame, the size is trimmed to what is
 * left, and anything that ends up below MIN_CROP_PX is rejected outright.
 */
function clampCrop(
  rect: CropRect,
  imageWidth: number,
  imageHeight: number
): { rect: CropRect } | { error: string } {
  const x = Math.max(0, Math.min(rect.x, Math.max(0, imageWidth - MIN_CROP_PX)));
  const y = Math.max(0, Math.min(rect.y, Math.max(0, imageHeight - MIN_CROP_PX)));
  const width = Math.min(rect.width, imageWidth - x);
  const height = Math.min(rect.height, imageHeight - y);

  if (width < MIN_CROP_PX || height < MIN_CROP_PX) {
    return { error: `Crop must be at least ${MIN_CROP_PX}x${MIN_CROP_PX} pixels inside the image` };
  }
  return { rect: { x, y, width, height } };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const isJson = (request.headers.get('content-type') || '').includes('application/json');

    // ── Parse the request into a common shape ──────────────────────────────
    let mediaId = '';
    let replaceOriginal = false;
    let requestedCrop: CropRect | null = null;      // JSON shape
    let clientFile: File | null = null;             // legacy multipart shape
    let clientWidth = 0;
    let clientHeight = 0;

    if (isJson) {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
      const { media_id, crop, replace_original } = body as {
        media_id?: string;
        crop?: Partial<CropRect>;
        replace_original?: boolean | string;
      };

      mediaId = typeof media_id === 'string' ? media_id : '';
      replaceOriginal = replace_original === true || replace_original === 'true';

      if (!mediaId) {
        return NextResponse.json({ error: 'media_id required' }, { status: 400 });
      }
      if (!crop || typeof crop !== 'object') {
        return NextResponse.json({ error: 'crop { x, y, width, height } required' }, { status: 400 });
      }

      const x = toInt(crop.x);
      const y = toInt(crop.y);
      const width = toInt(crop.width);
      const height = toInt(crop.height);
      if (x === null || y === null || width === null || height === null) {
        return NextResponse.json(
          { error: 'crop.x, crop.y, crop.width and crop.height must be numbers' },
          { status: 400 }
        );
      }
      if (x < 0 || y < 0 || width < MIN_CROP_PX || height < MIN_CROP_PX) {
        return NextResponse.json(
          { error: `crop must be non-negative and at least ${MIN_CROP_PX}px on each side` },
          { status: 400 }
        );
      }
      requestedCrop = { x, y, width, height };
    } else {
      const formData = await request.formData();
      clientFile = formData.get('file') as File | null;
      mediaId = (formData.get('media_id') as string) || '';
      clientWidth = parseInt(formData.get('width') as string, 10);
      clientHeight = parseInt(formData.get('height') as string, 10);
      replaceOriginal = formData.get('replace_original') === 'true';

      if (!clientFile || !mediaId) {
        return NextResponse.json({ error: 'file and media_id required' }, { status: 400 });
      }
      if (isNaN(clientWidth) || isNaN(clientHeight) || clientWidth < 1 || clientHeight < 1) {
        return NextResponse.json({ error: 'Valid width and height required' }, { status: 400 });
      }
    }

    // ── Fetch + own the media row (unchanged posture) ──────────────────────
    const { data: media, error: fetchErr } = await supabase
      .from('montree_media')
      .select('*')
      .eq('id', mediaId)
      .maybeSingle();

    if (fetchErr || !media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Verify the media belongs to the authenticated user's school
    if (media.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ── Produce the cropped bytes ──────────────────────────────────────────
    let fileBuffer: Buffer;
    let outWidth: number;
    let outHeight: number;

    if (requestedCrop) {
      // A video row has no croppable frame — fail loud rather than feed sharp an mp4.
      if (media.media_type === 'video') {
        return NextResponse.json({ error: 'Videos cannot be cropped' }, { status: 400 });
      }

      const sharp = await loadSharp();
      if (!sharp) {
        return NextResponse.json(
          { error: 'Server-side cropping is unavailable', code: 'crop_unavailable' },
          { status: 503 }
        );
      }

      const { data: original, error: downloadErr } = await supabase.storage
        .from(BUCKET)
        .download(media.storage_path);

      if (downloadErr || !original) {
        console.error('[Crop] original download failed:', media.storage_path, downloadErr);
        return NextResponse.json({ error: 'Could not read the original image' }, { status: 502 });
      }

      const originalBuffer = Buffer.from(await original.arrayBuffer());
      const pipeline = sharp(originalBuffer);

      const meta = await pipeline.metadata();
      const imageWidth = meta.width || 0;
      const imageHeight = meta.height || 0;
      if (!imageWidth || !imageHeight) {
        return NextResponse.json({ error: 'Could not read image dimensions' }, { status: 422 });
      }

      // Clamp against the ACTUAL pixels, never against montree_media.width/height
      // (which is client-reported and frequently null).
      const clamped = clampCrop(requestedCrop, imageWidth, imageHeight);
      if ('error' in clamped) {
        return NextResponse.json({ error: clamped.error }, { status: 400 });
      }

      const { x, y, width, height } = clamped.rect;
      fileBuffer = await pipeline
        .extract({ left: x, top: y, width, height })
        .jpeg({ quality: CROP_JPEG_QUALITY })
        .toBuffer();
      outWidth = width;
      outHeight = height;
    } else if (clientFile) {
      fileBuffer = Buffer.from(await clientFile.arrayBuffer());
      outWidth = clientWidth;
      outHeight = clientHeight;
    } else {
      // Unreachable — both parse branches already returned on a missing payload.
      return NextResponse.json({ error: 'No crop payload' }, { status: 400 });
    }

    // ── Upload to a NEW path (original file untouched, edge cache clean) ────
    const originalPath: string = media.storage_path;
    const lastDot = originalPath.lastIndexOf('.');
    const basePath = lastDot > 0 ? originalPath.substring(0, lastDot) : originalPath;
    const ext = lastDot > 0 ? originalPath.substring(lastDot) : '.jpg';
    const croppedPath = `${basePath}_cropped_${Date.now()}${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(croppedPath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false, // Never overwrite — always a new file
      });

    if (uploadErr) {
      console.error('Crop upload error:', uploadErr);
      return NextResponse.json(
        { error: 'Failed to upload cropped image' },
        { status: 500 }
      );
    }

    // ── Write the DB in TWO steps ──────────────────────────────────────────
    // Step 1 repoints columns that certainly exist. Step 2 is the best-effort
    // link column, which may not exist yet (42703) and must never be able to
    // take the request down with it.
    if (replaceOriginal) {
      const { error: repointErr } = await supabase
        .from('montree_media')
        .update({
          storage_path: croppedPath,
          thumbnail_path: null,   // the old thumbnail is of the uncropped frame
          width: outWidth,
          height: outHeight,
          file_size_bytes: fileBuffer.byteLength,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mediaId)
        .eq('school_id', auth.schoolId);

      if (repointErr) {
        console.error('[Crop] storage_path repoint failed:', repointErr.message, repointErr.code);
        // Don't leave the just-uploaded file orphaned when nothing points at it.
        await supabase.storage.from(BUCKET).remove([croppedPath]);
        return NextResponse.json(
          { error: 'Failed to apply the crop', detail: repointErr.message },
          { status: 500 }
        );
      }
    }

    // Update DB: store cropped path separately (kept for backward compat)
    const { error: updateErr } = await supabase
      .from('montree_media')
      .update({
        cropped_storage_path: croppedPath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mediaId);

    // If cropped_storage_path column doesn't exist yet (migration not run),
    // fall back gracefully — the crop is still saved in storage, and when
    // replace_original was set the row already points at it.
    if (updateErr) {
      const msg = updateErr.message || '';
      if (msg.includes('column') || updateErr.code === '42703') {
        console.warn('[Crop] cropped_storage_path column not found — crop saved in storage but not linked:', croppedPath);
      } else {
        console.error('Crop DB update error:', updateErr);
      }
    }

    // Build the CDN-cached proxy URL for the cropped version
    const croppedUrl = getProxyUrl(croppedPath);

    return NextResponse.json({
      success: true,
      media: {
        id: mediaId,
        // `url` is the frozen field for new callers: the proxy URL of whatever
        // this photo should render as from now on.
        url: croppedUrl,
        width: outWidth,
        height: outHeight,
        file_size_bytes: fileBuffer.byteLength,
        // The row's storage_path AFTER this call, so an in-memory list can stay honest.
        storage_path: replaceOriginal ? croppedPath : originalPath,
        replaced_original: replaceOriginal,
        // Legacy fields — the child gallery reads cropped_url.
        cropped_url: croppedUrl,
        cropped_storage_path: croppedPath,
      },
    });
  } catch (error) {
    console.error('Crop API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
