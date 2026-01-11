import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import https from 'https';
import http from 'http';

const execAsync = promisify(exec);

const TEMP_DIR = '/tmp/flashcard-maker';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const file = require('fs').createWriteStream(destPath);
    
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err: Error) => {
        require('fs').unlink(destPath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', (err) => {
      require('fs').unlink(destPath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Download-Uploaded] Starting...');
  
  try {
    const { videoUrl, filename } = await request.json();
    console.log(`[Download-Uploaded] URL: ${videoUrl?.slice(0, 100)}...`);
    console.log(`[Download-Uploaded] Filename: ${filename}`);

    if (!videoUrl) {
      return NextResponse.json(
        { message: 'Video URL is required' },
        { status: 400 }
      );
    }

    await fs.mkdir(TEMP_DIR, { recursive: true });

    // Create a unique filename with timestamp
    const safeFilename = filename?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'video.mp4';
    const outputPath = path.join(TEMP_DIR, `video_${Date.now()}_${safeFilename}`);
    
    console.log(`[Download-Uploaded] Downloading fresh copy for "${filename}"`);
    console.log(`[Download-Uploaded] Output path: ${outputPath}`);
    
    // Always download fresh - no caching to avoid wrong video issues
    try {
      await downloadFile(videoUrl, outputPath);
      
      const stats = await fs.stat(outputPath);
      console.log(`[Download-Uploaded] Downloaded: ${Math.round(stats.size/1024/1024)}MB`);
      
      if (stats.size < 1000) {
        throw new Error('Downloaded file is too small - may be corrupted');
      }
    } catch (dlError) {
      console.error('[Download-Uploaded] Download error:', dlError);
      throw new Error(`Failed to download video: ${dlError instanceof Error ? dlError.message : 'Unknown error'}`);
    }

    // Get duration using ffprobe
    let duration = 180;
    try {
      const { stdout: durationOut } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`,
        { timeout: 15000 }
      );
      duration = parseFloat(durationOut.trim()) || 180;
      console.log(`[Download-Uploaded] Video duration: ${duration}s`);
    } catch {
      console.log('[Download-Uploaded] Could not get duration, using default');
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Download-Uploaded] Complete in ${elapsed}s - returning path: ${outputPath}`);

    return NextResponse.json({
      filePath: outputPath,
      duration
    });

  } catch (error) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[Download-Uploaded] Failed after ${elapsed}s:`, error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to download video' },
      { status: 500 }
    );
  }
}
