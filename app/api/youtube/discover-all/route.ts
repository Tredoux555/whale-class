// =====================================================
// API: Discover videos for all works
// =====================================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { discoverVideosForAllWorks, getWorksNeedingDiscovery } from '@/lib/youtube/discovery';

export async function POST(request: NextRequest) {
  try {
    const { forceAll, minScore, autoApprove } = await request.json();

    const supabase = createClient();

    // Get works to process
    let works;
    
    if (forceAll) {
      const { data, error } = await supabase
        .from('curriculum_roadmap')
        .select('id, work_name, description, area')
        .order('work_name');

      if (error) throw error;
      works = data || [];
    } else {
      works = await getWorksNeedingDiscovery();
    }

    if (works.length === 0) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        message: 'No works need discovery',
        totalWorks: 0,
        videosFound: 0,
      });
    }

    // Start discovery
    const results = await discoverVideosForAllWorks(works, {
      minRelevanceScore: minScore || 60,
      autoApprove: autoApprove || false,
      autoApproveThreshold: 85,
    });

    const found = results.filter(r => r.status === 'found').length;
    const failed = results.filter(r => r.status === 'error' || r.status === 'no_video').length;

    return NextResponse.json({
      success: true,
      status: 'completed',
      totalWorks: works.length,
      videosFound: found,
      videosFailed: failed,
      coveragePercent: Math.round((found / works.length) * 100),
      results,
    });
  } catch (error) {
    console.error('Batch discovery error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createClient();

    const { data: stats, error } = await supabase
      .rpc('get_video_discovery_stats')
      .single();

    if (error) {
      console.error('Error fetching stats:', error);
      // Return default stats if function doesn't exist yet
      return NextResponse.json({
        success: true,
        stats: {
          total_works: 0,
          works_with_videos: 0,
          works_pending_approval: 0,
          works_missing_videos: 0,
          average_relevance_score: 0,
          total_searches_performed: 0,
          searches_last_30_days: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      stats: stats || {},
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}

