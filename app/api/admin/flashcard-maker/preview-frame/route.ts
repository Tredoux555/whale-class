import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { filePath, timestamp } = await request.json();

    if (!filePath || timestamp === undefined) {
      return NextResponse.json(
        { message: 'File path and timestamp required' },
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

    // Extract single frame at timestamp
    const tempPath = `/tmp/preview_${Date.now()}.jpg`;
    
    await execAsync(
      `ffmpeg -ss ${timestamp} -i "${filePath}" -vframes 1 -q:v 3 -y "${tempPath}"`,
      { timeout: 10000 }
    );

    // Read and convert to base64
    const imageBuffer = await fs.readFile(tempPath);
    const base64 = imageBuffer.toString('base64');

    // Cleanup
    await fs.unlink(tempPath).catch(() => {});

    return NextResponse.json({
      imageData: `data:image/jpeg;base64,${base64}`,
      timestamp
    });

  } catch (error) {
    console.error('Preview frame error:', error);
    return NextResponse.json(
      { message: 'Failed to extract preview frame' },
      { status: 500 }
    );
  }
}

