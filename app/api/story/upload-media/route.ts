import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken, getCurrentWeekStart } from '@/lib/story-db';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

// Allow large uploads on slow mobile networks (videos up to 300MB)
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Retry helper for Supabase storage uploads (handles ECONNRESET / transient network errors)
async function uploadWithRetry(
  supabase: ReturnType<typeof getSupabase>,
  bucket: string,
  path: string,
  data: Uint8Array,
  options: { contentType: string; upsert: boolean },
  maxRetries = 2
): Promise<{ error: { message: string } | null }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.storage.from(bucket).upload(path, data, options);
    if (!error) return { error: null };

    const msg = error.message || '';
    const isTransient = msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') ||
                        msg.includes('CONNECT_TIMEOUT') || msg.includes('fetch failed') ||
                        msg.includes('socket hang up') || msg.includes('network');

    if (!isTransient || attempt === maxRetries) {
      return { error: { message: error.message || 'Upload failed' } };
    }

    // Exponential backoff: 1s, 2s
    const delay = (attempt + 1) * 1000;
    console.log(`[Upload Media] Retry ${attempt + 1}/${maxRetries} after ${delay}ms — ${msg}`);
    await new Promise(r => setTimeout(r, delay));
  }
  return { error: { message: 'Upload failed after retries' } };
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/x-m4v', 'video/3gpp', 'video/3gpp2'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/flac', 'audio/webm'];
const DOCUMENT_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
];

const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB — bucket raised to 1GB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB

function getFileType(mimeType: string, filename: string): 'image' | 'video' | 'audio' | 'document' | null {
  if (IMAGE_TYPES.includes(mimeType)) return 'image';
  if (VIDEO_TYPES.includes(mimeType)) return 'video';
  if (AUDIO_TYPES.includes(mimeType)) return 'audio';
  if (DOCUMENT_TYPES.includes(mimeType)) return 'document';

  // Some mobile browsers send application/octet-stream — fall through to extension check
  const ext = filename.split('.').pop()?.toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', '3gp', '3g2'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'weba'];
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];

  if (ext && imageExts.includes(ext)) return 'image';
  if (ext && videoExts.includes(ext)) return 'video';
  if (ext && audioExts.includes(ext)) return 'audio';
  if (ext && docExts.includes(ext)) return 'document';

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const username = await verifyUserToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Detect file type — browsers may send empty/wrong MIME for .mov, .m4v, etc.
    const effectiveMime = file.type || '';
    const fileType = getFileType(effectiveMime, file.name);
    if (!fileType) {
      console.warn(`[Upload Media] Unsupported file: ${file.name}, MIME: "${file.type}", size: ${file.size}`);
      return NextResponse.json({ error: `Unsupported file type: ${file.name} (${file.type || 'unknown'})` }, { status: 400 });
    }

    const maxSizes = { image: MAX_IMAGE_SIZE, video: MAX_VIDEO_SIZE, audio: MAX_AUDIO_SIZE, document: MAX_DOCUMENT_SIZE };
    if (file.size > maxSizes[fileType]) {
      return NextResponse.json({ error: `File too large. Max: ${maxSizes[fileType] / (1024 * 1024)}MB` }, { status: 400 });
    }

    const supabase = getSupabase();
    const weekStartDate = getCurrentWeekStart();
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${timestamp}-${username}.${ext}`;
    const storagePath = `story-media/${weekStartDate}/${filename}`;

    // Read file into buffer — log size for diagnostics
    console.log(`[Upload Media] Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB, ${file.type || 'unknown MIME'}) as ${fileType} to ${storagePath}`);

    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (bufferErr) {
      console.error('[Upload Media] Failed to read file buffer:', bufferErr);
      return NextResponse.json({ error: 'Failed to read file — it may be too large for server memory' }, { status: 500 });
    }
    const buffer = new Uint8Array(arrayBuffer);

    const fallbackMimes: Record<string, string> = { image: 'image/jpeg', video: 'video/mp4', audio: 'audio/mpeg', document: 'application/octet-stream' };
    const effectiveContentType = file.type || fallbackMimes[fileType] || 'application/octet-stream';
    const { error: uploadError } = await uploadWithRetry(
      supabase, 'story-uploads', storagePath, buffer,
      { contentType: effectiveContentType, upsert: false },
      fileType === 'video' ? 3 : 2 // extra retry for videos
    );

    if (uploadError) {
      const msg = uploadError.message || '';
      console.error(`[Upload Media] Supabase storage error (${fileType}, ${(file.size / (1024 * 1024)).toFixed(1)}MB):`, msg);

      // Surface specific, actionable error messages
      if (msg.includes('Payload too large') || msg.includes('exceeded') || msg.includes('size')) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(0);
        return NextResponse.json({
          error: `Video too large for storage (${sizeMB}MB). Maximum is 500MB. Try trimming your video or recording at lower quality.`
        }, { status: 413 });
      }
      if (msg.includes('mime') || msg.includes('type')) {
        return NextResponse.json({
          error: `File type not supported: ${effectiveContentType}. Try converting to .mp4.`
        }, { status: 400 });
      }
      if (msg.includes('quota') || msg.includes('space')) {
        return NextResponse.json({
          error: 'Storage is full. Please contact the administrator.'
        }, { status: 507 });
      }

      return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 });
    }

    // Write a Cloudflare-proxied URL instead of Supabase's raw public URL.
    // This routes playback through our /api/montree/media/proxy edge-cached route
    // (HTTP Range support, China CDN, 7-day edge cache).
    const mediaUrl = getProxyUrl(storagePath, 'story-uploads');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Core fields only — session linking columns not present in production
    const mediaRecord = {
      week_start_date: weekStartDate,
      message_type: fileType,
      media_url: mediaUrl,
      media_filename: file.name,
      author: username,
      expires_at: expiresAt.toISOString(),
      is_expired: false,
    };

    let { error: insertError } = await supabase.from('story_message_history').insert(mediaRecord);

    // CHECK constraint fallback: if 'document' isn't in the allowed enum yet,
    // store as 'image' — readers detect documents by filename extension.
    if (
      insertError &&
      fileType === 'document' &&
      (insertError.code === '23514' || insertError.message?.includes('check constraint'))
    ) {
      console.warn('[Upload Media] message_type=document not allowed by CHECK constraint — falling back to image');
      const { error: fbError } = await supabase.from('story_message_history').insert({
        ...mediaRecord,
        message_type: 'image',
      });
      insertError = fbError;
    }

    if (insertError) {
      console.error('[Upload Media] DB insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save media record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mediaUrl,
      fileName: file.name,
      fileType,
      expiresIn: '24 hours'
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const isAbort = errMsg.includes('aborted') || errMsg.includes('ECONNRESET');
    console.error(`[Upload Media] ${isAbort ? 'Connection' : 'Unexpected'} error:`, errMsg);
    return NextResponse.json({
      error: isAbort
        ? 'Upload connection was interrupted. Please try again.'
        : `Failed to upload media: ${errMsg}`
    }, { status: 500 });
  }
}
