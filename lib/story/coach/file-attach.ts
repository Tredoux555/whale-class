'use client';

// Shared file/folder ingestion for the Coach composer. Lives here (not inline in
// the two coach pages) because the folder-zip + dropped-tree-walk logic is gnarly
// and the two coach surfaces — app/lyf-coach/(app)/coach + app/story/admin/(personal)/coach
// — must behave identically. Both pages call ingestDocFiles() / filesFromDataTransfer()
// / splitDropped() so there's one source of truth.
//
// Flow: any non-image input (the 📄 button, the 📁 folder button, or a drag-drop)
// becomes ONE extracted document the coach reviews. A single file goes straight to
// /api/story/coach/extract-document; multiple files / a whole folder are zipped
// client-side first (JSZip) and the server unzips + extracts every readable member.
// Loose dropped images still route to the photo (vision) path.

import JSZip from 'jszip';

export interface ExtractedDoc {
  name: string;
  text: string;
  chars: number;
  truncated: boolean;
  fileCount?: number;
}

const ZIP_MIME = 'application/zip';
const FOLDER_ZIP_LIMIT = 25 * 1024 * 1024; // matches the server upload cap
const MAX_MEMBER_BYTES = 8 * 1024 * 1024; // skip huge single files when bundling

// Junk we never bundle from a folder — pure noise, and node_modules/.git would
// blow the file count. Mirrors the server's SKIP_PATH.
const SKIP_PATH = /(^|\/)(node_modules|\.git|\.next|dist|build|out|\.cache|__pycache__|\.venv|venv|\.idea|\.vscode|coverage|\.DS_Store|Thumbs\.db)(\/|$)/i;

// Dropped files don't carry webkitRelativePath, so the tree-walker stamps one here.
type TaggedFile = File & { _relPath?: string };

function relPath(f: File): string {
  return (f as TaggedFile)._relPath || f.webkitRelativePath || f.name;
}

export function isImageFile(f: File): boolean {
  return f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif|bmp|avif)$/i.test(f.name);
}

// ── Drag-and-drop tree walk ───────────────────────────────────────────────
// A dropped folder arrives as DataTransferItem entries; webkitGetAsEntry +
// recursive readEntries flattens it into a File[] with relative paths preserved.

interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (cb: (f: File) => void, err: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (cb: (entries: FsEntry[]) => void, err: (e: unknown) => void) => void };
}

async function readEntry(entry: FsEntry | null, prefix: string, out: TaggedFile[]): Promise<void> {
  if (!entry) return;
  if (entry.isFile && entry.file) {
    try {
      const file = await new Promise<File>((res, rej) => entry.file!(res, rej));
      const tagged = file as TaggedFile;
      tagged._relPath = prefix + entry.name;
      out.push(tagged);
    } catch { /* unreadable entry — skip */ }
    return;
  }
  if (entry.isDirectory && entry.createReader) {
    const dirPath = prefix + entry.name + '/';
    if (SKIP_PATH.test('/' + dirPath)) return;
    const reader = entry.createReader();
    // readEntries returns in batches; pump until it yields an empty batch.
    const children: FsEntry[] = [];
    await new Promise<void>((resolve) => {
      const pump = () => reader.readEntries(
        (batch) => {
          if (!batch.length) { resolve(); return; }
          children.push(...batch);
          pump();
        },
        () => resolve(),
      );
      pump();
    });
    for (const child of children) await readEntry(child, dirPath, out);
  }
}

// Turn a drop into a flat File[]. Recurses folders when the browser supports the
// entry API; otherwise falls back to the plain (flat) file list.
export async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const items = dt.items;
  const canWalk = items && items.length > 0 &&
    typeof (items[0] as DataTransferItem & { webkitGetAsEntry?: unknown }).webkitGetAsEntry === 'function';
  if (!canWalk) return Array.from(dt.files || []);

  const entries: FsEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const e = (items[i] as DataTransferItem & { webkitGetAsEntry?: () => FsEntry | null }).webkitGetAsEntry?.();
    if (e) entries.push(e);
  }
  if (!entries.length) return Array.from(dt.files || []);

  const out: TaggedFile[] = [];
  for (const e of entries) await readEntry(e, '', out);
  return out;
}

// Split a dropped set into vision-images vs everything-else. A loose image (no
// path separator) is a photo to read; an image *inside* a folder stays with the
// docs bundle (the server skips it there — it can't become text).
export function splitDropped(files: File[]): { images: File[]; docs: File[] } {
  const images: File[] = [];
  const docs: File[] = [];
  for (const f of files) {
    if (f.size === 0) continue;
    const inFolder = relPath(f).includes('/');
    if (isImageFile(f) && !inFolder) images.push(f);
    else docs.push(f);
  }
  return { images, docs };
}

// ── Upload ────────────────────────────────────────────────────────────────

async function postToExtract(file: File, token: string): Promise<ExtractedDoc> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/story/coach/extract-document', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    let msg = 'Could not read that.';
    try { msg = ((await res.json()) as { error?: string })?.error || msg; } catch { /* not json */ }
    throw new Error(msg);
  }
  return (await res.json()) as ExtractedDoc;
}

// Zip a folder's files client-side into one File, skipping junk + giant members.
async function zipFiles(files: File[], zipName: string): Promise<File | null> {
  const zip = new JSZip();
  let added = 0;
  for (const f of files) {
    const p = relPath(f);
    if (SKIP_PATH.test('/' + p) || f.size === 0 || f.size > MAX_MEMBER_BYTES) continue;
    zip.file(p, f);
    added++;
  }
  if (!added) return null;
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return new File([blob], zipName, { type: ZIP_MIME });
}

// THE entry point both pages use for any non-image input. Returns one ExtractedDoc.
// Throws Error (with a human message) on failure so the caller shows attachError.
export async function ingestDocFiles(files: File[], token: string): Promise<ExtractedDoc> {
  const real = files.filter((f) => f.size > 0 && !SKIP_PATH.test('/' + relPath(f)));
  if (!real.length) throw new Error('Nothing readable there.');

  // Single loose file → send as-is (server reads pdf/docx/text/code/zip directly).
  if (real.length === 1 && !relPath(real[0]).includes('/')) {
    return postToExtract(real[0], token);
  }

  // A folder / multiple files → bundle into one zip the server unpacks.
  const top = relPath(real[0]).split('/')[0] || 'files';
  const zip = await zipFiles(real, `${top}.zip`);
  if (!zip) throw new Error('Nothing readable in that folder.');
  if (zip.size > FOLDER_ZIP_LIMIT) {
    throw new Error('That folder is too large — keep it under 25MB of text/code.');
  }
  return postToExtract(zip, token);
}
