import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set', hasKey: false }, { status: 500 });
    }

    const { text } = await request.json();
    
    const anthropic = new Anthropic({ apiKey });
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Extract week number and any child names from this text. Return JSON like {"weekNumber": 17, "names": ["Amy", "Leo"]}. Text: ${text || 'Week 17 plan for Amy, Leo, Rachel'}`
        }
      ]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    return NextResponse.json({
      success: true,
      hasKey: true,
      keyPrefix: apiKey.substring(0, 10) + '...',
      response: responseText,
      usage: message.usage
    });

  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
      hasKey: !!process.env.ANTHROPIC_API_KEY
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...' || 'not set'
  });
}
