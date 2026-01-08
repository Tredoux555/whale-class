import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

// Montessori-style prompt template
function getPrompt(word: string): string {
  return `A simple, child-friendly illustration of a ${word} on a clean white background. 
Montessori educational style: realistic but friendly, clear outlines, vibrant but not overwhelming colors. 
Single object centered, no text, no shadows, no background elements. 
High quality illustration suitable for a 3-5 year old child learning phonics.`;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
    }
    
    if (!openaiKey) {
      return NextResponse.json({ error: 'Missing OpenAI config' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    const { word } = await request.json();
    
    if (!word || typeof word !== 'string') {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    const cleanWord = word.toLowerCase().trim().replace(/[^a-z\s]/g, '');
    
    if (!cleanWord) {
      return NextResponse.json({ error: 'Invalid word' }, { status: 400 });
    }

    // Check if image already exists in storage
    const storagePath = `sound-objects/${cleanWord}.png`;
    const { data: existingFile } = await supabase.storage
      .from('images')
      .list('sound-objects', { search: `${cleanWord}.png` });
    
    if (existingFile && existingFile.length > 0) {
      const { data: publicUrl } = supabase.storage
        .from('images')
        .getPublicUrl(storagePath);
      
      return NextResponse.json({
        word: cleanWord,
        url: publicUrl.publicUrl,
        storagePath,
        cached: true,
      });
    }

    // Generate with DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: getPrompt(cleanWord),
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural',
    });

    const imageUrl = response.data[0]?.url;
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }

    // Download image and upload to Supabase storage
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Return DALL-E URL as fallback (expires in 1 hour)
      return NextResponse.json({
        word: cleanWord,
        url: imageUrl,
        storagePath: null,
        temporary: true,
      });
    }

    // Get permanent public URL
    const { data: publicUrl } = supabase.storage
      .from('images')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      word: cleanWord,
      url: publicUrl.publicUrl,
      storagePath,
      cached: false,
    });

  } catch (error: any) {
    console.error('Image generation error:', error);
    
    if (error.code === 'content_policy_violation') {
      return NextResponse.json({ 
        error: 'Content policy violation - try a different word' 
      }, { status: 400 });
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return NextResponse.json({ 
        error: 'Rate limit exceeded - please wait a moment' 
      }, { status: 429 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to generate image' 
    }, { status: 500 });
  }
}
