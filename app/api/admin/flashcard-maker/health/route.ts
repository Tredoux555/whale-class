import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
    }
  };

  // Check ffmpeg
  try {
    const { stdout } = await execAsync('ffmpeg -version 2>&1 | head -1', { timeout: 5000 });
    checks.ffmpeg = { status: 'OK', version: stdout.trim() };
  } catch (e) {
    checks.ffmpeg = { status: 'FAILED', error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Check ffprobe
  try {
    const { stdout } = await execAsync('ffprobe -version 2>&1 | head -1', { timeout: 5000 });
    checks.ffprobe = { status: 'OK', version: stdout.trim() };
  } catch (e) {
    checks.ffprobe = { status: 'FAILED', error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Check yt-dlp
  try {
    const { stdout } = await execAsync('yt-dlp --version', { timeout: 5000 });
    checks.ytdlp = { status: 'OK', version: stdout.trim() };
  } catch (e) {
    checks.ytdlp = { status: 'FAILED', error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Check /tmp writable
  try {
    const testPath = '/tmp/flashcard-health-test-' + Date.now();
    await fs.mkdir(testPath, { recursive: true });
    await fs.writeFile(testPath + '/test.txt', 'test');
    await fs.rm(testPath, { recursive: true });
    checks.tmp_writable = { status: 'OK' };
  } catch (e) {
    checks.tmp_writable = { status: 'FAILED', error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Check disk space in /tmp
  try {
    const { stdout } = await execAsync('df -h /tmp | tail -1', { timeout: 5000 });
    checks.tmp_disk = { status: 'OK', info: stdout.trim() };
  } catch (e) {
    checks.tmp_disk = { status: 'FAILED', error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Overall status
  const allOk = ['ffmpeg', 'ffprobe', 'ytdlp', 'tmp_writable'].every(
    key => (checks[key] as { status: string })?.status === 'OK'
  );

  return NextResponse.json({
    overall: allOk ? 'HEALTHY' : 'UNHEALTHY',
    checks
  }, { status: allOk ? 200 : 500 });
}
