import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { query } from '@/lib/story/db';
import { extractToken, verifyUserToken } from '@/lib/story/auth';
import { getCurrentWeekStart, getExpirationDate } from '@/lib/story/week';

// File type configurations
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

function getFileType(mimeType: string, filename: string): 'image' | 'video' | null {
  // Check MIME type first
  if (IMAGE_TYPES.includes(mimeType)) return 'image';
  if (VIDEO_TYPES.includes(mimeType)) return 'video';
  
  // Fallback to extension check
  const ext = filename.split('.').pop()?.toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  
  if (ext && imageExts.includes(ext)) return 'image';
  if (ext && videoExts.includes(ext)) return 'video';
  
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const token = extractToken(req.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyUserToken(token);
    const author = payload.username;

    // Check Supabase config
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Determine file type
    const fileType = getFileType(file.type, file.name);
    
    if (!fileType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Supported: JPEG, PNG, GIF, WebP, HEIC, MP4, WebM, MOV, AVI, MKV' },
        { status: 400 }
      );
    }

    // Check file size
    const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxMB}MB for ${fileType}s` },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Generate unique filename
    const weekStartDate = getCurrentWeekStart();
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || (fileType === 'image' ? 'jpg' : 'mp4');
    const filename = `${timestamp}-${author}.${ext}`;
    const storagePath = `story-media/${weekStartDate}/${filename}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    const { error: uploadError } = await supabase.storage
      .from('story-uploads')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('story-uploads')
      .getPublicUrl(storagePath);

    const mediaUrl = urlData.publicUrl;
    const expiresAt = getExpirationDate();

    // Save to database
    await query(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, media_url, media_filename, author, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [weekStartDate, fileType, mediaUrl, file.name, author, expiresAt]
    );

    return NextResponse.json({
      success: true,
      mediaUrl,
      fileName: file.name,
      fileType
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}
