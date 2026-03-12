// lib/montree/phonics/photo-bank-resolver.ts
// Resolves Photo Bank images for phonics words — shared across all phonics generators
// Fetches all Photo Bank photos, matches by label, returns word→URL map

export interface PhotoBankMatch {
  publicUrl: string;
  label: string;
}

/**
 * Fetch all Photo Bank photos and build a word→URL lookup map.
 * Uses pagination to get all photos. Matches are case-insensitive on label.
 * Returns Map<lowercase_word, publicUrl>
 */
export async function resolvePhotoBankImages(
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(`/api/montree/photo-bank?page=${page}&limit=200`, { signal });
      if (!res.ok) break;

      const data = await res.json();
      const photos: Array<{ label: string; public_url: string }> = data.photos || [];

      for (const photo of photos) {
        const key = photo.label.toLowerCase().trim();
        // First match wins — don't overwrite
        if (!result.has(key)) {
          result.set(key, photo.public_url);
        }
      }

      hasMore = photos.length === 200;
      page++;
    }
  } catch (err) {
    // AbortError is expected on cleanup; swallow it
    if (err instanceof Error && err.name === 'AbortError') return result;
    console.error('Photo Bank resolver error:', err);
  }

  return result;
}

/**
 * Convert a URL to a base64 data URL (for CardGenerator which needs data URLs).
 * Falls back to empty string on error.
 */
export async function urlToDataUrl(url: string, signal?: AbortSignal): Promise<string> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return '';
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

/**
 * React hook helper: resolve Photo Bank images on mount.
 * Returns [photoMap, isLoading].
 * Usage:
 *   const [photoMap, loadingPhotos] = usePhotoBankImages();
 *   const imageUrl = photoMap.get(word.toLowerCase()) || emojiUrl;
 */
export function createPhotoBankHook() {
  // This is a factory — actual hook is in the component
  // because hooks must be called at the top level of a React function component.
  return {
    resolvePhotoBankImages,
    urlToDataUrl,
  };
}
