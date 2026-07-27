// lib/montree/media/download-photos.ts
// Client-side "save to my device" for Picture Bank selections.
//
// One photo  → downloads that image directly (keeps its original extension).
// Many photos → zips them in the browser and downloads a single .zip.
//
// Images are fetched through the same-origin Cloudflare proxy
// (/api/montree/media/proxy/...), so there is no CORS preflight and the
// bytes usually come straight from the edge cache.
//
// JSZip is imported dynamically so it only lands in the bundle for users who
// actually click Download.

export interface DownloadablePhoto {
  id: string;
  label: string;
  filename: string;
  /** Same-origin proxy URL (see getProxyUrl). */
  public_url: string;
}

export interface DownloadProgress {
  /** Photos fetched so far. */
  done: number;
  /** Total photos requested. */
  total: number;
  /** 'fetching' while pulling images, 'zipping' while building the archive. */
  phase: 'fetching' | 'zipping';
}

export interface DownloadResult {
  /** Number of images successfully written to the device. */
  saved: number;
  /** Labels of photos that could not be fetched. */
  failed: string[];
  /** Name of the file handed to the browser, or null if nothing was saved. */
  filename: string | null;
}

/** How many images to fetch at once. Keeps the proxy from being hammered. */
const FETCH_CONCURRENCY = 4;

/**
 * Turn a picture label into a safe cross-platform filename stem.
 * "cat nap pan" → "cat-nap-pan". Strips characters Windows/macOS reject,
 * collapses whitespace, and caps length so long labels don't break the zip.
 */
export function safeStem(label: string, fallback: string): string {
  const cleaned = Array.from(label || '')
    .filter((ch) => ch.charCodeAt(0) >= 32) // drop control characters
    .join('')
    .replace(/[\\/:*?"<>|]+/g, '') // filesystem-reserved characters
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80);
  return cleaned || fallback;
}

/** Pull the extension off the stored filename, defaulting to .jpg. */
function extensionOf(filename: string): string {
  const m = /\.([a-z0-9]{2,5})$/i.exec(filename || '');
  return m ? `.${m[1].toLowerCase()}` : '.jpg';
}

/**
 * Build unique, human-readable filenames for a batch.
 * Duplicate labels get -2, -3, … so nothing is silently overwritten in the zip.
 */
export function buildFilenames(photos: DownloadablePhoto[]): string[] {
  const used = new Map<string, number>();
  return photos.map((photo, i) => {
    const stem = safeStem(photo.label, `picture-${i + 1}`);
    const ext = extensionOf(photo.filename);
    const key = `${stem}${ext}`.toLowerCase();
    const seen = used.get(key) ?? 0;
    used.set(key, seen + 1);
    return seen === 0 ? `${stem}${ext}` : `${stem}-${seen + 1}${ext}`;
  });
}

/** Hand a blob to the browser as a download, then release the object URL. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on the next tick — Safari needs the URL alive during the click.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Run `worker` over `items` with a bounded number of in-flight promises. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Download the given photos to the user's device.
 *
 * Resolves with a summary rather than throwing on individual failures — a
 * single unreachable image should not lose the other 19.
 */
export async function downloadPhotos(
  photos: DownloadablePhoto[],
  options: {
    /** Base name for the zip (no extension). Defaults to 'montree-pictures'. */
    zipName?: string;
    onProgress?: (progress: DownloadProgress) => void;
  } = {},
): Promise<DownloadResult> {
  if (!photos.length) return { saved: 0, failed: [], filename: null };

  const { zipName = 'montree-pictures', onProgress } = options;
  const names = buildFilenames(photos);
  const failed: string[] = [];
  let done = 0;

  const fetched = await mapWithConcurrency(photos, FETCH_CONCURRENCY, async (photo, i) => {
    try {
      const res = await fetch(photo.public_url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      return { name: names[i], blob, label: photo.label };
    } catch (err) {
      console.error(`Picture download failed for "${photo.label}":`, err);
      failed.push(photo.label);
      return null;
    } finally {
      done += 1;
      onProgress?.({ done, total: photos.length, phase: 'fetching' });
    }
  });

  const ok = fetched.filter((f): f is { name: string; blob: Blob; label: string } => f !== null);
  if (ok.length === 0) return { saved: 0, failed, filename: null };

  // Single image → save it as-is, no archive.
  if (ok.length === 1) {
    triggerDownload(ok[0].blob, ok[0].name);
    return { saved: 1, failed, filename: ok[0].name };
  }

  onProgress?.({ done: photos.length, total: photos.length, phase: 'zipping' });

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  ok.forEach(({ name, blob }) => zip.file(name, blob));

  const archive = await zip.generateAsync({
    type: 'blob',
    // Photos are already compressed — STORE keeps zipping fast for big batches.
    compression: 'STORE',
  });

  const filename = `${safeStem(zipName, 'montree-pictures')}-${ok.length}.zip`;
  triggerDownload(archive, filename);
  return { saved: ok.length, failed, filename };
}
