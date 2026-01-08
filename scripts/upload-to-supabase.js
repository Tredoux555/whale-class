// Upload all sound images to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://dmfncjjtsoxrnvcdnvjq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZm5jamp0c294cm52Y2RudmpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg0NzY1MiwiZXhwIjoyMDc4NDIzNjUyfQ.qapJCECkxlq-n5XFvvyH5CQ4T_2LY5-2sFIEyF2A8jw';

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
