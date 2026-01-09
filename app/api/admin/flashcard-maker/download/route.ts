import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const TEMP_DIR = '/tmp/flashcard-maker';

// Extend timeout for this route
export const maxDuration = 300; // 5 minutes (Vercel/Railway)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Download] Starting video download...');
  
  try {
    const { videoId } = await request.json();
    console.log(`[Download] Video ID: ${videoId}`);

    if (!videoId) {
      return NextResponse.json(
        { message: 'Video ID is required' },
        { status: 400 }
      );
    }

    await fs.mkdir(TEMP_DIR, { recursive: true });

    const outputPath = path.join(TEMP_DIR, `${videoId}.mp4`);
    const subtitlePath = path.join(TEMP_DIR, `${videoId}.en.vtt`);
    
    // Check if already downloaded (cache)
    let needsDownload = true;
    try {
      const stats = await fs.stat(outputPath);
      if (stats.size > 1000) { // File exists and has content
        needsDownload = false;
        console.log(`[Download] Using cached video: ${outputPath} (${Math.round(stats.size/1024/1024)}MB)`);
      }
    } catch {
      // File doesn't exist, need to download
    }

    if (needsDownload) {
      console.log('[Download] Downloading from YouTube...');
      
      // Use robust format selection with fallbacks
      const ytdlpCommand = `yt-dlp \
        -f "best[height<=480]/best" \
        --no-playlist \
        --no-warnings \
        --no-check-certificates \
        --geo-bypass \
        --socket-timeout 60 \
        --retries 5 \
        --fragment-retries 5 \
        --write-auto-sub \
        --sub-lang en \
        --convert-subs vtt \
        -o "${outputPath}" \
        "https://www.youtube.com/watch?v=${videoId}" 2>&1`;

      try {
        const { stdout, stderr } = await execAsync(ytdlpCommand, { 
          timeout: 180000, // 3 minutes max
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        console.log('[Download] yt-dlp output:', stdout.slice(-500));
      } catch (dlError: unknown) {
        const error = dlError as Error & { stdout?: string; stderr?: string };
        console.error('[Download] yt-dlp error:', error.message);
        console.error('[Download] stdout:', error.stdout?.slice(-500));
        console.error('[Download] stderr:', error.stderr?.slice(-500));
        throw new Error(`Download failed: ${error.message}`);
      }
    }

    // Verify file exists
    try {
      const stats = await fs.stat(outputPath);
      console.log(`[Download] Video file size: ${Math.round(stats.size/1024/1024)}MB`);
    } catch {
      throw new Error('Video file not created');
    }

    // Get video info (quick)
    let title = 'Downloaded Video';
    try {
      const { stdout } = await execAsync(
        `yt-dlp --dump-json --no-download "https://www.youtube.com/watch?v=${videoId}" 2>/dev/null`,
        { timeout: 15000 }
      );
      const info = JSON.parse(stdout);
      title = info.title || title;
    } catch {
      console.log('[Download] Could not fetch title, using default');
    }

    // Get duration
    let duration = 180;
    try {
      const { stdout: durationOut } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`,
        { timeout: 10000 }
      );
      duration = parseFloat(durationOut.trim()) || 180;
      console.log(`[Download] Video duration: ${duration}s`);
    } catch {
      console.log('[Download] Could not get duration, using default');
    }

    // Check for subtitles
    let subtitles = null;
    try {
      await fs.access(subtitlePath);
      subtitles = await fs.readFile(subtitlePath, 'utf-8');
      console.log('[Download] Subtitles found');
    } catch {
      console.log('[Download] No subtitles available');
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Download] Complete in ${elapsed}s`);

    return NextResponse.json({
      filePath: outputPath,
      title,
      subtitles,
      duration
    });

  } catch (error) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[Download] Failed after ${elapsed}s:`, error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to download video' },
      { status: 500 }
    );
  }
}
