import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';
import { createClient } from '@supabase/supabase-js';

// Increase timeout for large file uploads
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to detect file type from extension (for mobile compatibility)
function detectFileType(file: File): 'image' | 'video' {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
  const videoExtensions = ['mp4', 'webm', 'mov', 'quicktime'];
  
  if (extension && imageExtensions.includes(extension)) {
    return 'image';
  }
  if (extension && videoExtensions.includes(extension)) {
    return 'video';
  }
  
  // Fallback to MIME type
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  
  // Default to image if uncertain
  return 'image';
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const author = formData.get('author') as string;
    const providedType = formData.get('type') as string | null;

    if (!file || !author) {
      return NextResponse.json(
        { error: 'Missing file or author' },
        { status: 400 }
      );
    }

    // Detect file type (use provided type or auto-detect)
    const messageType = providedType === 'image' || providedType === 'video' 
      ? providedType 
      : detectFileType(file);

    // Validate file type - expanded list for mobile compatibility
    const validImageTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/heic',      // iOS HEIC format
      'image/heif',      // iOS HEIF format
      'image/x-heic',    // Alternative HEIC MIME
      'image/x-heif'     // Alternative HEIF MIME
    ];
    const validVideoTypes = [
      'video/mp4', 
      'video/webm', 
      'video/quicktime',
      'video/x-msvideo', // AVI
      'video/x-matroska' // MKV
    ];
    
    // Check by MIME type or file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidImage = validImageTypes.includes(file.type) || 
                         (messageType === 'image' && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(fileExtension || ''));
    const isValidVideo = validVideoTypes.includes(file.type) || 
                         (messageType === 'video' && ['mp4', 'webm', 'mov', 'quicktime'].includes(fileExtension || ''));
    
    if (messageType === 'image' && !isValidImage) {
      return NextResponse.json(
        { 
          error: `Invalid image type. File type: ${file.type || 'unknown'}, Extension: ${fileExtension || 'none'}. Supported: JPEG, PNG, GIF, WebP, HEIC.`,
          fileType: file.type,
          fileName: file.name
        },
        { status: 400 }
      );
    }

    if (messageType === 'video' && !isValidVideo) {
      return NextResponse.json(
        { 
          error: `Invalid video type. File type: ${file.type || 'unknown'}, Extension: ${fileExtension || 'none'}. Supported: MP4, WebM, MOV.`,
          fileType: file.type,
          fileName: file.name
        },
        { status: 400 }
      );
    }

    // Check file size (max 50MB for images, 100MB for videos)
    const maxSize = messageType === 'image' ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Max: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Get current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const weekStartDate = monday.toISOString().split('T')[0];

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `story-media/${weekStartDate}/${Date.now()}-${author}.${fileExt}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('story-uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      const errorMessage = uploadError.message || 'Unknown error';
      return NextResponse.json(
        { 
          error: 'Failed to upload file',
          details: errorMessage,
          code: (uploadError as any).statusCode || (uploadError as any).status || 'UNKNOWN',
          hint: errorMessage.includes('bucket') || errorMessage.includes('not found')
            ? 'Storage bucket "story-uploads" may not exist. Create it in Supabase Storage settings.'
            : undefined
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('story-uploads')
      .getPublicUrl(fileName);

    // Save to message history
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, media_url, media_filename, author, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [weekStartDate, messageType, publicUrl, file.name, author, expiresAt]
    );

    return NextResponse.json({
      success: true,
      mediaUrl: publicUrl,
      fileName: file.name,
      message: 'Media uploaded successfully'
    });
  } catch (error) {
    console.error('Media upload error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to upload media',
        details: process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error occurred',
        type: error instanceof Error ? error.name : 'UnknownError'
      },
      { status: 500 }
    );
  }
}

