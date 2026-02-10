// Upload all sound images to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars from .env.local
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const IMAGE_DIR = './generated-images';
const BUCKET = 'images';
const FOLDER = 'sound-objects';

async function uploadImages() {
  console.log('🚀 Starting Supabase upload...\n');
  
  // Get all sound-*.png files
  const files = fs.readdirSync(IMAGE_DIR)
    .filter(f => f.startsWith('sound-') && f.endsWith('.png'));
  
  console.log(`Found ${files.length} images to upload\n`);
  
  let success = 0;
  let failed = 0;
  const results = [];
  
  for (const file of files) {
    const filepath = path.join(IMAGE_DIR, file);
    const fileBuffer = fs.readFileSync(filepath);
    const storagePath = `${FOLDER}/${file}`;
    
    process.stdout.write(`Uploading: ${file}... `);
    
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'image/png',
        upsert: true  // Overwrite if exists
      });
    
    if (error) {
      console.log('❌ ' + error.message);
      failed++;
    } else {
      console.log('✅');
      success++;
      results.push({ file, path: storagePath });
    }
  }
  
  console.log('\n=====================================');
  console.log('📊 UPLOAD SUMMARY');
  console.log('=====================================');
  console.log(`✅ Successful: ${success}/${files.length}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\n📁 Location: ${BUCKET}/${FOLDER}/`);
  console.log(`🔗 Base URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FOLDER}/`);
  
  return results;
}

uploadImages().catch(console.error);
