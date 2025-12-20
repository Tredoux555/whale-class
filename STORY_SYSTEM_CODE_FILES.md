# Complete Code Files for Story System Bug Fix

## File 1: Main Story Page Component

**Path:** `app/story/[session]/page.tsx`

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Story {
  title: string;
  paragraphs: string[];
  hiddenMessage: string | null;
  messageAuthor: string | null;
}

interface MediaItem {
  id: number;
  message_type: 'image' | 'video';
  media_url: string;
  media_filename: string;
  author: string;
  created_at: string;
}

export default function StoryViewer() {
  const params = useParams();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [isDecoded, setIsDecoded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [lastLetterTapped, setLastLetterTapped] = useState(false);
  const [showMediaItems, setShowMediaItems] = useState(false);
  const paragraph3Ref = useRef<HTMLParagraphElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if session exists
    const session = sessionStorage.getItem('story_session');
    if (!session || session !== params.session) {
      router.push('/story');
      return;
    }

    loadStory();
    
    // Auto-logout on window close/unload
    const handleUnload = () => {
      sessionStorage.removeItem('story_session');
      fetch('/api/story/auth', { method: 'DELETE' });
    };
    
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [params.session, router]);

  const loadStory = async () => {
    try {
      const res = await fetch('/api/story/current', {
        headers: { 'Authorization': `Bearer ${params.session}` }
      });

      if (!res.ok) {
        sessionStorage.removeItem('story_session');
        router.push('/story');
        return;
      }

      const data = await res.json();
      setStory(data.story);
      setUsername(data.username);
      
      // Load media
      loadMedia();
    } catch (err) {
      console.error('Error loading story:', err);
      router.push('/story');
    }
  };

  const loadMedia = async () => {
    try {
      const res = await fetch('/api/story/current-media', {
        headers: { 'Authorization': `Bearer ${params.session}` }
      });

      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.media);
      }
    } catch (err) {
      console.error('Error loading media:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    setUploadError('');

    try {
      // Detect file type first to determine size limit
      const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|avi|mkv)$/i);
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i);
      
      // Validate file before upload - different limits for images vs videos
      const fileSizeMB = file.size / 1024 / 1024;
      const maxSizeMB = isVideo ? 100 : 50; // Videos: 100MB, Images: 50MB
      
      if (fileSizeMB > maxSizeMB) {
        setUploadError(`File too large: ${fileSizeMB.toFixed(2)}MB. Maximum size is ${maxSizeMB}MB for ${isVideo ? 'videos' : 'images'}.`);
        setIsUploadingMedia(false);
        return;
      }

      if (!isImage && !isVideo) {
        setUploadError('Unsupported file type. Please select an image or video file.');
        setIsUploadingMedia(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('author', username);
      
      // Auto-detect type (prioritize video detection)
      const messageType = isVideo ? 'video' : 'image';
      formData.append('type', messageType);

      const res = await fetch('/api/story/upload-media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${params.session}` },
        body: formData
      });

      const responseData = await res.json();

      if (res.ok) {
        // Reload media
        await loadMedia();
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Clear any previous errors
        setUploadError('');
        // Hide upload section after successful upload
        setShowUploadSection(false);
      } else {
        // Show detailed error message
        const errorMsg = responseData.error || 'Failed to upload file';
        const details = responseData.details ? ` (${responseData.details})` : '';
        const hint = responseData.hint ? `\n\n${responseData.hint}` : '';
        setUploadError(`${errorMsg}${details}${hint}`);
        console.error('Upload error response:', responseData);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(`Network error: ${errorMsg}. Please check your connection and try again.`);
      console.error('Upload error:', err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleLetterClick = (letter: string, charIndex: number, paragraphIndex: number) => {
    if (paragraphIndex !== 0) return; // Only first paragraph interactive
    
    const firstParagraph = story?.paragraphs[0] || '';
    const firstTIndex = firstParagraph.toLowerCase().indexOf('t');
    const firstCIndex = firstParagraph.toLowerCase().indexOf('c');

    if (letter.toLowerCase() === 't' && charIndex === firstTIndex) {
      // Clicking 't' ONLY toggles the decoded message
      // It should NEVER show media items - media is controlled by last letter only
      setIsDecoded(!isDecoded);
      setIsEditing(false); // Close editor if open
      // Do NOT modify showMediaItems here at all - keep it completely separate
      // BUG FIX: Explicitly hide media when decoding text message
      setShowMediaItems(false);
    } else if (letter.toLowerCase() === 'c' && charIndex === firstCIndex) {
      setIsEditing(true);
      setIsDecoded(false); // Close decoder if open
      setMessageInput('');
      setTimeout(() => {
        paragraph3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleLastLetterClick = () => {
    if (!lastLetterTapped) {
      // First tap: show upload section only, keep media hidden
      setLastLetterTapped(true);
      setShowUploadSection(true);
      setShowMediaItems(false); // Explicitly keep media hidden on first tap
    } else {
      // Second tap onwards: toggle media items visibility only
      setShowMediaItems(prev => !prev);
    }
  };

  const saveMessage = async () => {
    if (!messageInput.trim()) return;
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/story/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${params.session}`
        },
        body: JSON.stringify({ message: messageInput.trim(), author: username })
      });

      if (res.ok) {
        setIsEditing(false);
        setMessageInput('');
        await loadStory(); // Refresh to show saved state
      }
    } catch (err) {
      console.error('Error saving message:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveMessage();
    }
  };

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-lg text-gray-600">Loading story...</div>
      </div>
    );
  }

  const renderParagraph = (text: string, index: number) => {
    // First paragraph - make first 't' and 'c' clickable
    if (index === 0) {
      let tFound = false;
      let cFound = false;
      
      return (
        <p className="mb-6 leading-relaxed text-lg">
          {text.split('').map((char, i) => {
            const lowerChar = char.toLowerCase();
            const isFirstT = lowerChar === 't' && !tFound;
            const isFirstC = lowerChar === 'c' && !cFound;
            
            if (isFirstT) tFound = true;
            if (isFirstC) cFound = true;
            
            const isClickable = isFirstT || isFirstC;
            
            return (
              <span
                key={i}
                onClick={() => isClickable && handleLetterClick(char, i, index)}
                className={isClickable ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''}
                style={isClickable ? { textDecoration: 'none' } : {}}
              >
                {char}
              </span>
            );
          })}
        </p>
      );
    }

    // Third paragraph (index 2) - show hidden message or editor
    if (index === 2) {
      const displayText = isDecoded && story.hiddenMessage
        ? text + ' ' + story.hiddenMessage
        : text;

      return (
        <p ref={paragraph3Ref} className="mb-6 leading-relaxed text-lg">
          {displayText}
          {isEditing && (
            <span className="inline-block ml-2 align-middle">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-b-2 border-gray-400 outline-none px-2 py-1 bg-transparent animate-pulse min-w-[200px]"
                autoFocus
                placeholder="Type message..."
                disabled={isSaving}
              />
              <button
                onClick={saveMessage}
                disabled={isSaving || !messageInput.trim()}
                className="ml-3 text-sm bg-indigo-500 text-white px-4 py-1 rounded hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? '⏳' : '💾'} Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="ml-2 text-sm bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </span>
          )}
        </p>
      );
    }

    // Last paragraph - make last letter clickable to show upload section
    const isLastParagraph = index === story.paragraphs.length - 1;
    if (isLastParagraph && text.length > 0) {
      const lastCharIndex = text.length - 1;
      const lastChar = text[lastCharIndex];
      
      return (
        <p key={index} className="mb-6 leading-relaxed text-lg">
          {text.split('').map((char, i) => {
            const isLastLetter = i === lastCharIndex;
            return (
              <span
                key={i}
                onClick={() => isLastLetter && handleLastLetterClick()}
                className={isLastLetter ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''}
              >
                {char}
              </span>
            );
          })}
        </p>
      );
    }

    // All other paragraphs - regular text
    return (
      <p key={index} className="mb-6 leading-relaxed text-lg">
        {text}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Story Content */}
        <div className="bg-white rounded-lg shadow-xl p-12">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 font-serif">
            {story.title}
          </h1>
          <div className="prose prose-lg max-w-none">
            {story.paragraphs.map((paragraph, index) => (
              <div key={index}>
                {renderParagraph(paragraph, index)}
              </div>
            ))}
          </div>
        </div>

        {/* Media Upload Section - Only show when last letter is tapped */}
        {showUploadSection && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              📷 Share Photos & Videos
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Share a picture or video! It will automatically disappear after 7 days.
            </p>
            
            <div className="mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.heic,.heif"
                onChange={handleFileUpload}
                disabled={isUploadingMedia}
                className="block w-full text-sm text-gray-600
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-orange-50 file:text-orange-700
                  hover:file:bg-orange-100
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-2">
                Supported: JPEG, PNG, GIF, WebP, HEIC (iOS), MP4, WebM, MOV, AVI, MKV. Max size: Images 50MB, Videos 100MB
              </p>
              {isUploadingMedia && (
                <div className="mt-2">
                  <p className="text-sm text-blue-600">Uploading... Please wait</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '50%' }}></div>
                  </div>
                </div>
              )}
              {uploadError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-semibold">Upload Failed</p>
                  <p className="text-xs text-red-600 mt-1 whitespace-pre-line">{uploadError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Display Current Media - Only show when showMediaItems is true */}
        {showMediaItems && mediaItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h3 className="text-xl font-bold mb-4 text-gray-800">📸 Shared Photos & Videos:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mediaItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                  {item.message_type === 'image' ? (
                    <img 
                      src={item.media_url} 
                      alt={item.media_filename}
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                  ) : (
                    <video 
                      src={item.media_url} 
                      controls
                      className="w-full h-48 rounded-lg mb-2"
                    />
                  )}
                  <div className="text-xs text-gray-600">
                    <div className="font-semibold">{item.author}</div>
                    <div>{new Date(item.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## File 2: Fetch Current Story + Text Message API

**Path:** `app/api/story/current/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Get current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const weekStartDate = monday.toISOString().split('T')[0];

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
        hiddenMessage: storyData.hidden_message,  // TEXT MESSAGE FROM secret_stories TABLE
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
      console.log('Using default theme');
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
```

---

## File 3: Fetch Media Items API

**Path:** `app/api/story/current-media/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    await jwtVerify(token, JWT_SECRET);

    // Get current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const weekStartDate = monday.toISOString().split('T')[0];

    // Get all non-expired media for current week
    // QUERY FILTER: message_type IN ('image', 'video') - ONLY MEDIA, NOT TEXT
    const result = await db.query(
      `SELECT 
        id,
        message_type,
        media_url,
        media_filename,
        author,
        created_at
       FROM story_message_history
       WHERE week_start_date = $1
         AND message_type IN ('image', 'video')
         AND (expires_at IS NULL OR expires_at > NOW())
         AND is_expired = FALSE
       ORDER BY created_at DESC`,
      [weekStartDate]
    );

    return NextResponse.json({
      media: result.rows
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}
```

---

## File 4: Save Text Message API

**Path:** `app/api/story/message/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { message, author } = await req.json();

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message' },
        { status: 400 }
      );
    }

    // Get current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const weekStartDate = monday.toISOString().split('T')[0];

    // Save to message history (permanent record for admin)
    // Messages expire after 7 days from public view but stay in history
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, message_content, author, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [weekStartDate, 'text', message, author, expiresAt]
    );

    // Update the story with the new hidden message
    // This OVERWRITES any previous message (no history)
    const result = await db.query(
      `UPDATE secret_stories 
       SET hidden_message = $1, 
           message_author = $2, 
           updated_at = NOW()
       WHERE week_start_date = $3
       RETURNING *`,
      [message, author, weekStartDate]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Story not found for current week' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Message saved successfully'
    });
  } catch (error) {
    console.error('Message save error:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check if there's a message waiting
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    await jwtVerify(token, JWT_SECRET);

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const weekStartDate = monday.toISOString().split('T')[0];

    const result = await db.query(
      `SELECT hidden_message, message_author, updated_at 
       FROM secret_stories 
       WHERE week_start_date = $1`,
      [weekStartDate]
    );

    if (result.rows.length === 0 || !result.rows[0].hidden_message) {
      return NextResponse.json({ hasMessage: false });
    }

    return NextResponse.json({
      hasMessage: true,
      author: result.rows[0].message_author,
      timestamp: result.rows[0].updated_at
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

---

## File 5: Upload Media API

**Path:** `app/api/story/upload-media/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';
import { createClient } from '@supabase/supabase-js';

// Increase timeout for large file uploads
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to detect file type from extension (for mobile compatibility)
function detectFileType(file: File): 'image' | 'video' {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
  const videoExtensions = ['mp4', 'webm', 'mov', 'quicktime'];
  
  if (extension && imageExtensions.includes(extension)) {
    return 'image';
  }
  if (extension && videoExtensions.includes(extension)) {
    return 'video';
  }
  
  // Fallback to MIME type
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  
  // Default to image if uncertain
  return 'image';
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const author = formData.get('author') as string;
    const providedType = formData.get('type') as string | null;

    if (!file || !author) {
      return NextResponse.json(
        { error: 'Missing file or author' },
        { status: 400 }
      );
    }

    // Detect file type (use provided type or auto-detect)
    const messageType = providedType === 'image' || providedType === 'video' 
      ? providedType 
      : detectFileType(file);

    // Validate file type - expanded list for mobile compatibility
    const validImageTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/heic',      // iOS HEIC format
      'image/heif',      // iOS HEIF format
      'image/x-heic',    // Alternative HEIC MIME
      'image/x-heif'     // Alternative HEIF MIME
    ];
    const validVideoTypes = [
      'video/mp4', 
      'video/webm', 
      'video/quicktime',
      'video/x-msvideo', // AVI
      'video/x-matroska', // MKV
      'video/avi', // Alternative AVI MIME
      'video/x-m4v', // M4V
      'application/octet-stream' // Some mobile devices send videos as this
    ];
    
    // Check by MIME type or file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidImage = validImageTypes.includes(file.type) || 
                         (messageType === 'image' && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(fileExtension || ''));
    const isValidVideo = validVideoTypes.includes(file.type) || 
                         (messageType === 'video' && ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'quicktime'].includes(fileExtension || '')) ||
                         // Handle cases where MIME type is generic but extension indicates video
                         (file.type === 'application/octet-stream' && ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'].includes(fileExtension || ''));
    
    if (messageType === 'image' && !isValidImage) {
      return NextResponse.json(
        { 
          error: `Invalid image type. File type: ${file.type || 'unknown'}, Extension: ${fileExtension || 'none'}. Supported: JPEG, PNG, GIF, WebP, HEIC.`,
          fileType: file.type,
          fileName: file.name
        },
        { status: 400 }
      );
    }

    if (messageType === 'video' && !isValidVideo) {
      return NextResponse.json(
        { 
          error: `Invalid video type. File type: ${file.type || 'unknown'}, Extension: ${fileExtension || 'none'}. Supported: MP4, WebM, MOV.`,
          fileType: file.type,
          fileName: file.name
        },
        { status: 400 }
      );
    }

    // Check file size (max 50MB for images, 100MB for videos)
    const maxSize = messageType === 'image' ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Max: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Get current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const weekStartDate = monday.toISOString().split('T')[0];

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `story-media/${weekStartDate}/${Date.now()}-${author}.${fileExt}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('story-uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      const errorMessage = uploadError.message || 'Unknown error';
      return NextResponse.json(
        { 
          error: 'Failed to upload file',
          details: errorMessage,
          code: (uploadError as any).statusCode || (uploadError as any).status || 'UNKNOWN',
          hint: errorMessage.includes('bucket') || errorMessage.includes('not found')
            ? 'Storage bucket "story-uploads" may not exist. Create it in Supabase Storage settings.'
            : undefined
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('story-uploads')
      .getPublicUrl(fileName);

    // Save to message history
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, media_url, media_filename, author, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [weekStartDate, messageType, publicUrl, file.name, author, expiresAt]
    );

    return NextResponse.json({
      success: true,
      mediaUrl: publicUrl,
      fileName: file.name,
      message: 'Media uploaded successfully'
    });
  } catch (error) {
    console.error('Media upload error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to upload media',
        details: process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error occurred',
        type: error instanceof Error ? error.name : 'UnknownError'
      },
      { status: 500 }
    );
  }
}
```

---

## Bug Fix Summary

**File:** `app/story/[session]/page.tsx`  
**Function:** `handleLetterClick`  
**Line:** ~186

**Current Code (BUGGY):**
```typescript
if (letter.toLowerCase() === 't' && charIndex === firstTIndex) {
  setIsDecoded(!isDecoded);
  setIsEditing(false);
  // Do NOT modify showMediaItems here at all - keep it completely separate
}
```

**Fixed Code:**
```typescript
if (letter.toLowerCase() === 't' && charIndex === firstTIndex) {
  setIsDecoded(!isDecoded);
  setIsEditing(false);
  setShowMediaItems(false); // EXPLICITLY HIDE MEDIA WHEN DECODING TEXT
}
```

**Why this fixes it:**
- When clicking first 't', if `showMediaItems` was previously `true` (from clicking last letter), media would continue to show
- By explicitly setting `showMediaItems` to `false`, we ensure media gallery is hidden when decoding text messages
- This maintains the separation: first 't' = text only, last letter = media only

