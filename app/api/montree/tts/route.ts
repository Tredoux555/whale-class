// app/api/montree/tts/route.ts
// Text-to-Speech via OpenAI TTS API
// Returns MP3 audio stream for Guru messages

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // Rate limit: 10 TTS requests per minute per user (~$0.015/1K chars)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const supabase = getSupabase();
    const rateCheck = await checkRateLimit(supabase, ip, '/api/montree/tts', 10, 1);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Text-to-speech is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No text provided' },
        { status: 400 }
      );
    }

    // OpenAI TTS limit is 4096 chars
    if (text.length > 4096) {
      return NextResponse.json(
        { success: false, error: 'Text too long (max 4096 characters)' },
        { status: 400 }
      );
    }

    // Strip markdown formatting for cleaner speech
    const cleanText = text
      .replace(/#{1,6}\s/g, '')           // headers
      .replace(/\*\*(.*?)\*\*/g, '$1')    // bold
      .replace(/\*(.*?)\*/g, '$1')        // italic
      .replace(/`(.*?)`/g, '$1')          // inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/^\s*[-*+]\s/gm, '')       // list bullets
      .replace(/^\s*\d+\.\s/gm, '')       // numbered lists
      .trim();

    if (!cleanText) {
      return NextResponse.json(
        { success: false, error: 'No speakable text after formatting cleanup' },
        { status: 400 }
      );
    }

    // Call OpenAI TTS API with timeout protection
    const ttsAbortController = new AbortController();
    const ttsTimeout = setTimeout(() => ttsAbortController.abort(), 20_000); // 20s timeout
    let ttsResponse: Response;
    try {
      ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: cleanText,
          voice: 'nova', // Friendly, warm female voice
          response_format: 'mp3',
        }),
        signal: ttsAbortController.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(ttsTimeout);
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        console.error('[TTS] OpenAI API timeout (20s)');
        return NextResponse.json(
          { success: false, error: 'Speech generation timed out' },
          { status: 504 }
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(ttsTimeout);
    }

    if (!ttsResponse.ok) {
      console.error('[TTS] OpenAI API error:', ttsResponse.status);
      return NextResponse.json(
        { success: false, error: 'Speech generation failed' },
        { status: 502 }
      );
    }

    // Stream the audio response back
    const audioBuffer = await ttsResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('[TTS] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Speech generation failed' },
      { status: 500 }
    );
  }
}
