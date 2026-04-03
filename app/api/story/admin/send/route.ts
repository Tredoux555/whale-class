import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { encryptMessage } from '@/lib/message-encryption';
import {
  getCurrentWeekStart,
  getSessionToken,
  verifyStoryAdminToken,
  getAdminLoginLogId,
} from '@/lib/story/story-admin-auth';

// Allow large uploads (video up to 100MB)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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
    allowedExts: ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'],
    allowedMimes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/x-m4v'],
    maxSize: 100 * 1024 * 1024, // 100MB
    defaultExt: 'mp4',
    filenamePrefix: 'admin_video',
  },
} as const;

type MediaType = keyof typeof MEDIA_CONFIG;

function detectMediaType(file: File): MediaType | null {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  // Fallback: check extension for audio (some browsers report wrong MIME)
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && MEDIA_CONFIG.audio.allowedExts.includes(ext)) return 'audio';
  return null;
}

function validateFile(file: File, type: MediaType): string | null {
  const config = MEDIA_CONFIG[type];

  // Type validation
  if (type === 'audio') {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!config.allowedMimes.includes(file.type) && (!ext || !config.allowedExts.includes(ext))) {
      return 'Only audio files are allowed';
    }
  } else if (!file.type.startsWith(config.mimePrefix)) {
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

    const sessionToken = getSessionToken(authHeader);
    const contentType = req.headers.get('content-type') || '';
    const supabase = getSupabase();
    const weekStartDate = getCurrentWeekStart();
    const loginLogId = await getAdminLoginLogId(supabase, sessionToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // --- TEXT MESSAGE (JSON body) ---
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { message } = body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
      }

      const trimmedMessage = message.trim();
      const encryptedMessage = encryptMessage(trimmedMessage);

      await supabase.from('story_message_history').insert({
        week_start_date: weekStartDate,
        message_type: 'text',
        message_content: encryptedMessage,
        author: adminUsername,
        expires_at: expiresAt.toISOString(),
        is_expired: false,
      });

      // Upsert current week's secret story
      const { data: existing } = await supabase
        .from('secret_stories')
        .select('week_start_date')
        .eq('week_start_date', weekStartDate)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from('secret_stories')
          .update({
            hidden_message: encryptedMessage,
            message_author: adminUsername,
            updated_at: new Date().toISOString(),
          })
          .eq('week_start_date', weekStartDate);
      } else {
        await supabase.from('secret_stories').insert({
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
          message_author: adminUsername,
        });
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

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('story-uploads')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || `${config.mimePrefix}*`,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[Send ${mediaType}] Upload error:`, uploadError);
      return NextResponse.json({ error: `Failed to upload ${mediaType}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('story-uploads')
      .getPublicUrl(filePath);

    const mediaUrl = urlData.publicUrl;
    const encryptedCaption = caption.trim() ? encryptMessage(caption.trim()) : null;

    await supabase.from('story_message_history').insert({
      week_start_date: weekStartDate,
      message_type: mediaType,
      message_content: encryptedCaption,
      media_url: mediaUrl,
      media_filename: file.name || filename,
      author: adminUsername,
      expires_at: expiresAt.toISOString(),
      is_expired: false,
    });

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
