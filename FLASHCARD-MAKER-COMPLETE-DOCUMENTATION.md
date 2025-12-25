# Flashcard Maker Application - Complete Code & Error Documentation

## Overview
This is a Next.js application that generates flashcards from YouTube videos. It downloads videos, extracts frames at scene changes, and generates PDF flashcards.

**Current Issue**: Only generating 6 flashcards instead of 10-20 as desired.

---

## Project Structure

```
app/
  api/admin/flashcard-maker/
    download/route.ts      # Downloads YouTube videos
    extract/route.ts        # Extracts frames from videos (THIS IS THE PROBLEM FILE)
    generate-pdf/route.ts   # Generates PDF flashcards
  admin/flashcard-maker/
    page.tsx               # Main page component

components/flashcard-maker/
  FlashcardMaker.tsx       # Main component with UI
  FlashcardPreview.tsx     # Preview component
  FlashcardPDF.tsx         # PDF generation UI component
```

---

## Dependencies (package.json)

```json
{
  "dependencies": {
    "next": "16.0.7",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "jspdf": "^3.0.4",
    "pdfkit": "^0.17.2"
  }
}
```

**System Requirements**:
- `yt-dlp` (version 2025.12.08) - Must be installed on system
- `ffmpeg` (version 8.0.1) - Must be installed on system

---

## File 1: Download Route (`app/api/admin/flashcard-maker/download/route.ts`)

```typescript
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

// Type for video info from yt-dlp
interface VideoInfo {
  title?: string;
  [key: string]: any;
}

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
      const info: VideoInfo = JSON.parse(infoJson || '{}');
      
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
    const ytdlpCommand = `yt-dlp \
      -f "bestvideo[height<=720]+bestaudio/best[height<=720]" \
      --merge-output-format mp4 \
      --write-auto-sub \
      --sub-lang en \
      --convert-subs vtt \
      --quiet \
      --no-progress \
      --no-warnings \
      -o "${outputPath}" \
      "https://www.youtube.com/watch?v=${videoId}" 2>/dev/null || true`;

    // Execute download
    await execAsync(ytdlpCommand, { maxBuffer: 1024 * 1024, timeout: 120000 });

    // Get video info separately
    let info: VideoInfo = {};
    try {
      const { stdout: infoJson } = await execAsync(
        `yt-dlp --dump-json --quiet --no-warnings "https://www.youtube.com/watch?v=${videoId}" 2>/dev/null`,
        { maxBuffer: 5 * 1024 * 1024 }
      );
      info = JSON.parse(infoJson.trim()) as VideoInfo;
    } catch {
      info = { title: 'Downloaded Video' };
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
```

**Status**: ✅ Working correctly

---

## File 2: Extract Route (`app/api/admin/flashcard-maker/extract/route.ts`) - **PROBLEM FILE**

```typescript
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

    // Get video duration
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}" 2>/dev/null`
    );
    const duration = parseFloat(durationOutput.trim());

    // Use FFmpeg scene detection filter
    const threshold = sensitivity;
    
    // Extract scene change frames
    const timestampFile = path.join(framesDir, 'timestamps.txt');
    const ffmpegCommand = `ffmpeg -i "${filePath}" \
      -vf "select='gt(scene,${threshold})',showinfo" \
      -vsync vfr \
      -frame_pts 1 \
      -loglevel error \
      "${framesDir}/frame_%04d.jpg" 2>&1 | grep -E "pts_time:" > "${timestampFile}" 2>/dev/null || touch "${timestampFile}"`;

    // Execute ffmpeg
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

    // ⚠️ PROBLEM AREA - Lines 189-205
    // This is where the issue is - it only adds frames if less than 3, and limits to 20 max
    // Current behavior: Only generates 6 frames even with sensitivity at 10%
    
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
        
        // Extract frame at timestamp with high quality
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

    // Cleanup frame files
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
```

**PROBLEM IDENTIFIED**: 
- Lines 189-198: Only adds frames if `filteredTimestamps.length < 3`, and only adds 6 frames total
- Lines 200-205: Limits to max 20 frames but doesn't ensure minimum 10 frames
- The scene detection is working, but the fallback logic is too conservative

**DESIRED BEHAVIOR**: Always generate 10-20 flashcards, prioritizing scene changes but filling gaps with evenly-spaced frames if needed.

---

## File 3: PDF Generation Route (`app/api/admin/flashcard-maker/generate-pdf/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import PDFDocument from 'pdfkit';
import path from 'path';

interface ExtractedFrame {
  timestamp: number;
  imageData: string; // base64 with data:image/jpeg;base64, prefix
  lyric?: string;
}

interface PDFRequest {
  frames: ExtractedFrame[];
  songTitle: string;
  cardsPerPage: 1 | 2 | 4;
  borderColor: string;
  showTimestamps: boolean;
}

// A4 dimensions in points (72 points = 1 inch, A4 = 210mm x 297mm)
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 28.35;

// Format timestamp for display
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequest = await request.json();
    const { frames, songTitle, cardsPerPage, borderColor, showTimestamps } = body;

    if (!frames || frames.length === 0) {
      return new Response(JSON.stringify({ message: 'No frames provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set font path to node_modules location
    const fontPath = path.join(process.cwd(), 'node_modules/pdfkit/js/data');
    
    // Create PDF document with built-in font to avoid font loading issues
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: false,
      bufferPages: true,
      font: path.join(fontPath, 'Courier.afm')
    });

    // Collect PDF chunks
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const borderWidth = cardsPerPage === 1 ? 3 : cardsPerPage === 2 ? 2 : 1.5;
    const cornerRadius = cardsPerPage === 1 ? 5 : cardsPerPage === 2 ? 4 : 3;
    const fontSize = cardsPerPage === 1 ? 16 : cardsPerPage === 2 ? 12 : 8;

    // Calculate card dimensions
    const availableWidth = A4_WIDTH - (MARGIN * 2);
    const availableHeight = A4_HEIGHT - (MARGIN * 2);

    let cardWidth: number;
    let cardHeight: number;
    let cols: number;
    let rows: number;
    let gap: number;

    switch (cardsPerPage) {
      case 1:
        cols = 1;
        rows = 1;
        gap = 0;
        cardWidth = availableWidth;
        cardHeight = availableHeight;
        break;
      case 2:
        cols = 1;
        rows = 2;
        gap = 14.17;
        cardWidth = availableWidth;
        cardHeight = (availableHeight - gap) / 2;
        break;
      case 4:
        cols = 2;
        rows = 2;
        gap = 11.34;
        cardWidth = (availableWidth - gap) / 2;
        cardHeight = (availableHeight - gap) / 2;
        break;
    }

    // Process frames
    let frameIndex = 0;
    let pageNum = 0;

    const color = hexToRgb(borderColor);

    while (frameIndex < frames.length) {
      doc.addPage();
      pageNum++;

      // Draw cards on this page
      for (let cardNum = 0; cardNum < cardsPerPage && frameIndex < frames.length; cardNum++) {
        const frame = frames[frameIndex];
        
        // Calculate position
        const col = cardNum % cols;
        const row = Math.floor(cardNum / cols);
        const x = MARGIN + (col * (cardWidth + gap));
        const y = MARGIN + (row * (cardHeight + gap));

        // Draw rounded rectangle border
        doc.roundedRect(x, y, cardWidth, cardHeight, cornerRadius)
           .lineWidth(borderWidth)
           .strokeColor(color.r, color.g, color.b)
           .stroke();

        // Calculate image dimensions
        const imagePadding = borderWidth + 14.17;
        const imageMaxWidth = cardWidth - (imagePadding * 2);
        const imageMaxHeight = frame.lyric 
          ? cardHeight - (imagePadding * 2) - 56.69
          : cardHeight - (imagePadding * 2);
        
        const imageX = x + imagePadding;
        const imageY = y + imagePadding;

        // Add image
        try {
          const base64Data = frame.imageData.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          const aspectRatio = 16 / 9;
          let imgWidth = imageMaxWidth;
          let imgHeight = imgWidth / aspectRatio;
          
          if (imgHeight > imageMaxHeight) {
            imgHeight = imageMaxHeight;
            imgWidth = imgHeight * aspectRatio;
          }
          
          const imgX = imageX + (imageMaxWidth - imgWidth) / 2;
          const imgY = imageY + (imageMaxHeight - imgHeight) / 2;
          
          doc.image(imageBuffer, imgX, imgY, {
            width: imgWidth,
            height: imgHeight
          });
        } catch (error) {
          console.error('Error adding image:', error);
          doc.rect(imageX, imageY, imageMaxWidth, imageMaxHeight)
             .fillColor('#f3f4f6')
             .fill();
        }

        // Draw lyric text
        if (frame.lyric) {
          const textY = imageY + imageMaxHeight + 14.17;
          const textWidth = cardWidth - (imagePadding * 2);
          
          try {
            doc.font('Courier')
               .fontSize(fontSize)
               .fillColor('#1f2937')
               .text(frame.lyric, x + imagePadding, textY, {
                 width: textWidth,
                 align: 'center'
               });
          } catch (fontError) {
            console.error('Font error for lyrics:', fontError);
          }
        }

        // Draw timestamp if enabled
        if (showTimestamps) {
          const timestampSize = cardsPerPage === 1 ? 8 : 6;
          const timestamp = formatTimestamp(frame.timestamp);
          
          try {
            doc.font('Courier')
               .fontSize(timestampSize)
               .fillColor('#9ca3af')
               .text(
                 timestamp,
                 x + imagePadding,
                 y + cardHeight - imagePadding - 10,
                 {
                   width: cardWidth - (imagePadding * 2),
                   align: 'right'
                 }
               );
          } catch (fontError) {
            console.error('Font error for timestamp:', fontError);
          }
        }

        frameIndex++;
      }

      // Add page footer
      try {
        doc.font('Courier')
           .fontSize(8)
           .fillColor('#9ca3af')
           .text(
             `${songTitle} - Page ${pageNum}`,
             0,
             A4_HEIGHT - 14.17,
             {
               width: A4_WIDTH,
               align: 'center'
             }
           );
      } catch (fontError) {
        console.error('Font error for footer:', fontError);
      }
    }

    // Finalize PDF
    doc.end();

    // Wait for PDF to be generated
    await new Promise((resolve) => {
      doc.on('end', resolve);
    });

    // Combine chunks into single buffer
    const pdfBuffer = Buffer.concat(chunks);

    // Return PDF as download
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${songTitle.replace(/[^a-z0-9]/gi, '_')}_flashcards.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Failed to generate PDF' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
```

**Status**: ✅ Working correctly (though we previously tried jsPDF but reverted to pdfkit)

---

## File 4: Main Component (`components/flashcard-maker/FlashcardMaker.tsx`)

```typescript
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FlashcardPreview } from './FlashcardPreview';
import { FlashcardPDF } from './FlashcardPDF';

interface ExtractedFrame {
  timestamp: number;
  imageData: string; // base64
  lyric?: string;
}

interface ProcessingStatus {
  stage: 'idle' | 'downloading' | 'extracting' | 'detecting' | 'generating' | 'complete' | 'error';
  progress: number;
  message: string;
}

export function FlashcardMaker() {
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [sensitivity, setSensitivity] = useState(30); // Scene change threshold (0-100)
  const [minInterval, setMinInterval] = useState(2); // Minimum seconds between captures
  const [includeLyrics, setIncludeLyrics] = useState(true);
  const [songTitle, setSongTitle] = useState('');

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const processVideo = async () => {
    const youtubeUrl = urlInputRef.current?.value || '';
    console.log('processVideo called, youtubeUrl:', youtubeUrl);
    if (!youtubeUrl || youtubeUrl.trim() === '') {
      setStatus({ stage: 'error', progress: 0, message: 'Please enter a YouTube URL' });
      return;
    }
    
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setStatus({ stage: 'error', progress: 0, message: 'Invalid YouTube URL' });
      return;
    }

    try {
      // Stage 1: Download video
      setStatus({ stage: 'downloading', progress: 10, message: 'Downloading video from YouTube...' });
      
      const downloadRes = await fetch('/api/admin/flashcard-maker/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      
      if (!downloadRes.ok) {
        const error = await downloadRes.json();
        throw new Error(error.message || 'Failed to download video');
      }
      
      const { filePath, title, subtitles } = await downloadRes.json();
      setSongTitle(title || 'Untitled Song');

      // Stage 2: Extract frames with scene detection
      setStatus({ stage: 'detecting', progress: 40, message: 'Detecting scene changes...' });
      
      const extractRes = await fetch('/api/admin/flashcard-maker/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePath, 
          sensitivity: sensitivity / 100,
          minInterval,
          subtitles: includeLyrics ? subtitles : null
        })
      });
      
      if (!extractRes.ok) {
        const error = await extractRes.json();
        throw new Error(error.message || 'Failed to extract frames');
      }
      
      const { frames: extractedFrames } = await extractRes.json();
      setFrames(extractedFrames);

      // Stage 3: Complete
      setStatus({ 
        stage: 'complete', 
        progress: 100, 
        message: `Extracted ${extractedFrames.length} flashcard frames!` 
      });

    } catch (error) {
      setStatus({ 
        stage: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'An error occurred' 
      });
    }
  };

  const removeFrame = (index: number) => {
    setFrames(prev => prev.filter((_, i) => i !== index));
  };

  const updateLyric = (index: number, lyric: string) => {
    setFrames(prev => prev.map((frame, i) => 
      i === index ? { ...frame, lyric } : frame
    ));
  };

  const reorderFrames = (fromIndex: number, toIndex: number) => {
    setFrames(prev => {
      const newFrames = [...prev];
      const [removed] = newFrames.splice(fromIndex, 1);
      newFrames.splice(toIndex, 0, removed);
      return newFrames;
    });
  };

  const isProcessing = ['downloading', 'extracting', 'detecting', 'generating'].includes(status.stage);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">📹 Video Source</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube URL
            </label>
            <input
              ref={urlInputRef}
              type="text"
              defaultValue=""
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              disabled={isProcessing}
              autoComplete="off"
            />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scene Sensitivity: {sensitivity}%
              </label>
              <input
                type="range"
                min="10"
                max="70"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-full accent-blue-500"
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Lower = more frames, Higher = fewer frames
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Interval: {minInterval}s
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={minInterval}
                onChange={(e) => setMinInterval(Number(e.target.value))}
                className="w-full accent-blue-500"
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum seconds between captures
              </p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLyrics}
                  onChange={(e) => setIncludeLyrics(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                  disabled={isProcessing}
                />
                <span className="text-sm font-medium text-gray-700">
                  Include lyrics (if available)
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={processVideo}
            disabled={isProcessing}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {isProcessing ? '⏳ Processing...' : '🎬 Generate Flashcards'}
          </button>
        </div>
      </div>

      {/* Progress Section */}
      {status.stage !== 'idle' && (
        <div className={`rounded-2xl p-6 ${
          status.stage === 'error' 
            ? 'bg-red-50 border border-red-200' 
            : status.stage === 'complete'
            ? 'bg-green-50 border border-green-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">
              {status.stage === 'error' ? '❌' : 
               status.stage === 'complete' ? '✅' : '⏳'}
            </span>
            <span className={`font-medium ${
              status.stage === 'error' ? 'text-red-700' : 
              status.stage === 'complete' ? 'text-green-700' : 'text-blue-700'
            }`}>
              {status.message}
            </span>
          </div>
          
          {isProcessing && (
            <div className="w-full bg-white rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Preview Section */}
      {frames.length > 0 && (
        <>
          <FlashcardPreview 
            frames={frames}
            songTitle={songTitle}
            onRemove={removeFrame}
            onUpdateLyric={updateLyric}
            onReorder={reorderFrames}
          />
          
          <FlashcardPDF 
            frames={frames}
            songTitle={songTitle}
          />
        </>
      )}
    </div>
  );
}
```

**Status**: ✅ Working correctly

---

## File 5: Page Component (`app/admin/flashcard-maker/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { FlashcardMaker } from '@/components/flashcard-maker/FlashcardMaker';

export default function FlashcardMakerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎵 Song Flashcard Maker
          </h1>
          <p className="text-gray-600">
            Automatically generate flashcards from YouTube song videos for your kindergarten class
          </p>
        </div>
        
        {/* Vercel Limitation Notice */}
        {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1') && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  ⚠️ Production Limitation
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    This feature requires system tools (ffmpeg, yt-dlp) that are not available on Vercel's serverless functions.
                  </p>
                  <p className="mt-2">
                    <strong>To use this feature:</strong> Run the app locally with <code className="bg-yellow-100 px-1 rounded">npm run dev</code> and access at <code className="bg-yellow-100 px-1 rounded">http://localhost:3000/admin/flashcard-maker</code>
                  </p>
                  <p className="mt-2 text-xs">
                    See <code>FLASHCARD-MAKER-SETUP.md</code> for deployment alternatives.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <FlashcardMaker />
      </div>
    </div>
  );
}
```

**Status**: ✅ Working correctly

---

## Errors Encountered & Fixes Attempted

### Error 1: Video Not Downloading
**Error**: Videos weren't being downloaded, only metadata was retrieved  
**Root Cause**: The original code used `--dump-json` flag which outputs JSON instead of downloading  
**Fix Applied**: Separated video download command from metadata retrieval  
**Status**: ✅ FIXED

### Error 2: PDF Generation Font Error
**Error**: `ENOENT: no such file or directory, open '.../Helvetica.afm'`  
**Root Cause**: PDFKit trying to load font files that don't exist in Next.js build environment  
**Fix Attempted**: 
1. First tried removing `.font()` calls - didn't work
2. Then tried switching to jsPDF - worked but user reverted
3. Current: Using PDFKit with Courier font path and try-catch blocks  
**Status**: ✅ WORKING (with fallbacks)

### Error 3: TypeScript Build Error
**Error**: `Property 'title' does not exist on type '{}'`  
**Root Cause**: Missing type definition for yt-dlp JSON output  
**Fix Applied**: Added `VideoInfo` interface with optional properties  
**Status**: ✅ FIXED

### Error 4: Not Enough Flashcards Generated ⚠️ CURRENT ISSUE
**Error**: Only generating 6 flashcards even with sensitivity at 10%  
**Root Cause**: 
- Lines 189-198 in `extract/route.ts`: Only adds frames if `filteredTimestamps.length < 3`, and only adds 6 frames total
- The fallback logic is too conservative
- Scene detection may be working, but not enough frames are being captured

**Current Behavior**:
1. FFmpeg scene detection runs and finds some timestamps
2. Timestamps are filtered by `minInterval` (default 2 seconds)
3. If less than 3 frames found, adds 6 evenly-spaced frames
4. If more than 20 frames, reduces to 20
5. **Problem**: Never ensures minimum 10 frames

**Desired Behavior**:
- Always generate 10-20 flashcards
- Prioritize scene changes from FFmpeg
- Fill gaps with evenly-spaced frames if scene detection doesn't find enough
- Better distribution across the entire video duration

---

## Proposed Solution

Replace lines 189-205 in `app/api/admin/flashcard-maker/extract/route.ts` with:

```typescript
    // Ensure we have at least 10 frames, ideally 15-20
    const targetFrames = 15; // Target number of frames
    const minFrames = 10;    // Minimum acceptable frames
    const maxFrames = 20;    // Maximum frames
    
    // If we have too few frames from scene detection, add evenly spaced ones
    if (filteredTimestamps.length < minFrames) {
      // Calculate interval to get target number of frames
      const neededFrames = targetFrames - filteredTimestamps.length;
      const interval = duration / (neededFrames + 1);
      
      // Add evenly distributed frames throughout the video
      for (let i = 1; i <= neededFrames && filteredTimestamps.length < targetFrames; i++) {
        const t = i * interval;
        // Only add if not too close to existing frames (use half of minInterval for more frames)
        if (t < duration - 1 && !filteredTimestamps.some(ts => Math.abs(ts - t) < minInterval / 2)) {
          filteredTimestamps.push(t);
        }
      }
      filteredTimestamps.sort((a, b) => a - b);
    }

    // If we still don't have enough, be even more aggressive
    if (filteredTimestamps.length < minFrames) {
      const interval = duration / minFrames;
      for (let i = 0; i < minFrames; i++) {
        const t = i * interval;
        if (!filteredTimestamps.some(ts => Math.abs(ts - t) < 0.5)) {
          filteredTimestamps.push(t);
        }
      }
      filteredTimestamps.sort((a, b) => a - b);
    }

    // If we have too many frames (>20), reduce intelligently
    let finalTimestamps = filteredTimestamps;
    if (filteredTimestamps.length > maxFrames) {
      // Keep first and last frames, then evenly distribute the rest
      const step = Math.ceil(filteredTimestamps.length / maxFrames);
      finalTimestamps = filteredTimestamps.filter((_, i) => i % step === 0);
      
      // Ensure we have exactly maxFrames or close to it
      if (finalTimestamps.length > maxFrames) {
        finalTimestamps = finalTimestamps.slice(0, maxFrames);
      }
    }
```

---

## Testing Instructions

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Access the flashcard maker**:
   ```
   http://localhost:3000/admin/flashcard-maker
   ```

3. **Test with a YouTube video**:
   - URL: `https://www.youtube.com/watch?v=frN3nvhIHUk`
   - Set sensitivity to 10%
   - Set min interval to 1 second
   - Click "Generate Flashcards"

4. **Expected Result**: Should generate 10-20 flashcards

5. **Current Result**: Only generates 6 flashcards

---

## Summary

**Main Issue**: The frame extraction logic in `extract/route.ts` (lines 189-205) is too conservative and doesn't ensure a minimum of 10 frames.

**Solution**: Replace the fallback logic to always generate 10-20 frames, prioritizing scene changes but filling gaps with evenly-spaced frames when needed.

**Files to Modify**: 
- `app/api/admin/flashcard-maker/extract/route.ts` (lines 189-205)

**All other files are working correctly.**









