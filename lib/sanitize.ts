// lib/sanitize.ts
// Phase 6: HTML sanitization utilities for XSS prevention

/** Escape HTML special characters to prevent XSS in template strings */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Validate that a URL is a safe image source (allowlisted prefixes only) */
export function sanitizeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const ALLOWED_PREFIXES = [
    'https://dmfncjjtsoxrnvcdnvjq.supabase.co/',
    'data:image/png;base64,',   // Canvas exports (toDataURL)
    'data:image/jpeg;base64,',  // JPEG canvas exports / file reader
    '/images/',
    '/audio-new/',
  ];
  if (ALLOWED_PREFIXES.some(prefix => url.startsWith(prefix))) return url;
  return ''; // reject unknown sources
}
