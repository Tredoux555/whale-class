import { GeneratedStory } from './types';
import { query } from './db';

// Fallback story if generation fails
const FALLBACK_STORY: GeneratedStory = {
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

/**
 * Get the current curriculum theme (if available)
 */
async function getCurrentTheme(): Promise<string> {
  try {
    const result = await query<{ theme: string }>(
      `SELECT theme FROM curriculum_weeks 
       WHERE week_start <= CURRENT_DATE 
       ORDER BY week_start DESC LIMIT 1`
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].theme;
    }
  } catch {
    // Table might not exist, use default
  }
  
  return 'Community Helpers';
}

/**
 * Generate a weekly story using Claude API
 */
export async function generateWeeklyStory(): Promise<GeneratedStory> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set, using fallback story');
    return FALLBACK_STORY;
  }
  
  try {
    const currentTheme = await getCurrentTheme();
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
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
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Extract JSON from response (in case Claude wraps it in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const storyData = JSON.parse(jsonMatch[0]) as GeneratedStory;
    
    // Validate the story
    if (!storyData.paragraphs || storyData.paragraphs.length !== 5) {
      throw new Error('Invalid story structure');
    }

    // Ensure first paragraph has 't' and 'c'
    const firstParagraph = storyData.paragraphs[0].toLowerCase();
    if (!firstParagraph.includes('t') || !firstParagraph.includes('c')) {
      throw new Error('First paragraph missing required letters');
    }

    return storyData;
  } catch (error) {
    console.error('Story generation error:', error);
    return FALLBACK_STORY;
  }
}
