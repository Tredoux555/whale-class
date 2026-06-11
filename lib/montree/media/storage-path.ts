// lib/montree/media/storage-path.ts
// audit-fix (Jun 2026): resolve a stored media URL back to its Supabase
// storage {bucket, path} so delete endpoints can remove the actual file,
// not just the database row (closes the two long-standing "TODO: clean up
// storage" items — orphaned files were accumulating forever).

export function parseSupabasePublicUrl(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url || typeof url !== 'string') return null;
  // https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>[?v=...]
  // also tolerates /storage/v1/render/image/public/... variants
  const m = url.match(/\/storage\/v1\/(?:object|render\/image)\/public\/([^/]+)\/([^?]+)/);
  if (!m) return null;
  try {
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    return { bucket: m[1], path: m[2] };
  }
}

/**
 * Best-effort storage cleanup: never throws, returns true if a removal was
 * attempted successfully. DB row deletion must already have happened — the
 * file is unreachable either way; this just reclaims space.
 */
export async function tryRemoveStorageObject(
  // minimal structural type to avoid coupling to a specific client import
  supabase: { storage: { from(bucket: string): { remove(paths: string[]): Promise<{ error: { message: string } | null }> } } },
  url: string | null | undefined,
  label: string
): Promise<boolean> {
  const parsed = parseSupabasePublicUrl(url);
  if (!parsed) return false;
  try {
    const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
    if (error) {
      console.warn(`[storage-cleanup] ${label}: could not remove ${parsed.bucket}/${parsed.path}: ${error.message}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[storage-cleanup] ${label}: unexpected error removing ${parsed.bucket}/${parsed.path}:`, e);
    return false;
  }
}
