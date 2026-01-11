import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { encryptMessage } from '@/lib/message-encryption';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

async function verifyAdminToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, getJWTSecret());
    if (payload.role !== 'admin') return null;
    return payload.username as string;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const supabase = getSupabase();
    const weekStartDate = getCurrentWeekStart();
    
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const filePath = `story-media/${weekStartDate}/${filename}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('story-uploads')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('[SendImage] Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('story-uploads')
      .getPublicUrl(filePath);

    const mediaUrl = urlData.publicUrl;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Encrypt caption if provided
    const encryptedCaption = caption.trim() ? encryptMessage(caption.trim()) : null;

    // Save to message history
    await supabase.from('story_message_history').insert({
      week_start_date: weekStartDate,
      message_type: 'image',
      content: encryptedCaption,
      media_url: mediaUrl,
      media_filename: filename,
      author: adminUsername,
      expires_at: expiresAt.toISOString(),
      is_from_admin: true
    });

    return NextResponse.json({
      success: true,
      message: 'Image sent successfully',
      mediaUrl,
      sentAt: new Date().toISOString(),
      weekStartDate
    });
  } catch (error) {
    console.error('[SendImage] Error:', error);
    return NextResponse.json({ error: 'Failed to send image' }, { status: 500 });
  }
}
