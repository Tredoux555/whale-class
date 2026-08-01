#!/usr/bin/env node
/**
 * scripts/curriculum/publish-storybooks.mjs — uploads the 27 Dark Phonics
 * Story Book PDFs + their recap-page cover images to the public
 * `dark-phonics` bucket as
 *   books/<slug>.pdf
 *   books/covers/<slug>.png
 * so public/dark-phonics-storybooks.html can link them via the media proxy:
 *   https://montree.xyz/api/montree/media/proxy/books/<slug>.pdf?bucket=dark-phonics
 *   https://montree.xyz/api/montree/media/proxy/books/covers/<slug>.png?bucket=dark-phonics
 *
 * Source PDF:   ~/Desktop/English Curriculum 2026/Dark Phonics/Story Books/<slug>/book.pdf
 * Source cover: phonics-images/dark-phonics-books/<slug>/<recap-key>.png
 *   (recap key read from the manifest per book — books 14 + 24 use p4-recap,
 *   the rest use p5-recap; never hardcode this, always read the manifest.)
 * Manifest: scripts/curriculum/dark-phonics-storybooks/manifest.json
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Idempotent (upsert). Verifies each upload with a download afterwards.
 *
 * Usage: node scripts/curriculum/publish-storybooks.mjs [--dry-run] [--verify-only]
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..', '..');
const DRY = process.argv.includes('--dry-run');
const VERIFY_ONLY = process.argv.includes('--verify-only');

// env from .env.local
const env = {};
for (const line of fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing Supabase env in .env.local'); process.exit(1); }
const supabase = createClient(URL, KEY);

const manifest = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'dark-phonics-storybooks', 'manifest.json'), 'utf8'));
const PDF_ROOT = path.join(os.homedir(), 'Desktop', 'English Curriculum 2026', 'Dark Phonics', 'Story Books');
const ART_ROOT = path.join(REPO, 'phonics-images', 'dark-phonics-books');

function recapKey(book) {
  const p = book.pages.find((pg) => pg.key.includes('recap'));
  if (!p) throw new Error(`No recap page for ${book.slug}`);
  return p.key;
}

if (VERIFY_ONLY) {
  let pdfCount = 0, coverCount = 0;
  const { data: pdfList, error: pdfErr } = await supabase.storage.from('dark-phonics').list('books', { limit: 200 });
  if (pdfErr) { console.error('list books/ failed:', pdfErr.message); process.exit(1); }
  pdfCount = (pdfList || []).filter((f) => f.name.endsWith('.pdf')).length;
  const { data: coverList, error: coverErr } = await supabase.storage.from('dark-phonics').list('books/covers', { limit: 200 });
  if (coverErr) { console.error('list books/covers/ failed:', coverErr.message); process.exit(1); }
  coverCount = (coverList || []).filter((f) => f.name.endsWith('.png')).length;
  console.log(`books/: ${pdfCount} PDFs, books/covers/: ${coverCount} PNGs (expect 27 + 27)`);
  process.exit(pdfCount === 27 && coverCount === 27 ? 0 : 1);
}

let ok = 0, fail = 0;
for (const b of manifest.books) {
  const slug = b.slug;

  // --- PDF ---
  const pdfSrc = path.join(PDF_ROOT, slug, 'book.pdf');
  if (!fs.existsSync(pdfSrc) || fs.statSync(pdfSrc).size < 20000) {
    console.error(`FAIL [${slug}] missing/too-small PDF ${pdfSrc}`); fail++;
  } else {
    const pdfDest = `books/${slug}.pdf`;
    if (DRY) {
      console.log(`DRY  [${slug}] would upload ${pdfDest}`);
    } else {
      const buf = fs.readFileSync(pdfSrc);
      const { error } = await supabase.storage.from('dark-phonics')
        .upload(pdfDest, buf, { contentType: 'application/pdf', upsert: true });
      if (error) {
        console.error(`FAIL [${slug}] PDF upload: ${error.message}`); fail++;
      } else {
        const { data, error: dlErr } = await supabase.storage.from('dark-phonics').download(pdfDest);
        if (dlErr || !data || data.size !== buf.length) {
          console.error(`FAIL [${slug}] PDF verify: ${dlErr?.message || `size ${data?.size} != ${buf.length}`}`); fail++;
        } else {
          console.log(`OK   [${slug}] PDF ${(buf.length / 1024 | 0)} KB -> dark-phonics/${pdfDest}`);
          ok++;
        }
      }
    }
  }

  // --- Cover (recap page image) ---
  let rk;
  try { rk = recapKey(b); } catch (e) { console.error(`FAIL [${slug}] ${e.message}`); fail++; continue; }
  const coverSrc = path.join(ART_ROOT, slug, `${rk}.png`);
  if (!fs.existsSync(coverSrc) || fs.statSync(coverSrc).size < 5000) {
    console.error(`FAIL [${slug}] missing/too-small cover ${coverSrc}`); fail++; continue;
  }
  const coverDest = `books/covers/${slug}.png`;
  if (DRY) {
    console.log(`DRY  [${slug}] would upload ${coverDest}`);
    continue;
  }
  const cbuf = fs.readFileSync(coverSrc);
  const { error: cErr } = await supabase.storage.from('dark-phonics')
    .upload(coverDest, cbuf, { contentType: 'image/png', upsert: true });
  if (cErr) { console.error(`FAIL [${slug}] cover upload: ${cErr.message}`); fail++; continue; }
  const { data: cData, error: cDlErr } = await supabase.storage.from('dark-phonics').download(coverDest);
  if (cDlErr || !cData || cData.size !== cbuf.length) {
    console.error(`FAIL [${slug}] cover verify: ${cDlErr?.message || `size ${cData?.size} != ${cbuf.length}`}`); fail++; continue;
  }
  console.log(`OK   [${slug}] cover ${(cbuf.length / 1024 | 0)} KB -> dark-phonics/${coverDest}`);
  ok++;
}
console.log(`----\nDone: ${ok} uploaded, ${fail} failed.`);
process.exit(fail ? 1 : 0);
