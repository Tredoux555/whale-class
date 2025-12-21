import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';
import { getWeekStartDate } from '@/lib/story-utils';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Get current week's Monday
    const weekStartDate = getWeekStartDate();

    // Check if story exists for this week
    let story = await db.query(
      'SELECT * FROM secret_stories WHERE week_start_date = $1',
      [weekStartDate]
    );

    // If no story exists for this week, generate one
    if (story.rows.length === 0) {
      const newStory = await generateWeeklyStory();
      
      if (!newStory) {
        return NextResponse.json(
          { error: 'Failed to generate story' },
          { status: 500 }
        );
      }

      const insertResult = await db.query(
        `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          weekStartDate,
          newStory.theme,
          newStory.title,
          JSON.stringify({ paragraphs: newStory.paragraphs })
        ]
      );
      
      story = insertResult;
    }

    const storyData = story.rows[0];
    const content = typeof storyData.story_content === 'string' 
      ? JSON.parse(storyData.story_content)
      : storyData.story_content;

    return NextResponse.json({
      username: payload.username,
      story: {
        title: storyData.story_title,
        paragraphs: content.paragraphs,
        hiddenMessage: storyData.hidden_message,
        messageAuthor: storyData.message_author
      }
    });
  } catch (error) {
    console.error('Story fetch error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

async function generateWeeklyStory() {
  try {
    // Try to get current Whale curriculum theme
    let currentTheme = 'Community Helpers'; // Default theme
    
    try {
      const themeResult = await db.query(
        `SELECT theme FROM curriculum_weeks 
         WHERE week_start <= CURRENT_DATE 
         ORDER BY week_start DESC LIMIT 1`
      );
      
      if (themeResult.rows.length > 0) {
        currentTheme = themeResult.rows[0].theme;
      }
    } catch (err) {
      // If curriculum_weeks table doesn't exist or query fails, use default
      if (process.env.NODE_ENV === 'development') {
        console.log('Using default theme');
      }
    }

    // Call Claude API to generate story
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2024-10-22'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Write a short children's story (exactly 5 paragraphs) about "${currentTheme}". 

Requirements:
- Appropriate for ages 2-6 with simple English vocabulary
- The FIRST paragraph MUST contain both the letter 't' and the letter 'c' (uppercase or lowercase)
- Each paragraph should be 3-5 sentences
- Make it engaging and educational

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "theme": "${currentTheme}",
  "title": "Story Title Here",
  "paragraphs": ["paragraph 1 text", "paragraph 2 text", "paragraph 3 text", "paragraph 4 text", "paragraph 5 text"]
}`
        }]
      })
    });

    if (!response.ok) {
      throw new Error('Claude API request failed');
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Extract JSON from response (in case Claude wraps it in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const storyData = JSON.parse(jsonMatch[0]);
    
    // Validate the story has required fields and 't' and 'c' in first paragraph
    if (!storyData.paragraphs || storyData.paragraphs.length !== 5) {
      throw new Error('Invalid story structure');
    }

    const firstParagraph = storyData.paragraphs[0].toLowerCase();
    if (!firstParagraph.includes('t') || !firstParagraph.includes('c')) {
      throw new Error('First paragraph missing required letters');
    }

    return storyData;
  } catch (error) {
    console.error('Story generation error:', error);
    
    // Fallback story in case API fails
    return {
      theme: 'Community Helpers',
      title: 'The Kind Doctor',
      paragraphs: [
        'One sunny morning, little Tom went to see the doctor with his cat named Whiskers. The doctor had a bright smile and a gentle voice.',
        'Doctor Sarah checked Tom\'s ears and listened to his heart. "You are very healthy!" she said with a warm smile.',
        'Tom asked, "Can you check Whiskers too?" Doctor Sarah laughed and pretended to listen to the cat\'s heartbeat.',
        'Whiskers purred happily. Tom felt brave and strong after his checkup.',
        'Tom waved goodbye to Doctor Sarah. "Thank you for helping me feel better!" he said happily.'
      ]
    };
  }
}

