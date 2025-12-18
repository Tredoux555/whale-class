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

const TEMP_DIR = '/tmp/flashcard-maker';

interface VTTCue {
  start: number;
  end: number;
  text: string;
}

// Parse VTT subtitles
function parseVTT(vttContent: string): VTTCue[] {
  const cues: VTTCue[] = [];
  const lines = vttContent.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Look for timestamp line (00:00:00.000 --> 00:00:00.000)
    const timestampMatch = line.match(
      /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
    );
    
    if (timestampMatch) {
      const startSeconds = 
        parseInt(timestampMatch[1]) * 3600 +
        parseInt(timestampMatch[2]) * 60 +
        parseInt(timestampMatch[3]) +
        parseInt(timestampMatch[4]) / 1000;
      
      const endSeconds = 
        parseInt(timestampMatch[5]) * 3600 +
        parseInt(timestampMatch[6]) * 60 +
        parseInt(timestampMatch[7]) +
        parseInt(timestampMatch[8]) / 1000;
      
      // Collect text lines until empty line
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        // Remove VTT formatting tags
        const cleanText = lines[i]
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();
        if (cleanText) {
          textLines.push(cleanText);
        }
        i++;
      }
      
      if (textLines.length > 0) {
        cues.push({
          start: startSeconds,
          end: endSeconds,
          text: textLines.join(' ')
        });
      }
    }
    i++;
  }
  
  return cues;
}

// Find lyric for a given timestamp
function findLyricForTimestamp(cues: VTTCue[], timestamp: number): string | undefined {
  // Find the cue that contains or is closest to this timestamp
  const activeCue = cues.find(cue => timestamp >= cue.start && timestamp <= cue.end);
  if (activeCue) return activeCue.text;
  
  // Find the nearest cue within 2 seconds
  const nearestCue = cues.find(cue => 
    Math.abs(cue.start - timestamp) < 2 || Math.abs(cue.end - timestamp) < 2
  );
  return nearestCue?.text;
}

export async function POST(request: NextRequest) {
  try {
    const { filePath, sensitivity = 0.3, minInterval = 2, subtitles } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { message: 'File path is required' },
        { status: 400 }
      );
    }

    // Verify file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { message: 'Video file not found' },
        { status: 404 }
      );
    }

    // Parse subtitles if provided
    const subtitleCues = subtitles ? parseVTT(subtitles) : [];

    // Create output directory for frames
    const videoId = path.basename(filePath, '.mp4');
    const framesDir = path.join(TEMP_DIR, `${videoId}_frames`);
    await fs.mkdir(framesDir, { recursive: true });

    // Clean previous frames
    const existingFiles = await fs.readdir(framesDir);
    await Promise.all(
      existingFiles.map(file => fs.unlink(path.join(framesDir, file)))
    );

    // Get video duration (redirect stderr to avoid buffer issues)
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}" 2>/dev/null`
    );
    const duration = parseFloat(durationOutput.trim());

    // Use FFmpeg scene detection filter
    // The 'select' filter with scene detection outputs frames where scene changes
    // threshold: 0 = most sensitive, 1 = least sensitive
    // We invert the user's sensitivity so higher = fewer frames
    const threshold = sensitivity;
    
    // Extract scene change frames
    // We use the select filter to detect scene changes and output those frames
    // Write timestamps to a file to avoid buffer issues
    const timestampFile = path.join(framesDir, 'timestamps.txt');
    const ffmpegCommand = `ffmpeg -i "${filePath}" \
      -vf "select='gt(scene,${threshold})',showinfo" \
      -vsync vfr \
      -frame_pts 1 \
      -loglevel error \
      "${framesDir}/frame_%04d.jpg" 2>&1 | grep -E "pts_time:" > "${timestampFile}" 2>/dev/null || touch "${timestampFile}"`;

    // Execute ffmpeg (output goes to file)
    await execAsync(ffmpegCommand, { maxBuffer: 1024 * 1024 });

    // Read timestamps from file
    let ffmpegOutput = '';
    try {
      ffmpegOutput = await fs.readFile(timestampFile, 'utf-8');
      await fs.unlink(timestampFile).catch(() => {});
    } catch {
      // No timestamps file, will use fallback
    }

    // Parse FFmpeg output to get timestamps
    // showinfo filter outputs: pts_time:X.XXXXX
    const timestampRegex = /pts_time:(\d+\.?\d*)/g;
    const timestamps: number[] = [];
    let match;
    while ((match = timestampRegex.exec(ffmpegOutput)) !== null) {
      timestamps.push(parseFloat(match[1]));
    }

    // Also capture first frame if not already included
    if (timestamps.length === 0 || timestamps[0] > 1) {
      await execAsync(
        `ffmpeg -i "${filePath}" -ss 0 -vframes 1 -loglevel error "${framesDir}/frame_0000.jpg" -y 2>/dev/null`
      );
      timestamps.unshift(0);
    }

    // Filter by minimum interval
    const filteredTimestamps: number[] = [];
    let lastTimestamp = -minInterval;
    for (const ts of timestamps.sort((a, b) => a - b)) {
      if (ts - lastTimestamp >= minInterval) {
        filteredTimestamps.push(ts);
        lastTimestamp = ts;
      }
    }

    // If we have too few frames, add evenly spaced ones
    if (filteredTimestamps.length < 3) {
      const interval = duration / 6;
      for (let t = interval; t < duration - 1; t += interval) {
        if (!filteredTimestamps.some(ts => Math.abs(ts - t) < minInterval)) {
          filteredTimestamps.push(t);
        }
      }
      filteredTimestamps.sort((a, b) => a - b);
    }

    // If we have too many frames (>20), reduce
    let finalTimestamps = filteredTimestamps;
    if (filteredTimestamps.length > 20) {
      const step = Math.ceil(filteredTimestamps.length / 20);
      finalTimestamps = filteredTimestamps.filter((_, i) => i % step === 0);
    }

    // Extract frames at final timestamps and convert to base64
    const frames = await Promise.all(
      finalTimestamps.map(async (timestamp, index) => {
        const framePath = path.join(framesDir, `final_${index}.jpg`);
        
        // Extract frame at timestamp with high quality (suppress verbose output)
        await execAsync(
          `ffmpeg -ss ${timestamp} -i "${filePath}" -vframes 1 -q:v 2 -loglevel error "${framePath}" -y 2>/dev/null`
        );

        // Read and convert to base64
        const imageBuffer = await fs.readFile(framePath);
        const base64 = imageBuffer.toString('base64');

        // Find matching lyric
        const lyric = findLyricForTimestamp(subtitleCues, timestamp);

        return {
          timestamp,
          imageData: `data:image/jpeg;base64,${base64}`,
          lyric
        };
      })
    );

    // Cleanup frame files (keep video for re-processing)
    await fs.rm(framesDir, { recursive: true, force: true });

    return NextResponse.json({ frames });

  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to extract frames' },
      { status: 500 }
    );
  }
}

