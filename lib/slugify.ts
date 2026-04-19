// lib/slugify.ts
// Shared slugify utility — used by QR generator and whale-class page.
// Session 35 warned that drift between copies silently breaks QR deep-links.

export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
