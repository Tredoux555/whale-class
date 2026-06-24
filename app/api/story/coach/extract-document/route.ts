// app/api/story/coach/extract-document/route.ts
//
// Document → text for the Coach. Story-admin only (owner + public Lyf Coach
// accounts are both story_admin_users, so verifyAdminToken covers both). The
// browser posts an uploaded file (PDF / DOCX / TXT / CSV) here; we extract the
// full plain text server-side and return it. The client then sends that text
// with the next coach message, where the route injects it as document context
// before the user's prompt (see app/api/story/coach/route.ts). Audio's sibling:
// transient, never persisted — same posture as /transcribe.
//
// Extraction is pure-JS, no system binaries (Railway Node buildpack only):
//   PDF  → unpdf  (serverless pdf.js build)
//   DOCX → mammoth (already a dependency)
//   TXT/CSV/text-* → UTF-8 decode (the raw text IS the content)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/story-db';

// A 10MB PDF with heavy text can take a few seconds to parse — give it headroom
// over the 15s default (same reasoning as the Whisper route's bump).
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (spec)
const MIN_FILE_BYTES = 8;
// Cap the injected text so one document can't blow the model context, latency,
// or the single-turn cost model. ~200k chars ≈ ~50k tokens ≈ ~60 pages — plenty
// for an agreement, while bounded. The coach route caps again defensively.
const MAX_DOC_CHARS = 200_000;

type Kind = 'pdf' | 'docx' | 'text' | 'unsupported' | 'legacy_doc';

function classify(name: string, mime: string): Kind {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (
    ext === 'docx' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) return 'docx';
  if (ext === 'doc' || mime === 'application/msword') return 'legacy_doc';
  if (ext === 'txt' || ext === 'csv' || ext === 'md' || ext === 'tsv') return 'text';
  if (mime.startsWith('text/')) return 'text';
  return 'unsupported';
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
    return NextResponse.json({ error: 'No document received.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'That file is too large — the limit is 10MB.' }, { status: 400 });
  }

  const name = (file.name || 'document').slice(0, 200);
  const kind = classify(name, file.type || '');

  if (kind === 'legacy_doc') {
    return NextResponse.json(
      { error: 'Old .doc files aren’t supported — please re-save it as a PDF or .docx and try again.' },
      { status: 415 },
    );
  }
  if (kind === 'unsupported') {
    return NextResponse.json(
      { error: 'I can read PDF, Word (.docx), text, and CSV files. Try one of those.' },
      { status: 415 },
    );
  }

  let text = '';
  try {
    const buf = Buffer.from(await file.arrayBuffer());

    if (kind === 'pdf') {
      // Serverless pdf.js — no native deps. mergePages joins all pages into one string.
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const res = await extractText(pdf, { mergePages: true });
      text = Array.isArray(res.text) ? res.text.join('\n\n') : String(res.text || '');
    } else if (kind === 'docx') {
      const mammoth = (await import('mammoth')).default;
      const res = await mammoth.extractRawText({ buffer: buf });
      text = res.value || '';
    } else {
      // text/csv/txt/md/tsv — the bytes already ARE the content.
      text = buf.toString('utf-8');
    }
  } catch (e) {
    console.error('[coach/extract-document] parse error:', e instanceof Error ? e.message : 'unknown', '·', name);
    return NextResponse.json(
      { error: 'I couldn’t read that document — it may be scanned, encrypted, or damaged.' },
      { status: 422 },
    );
  }

  // Normalize lightly so the model sees clean text: strip NUL + BOM, normalize
  // CRLF, and collapse runaway blank lines.
  text = text
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  if (!text) {
    return NextResponse.json(
      { error: 'That document has no readable text — if it’s a scan, it would need OCR first.' },
      { status: 422 },
    );
  }

  let truncated = false;
  if (text.length > MAX_DOC_CHARS) {
    text = text.slice(0, MAX_DOC_CHARS);
    truncated = true;
  }

  return NextResponse.json({ name, text, chars: text.length, truncated });
}
