import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getCurrentWeekStart } from '@/lib/story-db';

const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/flac', 'audio/webm'];
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    // Verify admin auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    if (token !== 'admin_session_token') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const caption = formData.get('caption') as string || '';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'weba'];
    
    if (!AUDIO_TYPES.includes(file.type) && (!ext || !audioExts.includes(ext))) {
      return NextResponse.json({ error: 'Invalid audio file type' }, { status: 400 });
    }

    if (file.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: 'File too large. Max: 50MB' }, { status: 400 });
    }

    const supabase = getSupabase();
    const weekStartDate = getCurrentWeekStart();
    const timestamp = Date.now();
    const safeExt = ext || 'mp3';
    const filename = `${timestamp}-admin-audio.${safeExt}`;
    const storagePath = `story-media/${weekStartDate}/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    const { error: uploadError } = await supabase.storage
      .from('story-uploads')
      .upload(storagePath, buffer, { contentType: file.type || 'audio/mpeg', upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload audio', details: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('story-uploads').getPublicUrl(storagePath);
    const mediaUrl = urlData.publicUrl;

    // Set expiry (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Insert message record
    const { error: insertError } = await supabase.from('story_message_history').insert({
      week_start_date: weekStartDate,
      message_type: 'audio',
      message_content: caption || null,
      media_url: mediaUrl,
      media_filename: file.name,
      author: 'Teacher',
      expires_at: expiresAt.toISOString()
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save audio message' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mediaUrl,
      fileName: file.name,
      expiresIn: '24 hours'
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
  }
}
