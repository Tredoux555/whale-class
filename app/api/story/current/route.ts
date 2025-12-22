import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractToken, getCurrentWeekStart } from '@/lib/story-auth';

export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Update last seen (if table exists - optional for backward compatibility)
    try {
      await db.query(
        `UPDATE story_online_sessions SET last_seen_at = NOW(), is_online = TRUE WHERE session_token = $1`,
        [token]
      );
    } catch (error) {
      // Online sessions table might not exist yet - that's okay
    }

    const weekStartDate = getCurrentWeekStart();

    // Check if story exists for this week
    let story = await db.query(
      'SELECT * FROM secret_stories WHERE week_start_date = $1',
      [weekStartDate]
    );

    // If no story exists for this week, generate one
    if (story.rows.length === 0) {
      const newStory = await generateWeeklyStory();
      
      const insertResult = await db.query(
        `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [weekStartDate, newStory.theme, newStory.title, JSON.stringify({ paragraphs: newStory.paragraphs })]
      );
      
      story = insertResult;
    }

    const storyData = story.rows[0];
    const content = typeof storyData.story_content === 'string'
      ? JSON.parse(storyData.story_content)
      : storyData.story_content;

    console.log('Returning story data:', {
      title: storyData.story_title,
      hiddenMessage: storyData.hidden_message,
      messageAuthor: storyData.message_author,
      adminMessage: storyData.admin_message
    });

    return NextResponse.json({
      username: payload.username,
      story: {
        title: storyData.story_title,
        paragraphs: content.paragraphs,
        hiddenMessage: storyData.hidden_message,
        messageAuthor: storyData.message_author,
        adminMessage: storyData.admin_message
      }
    });
  } catch (error) {
    console.error('Story fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch story' }, { status: 500 });
  }
}

async function generateWeeklyStory() {
  try {
    // Try to get current Whale curriculum theme
    let currentTheme = 'Friendship';
    
    try {
      const themeResult = await db.query(
        `SELECT theme FROM curriculum_weeks 
         WHERE week_start <= CURRENT_DATE 
         ORDER BY week_start DESC LIMIT 1`
      );
      
      if (themeResult.rows.length > 0) {
        currentTheme = themeResult.rows[0].theme;
      }
    } catch {
      // Table might not exist, use default
    }

    // Try Claude API
    if (process.env.ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
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
  "paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3", "paragraph 4", "paragraph 5"]
}`
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const storyData = JSON.parse(jsonMatch[0]);
          if (storyData.paragraphs?.length === 5) {
            return storyData;
          }
        }
      }
    }
  } catch (error) {
    console.error('Story generation error:', error);
  }

  // Fallback story
  return {
    theme: 'Friendship',
    title: 'The Kind Friends',
    paragraphs: [
      'Once upon a time, there was a little cat named Tiny who loved to play in the sunshine.',
      'One day, Tiny met a friendly dog named Buddy at the park. They decided to play together.',
      'Buddy showed Tiny his favorite ball, and Tiny showed Buddy her favorite spot by the flowers.',
      'They played all afternoon, running and jumping in the soft green grass.',
      'When the sun began to set, they promised to meet again tomorrow. True friends always find each other.'
    ]
  };
}
