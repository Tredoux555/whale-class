import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

// Custom exec with increased maxBuffer to handle large output
const execAsync = (command: string, options?: { timeout?: number }) => {
  return promisify(exec)(command, {
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
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
    // Redirect verbose output to /dev/null to avoid maxBuffer issues
    const ytdlpCommand = `yt-dlp \
      -f "bestvideo[height<=720]+bestaudio/best[height<=720]" \
      --merge-output-format mp4 \
      --write-auto-sub \
      --sub-lang en \
      --convert-subs vtt \
      --quiet \
      --no-warnings \
      -o "${outputPath}" \
      --print-json \
      "https://www.youtube.com/watch?v=${videoId}" 2>/dev/null`;

    const { stdout } = await execAsync(ytdlpCommand);

    // Parse yt-dlp JSON output for video info
    const lines = stdout.trim().split('\n');
    const jsonLine = lines.find(line => line.startsWith('{'));
    const info = jsonLine ? JSON.parse(jsonLine) : {};

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

