#!/usr/bin/env node
/**
 * Bulk upload English teaching photos to Supabase Photo Bank
 *
 * Prerequisites:
 *   1. Run collect-english-photos.sh first to gather all photos
 *   2. Create the 'photo-bank' storage bucket in Supabase dashboard (public read)
 *   3. Run migration 140_photo_bank.sql in Supabase
 *
 * Usage:
 *   node scripts/upload-to-photo-bank.mjs
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
 */

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, basename } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'photo-bank';
const PHOTOS_DIR = join(process.cwd(), '..', '..', 'English-Teaching-Photos');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Category keywords mapping (mirrors the database seed data)
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
  phonics: ['short_a','short_e','short_i','short_o','short_u','long_a','long_e','long_i','long_o','long_u','cvc','blend','digraph','pink_series','blue_series','green_series'],
};

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

function cleanLabel(filename) {
  return filename
    .replace(/\.[^/.]+$/, '')     // remove extension
    .replace(/[-_]/g, ' ')         // dashes/underscores → spaces
    .replace(/\s+/g, ' ')          // normalize spaces
    .trim();
}

function capitalizeLabel(label) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function autoCategory(labelLower) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (labelLower.includes(keyword)) return category;
    }
  }
  return 'general';
}

function generateTags(label) {
  const words = label.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  return [...new Set([...words, label.toLowerCase()])];
}

async function main() {
  console.log('=== Montree Photo Bank: Bulk Upload ===\n');

  let files;
  try {
    files = await readdir(PHOTOS_DIR);
  } catch (err) {
    console.error(`❌ Could not read photos directory: ${PHOTOS_DIR}`);
    console.error('   Run collect-english-photos.sh first');
    process.exit(1);
  }

  const imageFiles = files.filter(f => {
    const ext = extname(f).toLowerCase();
    return ext in MIME_MAP;
  });

  console.log(`Found ${imageFiles.length} image files\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of imageFiles) {
    const filePath = join(PHOTOS_DIR, filename);
    const ext = extname(filename).toLowerCase();
    const mimeType = MIME_MAP[ext];
    const label = cleanLabel(filename);
    const labelCapitalized = capitalizeLabel(label);
    const labelLower = label.toLowerCase();
    const category = autoCategory(labelLower);
    const tags = generateTags(label);

    // Check if already exists
    const { data: existing } = await supabase
      .from('montree_photo_bank')
      .select('id')
      .eq('filename', filename)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏭️  ${filename} (already exists)`);
      skipped++;
      continue;
    }

    try {
      const fileBuffer = await readFile(filePath);
      const fileInfo = await stat(filePath);
      const timestamp = Date.now();
      const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `photos/${timestamp}_${sanitizedName}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

      if (uploadErr) {
        console.error(`  ❌ ${filename}: Storage error — ${uploadErr.message}`);
        failed++;
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

      // Insert into database
      const { error: dbErr } = await supabase
        .from('montree_photo_bank')
        .insert({
          filename,
          label: labelCapitalized,
          tags,
          category,
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          file_size: fileInfo.size,
          mime_type: mimeType,
          uploaded_by: 'system',
          is_public: true,
          is_approved: true,
        });

      if (dbErr) {
        console.error(`  ❌ ${filename}: DB error — ${dbErr.message}`);
        failed++;
        continue;
      }

      console.log(`  ✅ ${labelCapitalized} [${category}] — ${filename}`);
      uploaded++;
    } catch (err) {
      console.error(`  ❌ ${filename}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== Upload Complete ===');
  console.log(`✅ Uploaded: ${uploaded}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total processed: ${imageFiles.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
