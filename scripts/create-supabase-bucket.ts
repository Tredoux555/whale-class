/**
 * Script to create Supabase Storage bucket
 * Run with: npx tsx scripts/create-supabase-bucket.ts
 * 
 * Make sure you have these environment variables set:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please set:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nYou can set them temporarily:');
  console.error('  export NEXT_PUBLIC_SUPABASE_URL="your-url"');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createBucket() {
  const bucketName = 'videos';
  
  console.log('🔍 Checking if bucket exists...');
  
  // Check if bucket already exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError.message);
    process.exit(1);
  }
  
  const existingBucket = buckets?.find(b => b.name === bucketName);
  
  if (existingBucket) {
    console.log(`✅ Bucket "${bucketName}" already exists!`);
    console.log('   Public:', existingBucket.public);
    console.log('   File size limit:', existingBucket.file_size_limit);
    console.log('   Allowed MIME types:', existingBucket.allowed_mime_types || 'All');
    
    if (!existingBucket.public) {
      console.log('\n⚠️  Warning: Bucket is not public!');
      console.log('   Videos may not be accessible. Consider making it public in the Supabase dashboard.');
    }
    
    return;
  }
  
  console.log(`📦 Creating bucket "${bucketName}"...`);
  
  // Create the bucket
  const { data, error } = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: null, // Allow all types
  });
  
  if (error) {
    console.error('❌ Error creating bucket:', error.message);
    
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      console.error('\n💡 Tip: Make sure you\'re using the SERVICE_ROLE_KEY, not the anon key.');
      console.error('   The service role key has admin privileges needed to create buckets.');
    }
    
    process.exit(1);
  }
  
  console.log('✅ Bucket created successfully!');
  console.log('   Name:', bucketName);
  console.log('   Public: true');
  console.log('   File size limit: 100MB');
  console.log('   Allowed MIME types: All');
}

createBucket().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});


