// /api/montree/students/parse/route.ts
// AI-powered student name extraction
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { content, fileName } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    // Check if it's a base64 image
    const isImage = content.startsWith('[FILE:') && 
      (content.includes('data:image') || content.includes('.png') || content.includes('.jpg'));

    let messageContent: any[];
    
    if (isImage) {
      // Extract base64 data
      const base64Match = content.match(/data:image\/[^;]+;base64,([^"]+)/);
      if (base64Match) {
        const mediaType = content.includes('png') ? 'image/png' : 'image/jpeg';
        messageContent = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Match[1],
            },
          },
          {
            type: 'text',
            text: `Extract all student/children names from this image. 
Return ONLY a JSON array of objects with "name" field.
Example: [{"name": "Rachel"}, {"name": "John"}]
If you see dates of birth, include them as "dateOfBirth" in YYYY-MM-DD format.
Return ONLY the JSON, no other text.`,
          },
        ];
      } else {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
      }
    } else {
      // Text content (CSV, pasted text, etc.)
      messageContent = [
        {
          type: 'text',
          text: `Extract all student/children names from this content:

---
${content}
---

Return ONLY a JSON array of objects with "name" field.
Example: [{"name": "Rachel"}, {"name": "John"}]
If you see dates of birth, include them as "dateOfBirth" in YYYY-MM-DD format.
Ignore headers, numbers, and non-name content.
Return ONLY the JSON array, no other text or markdown.`,
        },
      ];
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    // Extract text from response
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Parse JSON from response
    let students: Array<{ name: string; dateOfBirth?: string }> = [];
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        students = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json({ 
        error: 'Failed to parse student names',
        raw: responseText 
      }, { status: 500 });
    }

    // Clean up the data
    students = students
      .filter(s => s.name && s.name.trim().length > 0)
      .map(s => ({
        name: s.name.trim(),
        dateOfBirth: s.dateOfBirth || undefined,
      }));

    return NextResponse.json({ 
      students,
      count: students.length,
    });

  } catch (error: any) {
    console.error('Parse API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process',
    }, { status: 500 });
  }
}
