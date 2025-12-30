import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Recovery endpoint to rebuild video metadata from storage
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // List all files in videos bucket root
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('videos')
      .list('', { limit: 1000 });

    if (rootError) {
      return NextResponse.json({ error: rootError.message }, { status: 500 });
    }

    // List files in videos subfolder
    const { data: videoFiles } = await supabase.storage
      .from('videos')
      .list('videos', { limit: 1000 });

    // Get current metadata
    let currentMetadata: any[] = [];
    try {
      const { data: metaFile } = await supabase.storage
        .from('videos')
        .download('data/videos.json');
      
      if (metaFile) {
        const text = await metaFile.text();
        currentMetadata = JSON.parse(text);
      }
    } catch (e) {
      console.log('No existing metadata file');
    }

    // Find video files (UUIDs)
    const allVideoFiles: string[] = [];
    
    // Check root level for UUID files
    rootFiles?.forEach(file => {
      if (file.name && file.name.match(/^[0-9a-f-]{36}/i) && !file.name.endsWith('.json')) {
        allVideoFiles.push(file.name);
      }
    });

    // Check videos subfolder
    videoFiles?.forEach(file => {
      if (file.name && file.name.match(/^[0-9a-f-]{36}/i)) {
        allVideoFiles.push(`videos/${file.name}`);
      }
    });

    return NextResponse.json({
      totalFilesInStorage: allVideoFiles.length,
      currentMetadataEntries: currentMetadata.length,
      rootFiles: rootFiles?.map(f => f.name),
      videoFolderFiles: videoFiles?.map(f => f.name).slice(0, 30),
      currentMetadata: currentMetadata.slice(0, 10)
    });

  } catch (error) {
    console.error('Recovery check error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // List all video files in videos subfolder
    const { data: videoFiles } = await supabase.storage
      .from('videos')
      .list('videos', { limit: 1000 });

    // Get current metadata
    let currentMetadata: any[] = [];
    try {
      const { data: metaFile } = await supabase.storage
        .from('videos')
        .download('data/videos.json');
      
      if (metaFile) {
        const text = await metaFile.text();
        currentMetadata = JSON.parse(text);
      }
    } catch (e) {
      console.log('Creating new metadata file');
    }

    const existingIds = new Set(currentMetadata.map((v: any) => v.id));
    let added = 0;

    // Add missing videos to metadata
    for (const file of videoFiles || []) {
      if (file.name && file.name.match(/^[0-9a-f-]{36}/i)) {
        // Extract UUID from filename (first 36 chars or 5 hyphen-separated parts)
        const parts = file.name.split('-');
        const id = parts.slice(0, 5).join('-');
        
        if (!existingIds.has(id)) {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('videos')
            .getPublicUrl(`videos/${file.name}`);

          currentMetadata.push({
            id: id,
            title: `Recovered Video ${added + 1}`,
            category: 'song-of-week',
            videoUrl: urlData.publicUrl,
            uploadedAt: file.created_at || new Date().toISOString(),
            week: 'Week 16',
            needsReview: true
          });
          added++;
          existingIds.add(id);
        }
      }
    }

    if (added > 0) {
      // Save updated metadata
      const jsonData = JSON.stringify(currentMetadata, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload('data/videos.json', blob, {
          upsert: true,
          contentType: 'application/json',
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      added,
      total: currentMetadata.length,
      message: added > 0 
        ? `Added ${added} videos with placeholder titles. Update them in admin panel.`
        : 'No new videos found to add'
    });

  } catch (error) {
    console.error('Recovery error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
