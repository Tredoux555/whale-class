// lib/story/coach/documents.ts
//
// The Coach's DOCUMENT STORE — a durable, taggable place to save and read back
// design artifacts (design docs, briefs, specs, exports) across sessions. See
// migration 274 for the schema + why it's its own store.
//
// Space-scoped (every read/write filters by the caller's space → per-account
// isolation). Content is PLAINTEXT by design (design artifacts, queried by
// title/tags, mirrored to plaintext .md on disk). Mirrors the type/error posture
// of build-state.ts: writes fail loudly (returned), reads degrade quietly ([]),
// nothing here throws to the caller.
//
// On save we ALSO write a local .md "desktop double" to <root>/coach-docs — but
// only in local dev. The deployed coach runs on Railway and cannot write to the
// user's Mac, so the mirror is a local-run convenience; the DB row is the source
// of truth and always saves regardless.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

export interface DocumentInput {
  title: string;
  content: string;
  doc_type?: string;
  tags?: string[];
}

export interface SavedDocument {
  id: string;
  title: string;
  doc_type: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  content: string;
}

export interface DocWriteResult {
  ok: boolean;
  id?: string;
  mirrored?: string; // local .md path when the desktop double was written
  error?: string;
}

// Bounds — generous (documents, not memories) but capped so a runaway model
// can't write an unbounded row.
const MAX_TITLE = 200;
const MAX_CONTENT = 400_000; // ~100k tokens; the coach route caps context again
const MAX_DOC_TYPE = 40;
const MAX_TAGS = 30;
const MAX_TAG_LEN = 60;

function clampStr(s: unknown, n: number): string {
  return (typeof s === 'string' ? s : '').trim().slice(0, n);
}

function normaliseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of raw) {
    const tag = clampStr(t, MAX_TAG_LEN).toLowerCase();
    if (tag && !seen.has(tag)) { seen.add(tag); out.push(tag); }
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/** Filesystem-safe slug of a title: lowercase, alnum + hyphens, capped. */
export function slugify(title: string): string {
  // NFKD splits accented letters into base + combining mark; the [^a-z0-9]
  // filter below then drops the combining marks (and every other non-alnum),
  // so "café brief" → "cafe-brief". No separate diacritic-strip needed.
  const s = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || 'untitled';
}

/** Mirror filename: [doc_type]-[slug]-[YYYY-MM-DD].md */
export function mirrorFilename(docType: string | null, title: string): string {
  const type = slugify(docType || 'doc');
  const date = new Date().toISOString().slice(0, 10);
  return `${type}-${slugify(title)}-${date}.md`;
}

// Build the markdown the desktop double holds — front-matter-ish header + body.
function renderMarkdown(doc: { title: string; doc_type: string | null; tags: string[]; content: string }): string {
  const meta = [
    `# ${doc.title}`,
    '',
    `- **Type:** ${doc.doc_type || '—'}`,
    `- **Tags:** ${doc.tags.length ? doc.tags.join(', ') : '—'}`,
    `- **Saved:** ${new Date().toISOString()}`,
    '',
    '---',
    '',
  ].join('\n');
  return meta + doc.content + '\n';
}

// Best-effort local .md mirror. Local dev only — the Railway server can't reach
// the Mac, so writing there is pointless + clutters the ephemeral container.
// Never throws: a mirror failure must never fail the DB save.
async function writeLocalMirror(
  filename: string,
  markdown: string,
): Promise<string | undefined> {
  if (process.env.NODE_ENV === 'production') return undefined; // deployed → no Mac to write to
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const dir = path.join(process.cwd(), 'coach-docs');
    await fs.mkdir(dir, { recursive: true });
    const full = path.join(dir, filename);
    await fs.writeFile(full, markdown, 'utf-8');
    return full;
  } catch {
    return undefined; // read-only FS / permission / anything — silently skip
  }
}

/**
 * Save a document for a space. Always inserts a new row (documents accumulate;
 * we don't supersede — a brief and its v2 are both worth keeping). Writes the
 * local .md desktop double in dev. Returns the new id (+ mirror path if written).
 */
export async function saveDocument(
  supabase: SupabaseClient,
  space: string,
  input: DocumentInput,
): Promise<DocWriteResult> {
  const title = clampStr(input.title, MAX_TITLE);
  const content = clampStr(input.content, MAX_CONTENT);
  const doc_type = input.doc_type ? clampStr(input.doc_type, MAX_DOC_TYPE) : null;
  const tags = normaliseTags(input.tags);

  if (!title) return { ok: false, error: 'title is required' };
  if (!content) return { ok: false, error: 'content is required' };

  const { data, error } = await supabase
    .from('story_coach_documents')
    .insert({ space, title, content, doc_type, tags })
    .select('id')
    .single();
  if (error || !data) {
    console.warn('[coach/documents] insert error:', error?.message);
    return { ok: false, error: error?.message || 'insert failed' };
  }

  const mirrored = await writeLocalMirror(
    mirrorFilename(doc_type, title),
    renderMarkdown({ title, doc_type, tags, content }),
  );

  return { ok: true, id: data.id as string, mirrored };
}

export interface ReadDocumentsOpts {
  /** Free-text matched against the title (case-insensitive substring). */
  query?: string;
  /** Tags — a document matches if it carries ANY of these (overlap). */
  tags?: string[];
  /** Max rows (default 10, max 25). */
  limit?: number;
  /** Include full content (default true). Set false for a lightweight list. */
  withContent?: boolean;
}

/**
 * Read documents for a space, newest-first, optionally filtered by title query
 * and/or tag overlap. Returns [] on any error (never throws).
 */
export async function readDocuments(
  supabase: SupabaseClient,
  space: string,
  opts: ReadDocumentsOpts = {},
): Promise<SavedDocument[]> {
  const limit = Math.min(Math.max(1, opts.limit || 10), 25);
  const cols = opts.withContent === false
    ? 'id, title, doc_type, tags, created_at, updated_at'
    : 'id, title, doc_type, tags, created_at, updated_at, content';

  let q = supabase
    .from('story_coach_documents')
    .select(cols)
    .eq('space', space)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Tag overlap filter (PostgREST array `overlaps`).
  const tags = normaliseTags(opts.tags);
  if (tags.length) q = q.overlaps('tags', tags);

  // Title substring — escape PostgREST ILIKE metachars (%, _, \) and wrap in %.
  const query = clampStr(opts.query, MAX_TITLE);
  if (query) {
    const safe = query.replace(/[%_\\]/g, '\\$&');
    q = q.ilike('title', `%${safe}%`);
  }

  const { data, error } = await q;
  if (error || !data) {
    if (error) console.warn('[coach/documents] read error:', error.message);
    return [];
  }
  return (data as unknown as SavedDocument[]).map((r) => ({
    id: r.id,
    title: r.title,
    doc_type: r.doc_type ?? null,
    tags: r.tags || [],
    created_at: r.created_at,
    updated_at: r.updated_at,
    content: opts.withContent === false ? '' : (r.content || ''),
  }));
}
