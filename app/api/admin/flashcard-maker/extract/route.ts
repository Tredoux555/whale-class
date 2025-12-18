import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

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
  // Find the cue that contains this timestamp
  const activeCue = cues.find(cue => timestamp >= cue.start && timestamp <= cue.end);
  if (activeCue) return activeCue.text;
  
  // Find the nearest cue within 3 seconds
  let nearestCue: VTTCue | undefined;
  let minDistance = Infinity;
  
  for (const cue of cues) {
    const distanceToStart = Math.abs(cue.start - timestamp);
    const distanceToEnd = Math.abs(cue.end - timestamp);
    const distance = Math.min(distanceToStart, distanceToEnd);
    
    if (distance < minDistance && distance < 3) {
      minDistance = distance;
      nearestCue = cue;
    }
  }
  
  return nearestCue?.text;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      filePath, 
      sensitivity = 0.3, 
      minInterval = 2, 
      subtitles,
      targetFrames = 15 // Target number of frames (10-20 range)
    } = await request.json();

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
    try {
      const existingFiles = await fs.readdir(framesDir);
      await Promise.all(
        existingFiles.map(file => fs.unlink(path.join(framesDir, file)))
      );
    } catch {
      // Directory might not exist yet
    }

    // Get video duration
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    const duration = parseFloat(durationOutput.trim());
    
    console.log(`Video duration: ${duration}s, Target frames: ${targetFrames}, Sensitivity: ${sensitivity}`);

    // STRATEGY: Use multiple methods to ensure we get enough frames
    const allTimestamps: Set<number> = new Set();

    // Method 1: Scene detection with FFmpeg
    // Lower threshold = more sensitive = more scene changes detected
    const sceneThreshold = Math.max(0.05, sensitivity * 0.5); // Scale down for more detection
    
    try {
      const sceneCommand = `ffmpeg -i "${filePath}" -vf "select='gt(scene,${sceneThreshold})',showinfo" -vsync vfr -f null - 2>&1 | grep "pts_time"`;
      const { stdout: sceneOutput } = await execAsync(sceneCommand, { timeout: 120000 });
      
      const ptsRegex = /pts_time:(\d+\.?\d*)/g;
      let match;
      while ((match = ptsRegex.exec(sceneOutput)) !== null) {
        const ts = parseFloat(match[1]);
        if (ts > 0.5 && ts < duration - 0.5) {
          allTimestamps.add(Math.round(ts * 10) / 10); // Round to 0.1s precision
        }
      }
      console.log(`Scene detection found ${allTimestamps.size} timestamps`);
    } catch (e) {
      console.log('Scene detection produced no results, using fallback methods');
    }

    // Method 2: If scene detection didn't find enough, try with even lower threshold
    if (allTimestamps.size < 10) {
      try {
        const lowerThreshold = 0.02;
        const sceneCommand2 = `ffmpeg -i "${filePath}" -vf "select='gt(scene,${lowerThreshold})',showinfo" -vsync vfr -f null - 2>&1 | grep "pts_time"`;
        const { stdout: sceneOutput2 } = await execAsync(sceneCommand2, { timeout: 120000 });
        
        const ptsRegex = /pts_time:(\d+\.?\d*)/g;
        let match;
        while ((match = ptsRegex.exec(sceneOutput2)) !== null) {
          const ts = parseFloat(match[1]);
          if (ts > 0.5 && ts < duration - 0.5) {
            allTimestamps.add(Math.round(ts * 10) / 10);
          }
        }
        console.log(`Lower threshold scene detection: now have ${allTimestamps.size} timestamps`);
      } catch (e) {
        console.log('Lower threshold scene detection failed');
      }
    }

    // Method 3: Add evenly distributed timestamps to ensure minimum count
    const minFrames = 10;
    const maxFrames = 20;
    
    if (allTimestamps.size < minFrames) {
      // Calculate interval to get target frames
      const interval = duration / (targetFrames + 1);
      for (let t = interval; t < duration - 0.5; t += interval) {
        allTimestamps.add(Math.round(t * 10) / 10);
      }
      console.log(`Added evenly spaced frames: now have ${allTimestamps.size} timestamps`);
    }

    // Always include first frame (after a brief moment)
    allTimestamps.add(0.5);

    // Convert to sorted array
    let timestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    console.log(`Total timestamps before filtering: ${timestamps.length}`);

    // Filter by minimum interval
    const filteredTimestamps: number[] = [];
    let lastTimestamp = -minInterval;
    
    for (const ts of timestamps) {
      if (ts - lastTimestamp >= minInterval) {
        filteredTimestamps.push(ts);
        lastTimestamp = ts;
      }
    }
    
    console.log(`After min interval filter (${minInterval}s): ${filteredTimestamps.length} timestamps`);

    // If still not enough after filtering, reduce the minimum interval and retry
    let finalTimestamps = filteredTimestamps;
    
    if (finalTimestamps.length < minFrames) {
      const reducedInterval = Math.max(1, minInterval / 2);
      const refiltered: number[] = [];
      let last = -reducedInterval;
      
      for (const ts of timestamps) {
        if (ts - last >= reducedInterval) {
          refiltered.push(ts);
          last = ts;
        }
      }
      finalTimestamps = refiltered;
      console.log(`Re-filtered with ${reducedInterval}s interval: ${finalTimestamps.length} timestamps`);
    }

    // If STILL not enough, generate evenly spaced frames
    if (finalTimestamps.length < minFrames) {
      finalTimestamps = [];
      const interval = duration / (targetFrames + 1);
      for (let t = 0.5; t < duration - 0.5; t += interval) {
        finalTimestamps.push(Math.round(t * 10) / 10);
      }
      console.log(`Generated ${finalTimestamps.length} evenly spaced frames as fallback`);
    }

    // If too many, reduce by sampling
    if (finalTimestamps.length > maxFrames) {
      const step = Math.ceil(finalTimestamps.length / maxFrames);
      finalTimestamps = finalTimestamps.filter((_, i) => i % step === 0);
      console.log(`Reduced to ${finalTimestamps.length} frames`);
    }

    // Ensure we're in the 10-20 range
    finalTimestamps = finalTimestamps.slice(0, maxFrames);
    
    console.log(`Final frame count: ${finalTimestamps.length}`);
    console.log(`Timestamps: ${finalTimestamps.join(', ')}`);

    // Extract frames at final timestamps and convert to base64
    const frames = await Promise.all(
      finalTimestamps.map(async (timestamp, index) => {
        const framePath = path.join(framesDir, `frame_${index.toString().padStart(3, '0')}.jpg`);
        
        try {
          // Extract frame at timestamp with high quality
          // Using -q:v 2 for high quality JPEG (range 2-31, lower is better)
          await execAsync(
            `ffmpeg -ss ${timestamp} -i "${filePath}" -vframes 1 -q:v 2 -y "${framePath}"`,
            { timeout: 30000 }
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
        } catch (frameError) {
          console.error(`Failed to extract frame at ${timestamp}:`, frameError);
          return null;
        }
      })
    );

    // Filter out any failed extractions
    const validFrames = frames.filter((f): f is NonNullable<typeof f> => f !== null);
    
    console.log(`Successfully extracted ${validFrames.length} frames`);

    // Cleanup frame files
    try {
      await fs.rm(framesDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    if (validFrames.length === 0) {
      return NextResponse.json(
        { message: 'Failed to extract any frames from video' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      frames: validFrames,
      debug: {
        duration,
        requestedTargetFrames: targetFrames,
        actualFrameCount: validFrames.length,
        timestamps: validFrames.map(f => f.timestamp)
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
