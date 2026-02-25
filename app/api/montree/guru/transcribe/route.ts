// app/api/montree/guru/transcribe/route.ts
// Voice Notes — Transcribe audio via OpenAI Whisper
// Audio is NOT stored — transcribe and discard (privacy + storage)

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Voice transcription is not configured' },
        { status: 503 }
      );
    }

    // Get audio from FormData
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB — Whisper's limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Audio file too large (max 25MB)' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (audioFile.type && !validTypes.some(t => audioFile.type.startsWith(t))) {
      // Be lenient — some browsers report different MIME types
      // Whisper will reject truly invalid formats anyway
    }

    // Send to OpenAI Whisper
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile, audioFile.name || 'recording.webm');
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'en');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      console.error('[Transcribe] Whisper API error:', whisperResponse.status);
      return NextResponse.json(
        { success: false, error: 'Transcription failed' },
        { status: 502 }
      );
    }

    const result = await whisperResponse.json();
    const text = result.text?.trim();

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'No speech detected in audio' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, text });

  } catch (error) {
    console.error('[Transcribe] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Transcription failed' },
      { status: 500 }
    );
  }
}
