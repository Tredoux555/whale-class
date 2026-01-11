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

    // Validate file type - allow audio files
    const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/flac', 'audio/webm'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'weba'];
    
    if (!audioTypes.includes(file.type) && (!ext || !audioExts.includes(ext))) {
      return NextResponse.json({ error: 'Only audio files are allowed' }, { status: 400 });
    }

    // Max 50MB for audio
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    const supabase = getSupabase();
    const weekStartDate = getCurrentWeekStart();
    
    // Generate unique filename
    const safeExt = ext || 'mp3';
    const filename = `admin_audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${safeExt}`;
    const filePath = `story-media/${weekStartDate}/${filename}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('[SendAudio] Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    const mediaUrl = urlData.publicUrl;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Encrypt caption if provided
    const encryptedCaption = caption.trim() ? encryptMessage(caption.trim()) : null;

    // Save to message history
    await supabase.from('story_message_history').insert({
      week_start_date: weekStartDate,
      message_type: 'audio',
      content: encryptedCaption,
      media_url: mediaUrl,
      media_filename: file.name, // Keep original filename for display
      author: adminUsername,
      expires_at: expiresAt.toISOString(),
      is_from_admin: true
    });

    return NextResponse.json({
      success: true,
      message: 'Audio sent successfully',
      mediaUrl,
      fileName: file.name,
      sentAt: new Date().toISOString(),
      weekStartDate
    });
  } catch (error) {
    console.error('[SendAudio] Error:', error);
    return NextResponse.json({ error: 'Failed to send audio' }, { status: 500 });
  }
}
