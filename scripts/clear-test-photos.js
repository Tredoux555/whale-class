#!/usr/bin/env node

/**
 * Clear all test photos from montree_child_photos table
 * Run with: node scripts/clear-test-photos.js
 *
 * This also clears the photos from Supabase storage if they exist there.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load from .env.local if it exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  }
  console.log('📄 Loaded environment from .env.local');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dmfncjjtsoxrnvcdnvjq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  console.log('Make sure it exists in .env.local or run with:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/clear-test-photos.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function clearPhotos() {
  console.log('🔍 Checking for test photos...\n');

  // First, get all photos to show what we're deleting
  const { data: photos, error: fetchError } = await supabase
    .from('montree_child_photos')
    .select('id, child_id, photo_url, work_name, caption, created_at')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching photos:', fetchError.message);
    process.exit(1);
  }

  if (!photos || photos.length === 0) {
    console.log('✅ No photos found in database - nothing to clear!');
    return;
  }

  console.log(`📸 Found ${photos.length} photos:\n`);
  photos.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.work_name || 'No work'}`);
    console.log(`     Created: ${new Date(p.created_at).toLocaleString()}`);
    console.log(`     URL: ${p.photo_url?.substring(0, 60)}...`);
    console.log('');
  });

  // Confirm before deleting
  console.log('⚠️  About to DELETE all photos above.\n');

  // Delete from database
  const { error: deleteError, count } = await supabase
    .from('montree_child_photos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)

  if (deleteError) {
    console.error('❌ Error deleting photos:', deleteError.message);
    process.exit(1);
  }

  console.log(`✅ Deleted ${photos.length} photos from database`);

  // Try to delete from storage bucket if photos are stored there
  const storagePhotos = photos.filter(p => p.photo_url?.includes('supabase.co/storage'));

  if (storagePhotos.length > 0) {
    console.log(`\n🗑️  Attempting to delete ${storagePhotos.length} photos from storage...`);

    for (const photo of storagePhotos) {
      try {
        // Extract path from URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/file.jpg
        const url = new URL(photo.photo_url);
        const pathParts = url.pathname.split('/storage/v1/object/public/');
        if (pathParts.length === 2) {
          const [bucket, ...filePath] = pathParts[1].split('/');
          const path = filePath.join('/');

          const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

          if (error) {
            console.log(`   ⚠️  Could not delete from storage: ${path}`);
          } else {
            console.log(`   ✅ Deleted: ${path}`);
          }
        }
      } catch (e) {
        console.log(`   ⚠️  Could not parse URL: ${photo.photo_url}`);
      }
    }
  }

  console.log('\n🎉 Photo cleanup complete!');
}

clearPhotos().catch(console.error);
