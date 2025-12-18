import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const messageType = formData.get('type') as 'image' | 'video';

    if (!file || !author) {
      return NextResponse.json(
        { error: 'Missing file or author' },
        { status: 400 }
      );
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    
    if (messageType === 'image' && !validImageTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    if (messageType === 'video' && !validVideoTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid video type. Only MP4, WebM, and MOV are allowed.' },
        { status: 400 }
      );
    }

    // Check file size (max 50MB for images, 100MB for videos)
    const maxSize = messageType === 'image' ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
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
      return NextResponse.json(
        { error: 'Failed to upload file' },
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
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}

