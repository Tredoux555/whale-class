/**
 * Interactive script to create Supabase Storage bucket
 * Run with: node scripts/create-bucket-interactive.js
 * 
 * This script will prompt you for your Supabase credentials
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createBucket() {
  console.log('🪣 Supabase Bucket Creation Script\n');
  console.log('You can find these credentials at:');
  console.log('  https://supabase.com/dashboard/project/whale-class → Settings → API\n');
  
  // Get credentials
  const supabaseUrl = await question('Enter your Supabase Project URL: ');
  const supabaseServiceRoleKey = await question('Enter your Supabase service_role key: ');
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('\n❌ Both credentials are required!');
    rl.close();
    process.exit(1);
  }
  
  console.log('\n🔍 Connecting to Supabase...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  const bucketName = 'videos';
  
  console.log('🔍 Checking if bucket exists...');
  
  // Check if bucket already exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('\n❌ Error listing buckets:', listError.message);
    
    if (listError.message.includes('permission') || listError.message.includes('unauthorized')) {
      console.error('\n💡 Tip: Make sure you\'re using the SERVICE_ROLE_KEY, not the anon key.');
      console.error('   The service role key has admin privileges needed to create buckets.');
    }
    
    rl.close();
    process.exit(1);
  }
  
  const existingBucket = buckets?.find(b => b.name === bucketName);
  
  if (existingBucket) {
    console.log(`\n✅ Bucket "${bucketName}" already exists!`);
    console.log('   Public:', existingBucket.public);
    console.log('   File size limit:', existingBucket.file_size_limit);
    console.log('   Allowed MIME types:', existingBucket.allowed_mime_types || 'All');
    
    if (!existingBucket.public) {
      console.log('\n⚠️  Warning: Bucket is not public!');
      console.log('   Videos may not be accessible. Consider making it public in the Supabase dashboard.');
    }
    
    rl.close();
    return;
  }
  
  console.log(`\n📦 Creating bucket "${bucketName}"...`);
  
  // Create the bucket
  const { data, error } = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: null, // Allow all types
  });
  
  if (error) {
    console.error('\n❌ Error creating bucket:', error.message);
    
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      console.error('\n💡 Tip: Make sure you\'re using the SERVICE_ROLE_KEY, not the anon key.');
      console.error('   The service role key has admin privileges needed to create buckets.');
    }
    
    if (error.message.includes('already exists')) {
      console.log('\n✅ Bucket already exists (checked via different method)');
      rl.close();
      return;
    }
    
    rl.close();
    process.exit(1);
  }
  
  console.log('\n✅ Bucket created successfully!');
  console.log('   Name:', bucketName);
  console.log('   Public: true');
  console.log('   File size limit: 100MB');
  console.log('   Allowed MIME types: All');
  console.log('\n🎉 You can now proceed with the migration!');
  
  rl.close();
}

createBucket().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  rl.close();
  process.exit(1);
});

