import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';
import { createClient } from '@supabase/supabase-js';

// Increase timeout for large file uploads
export const maxDuration = 60;

// Helper function to get Supabase client (with validation)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
  }

  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Helper function to detect file type from extension (for mobile compatibility)
function detectFileType(file: File): 'image' | 'video' {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
  const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'quicktime'];
  
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
    // Validate environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'NEXT_PUBLIC_SUPABASE_URL environment variable is missing',
          hint: 'Please set NEXT_PUBLIC_SUPABASE_URL in your environment variables'
        },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'SUPABASE_SERVICE_ROLE_KEY environment variable is missing',
          hint: 'Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables'
        },
        { status: 500 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Get Supabase client
    const supabase = getSupabaseClient();

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
      'video/x-matroska', // MKV
      'video/avi', // Alternative AVI MIME
      'video/x-m4v', // M4V
      'application/octet-stream' // Some mobile devices send videos as this
    ];
    
    // Check by MIME type or file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidImage = validImageTypes.includes(file.type) || 
                         (messageType === 'image' && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(fileExtension || ''));
    const isValidVideo = validVideoTypes.includes(file.type) || 
                         (messageType === 'video' && ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'quicktime'].includes(fileExtension || '')) ||
                         // Handle cases where MIME type is generic but extension indicates video
                         (file.type === 'application/octet-stream' && ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'].includes(fileExtension || ''));
    
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
          error: `Invalid video type. File type: ${file.type || 'unknown'}, Extension: ${fileExtension || 'none'}. Supported: MP4, WebM, MOV, AVI, MKV, M4V.`,
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
    if (!fileExt) {
      return NextResponse.json(
        { error: 'File must have an extension' },
        { status: 400 }
      );
    }

    const fileName = `story-media/${weekStartDate}/${Date.now()}-${author.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure content type is set (fallback to application/octet-stream if missing)
    const contentType = file.type || (messageType === 'image' ? 'image/jpeg' : 'video/mp4');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('story-uploads')
      .upload(fileName, buffer, {
        contentType: contentType,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      const errorMessage = uploadError.message || 'Unknown error';
      const errorCode = (uploadError as any).statusCode || (uploadError as any).status || 'UNKNOWN';
      
      // Provide helpful hints based on error type
      let hint = undefined;
      if (errorMessage.includes('bucket') || errorMessage.includes('not found') || errorCode === 404) {
        hint = 'Storage bucket "story-uploads" may not exist. Create it in Supabase Storage settings and ensure it is public.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorCode === 403) {
        hint = 'Storage bucket policies may not be configured correctly. Check that INSERT policies are set for the "story-uploads" bucket.';
      } else if (errorMessage.includes('size') || errorCode === 413) {
        hint = 'File size exceeds limits. Images: 50MB max, Videos: 100MB max.';
      } else if (errorCode === 401 || errorMessage.includes('unauthorized')) {
        hint = 'Authentication failed. Check that SUPABASE_SERVICE_ROLE_KEY is set correctly.';
      }

      return NextResponse.json(
        { 
          error: 'Failed to upload file',
          details: errorMessage,
          code: errorCode,
          hint: hint
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

