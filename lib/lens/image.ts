// lib/lens/image.ts
// Client-side photo compression, before the bytes ever reach IndexedDB.
//
// 🚨 WHY COMPRESS BEFORE QUEUEING AND NOT BEFORE UPLOADING.
// A modern phone hands over a 4–8MB HEIC or JPEG. Queueing that raw would mean
// the device holds ~50MB after a single classroom, hits the storage ceiling on a
// busy day, and then spends that whole payload again on a 3G uplink in a
// school's back corridor. Compressing at capture time means the queue holds what
// will actually be sent, the "N waiting" pill reflects real work, and a retry
// re-sends 400KB rather than 8MB.
//
// 🚨 WHY 1920px AND 0.82 JPEG.
// These photographs are evidence of shelves and materials — is the material
// complete, is its control of error intact, could a child reach it. 1920 on the
// long edge resolves a label on a Sensorial shelf in a report appendix printed at
// A4, which is the actual requirement. Going higher buys nothing a reader can
// see and costs upload time she does not have.
//
// 🚨 HEIC IS THE CASE THAT MATTERS. An iPhone's default format is HEIC, which
// Safari can decode but Chrome on Android cannot, and which the server's MIME
// allow-list accepts only grudgingly. Drawing it to a canvas and re-encoding as
// JPEG normalises it — and when the browser CANNOT decode it (some Androids
// handed a HEIC from a shared album), the original File is returned untouched
// rather than throwing, so the moment still saves and the server decides.

'use client';

export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
  /** A blob: URL for the optimistic thumbnail. The caller owns revoking it. */
  previewUrl: string;
  /** True when compression was skipped and the original bytes are being used. */
  original: boolean;
}

const MAX_EDGE = 1920;
const QUALITY = 0.82;

/** Rotation-aware decode. Returns null when the browser cannot read the file. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  // createImageBitmap honours EXIF orientation with imageOrientation:'from-image'
  // in every browser that has it, which is the difference between an upright
  // shelf and a shelf lying on its side in the report appendix.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to the <img> path */
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function sizeOf(source: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  if ('naturalWidth' in source) {
    return { w: source.naturalWidth || source.width, h: source.naturalHeight || source.height };
  }
  return { w: source.width, h: source.height };
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const fallback = (): PreparedPhoto => ({
    blob: file,
    width: 0,
    height: 0,
    previewUrl: URL.createObjectURL(file),
    original: true,
  });

  let source: ImageBitmap | HTMLImageElement | null = null;
  try {
    source = await decode(file);
  } catch {
    return fallback();
  }
  if (!source) return fallback();

  const { w, h } = sizeOf(source);
  if (!w || !h) {
    if ('close' in source) source.close();
    return fallback();
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if ('close' in source) source.close();
    return fallback();
  }
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  if ('close' in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY),
  );
  if (!blob) return fallback();

  // If the "compressed" version came out bigger — a small screenshot, an already
  // well-optimised JPEG — keep the original. Re-encoding for no gain only loses
  // quality.
  if (blob.size >= file.size && scale === 1) return fallback();

  return { blob, width, height, previewUrl: URL.createObjectURL(blob), original: false };
}
