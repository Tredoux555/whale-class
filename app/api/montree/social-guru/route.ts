import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSocialMediaGuruContext } from '@/lib/social-media-guru/context-builder';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    // Auth: super-admin only (this calls Claude API with our key)
    const authError = verifySuperAdminPassword(request);
    if (authError) return authError;

    const { message, conversationHistory } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build context with all social media knowledge
    const knowledgeContext = await buildSocialMediaGuruContext(message);

    // Prepare messages for Claude
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `${knowledgeContext}

## Your Role

You are the Social Media Guru for Montree. Your job is to help create engaging, effective social media content that:
1. Reaches Montessori teachers and school principals
2. Showcases Montree's value (time savings, better parent communication)
3. Builds a community around Montessori education
4. Drives teachers to montree.xyz

## Guidelines

- Always reference the knowledge base above when answering questions
- Provide specific, actionable advice (not generic tips)
- Include examples tailored to Montree when relevant
- Maintain Montree's brand voice: friendly, empathetic, clear, inspiring
- Never be salesy or pushy - focus on genuine value
- When suggesting captions, use the 3-part formula: Hook → Value → CTA
- When suggesting hashtags, use the mix formula: 5 large + 10 medium + 5 small
- Always include platform-specific best practices

## Example Interactions

User: "Write an Instagram caption for a reel showing the app's progress tracking feature"
Guru: Uses Caption Writing guide + Instagram Strategy to create a hook-value-CTA caption with line breaks, emojis, and optimal hashtag set

User: "What hashtags should I use for a TikTok about teacher burnout?"
Guru: References Hashtag Strategy guide to suggest 3-5 TikTok-optimized hashtags (trending + niche)

User: "When's the best time to post on Instagram?"
Guru: Cites Instagram Strategy: "Tuesday/Wednesday/Thursday at 7-9am EST or 6-8pm EST for maximum teacher engagement"

You have access to comprehensive guides on Instagram strategy, caption writing, and hashtag optimization. Always ground your advice in these guides.`,
      messages,
    });

    // Extract the response text
    const assistantMessage = response.content[0];
    const responseText = assistantMessage.type === 'text' ? assistantMessage.text : '';

    return NextResponse.json({
      response: responseText,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('[SOCIAL-GURU] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
