#!/usr/bin/env node
/**
 * Ingest the flattened curriculum image set into the Montree photo bank,
 * CONVERTED to JPEG (quality ~90, transparency flattened to white).
 *
 * Source: ~/Desktop/English Curriculum 2026/_all_images_flat/  (PNGs)
 * Naming: mostly bare `<word>.png`; a handful of collision variants carry a
 *         `-wNN` suffix (e.g. potato-w02.png) pinning them to a specific week.
 *
 * Week/sound linkage is SPEC-GROUNDED: each flat filename is matched against
 * the .png references inside lib/montree/english-curriculum/spec/*.json, and
 * that week's `sound` field is attached as a tag. Nothing is guessed.
 *
 * Source PNGs are NEVER modified. Converted JPEGs are written to a temp dir
 * for traceability and uploaded from an in-memory buffer.
 *
 * Idempotent: skips any source file whose JPEG filename already exists in the
 * bank (so re-runs only add what is missing).
 *
 * Run:
 *   DRY_RUN=1 node --env-file=.env.local scripts/upload-curriculum-images-to-photo-bank.mjs
 *   node --env-file=.env.local scripts/upload-curriculum-images-to-photo-bank.mjs
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';
const BUCKET = 'photo-bank';
const CONCURRENCY = 5;
const MAX_RETRIES = 3;

const SOURCE_DIR = path.join(os.homedir(), 'Desktop', 'English Curriculum 2026', '_all_images_flat');
const SPEC_DIR = path.join(process.cwd(), 'lib', 'montree', 'english-curriculum', 'spec');
const TMP_DIR = path.join(os.tmpdir(), 'montree-curriculum-jpg');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- category auto-detect (mirrors upload-to-photo-bank.mjs) ----
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

// ---- build spec index: png filename -> [{week, sound}] + week -> sound ----
function buildSpecIndex() {
  const files = fs.readdirSync(SPEC_DIR).filter(f => /^(week-\d+|intro-week-[ab])\.json$/.test(f));
  const byFilename = {};   // 'turtle.png' -> [{ week:'02', sound:'t' }]
  const weekToSound = {};  // '02' -> 't'
  for (const f of files) {
    const raw = fs.readFileSync(path.join(SPEC_DIR, f), 'utf8');
    let j;
    try { j = JSON.parse(raw); } catch { continue; }
    const sound = j.sound || j.patternDisplay || null;
    const wk = (f.match(/week-(\d+)/) || [])[1] || f.replace('.json', '');
    weekToSound[wk] = sound;
    const pngs = new Set((raw.match(/"[A-Za-z0-9_-]+\.png"/g) || []).map(s => s.replace(/"/g, '')));
    for (const p of pngs) {
      (byFilename[p] = byFilename[p] || []).push({ week: wk, sound });
    }
  }
  return { byFilename, weekToSound };
}

// strip extension + trailing -wNN collision suffix, dashes->spaces
function cleanLabel(filename) {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/-w\d+$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTags(label, linkages) {
  const tags = new Set(['curriculum']);
  for (const { week, sound } of linkages) {
    if (week) tags.add(`week-${week}`);
    if (sound) tags.add(`sound-${String(sound).toLowerCase()}`);
  }
  for (const w of label.toLowerCase().split(/\s+/).filter(w => w.length > 1)) tags.add(w);
  if (label) tags.add(label.toLowerCase());
  return [...tags];
}

async function convertToJpeg(srcPath) {
  // flatten transparency to white, quality 90; returns { buffer, width, height }
  const img = sharp(srcPath).flatten({ background: '#ffffff' }).jpeg({ quality: 90 });
  const buffer = await img.toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width || null, height: meta.height || null };
}

async function withRetry(fn, label) {
  let lastErr;
  for (let a = 1; a <= MAX_RETRIES; a++) {
    try { return await fn(); }
    catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 400 * a)); }
  }
  throw lastErr;
}

async function main() {
  console.log('=== Curriculum images -> Photo Bank (JPEG) ===');
  console.log(DRY_RUN ? '🟡 DRY RUN — no conversion writes, no uploads, no DB inserts.\n' : '');

  const { byFilename, weekToSound } = buildSpecIndex();
  console.log(`Spec index: ${Object.keys(byFilename).length} distinct png refs across specs.`);

  if (!fs.existsSync(SOURCE_DIR)) { console.error('Source dir not found:', SOURCE_DIR); process.exit(1); }
  const pngs = fs.readdirSync(SOURCE_DIR).filter(f => f.toLowerCase().endsWith('.png')).sort();
  console.log(`Source PNGs: ${pngs.length}\n`);

  // Plan every file: resolve jpeg filename, label, linkages, tags, category.
  const plan = [];
  let unmappedCount = 0;
  for (const png of pngs) {
    const jpegName = png.replace(/\.png$/i, '.jpg');
    const label = cleanLabel(png);
    const suffix = png.match(/-w(\d+)\.png$/i);
    let linkages;
    if (suffix) {
      const wk = suffix[1].padStart(2, '0');
      linkages = [{ week: wk, sound: weekToSound[wk] ?? weekToSound[suffix[1]] ?? null }];
    } else if (byFilename[png]) {
      // dedupe by week
      const seen = new Map();
      for (const l of byFilename[png]) if (!seen.has(l.week)) seen.set(l.week, l);
      linkages = [...seen.values()];
    } else {
      linkages = [];
      unmappedCount++;
    }
    plan.push({
      png, jpegName, label,
      category: autoCategory(label.toLowerCase()),
      tags: buildTags(label, linkages),
      weeks: linkages.map(l => l.week).filter(Boolean),
    });
  }
  console.log(`Planned: ${plan.length}  (unmapped to any week/sound: ${unmappedCount})`);

  // Idempotency: which jpeg filenames already in the bank?
  const existing = new Set();
  {
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from('montree_photo_bank')
        .select('filename').range(from, from + PAGE - 1);
      if (error) { console.error('DB read failed:', error.message); process.exit(1); }
      if (!data || data.length === 0) break;
      for (const r of data) existing.add(r.filename);
      if (data.length < PAGE) break;
    }
  }
  console.log(`Bank already holds ${existing.size} filenames.`);

  // Convert all planned files (needed for sha dedupe + width/height), skipping
  // ones already in the bank. Source PNGs are only READ.
  if (!DRY_RUN) await fsp.mkdir(TMP_DIR, { recursive: true });
  const toProcess = plan.filter(p => !existing.has(p.jpegName));
  const alreadyInBank = plan.length - toProcess.length;
  console.log(`Skipping ${alreadyInBank} already in bank; converting ${toProcess.length}...\n`);

  const bySha = new Map();       // sha256 -> first plan item (kept)
  const collapsed = [];          // { png, dupeOf }
  const converted = [];          // items to actually upload
  let convertFailed = 0;
  let done = 0;
  for (const item of toProcess) {
    try {
      const { buffer, width, height } = await convertToJpeg(path.join(SOURCE_DIR, item.png));
      const sha = crypto.createHash('sha256').update(buffer).digest('hex');
      if (bySha.has(sha)) { collapsed.push({ png: item.png, dupeOf: bySha.get(sha).png }); continue; }
      bySha.set(sha, item);
      item.buffer = buffer; item.width = width; item.height = height; item.size = buffer.length; item.sha = sha;
      if (!DRY_RUN) await fsp.writeFile(path.join(TMP_DIR, item.jpegName), buffer);
      converted.push(item);
    } catch (e) {
      convertFailed++;
      console.error(`  ✗ convert ${item.png}: ${e.message}`);
    }
    if (++done % 200 === 0) console.log(`  ...converted ${done}/${toProcess.length}`);
  }
  console.log(`\nConverted: ${converted.length}  |  collapsed as content-dupes: ${collapsed.length}  |  convert failures: ${convertFailed}`);
  if (collapsed.length) {
    console.log('Collapsed dupes (kept -> dropped):');
    for (const c of collapsed.slice(0, 40)) console.log(`  ${c.dupeOf}  <-  ${c.png}`);
    if (collapsed.length > 40) console.log(`  ...and ${collapsed.length - 40} more`);
  }

  if (DRY_RUN) {
    console.log('\n--- SAMPLE PLANNED ROWS (first 12) ---');
    for (const it of converted.slice(0, 12)) {
      console.log(`  ${it.jpegName}  [${it.category}]  ${it.width}x${it.height} ${(it.size/1024).toFixed(0)}KB`);
      console.log(`      label="${it.label}"  weeks=[${it.weeks.join(',')}]`);
      console.log(`      tags=${JSON.stringify(it.tags)}`);
    }
    console.log(`\nDRY RUN totals -> would upload ${converted.length}, skip ${alreadyInBank}, collapse ${collapsed.length}, convert-fail ${convertFailed}`);
    return;
  }

  // Upload + insert, concurrency-limited with retries.
  let uploaded = 0, failed = 0;
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < converted.length) {
      const it = converted[cursor++];
      const timestamp = Date.now();
      const sanitized = it.jpegName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `photos/${timestamp}_${sanitized}`;
      try {
        await withRetry(async () => {
          const { error } = await sb.storage.from(BUCKET)
            .upload(storagePath, it.buffer, { contentType: 'image/jpeg', upsert: false });
          if (error) throw new Error('storage: ' + error.message);
        });
        const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
        await withRetry(async () => {
          const { error } = await sb.from('montree_photo_bank').insert({
            filename: it.jpegName,
            label: it.label,
            tags: it.tags,
            category: it.category,
            storage_path: storagePath,
            public_url: urlData.publicUrl,
            file_size: it.size,
            width: it.width,
            height: it.height,
            mime_type: 'image/jpeg',
            uploaded_by: 'system',
            is_public: true,
            is_approved: true,
          });
          if (error) throw new Error('db: ' + error.message);
        });
        uploaded++;
        if (uploaded % 100 === 0) console.log(`  uploaded ${uploaded}/${converted.length}`);
      } catch (e) {
        failed++;
        failures.push({ png: it.png, error: e.message });
        console.error(`  ✗ ${it.png}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('\n=== INGEST COMPLETE ===');
  console.log(`Uploaded:            ${uploaded}`);
  console.log(`Skipped (in bank):   ${alreadyInBank}`);
  console.log(`Collapsed dupes:     ${collapsed.length}`);
  console.log(`Convert failures:    ${convertFailed}`);
  console.log(`Upload failures:     ${failed}`);
  if (failures.length) {
    console.log('\nUpload failures detail:');
    for (const f of failures) console.log(`  ${f.png}: ${f.error}`);
  }
  console.log(`\nConverted JPEGs written to temp dir: ${TMP_DIR}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
