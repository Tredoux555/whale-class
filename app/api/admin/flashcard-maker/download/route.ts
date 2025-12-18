import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

// Custom exec with increased maxBuffer to handle large output
const execAsync = (command: string, options?: { timeout?: number; maxBuffer?: number }) => {
  return promisify(exec)(command, {
    maxBuffer: options?.maxBuffer || 50 * 1024 * 1024, // 50MB buffer (default)
    timeout: options?.timeout || 300000,
  });
};

// Temp directory for video processing
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

    // Ensure temp directory exists
    await fs.mkdir(TEMP_DIR, { recursive: true });

    const outputPath = path.join(TEMP_DIR, `${videoId}.mp4`);
    const subtitlePath = path.join(TEMP_DIR, `${videoId}.en.vtt`);
    
    // Check if already downloaded
    try {
      await fs.access(outputPath);
      // File exists, get title from info
      const { stdout: infoJson } = await execAsync(
        `yt-dlp --dump-json "https://www.youtube.com/watch?v=${videoId}" 2>/dev/null || echo "{}"`
      );
      const info = JSON.parse(infoJson || '{}');
      
      // Check for subtitles
      let subtitles = null;
      try {
        await fs.access(subtitlePath);
        subtitles = await fs.readFile(subtitlePath, 'utf-8');
      } catch {
        // No subtitles
      }
      
      return NextResponse.json({
        filePath: outputPath,
        title: info.title || 'Downloaded Video',
        subtitles
      });
    } catch {
      // File doesn't exist, download it
    }

    // Download video with yt-dlp
    // -f: format selection (best quality under 720p for reasonable file size)
    // --write-auto-sub: download auto-generated subtitles
    // --sub-lang: prefer English subtitles
    // Use --no-progress and --quiet to minimize output
    // Write JSON to temp file instead of stdout to avoid buffer issues
    const jsonPath = path.join(TEMP_DIR, `${videoId}_info.json`);
    const ytdlpCommand = `yt-dlp \
      -f "bestvideo[height<=720]+bestaudio/best[height<=720]" \
      --merge-output-format mp4 \
      --write-auto-sub \
      --sub-lang en \
      --convert-subs vtt \
      --quiet \
      --no-progress \
      --no-warnings \
      --dump-json \
      -o "${outputPath}" \
      "https://www.youtube.com/watch?v=${videoId}" > "${jsonPath}" 2>/dev/null || true`;

    // Execute download (output goes to file, not stdout)
    await execAsync(ytdlpCommand, { maxBuffer: 1024 * 1024 }); // Small buffer since output is minimal

    // Read JSON from file
    let info = {};
    try {
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      info = JSON.parse(jsonContent.trim());
      // Clean up JSON file
      await fs.unlink(jsonPath).catch(() => {});
    } catch {
      // If JSON read fails, try to get info separately
      try {
        const { stdout: infoJson } = await execAsync(
          `yt-dlp --dump-json --quiet --no-warnings "https://www.youtube.com/watch?v=${videoId}" 2>/dev/null`,
          { maxBuffer: 5 * 1024 * 1024 }
        );
        info = JSON.parse(infoJson.trim());
      } catch {
        info = { title: 'Downloaded Video' };
      }
    }

    // Info already parsed above

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
      title: info.title || 'Downloaded Video',
      subtitles
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to download video' },
      { status: 500 }
    );
  }
}

