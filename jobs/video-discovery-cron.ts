// =====================================================
// CRON JOB: Daily video discovery
// =====================================================
// This runs daily at 2 AM to find new videos
// Configure in your hosting provider (Vercel, etc.)

import { createClient } from '@/lib/supabase';
import { getWorksNeedingDiscovery, discoverVideosForAllWorks } from '@/lib/youtube/discovery';

export async function runVideoDiscoveryCron() {
  console.log('[CRON] Starting daily video discovery...');
  const startTime = Date.now();

  try {
    // Get works that need discovery
    const works = await getWorksNeedingDiscovery();

    if (works.length === 0) {
      console.log('[CRON] No works need discovery');
      return {
        success: true,
        worksProcessed: 0,
        videosFound: 0,
        duration: Date.now() - startTime,
      };
    }

    console.log(`[CRON] Discovering videos for ${works.length} works...`);

    // Run discovery
    const results = await discoverVideosForAllWorks(works, {
      minRelevanceScore: 60,
      autoApprove: false, // Manual approval required
    });

    const found = results.filter(r => r.status === 'found').length;
    const failed = results.filter(r => r.status === 'error' || r.status === 'no_video').length;

    const duration = Date.now() - startTime;

    console.log(`[CRON] Discovery complete: ${found} videos found, ${failed} failed`);
    console.log(`[CRON] Duration: ${duration}ms`);

    return {
      success: true,
      worksProcessed: works.length,
      videosFound: found,
      videosFailed: failed,
      duration,
    };
  } catch (error) {
    console.error('[CRON] Discovery failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

// Export for Vercel cron
export default async function handler() {
  const result = await runVideoDiscoveryCron();
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

// For manual testing
if (require.main === module) {
  runVideoDiscoveryCron()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

