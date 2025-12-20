#!/usr/bin/env node
// =====================================================
// CLI: Discover videos for all works
// =====================================================
// Usage: npx ts-node scripts/discover-videos.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  console.log('🎥 WHALE PLATFORM - VIDEO DISCOVERY');
  console.log('=====================================\n');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase credentials not found');
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\n');
    process.exit(1);
  }

  if (!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY) {
    console.error('❌ Error: YouTube API key not found');
    console.error('Set NEXT_PUBLIC_YOUTUBE_API_KEY in .env.local\n');
    process.exit(1);
  }

  try {
    console.log('Starting video discovery...\n');

    // Call API endpoint
    const response = await fetch('http://localhost:3000/api/youtube/discover-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        forceAll: false, // Only search for works without videos
        minScore: 60,
        autoApprove: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    console.log('\n📊 DISCOVERY COMPLETE!');
    console.log('=====================');
    console.log(`✅ Total works: ${data.totalWorks}`);
    console.log(`✅ Videos found: ${data.videosFound}`);
    console.log(`❌ Failed: ${data.videosFailed}`);
    console.log(`📈 Coverage: ${data.coveragePercent}%\n`);

    console.log('Next steps:');
    console.log('1. Go to http://localhost:3000/admin/video-management');
    console.log('2. Review and approve videos');
    console.log('3. Videos will appear on curriculum pages\n');

  } catch (error) {
    console.error('\n❌ Discovery failed:', error);
    console.error('\nMake sure:');
    console.error('1. Development server is running (npm run dev)');
    console.error('2. Database migration has been run');
    console.error('3. YouTube API key is valid\n');
    process.exit(1);
  }
}

main();






