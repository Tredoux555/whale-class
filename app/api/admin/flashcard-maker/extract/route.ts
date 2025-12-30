import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const TEMP_DIR = '/tmp/flashcard-maker';

// Extend timeout for this route
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

interface VTTCue {
  start: number;
  end: number;
  text: string;
}

function parseVTT(vttContent: string): VTTCue[] {
  const cues: VTTCue[] = [];
  const lines = vttContent.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
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
      
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        const cleanText = lines[i]
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();
        if (cleanText) textLines.push(cleanText);
        i++;
      }
      
      if (textLines.length > 0) {
        cues.push({ start: startSeconds, end: endSeconds, text: textLines.join(' ') });
      }
    }
    i++;
  }
  
  return cues;
}

function findLyricForTimestamp(cues: VTTCue[], timestamp: number): string | undefined {
  const activeCue = cues.find(cue => timestamp >= cue.start && timestamp <= cue.end);
  if (activeCue) return activeCue.text;
  
  let nearestCue: VTTCue | undefined;
  let minDistance = Infinity;
  
  for (const cue of cues) {
    const distance = Math.min(Math.abs(cue.start - timestamp), Math.abs(cue.end - timestamp));
    if (distance < minDistance && distance < 3) {
      minDistance = distance;
      nearestCue = cue;
    }
  }
  
  return nearestCue?.text;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Extract] Starting frame extraction...');
  
  try {
    const { 
      filePath, 
      sensitivity = 0.2, 
      minInterval = 1.5, 
      subtitles,
      targetFrames = 20
    } = await request.json();
    
    console.log(`[Extract] File: ${filePath}, Target: ${targetFrames} frames`);

    if (!filePath) {
      return NextResponse.json({ message: 'File path is required' }, { status: 400 });
    }

    try {
      await fs.access(filePath);
      console.log('[Extract] File exists');
    } catch {
      return NextResponse.json({ message: 'Video file not found' }, { status: 404 });
    }

    const subtitleCues = subtitles ? parseVTT(subtitles) : [];
    const videoId = path.basename(filePath, '.mp4');
    const framesDir = path.join(TEMP_DIR, `${videoId}_frames_${Date.now()}`);
    await fs.mkdir(framesDir, { recursive: true });

    // Get video duration
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    const duration = parseFloat(durationOutput.trim());
    
    console.log(`Video duration: ${duration}s, Target: ${targetFrames} frames`);

    // UPDATED: More aggressive frame extraction
    const allTimestamps: Set<number> = new Set();
    
    // Always add first frame
    allTimestamps.add(0.5);

    // Method 1: Scene detection with multiple thresholds
    const thresholds = [
      sensitivity * 0.3,  // Very sensitive
      sensitivity * 0.5,  // Sensitive  
      sensitivity * 0.8,  // Normal
    ];

    for (const threshold of thresholds) {
      if (allTimestamps.size >= targetFrames * 1.5) break;
      
      try {
        const cmd = `ffmpeg -i "${filePath}" -vf "select='gt(scene,${Math.max(0.01, threshold)})',showinfo" -vsync vfr -f null - 2>&1 | grep "pts_time" || true`;
        const { stdout } = await execAsync(cmd, { timeout: 120000 });
        
        const ptsRegex = /pts_time:(\d+\.?\d*)/g;
        let match;
        while ((match = ptsRegex.exec(stdout)) !== null) {
          const ts = parseFloat(match[1]);
          if (ts > 0.3 && ts < duration - 0.3) {
            allTimestamps.add(Math.round(ts * 10) / 10);
          }
        }
      } catch (e) {
        console.log(`Scene detection at threshold ${threshold} failed`);
      }
    }

    console.log(`Scene detection found: ${allTimestamps.size} timestamps`);

    // Method 2: Always add evenly distributed frames to meet target
    const evenInterval = duration / (targetFrames + 1);
    for (let t = evenInterval; t < duration - 0.3; t += evenInterval) {
      allTimestamps.add(Math.round(t * 10) / 10);
    }

    console.log(`After adding even distribution: ${allTimestamps.size} timestamps`);

    // Sort and filter by minimum interval
    let timestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // Apply minimum interval filter
    const filtered: number[] = [];
    let lastTs = -minInterval;
    for (const ts of timestamps) {
      if (ts - lastTs >= minInterval) {
        filtered.push(ts);
        lastTs = ts;
      }
    }

    // If we filtered too aggressively, reduce interval
    let finalTimestamps = filtered;
    if (filtered.length < targetFrames && timestamps.length >= targetFrames) {
      const reducedInterval = minInterval * 0.5;
      const refiltered: number[] = [];
      lastTs = -reducedInterval;
      for (const ts of timestamps) {
        if (ts - lastTs >= reducedInterval) {
          refiltered.push(ts);
          lastTs = ts;
        }
      }
      finalTimestamps = refiltered;
    }

    // Cap at 40 max
    const MAX_FRAMES = 40;
    const MIN_FRAMES = 10;
    
    if (finalTimestamps.length > MAX_FRAMES) {
      const step = Math.ceil(finalTimestamps.length / MAX_FRAMES);
      finalTimestamps = finalTimestamps.filter((_, i) => i % step === 0).slice(0, MAX_FRAMES);
    }

    // Ensure minimum
    if (finalTimestamps.length < MIN_FRAMES) {
      const interval = duration / (MIN_FRAMES + 1);
      finalTimestamps = [];
      for (let t = interval; t < duration - 0.3 && finalTimestamps.length < MIN_FRAMES; t += interval) {
        finalTimestamps.push(Math.round(t * 10) / 10);
      }
    }

    console.log(`Final frame count: ${finalTimestamps.length}`);

    // Extract frames
    const frames = await Promise.all(
      finalTimestamps.map(async (timestamp, index) => {
        const framePath = path.join(framesDir, `frame_${index.toString().padStart(3, '0')}.jpg`);
        
        try {
          await execAsync(
            `ffmpeg -ss ${timestamp} -i "${filePath}" -vframes 1 -q:v 2 -y "${framePath}"`,
            { timeout: 30000 }
          );

          const imageBuffer = await fs.readFile(framePath);
          const base64 = imageBuffer.toString('base64');
          const lyric = findLyricForTimestamp(subtitleCues, timestamp);

          return {
            timestamp,
            imageData: `data:image/jpeg;base64,${base64}`,
            lyric
          };
        } catch (e) {
          console.error(`Frame extraction failed at ${timestamp}:`, e);
          return null;
        }
      })
    );

    const validFrames = frames.filter((f): f is NonNullable<typeof f> => f !== null);

    // Cleanup
    try {
      await fs.rm(framesDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    if (validFrames.length === 0) {
      return NextResponse.json({ message: 'Failed to extract frames' }, { status: 500 });
    }

    return NextResponse.json({ 
      frames: validFrames,
      debug: {
        duration,
        targetFrames,
        actualFrameCount: validFrames.length
      }
    });

  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to extract frames' },
      { status: 500 }
    );
  }
}
