#!/usr/bin/env node
/**
 * Ingest the circle-time Midjourney art (public/circle-time-images/weekN/) into
 * the LIVE picture bank.
 *
 * Source : public/circle-time-images/week<N>/ct-week<N>-*.jpg  for every week
 *          folder present (site weeks 1-24, 30-34 as of this writing).
 * Storage: photo-bank/circle-time/week<N>/<filename>  (upsert, idempotent)
 * DB row : label/tags/category derived from the filename + the week's theme
 *          (public/circle-time-weeks.js manifest, `short` field).
 *
 * Only files actually <img>-referenced by that week's public/circle-time-week<N>.html
 * are uploaded (computed by grepping the HTML, not hardcoded) - this drops the
 * unreferenced ct-week<N>-card-<x>.jpg leftovers that no page points at.
 * ct-week<N>-sign-*.jpg ARE referenced and so ARE uploaded.
 *
 * There is no hardcoded "known-missing" list any more - a referenced file that
 * does not exist on disk is simply not in the plan (fs.readdirSync only sees
 * what's really there). Once real art lands for a slot, the next run picks it
 * up as a normal new upload automatically.
 *
 * Replaced art: montree_photo_bank has no content-hash or JSON metadata column
 * (checked migrations/140_photo_bank.sql + a live row - see HANDOFF notes), so
 * "has this file changed since it was ingested" is approximated by comparing
 * the local file's mtime against the bank row's `updated_at`. Pass --refresh
 * to act on that: any referenced file already in the bank whose local mtime
 * is newer than its row's updated_at (or whose byte size differs) is
 * re-uploaded to the SAME storage path (upsert) and its row's metadata +
 * updated_at are refreshed. Without --refresh, files already in the bank are
 * left untouched (original idempotent behaviour).
 *
 * Style: NOT encoded in the label - tags only (CLAUDE.md rule).
 *
 * Run (on the Mac, from the repo root):
 *   node --env-file=.env.local scripts/curriculum/upload-circle-time-art.mjs --dry-run
 *   node --env-file=.env.local scripts/curriculum/upload-circle-time-art.mjs --dry-run --refresh
 *   node --env-file=.env.local scripts/curriculum/upload-circle-time-art.mjs
 *   node --env-file=.env.local scripts/curriculum/upload-circle-time-art.mjs --refresh
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const REFRESH = process.argv.includes('--refresh') || process.env.REFRESH === '1';

const BUCKET = 'photo-bank';
const STORAGE_PREFIX = 'circle-time';
const CONCURRENCY = 4;
const MAX_RETRIES = 2; // 1 retry after the first attempt

const WEEKS_DIR = path.join(process.cwd(), 'public', 'circle-time-images');
const MANIFEST_PATH = path.join(process.cwd(), 'public', 'circle-time-weeks.js');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- category auto-detect (mirrors scripts/upload-to-photo-bank.mjs) ----
const CATEGORY_KEYWORDS = {
  animals: ['cat','dog','bird','fish','elephant','lion','bear','horse','cow','pig','duck','chicken','frog','snake','turtle','rabbit','sheep','goat','monkey','tiger','giraffe','zebra','penguin','whale','dolphin','bee','butterfly','ant','spider','snail','cheetah','hippo','rhino','crocodile','parrot','owl'],
  food: ['apple','banana','orange','grape','strawberry','watermelon','cake','bread','milk','water','juice','rice','noodle','pizza','egg','cheese','meat','vegetable','fruit','carrot','tomato','potato','corn','pear','peach','mango','cherry','lemon','cookie','candy','ice cream','soup'],
  objects: ['ball','book','pen','pencil','table','chair','door','window','clock','phone','computer','bag','shoe','hat','cup','plate','spoon','fork','key','box','bottle','lamp','mirror','brush','comb','scissors','umbrella','bell','flag','bed','pillow','blanket','towel'],
  body: ['hand','foot','head','eye','ear','nose','mouth','arm','leg','finger','toe','hair','face','teeth','tongue','shoulder','knee','elbow','neck','back'],
  nature: ['tree','flower','sun','moon','star','cloud','rain','snow','mountain','river','ocean','beach','forest','garden','grass','leaf','rock','sand','sky','wind','rainbow'],
  places: ['house','school','park','store','hospital','library','church','farm','zoo','airport','beach','city','village','kitchen','bedroom','bathroom','classroom','playground','garden','office','beijing','shanghai'],
  actions: ['run','walk','jump','swim','eat','drink','sleep','read','write','draw','sing','dance','play','cook','clean','wash','sit','stand','open','close','push','pull','throw','catch','climb','fly'],
  colors: ['red','blue','green','yellow','orange','purple','pink','black','white','brown','gray','gold','silver'],
  clothing: ['shirt','pants','dress','skirt','jacket','coat','hat','shoes','socks','gloves','scarf','boots','uniform','sweater','shorts'],
  transport: ['car','bus','train','airplane','boat','bicycle','motorcycle','truck','taxi','helicopter','rocket','submarine'],
};

function autoCategory(labelLower) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (labelLower.includes(keyword)) return category;
    }
  }
  return 'general';
}

// ---- week manifest: n -> theme short name ----
function loadWeekThemes() {
  const src = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const themes = {};
  const re = /\{\s*n:\s*(\d+)\s*,\s*short:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) themes[Number(m[1])] = m[2];
  return themes;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// stem = filename with the `ct-week<N>-` prefix and `.jpg` suffix stripped
function parseStem(stem) {
  const m = stem.match(/^(card|poster|sign|badge)-(.+)$/);
  if (!m) return null;
  return { kind: m[1], rest: m[2] };
}

function deriveLabel(kind, rest, theme) {
  const words = rest.replace(/-/g, ' ');
  switch (kind) {
    case 'card':
      return words;
    case 'poster':
      if (rest === 'theme') return `${theme} theme poster`;
      if (rest === 'sentence-frames') return `${theme} sentence frames`;
      if (rest === 'chorus') return `${theme} song chorus`;
      return `${words} (poster)`;
    case 'sign':
      return `${capitalize(words)} sign`;
    case 'badge':
      return `${words} badge`;
    default:
      return words;
  }
}

function buildTags(weekNum, kind, label, theme) {
  const tags = new Set(['picture-bank', 'circle-time', `circle-time-week-${weekNum}`, kind]);
  for (const w of label.toLowerCase().replace(/[()]/g, '').split(/\s+/).filter(Boolean)) tags.add(w);
  if (theme) tags.add(theme.toLowerCase());
  return [...tags];
}

async function withRetry(fn) {
  let lastErr;
  for (let a = 0; a <= MAX_RETRIES; a++) {
    try { return await fn(); }
    catch (e) { lastErr = e; if (a < MAX_RETRIES) await new Promise(r => setTimeout(r, 400 * (a + 1))); }
  }
  throw lastErr;
}

async function main() {
  console.log('=== Circle-time art -> photo-bank ===');
  if (DRY_RUN) console.log('DRY RUN - no uploads, no DB writes.');
  if (REFRESH) console.log('REFRESH mode - re-upload files whose local copy changed since ingest.');
  console.log('');

  const themes = loadWeekThemes();

  const weekDirs = fs.readdirSync(WEEKS_DIR)
    .filter(d => /^week\d+$/.test(d) && fs.statSync(path.join(WEEKS_DIR, d)).isDirectory())
    .map(d => Number(d.replace('week', '')))
    .sort((a, b) => a - b);

  console.log(`Week folders found: ${weekDirs.join(', ')}\n`);

  // Build the full upload plan: per week, filter to files referenced by that
  // week's HTML page. A referenced file that doesn't exist on disk simply
  // never appears here (readdirSync only lists what's really there).
  const plan = [];
  const perWeekCounts = {};
  for (const n of weekDirs) {
    const dir = path.join(WEEKS_DIR, `week${n}`);
    const htmlPath = path.join(process.cwd(), 'public', `circle-time-week${n}.html`);
    if (!fs.existsSync(htmlPath)) {
      console.log(`  ! week${n}: no public/circle-time-week${n}.html found - skipping whole week`);
      continue;
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    const theme = themes[n];
    if (!theme) console.log(`  ! week${n}: no theme found in circle-time-weeks.js manifest`);

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg'));
    let weekPlanned = 0, weekSkippedUnref = 0, weekBadName = 0;

    for (const filename of files) {
      if (!html.includes(filename)) { weekSkippedUnref++; continue; }

      const stemMatch = filename.match(new RegExp(`^ct-week${n}-(.+)\\.jpg$`));
      if (!stemMatch) { weekBadName++; continue; }
      const parsed = parseStem(stemMatch[1]);
      if (!parsed) { weekBadName++; continue; }

      const { kind, rest } = parsed;
      const label = deriveLabel(kind, rest, theme || `week ${n}`);
      const tags = buildTags(n, kind, label, theme);
      const category = autoCategory(label.toLowerCase());
      const storagePath = `${STORAGE_PREFIX}/week${n}/${filename}`;
      const srcPath = path.join(dir, filename);
      const mtimeMs = fs.statSync(srcPath).mtimeMs;

      plan.push({ n, filename, srcPath, storagePath, label, tags, category, mtimeMs });
      weekPlanned++;
    }
    perWeekCounts[n] = { planned: weekPlanned, skippedUnref: weekSkippedUnref, badName: weekBadName, total: files.length };
  }

  console.log('--- Per-week plan ---');
  let totalPlanned = 0, totalSkippedUnref = 0, totalFiles = 0;
  for (const n of weekDirs) {
    const c = perWeekCounts[n];
    if (!c) continue;
    console.log(`  week${n}: total=${c.total} planned=${c.planned} skip(unreferenced)=${c.skippedUnref} badName=${c.badName}`);
    totalPlanned += c.planned; totalSkippedUnref += c.skippedUnref; totalFiles += c.total;
  }
  console.log(`\nTOTALS: files=${totalFiles} planned=${totalPlanned} skipped(unreferenced)=${totalSkippedUnref}`);

  // Idempotency / refresh lookup: which storage_paths already exist, and when
  // were they last touched + how big were they?
  const existing = new Map(); // storage_path -> { updated_at, file_size }
  {
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from('montree_photo_bank')
        .select('storage_path, updated_at, file_size').range(from, from + PAGE - 1);
      if (error) { console.error('DB read failed:', error.message); process.exit(1); }
      if (!data || data.length === 0) break;
      for (const r of data) existing.set(r.storage_path, { updated_at: r.updated_at, file_size: r.file_size });
      if (data.length < PAGE) break;
    }
  }
  console.log(`\nBank already holds ${existing.size} storage_paths.`);

  const toUpload = [];   // brand new rows
  const toRefresh = [];  // existing row, local file looks newer/different
  let unchanged = 0;

  for (const it of plan) {
    const row = existing.get(it.storagePath);
    if (!row) { toUpload.push(it); continue; }
    if (!REFRESH) { unchanged++; continue; }
    const rowUpdatedMs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    const sizeKnown = typeof row.file_size === 'number';
    let localSize = null;
    try { localSize = fs.statSync(it.srcPath).size; } catch { /* ignore */ }
    const sizeDiffers = sizeKnown && localSize != null && localSize !== row.file_size;
    const isNewer = it.mtimeMs > rowUpdatedMs + 1000; // 1s slack
    if (isNewer || sizeDiffers) toRefresh.push({ ...it, _reason: sizeDiffers ? 'size differs' : 'mtime newer' });
    else unchanged++;
  }

  console.log(`New to upload:     ${toUpload.length}`);
  console.log(`Refresh candidates:${REFRESH ? ' ' + toRefresh.length : ' (pass --refresh to check)'}`);
  console.log(`Unchanged in bank: ${unchanged}`);

  if (DRY_RUN) {
    console.log('\n--- Sample new uploads (first 15) ---');
    for (const it of toUpload.slice(0, 15)) {
      console.log(`  ${it.filename}  ->  ${it.storagePath}`);
      console.log(`      label="${it.label}"  category=${it.category}`);
      console.log(`      tags=${JSON.stringify(it.tags)}`);
    }
    if (REFRESH) {
      console.log('\n--- Refresh candidates (all) ---');
      for (const it of toRefresh) {
        console.log(`  ${it.filename}  (${it._reason})  ->  ${it.storagePath}`);
      }
    }
    console.log('\nDRY RUN - stopping before any DB/storage access.');
    return;
  }

  let uploaded = 0, refreshed = 0, failed = 0;
  const failures = [];
  const work = [
    ...toUpload.map(it => ({ ...it, _action: 'insert' })),
    ...toRefresh.map(it => ({ ...it, _action: 'refresh' })),
  ];
  let cursor = 0;

  async function worker() {
    while (cursor < work.length) {
      const it = work[cursor++];
      try {
        const buf = await fsp.readFile(it.srcPath);
        let width = null, height = null;
        try {
          const meta = await sharp(buf).metadata();
          width = meta.width || null;
          height = meta.height || null;
        } catch { /* metadata is best-effort */ }

        await withRetry(async () => {
          const { error } = await sb.storage.from(BUCKET)
            .upload(it.storagePath, buf, { contentType: 'image/jpeg', upsert: true });
          if (error) throw new Error('storage: ' + error.message);
        });

        if (it._action === 'insert') {
          const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(it.storagePath);
          await withRetry(async () => {
            const { error } = await sb.from('montree_photo_bank').insert({
              filename: it.filename,
              label: it.label,
              tags: it.tags,
              category: it.category,
              storage_path: it.storagePath,
              public_url: pub.publicUrl,
              file_size: buf.length,
              width,
              height,
              mime_type: 'image/jpeg',
              uploaded_by: 'system',
            });
            if (error) throw new Error('db: ' + error.message);
          });
          uploaded++;
          if (uploaded % 50 === 0) console.log(`  ...uploaded ${uploaded}/${toUpload.length}`);
        } else {
          await withRetry(async () => {
            const { error } = await sb.from('montree_photo_bank')
              .update({
                label: it.label,
                tags: it.tags,
                category: it.category,
                file_size: buf.length,
                width,
                height,
                updated_at: new Date().toISOString(),
              })
              .eq('storage_path', it.storagePath);
            if (error) throw new Error('db: ' + error.message);
          });
          refreshed++;
          console.log(`  refreshed: ${it.filename} (${it._reason})`);
        }

      } catch (e) {
        failed++;
        failures.push({ file: it.filename, error: e.message || String(e) });
        console.error(`  ✗ ${it.filename}: ${e.message || e}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('\n=== DONE ===');
  console.log(`Uploaded (new):    ${uploaded}`);
  console.log(`Refreshed:         ${refreshed}`);
  console.log(`Unchanged in bank: ${unchanged}`);
  console.log(`Failed:            ${failed}`);
  console.log(`Planned total:     ${plan.length}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  ${f.file}: ${f.error}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
