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
 * On top of that, an explicit SKIP set below excludes the 78 filenames listed
 * in "Claude outputs/ART-TODO.md" as still-missing / known-wrong art (repo
 * root, as delivered 2026-09-06) - re-run this script once that art exists;
 * it will pick them up automatically (nothing else has to change).
 *
 * Style: NOT encoded in the label - tags only (CLAUDE.md rule).
 *
 * Run (on the Mac, from the repo root):
 *   node --env-file=.env.local scripts/curriculum/upload-circle-time-art.mjs --dry-run
 *   node --env-file=.env.local scripts/curriculum/upload-circle-time-art.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';

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

// ---- 78 known-wrong / still-missing filenames, per Claude outputs/ART-TODO.md ----
// (do not upload these even if a file happens to exist on disk at that path -
//  it is either absent or wrong; re-run this script after real art lands)
const SKIP = new Set([
  'ct-week16-card-can-dress.jpg','ct-week16-card-mittens.jpg','ct-week16-card-scarf.jpg',
  'ct-week16-card-snow-boots.jpg','ct-week16-card-winter-coat.jpg','ct-week16-card-winter-control.jpg',
  'ct-week16-card-woolly-hat.jpg',
  'ct-week17-card-can-blow.jpg','ct-week17-card-can-look.jpg','ct-week17-card-can-open.jpg',
  'ct-week17-card-can-splash.jpg','ct-week17-card-puddle.jpg','ct-week17-card-raindrop.jpg',
  'ct-week17-card-rainy-day-sign.jpg','ct-week17-card-rainy.jpg','ct-week17-card-sandals.jpg',
  'ct-week17-card-snowy.jpg','ct-week17-card-sunny-day-sign.jpg','ct-week17-card-weather-control.jpg',
  'ct-week17-card-windy.jpg','ct-week17-poster-snowy.jpg',
  'ct-week18-card-bicycle.jpg','ct-week18-card-birds-nest.jpg','ct-week18-card-can-knock.jpg',
  'ct-week18-card-can-walk.jpg','ct-week18-card-courtyard-house.jpg','ct-week18-card-old-beijing.jpg',
  'ct-week18-card-rickshaw.jpg',
  'ct-week19-card-can-count.jpg','ct-week19-card-can-share.jpg','ct-week19-card-china-control.jpg',
  'ct-week19-card-silk-ribbon.jpg','ct-week19-sign-we-use-it.jpg',
  'ct-week20-card-can-bow.jpg','ct-week20-card-can-dance.jpg','ct-week20-card-can-fold.jpg',
  'ct-week20-card-can-give.jpg','ct-week20-card-can-hang.jpg','ct-week20-card-chinese-knot.jpg',
  'ct-week20-card-couplets.jpg','ct-week20-card-eat-it.jpg','ct-week20-card-paper-cutting.jpg',
  'ct-week20-card-red-lantern.jpg','ct-week20-card-sweets.jpg','ct-week20-card-tangerine.jpg',
  'ct-week3-card-can-guess.jpg','ct-week3-card-can-hear.jpg','ct-week3-card-can-smell.jpg',
  'ct-week3-card-can-taste.jpg','ct-week3-card-cork.jpg','ct-week3-card-leaf.jpg',
  'ct-week3-card-marble.jpg','ct-week3-card-mouth.jpg','ct-week3-card-senses-control.jpg',
  'ct-week4-card-can-breathe.jpg','ct-week4-card-kite.jpg','ct-week4-card-lantern.jpg',
  'ct-week4-card-owl.jpg','ct-week4-poster-calm.jpg',
  'ct-week5-card-can-blow.jpg','ct-week5-card-can-fan.jpg','ct-week5-card-can-jump.jpg',
  'ct-week5-card-can-rake.jpg','ct-week5-card-can-rub.jpg','ct-week5-card-can-sort.jpg',
  'ct-week5-card-can-spin.jpg','ct-week5-card-can-wave.jpg','ct-week5-card-red-berry.jpg',
  'ct-week5-card-sunflower.jpg','ct-week5-card-yellow-hat.jpg',
  'ct-week6-card-coat.jpg',
  'ct-week7-card-biscuit.jpg','ct-week7-card-can-crunch.jpg','ct-week7-card-can-drink.jpg',
  'ct-week7-card-can-eat.jpg','ct-week7-card-can-peel.jpg','ct-week7-card-ice-cream.jpg',
  'ct-week7-card-sweet.jpg',
]);

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
  if (DRY_RUN) console.log('DRY RUN - no uploads, no DB writes.\n');

  const themes = loadWeekThemes();

  const weekDirs = fs.readdirSync(WEEKS_DIR)
    .filter(d => /^week\d+$/.test(d) && fs.statSync(path.join(WEEKS_DIR, d)).isDirectory())
    .map(d => Number(d.replace('week', '')))
    .sort((a, b) => a - b);

  console.log(`Week folders found: ${weekDirs.join(', ')}\n`);

  // Build the full upload plan: per week, filter to files referenced by that
  // week's HTML page, minus the explicit SKIP set.
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
    let weekPlanned = 0, weekSkippedUnref = 0, weekSkippedList = 0, weekBadName = 0;

    for (const filename of files) {
      if (SKIP.has(filename)) { weekSkippedList++; continue; }
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

      plan.push({ n, filename, srcPath: path.join(dir, filename), storagePath, label, tags, category });
      weekPlanned++;
    }
    perWeekCounts[n] = { planned: weekPlanned, skippedList: weekSkippedList, skippedUnref: weekSkippedUnref, badName: weekBadName, total: files.length };
  }

  console.log('--- Per-week plan ---');
  let totalPlanned = 0, totalSkippedList = 0, totalSkippedUnref = 0, totalFiles = 0;
  for (const n of weekDirs) {
    const c = perWeekCounts[n];
    if (!c) continue;
    console.log(`  week${n}: total=${c.total} planned=${c.planned} skip(ART-TODO)=${c.skippedList} skip(unreferenced)=${c.skippedUnref} badName=${c.badName}`);
    totalPlanned += c.planned; totalSkippedList += c.skippedList; totalSkippedUnref += c.skippedUnref; totalFiles += c.total;
  }
  console.log(`\nTOTALS: files=${totalFiles} planned=${totalPlanned} skipped(ART-TODO)=${totalSkippedList} skipped(unreferenced)=${totalSkippedUnref}`);

  if (DRY_RUN) {
    console.log('\n--- Sample planned rows (first 15) ---');
    for (const it of plan.slice(0, 15)) {
      console.log(`  ${it.filename}  ->  ${it.storagePath}`);
      console.log(`      label="${it.label}"  category=${it.category}`);
      console.log(`      tags=${JSON.stringify(it.tags)}`);
    }
    console.log('\nDRY RUN - stopping before any DB/storage access.');
    return;
  }

  // Idempotency: which storage_paths already exist in the bank?
  const existing = new Set();
  {
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from('montree_photo_bank')
        .select('storage_path').range(from, from + PAGE - 1);
      if (error) { console.error('DB read failed:', error.message); process.exit(1); }
      if (!data || data.length === 0) break;
      for (const r of data) existing.add(r.storage_path);
      if (data.length < PAGE) break;
    }
  }
  console.log(`\nBank already holds ${existing.size} storage_paths.`);

  const toUpload = plan.filter(p => !existing.has(p.storagePath));
  const alreadyInBank = plan.length - toUpload.length;
  console.log(`Skipping ${alreadyInBank} already in bank; uploading ${toUpload.length}...\n`);

  let uploaded = 0, failed = 0;
  const failures = [];
  let cursor = 0;

  async function worker() {
    while (cursor < toUpload.length) {
      const it = toUpload[cursor++];
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
      } catch (e) {
        failed++;
        failures.push({ file: it.filename, error: e.message || String(e) });
        console.error(`  ✗ ${it.filename}: ${e.message || e}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('\n=== DONE ===');
  console.log(`Uploaded:          ${uploaded}`);
  console.log(`Already in bank:   ${alreadyInBank}`);
  console.log(`Failed:            ${failed}`);
  console.log(`Planned total:     ${plan.length}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  ${f.file}: ${f.error}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
