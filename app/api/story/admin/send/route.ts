import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { encryptMessage } from '@/lib/message-encryption';
import {
  getCurrentWeekStart,
  verifyStoryAdminToken,
} from '@/lib/story/story-admin-auth';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

// Allow large uploads (video up to 300MB — mobile 4G can take a few min)
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Retry helper for Supabase storage uploads (handles ECONNRESET / transient network errors)
async function uploadWithRetry(
  supabase: ReturnType<typeof getSupabase>,
  bucket: string,
  path: string,
  data: ArrayBuffer | Uint8Array,
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

    const delay = (attempt + 1) * 1000;
    console.log(`[Admin Send] Retry ${attempt + 1}/${maxRetries} after ${delay}ms — ${msg}`);
    await new Promise(r => setTimeout(r, delay));
  }
  return { error: { message: 'Upload failed after retries' } };
}

// File type validation rules
const MEDIA_CONFIG = {
  audio: {
    mimePrefix: 'audio/',
    allowedExts: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'weba'],
    allowedMimes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/flac', 'audio/webm'],
    maxSize: 50 * 1024 * 1024, // 50MB
    defaultExt: 'mp3',
    filenamePrefix: 'admin_audio',
  },
  image: {
    mimePrefix: 'image/',
    allowedExts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg'],
    allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/bmp', 'image/svg+xml'],
    maxSize: 10 * 1024 * 1024, // 10MB
    defaultExt: 'jpg',
    filenamePrefix: 'admin_img',
  },
  video: {
    mimePrefix: 'video/',
    allowedExts: ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v', '3gp', '3g2'],
    allowedMimes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/x-m4v', 'video/3gpp', 'video/3gpp2'],
    maxSize: 500 * 1024 * 1024, // 500MB — bucket raised to 1GB
    defaultExt: 'mp4',
    filenamePrefix: 'admin_video',
  },
  document: {
    mimePrefix: 'application/',
    allowedExts: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'odt', 'ods', 'odp', 'zip', 'epub'],
    allowedMimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation',
      'application/rtf',
      'application/zip',
      'application/epub+zip',
      'text/plain',
      'text/csv',
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    defaultExt: 'pdf',
    filenamePrefix: 'admin_doc',
  },
} as const;

type MediaType = keyof typeof MEDIA_CONFIG;

function detectMediaType(file: File): MediaType | null {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('application/') || mime.startsWith('text/')) {
    if (MEDIA_CONFIG.document.allowedMimes.includes(mime as never)) return 'document';
  }
  // Fallback: check extension (mobile browsers sometimes report wrong/empty MIME)
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && MEDIA_CONFIG.video.allowedExts.includes(ext)) return 'video';
  if (ext && MEDIA_CONFIG.image.allowedExts.includes(ext)) return 'image';
  if (ext && MEDIA_CONFIG.audio.allowedExts.includes(ext)) return 'audio';
  if (ext && MEDIA_CONFIG.document.allowedExts.includes(ext)) return 'document';
  return null;
}

function validateFile(file: File, type: MediaType): string | null {
  const config = MEDIA_CONFIG[type];

  // Type validation — mobile browsers often send empty or wrong MIME types
  // so also check file extension as fallback (same logic as detectMediaType)
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mimeOk = file.type && (
    file.type.startsWith(config.mimePrefix) ||
    config.allowedMimes.includes(file.type as never) ||
    // Documents allow text/* in addition to application/*
    (type === 'document' && file.type.startsWith('text/'))
  );
  const extOk = ext && config.allowedExts.includes(ext as never);

  if (!mimeOk && !extOk) {
    return `Only ${type} files are allowed`;
  }

  // Size validation
  if (file.size > config.maxSize) {
    const maxMB = config.maxSize / (1024 * 1024);
    return `File too large (max ${maxMB}MB)`;
  }

  return null; // valid
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const adminUsername = await verifyStoryAdminToken(authHeader);
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    const supabase = getSupabase();
    const weekStartDate = getCurrentWeekStart();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // --- TEXT MESSAGE (JSON body) ---
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { message } = body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
      }

      // 🚨 Session 113 V2 Story audit F-4.3 — cap admin text at 5,000 chars.
      // The legacy 50K limit produced ~100KB encrypted rows; the parent
      // letter-reveal UX is a single paragraph, never anywhere near that.
      // Removes a low-effort DoS vector on the parent page render path.
      if (message.length > 5000) {
        return NextResponse.json({ error: 'Message too long (max 5,000 characters)' }, { status: 400 });
      }

      // NOTE: Session 113 V2 added an "overwrite confirmation" guard here
      // (F-4.1) that returned 409 when sending to a week that already had a
      // hidden_message. Reverted per user directive — Tredoux is the only
      // admin on this system and was finding the prompt friction-y.
      // Sends now blindly upsert the week's message as they always did.

      const trimmedMessage = message.trim();
      const encryptedMessage = encryptMessage(trimmedMessage);

      // is_from_admin flags this as an admin message so the dashboard can
      // attach a read receipt to it. (login_log_id / session_token were
      // never added to production story_message_history.)
      const textRecord = {
        week_start_date: weekStartDate,
        message_type: 'text',
        message_content: encryptedMessage,
        author: adminUsername,
        is_from_admin: true,
        expires_at: expiresAt.toISOString(),
        is_expired: false,
      };

      const { error: textInsertError } = await supabase.from('story_message_history').insert(textRecord);

      if (textInsertError) {
        console.error('[Send] Text message DB insert failed:', textInsertError);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
      }

      // Upsert current week's secret story
      const { data: existing } = await supabase
        .from('secret_stories')
        .select('week_start_date')
        .eq('week_start_date', weekStartDate)
        .limit(1);

      // 🚨 The secret_stories write powers the parent page's tap-to-reveal
      // ('t') hidden message. Its error MUST be checked — a silently
      // swallowed failure here is exactly what broke the admin→story
      // direction: a legacy CHECK constraint (secret_stories_message_author_check,
      // message_author IN ('T','Z')) rejected the newer admin usernames
      // ('J'/'P'), the UPDATE threw, and hidden_message kept the last
      // PARENT message. Parent→admin worked because parents send as 'T'/'Z'.
      //
      // Migration 245 drops that obsolete constraint. The constraint-aware
      // fallback below keeps admin notes publishing even on a DB where the
      // migration hasn't run yet: on a CHECK violation (Postgres 23514) we
      // retry the hidden_message write WITHOUT touching message_author so
      // the note still reaches the story page.
      type SbError = { message?: string; code?: string } | null;

      async function writeSecretStory(includeAuthor: boolean): Promise<SbError> {
        if (existing && existing.length > 0) {
          const update: Record<string, unknown> = {
            hidden_message: encryptedMessage,
            updated_at: new Date().toISOString(),
          };
          if (includeAuthor) update.message_author = adminUsername;
          const { error } = await supabase.from('secret_stories')
            .update(update)
            .eq('week_start_date', weekStartDate);
          return error;
        }
        const insert: Record<string, unknown> = {
          week_start_date: weekStartDate,
          theme: 'Weekly Learning',
          story_title: 'Classroom Activities',
          story_content: {
            paragraphs: [
              'Today we learned about counting and colors in class.',
              'The children practiced their letters and sounds.',
              'Everyone had fun during circle time.',
              'We read a wonderful story together.',
              'Looking forward to more learning tomorrow!',
            ],
          },
          hidden_message: encryptedMessage,
        };
        if (includeAuthor) insert.message_author = adminUsername;
        const { error } = await supabase.from('secret_stories').insert(insert);
        return error;
      }

      let secretStoriesError = await writeSecretStory(true);

      // Legacy message_author CHECK constraint fallback (pre-migration-245 DBs).
      if (
        secretStoriesError &&
        (secretStoriesError.code === '23514' ||
          secretStoriesError.message?.includes('message_author_check') ||
          secretStoriesError.message?.includes('check constraint'))
      ) {
        console.warn('[Send] secret_stories message_author rejected by CHECK constraint — retrying without author (apply migration 245)');
        secretStoriesError = await writeSecretStory(false);
      }

      if (secretStoriesError) {
        console.error('[Send] secret_stories hidden_message write failed:', secretStoriesError);
        return NextResponse.json(
          { error: 'Failed to publish note to the story page' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Note sent successfully',
        sentAt: new Date().toISOString(),
        weekStartDate,
      });
    }

    // --- MEDIA MESSAGE (FormData body) ---
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const caption = (formData.get('caption') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mediaType = detectMediaType(file);
    if (!mediaType) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const validationError = validateFile(file, mediaType);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const config = MEDIA_CONFIG[mediaType];
    const ext = file.name.split('.').pop()?.toLowerCase() || config.defaultExt;
    const filename = `${config.filenamePrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const filePath = `story-media/${weekStartDate}/${filename}`;

    // Upload to Supabase Storage (with retry for transient network errors)
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (bufferErr) {
      console.error(`[Send ${mediaType}] Failed to read file buffer:`, bufferErr);
      return NextResponse.json({ error: 'Failed to read file — it may be too large for server memory' }, { status: 500 });
    }

    console.log(`[Send ${mediaType}] Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB) to ${filePath}`);

    const { error: uploadError } = await uploadWithRetry(
      supabase, 'story-uploads', filePath, arrayBuffer,
      { contentType: file.type || `${config.mimePrefix}${config.defaultExt}`, upsert: false },
      mediaType === 'video' ? 3 : 2
    );

    if (uploadError) {
      const msg = uploadError.message || '';
      console.error(`[Send ${mediaType}] Upload error (${(file.size / (1024 * 1024)).toFixed(1)}MB):`, msg);

      // Surface specific, actionable error messages
      if (msg.includes('Payload too large') || msg.includes('exceeded') || msg.includes('size')) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(0);
        return NextResponse.json({
          error: `File too large for storage (${sizeMB}MB). Maximum is 500MB. Try a shorter video or lower quality recording.`
        }, { status: 413 });
      }
      if (msg.includes('mime') || msg.includes('type')) {
        return NextResponse.json({
          error: `File type not supported. Try converting to .mp4.`
        }, { status: 400 });
      }
      if (msg.includes('quota') || msg.includes('space')) {
        return NextResponse.json({
          error: 'Storage is full. Please contact the administrator.'
        }, { status: 507 });
      }

      return NextResponse.json({ error: `Failed to upload ${mediaType}: ${msg}` }, { status: 500 });
    }

    // Write a Cloudflare-proxied URL instead of Supabase's raw public URL.
    // Routes playback through our edge-cached proxy (HTTP Range, China CDN).
    const mediaUrl = getProxyUrl(filePath, 'story-uploads');
    const encryptedCaption = caption.trim() ? encryptMessage(caption.trim()) : null;

    // is_from_admin flags this as an admin message for the dashboard read receipt.
    const mediaRecord = {
      week_start_date: weekStartDate,
      message_type: mediaType,
      message_content: encryptedCaption,
      media_url: mediaUrl,
      media_filename: file.name || filename,
      author: adminUsername,
      is_from_admin: true,
      expires_at: expiresAt.toISOString(),
      is_expired: false,
    };

    let { error: mediaInsertError } = await supabase.from('story_message_history').insert(mediaRecord);

    // CHECK constraint fallback: if 'document' isn't in the allowed enum yet,
    // store as 'image' — readers detect documents by filename extension.
    // Use a minimal record (no session columns) so this works even on
    // databases where the session-linking migration hasn't been applied.
    if (
      mediaInsertError &&
      mediaType === 'document' &&
      (mediaInsertError.code === '23514' || mediaInsertError.message?.includes('check constraint'))
    ) {
      console.warn('[Send] message_type=document not allowed by CHECK constraint — falling back to image');
      const minimalFallback = {
        week_start_date: weekStartDate,
        message_type: 'image',
        message_content: encryptedCaption,
        media_url: mediaUrl,
        media_filename: file.name || filename,
        author: adminUsername,
        is_from_admin: true,
        expires_at: expiresAt.toISOString(),
        is_expired: false,
      };
      const { error: fbError } = await supabase.from('story_message_history').insert(minimalFallback);
      if (fbError) {
        console.error('[Send] Document image-fallback insert failed:', fbError);
      }
      mediaInsertError = fbError;
    }

    if (mediaInsertError) {
      console.error('[Send] Media message DB insert failed:', mediaInsertError);
      return NextResponse.json({ error: 'Failed to save media message' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} sent successfully`,
      mediaUrl,
      ...(mediaType === 'audio' ? { fileName: file.name } : {}),
      sentAt: new Date().toISOString(),
      weekStartDate,
    });
  } catch (error) {
    console.error('[Send] Error:', error);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
