import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { verifyToken, extractToken, getCurrentWeekStart, getExpirationDate } from '@/lib/story-auth';

// Initialize Supabase client for storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Max file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export async function POST(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const author = (formData.get('author') as string) || payload.username;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Determine if image or video
    const mimeType = file.type;
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WEBP, MP4, MOV, WEBM' },
        { status: 400 }
      );
    }

    // Check file size
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxSizeMB}MB` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
    const filename = `${author}-${timestamp}-${randomId}.${extension}`;
    const filePath = `messages/${getCurrentWeekStart()}/${filename}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('story-media')
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('story-media')
      .getPublicUrl(filePath);

    const mediaUrl = urlData.publicUrl;
    const weekStartDate = getCurrentWeekStart();
    const expiresAt = getExpirationDate();
    const messageType = isImage ? 'image' : 'video';

    // Save to database
    const result = await db.query(
      `INSERT INTO story_message_history 
       (week_start_date, author, message_type, media_url, media_filename, 
        media_size_bytes, media_mime_type, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [weekStartDate, author, messageType, mediaUrl, filename, file.size, mimeType, expiresAt]
    );

    return NextResponse.json({
      success: true,
      media: {
        id: result.rows[0].id,
        type: messageType,
        url: mediaUrl,
        filename: filename,
        mimeType: mimeType,
        author: author
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json(
      { error: 'Failed to upload media', details: message },
      { status: 500 }
    );
  }
}

// DELETE: Remove a media item
export async function DELETE(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('id');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    // Get the media item (only allow deletion of own media)
    const mediaResult = await db.query(
      `SELECT media_url, author FROM story_message_history WHERE id = $1`,
      [mediaId]
    );

    if (mediaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const media = mediaResult.rows[0];
    
    // Check ownership (admins can delete any, users only their own)
    if (payload.type !== 'admin' && media.author !== payload.username) {
      return NextResponse.json({ error: 'Not authorized to delete this media' }, { status: 403 });
    }

    // Delete from storage
    const url = new URL(media.media_url);
    const pathParts = url.pathname.split('/story-media/');
    if (pathParts.length > 1) {
      const storagePath = pathParts[1];
      await supabase.storage.from('story-media').remove([storagePath]);
    }

    // Mark as expired in database (soft delete)
    await db.query(
      `UPDATE story_message_history SET is_expired = TRUE WHERE id = $1`,
      [mediaId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}
