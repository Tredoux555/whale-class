// app/api/story/coach/extract-document/route.ts
//
// File → text for the Coach. Story-admin only (owner + public Lyf Coach
// accounts are both story_admin_users, so verifyAdminToken covers both). The
// browser posts an uploaded file here; we extract the full plain text
// server-side and return it. The client then sends that text with the next
// coach message, where the route injects it as document context before the
// user's prompt (see app/api/story/coach/route.ts). Audio's sibling: transient,
// never persisted — same posture as /transcribe.
//
// Extraction is pure-JS, no system binaries (Railway Node buildpack only):
//   PDF  → unpdf  (serverless pdf.js build)
//   DOCX → mammoth (already a dependency)
//   text/code/html/json/csv/... → UTF-8 decode (the raw text IS the content)
//   ZIP  → jszip walk; every readable entry is extracted (pdf/docx/text/code)
//          and concatenated under per-file headers, junk + binaries skipped.
// A picked folder is zipped client-side and arrives here as a zip, so "drop a
// whole folder" and "drop a zip" are the same server path.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/story-db';

// A 25MB zip of a project folder, or a heavy PDF, can take several seconds to
// walk + parse — give it headroom over the 15s default (same reasoning as the
// Whisper route's bump).
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB upload cap (zips/folders fit)
const MIN_FILE_BYTES = 8;
// Cap the injected text so one upload can't blow the model context, latency, or
// the single-turn cost model. ~200k chars ≈ ~50k tokens ≈ ~60 pages — plenty
// for an agreement or a small codebase, while bounded. The coach route caps
// again defensively.
const MAX_DOC_CHARS = 200_000;
// A pathological zip could hold thousands of files; bound the walk.
const MAX_ZIP_ENTRIES = 400;
// Skip any single in-zip member bigger than this (avoids one huge file eating
// the whole budget before we've seen the rest of the folder).
const MAX_ZIP_MEMBER_BYTES = 8 * 1024 * 1024;

type Kind = 'pdf' | 'docx' | 'text' | 'zip' | 'unsupported' | 'legacy_doc';

// Extensions we read as plain text (the raw bytes ARE the content). Broad on
// purpose — code, markup, config, data. Anything not here AND not text/* mime
// is treated as binary and skipped (inside zips) or refused (single upload).
const TEXT_EXT = new Set([
  'txt', 'text', 'md', 'markdown', 'rst', 'csv', 'tsv', 'log', 'tex',
  'html', 'htm', 'xml', 'xhtml', 'svg', 'vue', 'svelte', 'astro',
  'json', 'jsonc', 'json5', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'properties',
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts',
  'css', 'scss', 'sass', 'less', 'styl',
  'py', 'pyi', 'rb', 'go', 'rs', 'java', 'kt', 'kts', 'swift', 'm', 'mm',
  'c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hh', 'cs', 'php', 'pl', 'pm',
  'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
  'sql', 'graphql', 'gql', 'prisma', 'proto',
  'r', 'lua', 'dart', 'scala', 'clj', 'cljs', 'ex', 'exs', 'erl', 'elm', 'hs', 'ml', 'fs',
  'gradle', 'dockerfile', 'gitignore', 'editorconfig', 'lock',
]);

// Extensions that are definitely binary — never even try to decode (inside a
// zip these are skipped silently rather than producing garbage).
const BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif', 'bmp', 'ico', 'tif', 'tiff', 'avif',
  'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus',
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv',
  'zip', 'gz', 'tar', 'tgz', 'rar', '7z', 'bz2', 'xz',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'exe', 'dll', 'so', 'dylib', 'bin', 'dmg', 'pkg', 'app', 'class', 'o', 'a', 'wasm',
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'odt', 'ods', 'key', 'numbers', 'pages',
  'sqlite', 'db', 'pyc',
]);

// Folders / files we never bundle from a zip — pure noise for a coach.
const SKIP_PATH = /(^|\/)(node_modules|\.git|\.next|dist|build|out|\.cache|__pycache__|\.venv|venv|\.idea|\.vscode|coverage|\.DS_Store|Thumbs\.db)(\/|$)/i;

function extOf(name: string): string {
  const base = name.split('/').pop() || name;
  if (base.startsWith('.') && !base.slice(1).includes('.')) return base.slice(1).toLowerCase(); // .gitignore
  return (base.split('.').pop() || '').toLowerCase();
}

function classify(name: string, mime: string): Kind {
  const ext = extOf(name);
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (
    ext === 'docx' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) return 'docx';
  if (ext === 'doc' || mime === 'application/msword') return 'legacy_doc';
  if (
    ext === 'zip' ||
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed'
  ) return 'zip';
  if (TEXT_EXT.has(ext)) return 'text';
  if (mime.startsWith('text/')) return 'text';
  return 'unsupported';
}

// A NUL byte in the first chunk is the cheapest reliable "this is binary" tell.
function looksBinary(buf: Buffer): boolean {
  const n = Math.min(buf.length, 4096);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

function normalize(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

// Extract one file's text by kind. Returns '' when there's nothing usable.
async function extractOne(kind: Kind, buf: Buffer): Promise<string> {
  if (kind === 'pdf') {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const res = await extractText(pdf, { mergePages: true });
    return Array.isArray(res.text) ? res.text.join('\n\n') : String(res.text || '');
  }
  if (kind === 'docx') {
    const mammoth = (await import('mammoth')).default;
    const res = await mammoth.extractRawText({ buffer: buf });
    return res.value || '';
  }
  // text/code/html/etc — bytes already are the content.
  return buf.toString('utf-8');
}

// Walk a zip into one combined, headered text blob. Junk + binaries skipped.
async function extractZip(buf: Buffer): Promise<{ text: string; fileCount: number; truncated: boolean }> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buf);

  // Deterministic, readable order.
  const entries = Object.values(zip.files)
    .filter((e) => !e.dir && !SKIP_PATH.test('/' + e.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, MAX_ZIP_ENTRIES);

  const parts: string[] = [];
  let used = 0;
  let fileCount = 0;
  let truncated = false;

  for (const entry of entries) {
    if (used >= MAX_DOC_CHARS) { truncated = true; break; }
    const ext = extOf(entry.name);
    if (BINARY_EXT.has(ext)) continue;

    const memberKind = classify(entry.name, '');
    if (memberKind === 'unsupported' || memberKind === 'zip' || memberKind === 'legacy_doc') continue;

    let memberBuf: Buffer;
    try {
      const u8 = await entry.async('uint8array');
      if (u8.byteLength > MAX_ZIP_MEMBER_BYTES) continue;
      memberBuf = Buffer.from(u8);
    } catch { continue; }

    // Text-kind member that's actually binary (mislabeled ext) → skip the garbage.
    if (memberKind === 'text' && looksBinary(memberBuf)) continue;

    let body = '';
    try {
      body = normalize(await extractOne(memberKind, memberBuf));
    } catch { continue; }
    if (!body) continue;

    const header = `\n\n===== ${entry.name} =====\n\n`;
    const remaining = MAX_DOC_CHARS - used;
    let chunk = header + body;
    if (chunk.length > remaining) {
      chunk = chunk.slice(0, remaining);
      truncated = true;
    }
    parts.push(chunk);
    used += chunk.length;
    fileCount++;
  }

  if (entries.length >= MAX_ZIP_ENTRIES) truncated = true;
  return { text: parts.join('').trim(), fileCount, truncated };
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let file: File | null;
  try {
    const form = await req.formData();
    file = form.get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }
  if (!file || file.size < MIN_FILE_BYTES) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'That’s too large — the limit is 25MB.' }, { status: 400 });
  }

  const name = (file.name || 'document').slice(0, 200);
  const kind = classify(name, file.type || '');

  if (kind === 'legacy_doc') {
    return NextResponse.json(
      { error: 'Old .doc files aren’t supported — please re-save it as a PDF or .docx and try again.' },
      { status: 415 },
    );
  }

  let text = '';
  let fileCount = 1;
  let truncated = false;

  try {
    const buf = Buffer.from(await file.arrayBuffer());

    if (kind === 'zip') {
      const z = await extractZip(buf);
      text = z.text;
      fileCount = z.fileCount;
      truncated = z.truncated;
      if (!fileCount) {
        return NextResponse.json(
          { error: 'I couldn’t find any readable files in that folder — it may be all images or binaries.' },
          { status: 422 },
        );
      }
    } else if (kind === 'unsupported') {
      // Single unknown file: try to read it as text if it isn't binary, else refuse.
      if (BINARY_EXT.has(extOf(name)) || looksBinary(buf)) {
        return NextResponse.json(
          { error: 'I can read PDFs, Word docs, text, code, HTML, and zips/folders — that one looks like a binary file.' },
          { status: 415 },
        );
      }
      text = normalize(buf.toString('utf-8'));
    } else {
      text = normalize(await extractOne(kind, buf));
    }
  } catch (e) {
    console.error('[coach/extract-document] parse error:', e instanceof Error ? e.message : 'unknown', '·', name);
    return NextResponse.json(
      { error: 'I couldn’t read that — it may be encrypted, damaged, or an unsupported format.' },
      { status: 422 },
    );
  }

  if (!text) {
    return NextResponse.json(
      { error: 'That had no readable text — if it’s a scan, it would need OCR first.' },
      { status: 422 },
    );
  }

  if (text.length > MAX_DOC_CHARS) {
    text = text.slice(0, MAX_DOC_CHARS);
    truncated = true;
  }

  return NextResponse.json({ name, text, chars: text.length, truncated, fileCount });
}
