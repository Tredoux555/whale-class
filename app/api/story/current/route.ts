import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/story/db';
import { extractToken, verifyUserToken } from '@/lib/story/auth';
import { getCurrentWeekStart } from '@/lib/story/week';
import { generateWeeklyStory } from '@/lib/story/generate';
import { Story, StoryResponse } from '@/lib/story/types';

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const token = extractToken(req.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyUserToken(token);
    const weekStartDate = getCurrentWeekStart();

    // Get or create story for this week
    let story = await queryOne<Story>(
      'SELECT * FROM secret_stories WHERE week_start_date = $1',
      [weekStartDate]
    );

    if (!story) {
      // Generate new story
      const newStory = await generateWeeklyStory();
      
      const result = await query<Story>(
        `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          weekStartDate,
          newStory.theme,
          newStory.title,
          JSON.stringify({ paragraphs: newStory.paragraphs })
        ]
      );
      
      story = result.rows[0];
    }

    if (!story) {
      return NextResponse.json(
        { error: 'Failed to load story' },
        { status: 500 }
      );
    }

    // Parse story content
    const content = typeof story.story_content === 'string' 
      ? JSON.parse(story.story_content)
      : story.story_content;

    const response: { username: string; story: StoryResponse } = {
      username: payload.username,
      story: {
        title: story.story_title,
        paragraphs: content.paragraphs || [],
        hiddenMessage: story.hidden_message,
        messageAuthor: story.message_author
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Story fetch error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
