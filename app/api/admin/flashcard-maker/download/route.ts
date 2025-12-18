import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const TEMP_DIR = '/tmp/flashcard-maker';

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { message: 'Video ID is required' },
        { status: 400 }
      );
    }

    await fs.mkdir(TEMP_DIR, { recursive: true });

    const outputPath = path.join(TEMP_DIR, `${videoId}.mp4`);
    const subtitlePath = path.join(TEMP_DIR, `${videoId}.en.vtt`);
    
    // Check if already downloaded
    let needsDownload = true;
    try {
      await fs.access(outputPath);
      needsDownload = false;
    } catch {
      // File doesn't exist
    }

    if (needsDownload) {
      // Download video with yt-dlp
      const ytdlpCommand = `yt-dlp \
        -f "bestvideo[height<=720]+bestaudio/best[height<=720]" \
        --merge-output-format mp4 \
        --write-auto-sub \
        --sub-lang en \
        --convert-subs vtt \
        -o "${outputPath}" \
        "https://www.youtube.com/watch?v=${videoId}"`;

      await execAsync(ytdlpCommand, { timeout: 300000 });
    }

    // Get video info
    let title = 'Downloaded Video';
    try {
      const { stdout } = await execAsync(
        `yt-dlp --dump-json "https://www.youtube.com/watch?v=${videoId}" 2>/dev/null`
      );
      const info = JSON.parse(stdout);
      title = info.title || title;
    } catch {
      // Ignore title fetch errors
    }

    // Get duration
    let duration = 180;
    try {
      const { stdout: durationOut } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
      );
      duration = parseFloat(durationOut.trim()) || 180;
    } catch {
      // Ignore duration fetch errors
    }

    // Check for subtitles
    let subtitles = null;
    try {
      await fs.access(subtitlePath);
      subtitles = await fs.readFile(subtitlePath, 'utf-8');
    } catch {
      // No subtitles available
    }

    return NextResponse.json({
      filePath: outputPath,
      title,
      subtitles,
      duration
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to download video' },
      { status: 500 }
    );
  }
}
