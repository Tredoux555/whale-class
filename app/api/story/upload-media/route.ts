import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken, getCurrentWeekStart, getSessionToken, getLoginLogId } from '@/lib/story-db';

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

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_SIZE = 300 * 1024 * 1024; // 300MB — iPhone videos can be large
const MAX_AUDIO_SIZE = 50 * 1024 * 1024;

function getFileType(mimeType: string, filename: string): 'image' | 'video' | 'audio' | null {
  if (IMAGE_TYPES.includes(mimeType)) return 'image';
  if (VIDEO_TYPES.includes(mimeType)) return 'video';
  if (AUDIO_TYPES.includes(mimeType)) return 'audio';

  // Some mobile browsers send application/octet-stream — fall through to extension check
  const ext = filename.split('.').pop()?.toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', '3gp', '3g2'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'weba'];
  
  if (ext && imageExts.includes(ext)) return 'image';
  if (ext && videoExts.includes(ext)) return 'video';
  if (ext && audioExts.includes(ext)) return 'audio';
  
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

    const maxSizes = { image: MAX_IMAGE_SIZE, video: MAX_VIDEO_SIZE, audio: MAX_AUDIO_SIZE };
    if (file.size > maxSizes[fileType]) {
      return NextResponse.json({ error: `File too large. Max: ${maxSizes[fileType] / (1024 * 1024)}MB` }, { status: 400 });
    }

    const supabase = getSupabase();
    const weekStartDate = getCurrentWeekStart();
    const authHeader = req.headers.get('authorization');
    const sessionToken = getSessionToken(authHeader);
    const loginLogId = await getLoginLogId(sessionToken);
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

    const effectiveContentType = file.type || `${fileType === 'video' ? 'video/mp4' : fileType === 'audio' ? 'audio/mpeg' : 'image/jpeg'}`;
    const { error: uploadError } = await uploadWithRetry(
      supabase, 'story-uploads', storagePath, buffer,
      { contentType: effectiveContentType, upsert: false },
      fileType === 'video' ? 3 : 2 // extra retry for videos
    );

    if (uploadError) {
      console.error('[Upload Media] Supabase storage error:', uploadError.message);
      return NextResponse.json({ error: `Upload to storage failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('story-uploads').getPublicUrl(storagePath);
    const mediaUrl = urlData.publicUrl;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Core fields always present; session linking fields may not exist in DB yet
    const mediaRecord: Record<string, unknown> = {
      week_start_date: weekStartDate,
      message_type: fileType,
      media_url: mediaUrl,
      media_filename: file.name,
      author: username,
      expires_at: expiresAt.toISOString(),
      is_expired: false,
    };
    if (sessionToken) mediaRecord.session_token = sessionToken;
    if (loginLogId) mediaRecord.login_log_id = loginLogId;
    mediaRecord.is_from_admin = false;

    let { error: insertError } = await supabase.from('story_message_history').insert(mediaRecord);

    // Retry without session fields if columns don't exist
    if (insertError && (insertError.message?.includes('column') || insertError.code === '42703')) {
      console.warn('[Upload Media] Session columns missing — retrying without:', insertError.message);
      const { error: retryError } = await supabase.from('story_message_history').insert({
        week_start_date: weekStartDate,
        message_type: fileType,
        media_url: mediaUrl,
        media_filename: file.name,
        author: username,
        expires_at: expiresAt.toISOString(),
        is_expired: false,
      });
      insertError = retryError;
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
