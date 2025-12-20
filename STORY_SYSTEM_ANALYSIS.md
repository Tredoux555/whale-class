# Secret Message System Analysis - /story Route

## Complete File Structure

```
app/
├── story/
│   ├── [session]/
│   │   └── page.tsx          # Main story viewer component
│   ├── admin/
│   │   ├── page.tsx          # Admin login
│   │   └── dashboard/
│   │       └── page.tsx      # Admin dashboard
│   └── page.tsx              # Story login page
└── api/
    └── story/
        ├── current/route.ts           # Fetch current story + text message
        ├── current-media/route.ts    # Fetch media items (images/videos)
        ├── message/route.ts          # Save text message
        ├── upload-media/route.ts      # Upload image/video
        └── auth/route.ts              # Authentication

migrations/
├── 001_create_secret_story_tables.sql    # Base tables
└── 009_story_admin_system.sql            # Message history table
```

---

## 1. Main Story Page Component

**File:** `app/story/[session]/page.tsx`

### Key State Variables

```typescript
const [story, setStory] = useState<Story | null>(null);
const [isDecoded, setIsDecoded] = useState(false);           // Controls text message display
const [isEditing, setIsEditing] = useState(false);           // Controls message editor
const [messageInput, setMessageInput] = useState('');
const [username, setUsername] = useState('');
const [isSaving, setIsSaving] = useState(false);
const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);  // All media items loaded
const [isUploadingMedia, setIsUploadingMedia] = useState(false);
const [uploadError, setUploadError] = useState('');
const [showUploadSection, setShowUploadSection] = useState(false);  // Upload UI visibility
const [lastLetterTapped, setLastLetterTapped] = useState(false);   // Track last letter tap
const [showMediaItems, setShowMediaItems] = useState(false);       // Media gallery visibility
```

### Component Initialization

```typescript
useEffect(() => {
  // Check session
  const session = sessionStorage.getItem('story_session');
  if (!session || session !== params.session) {
    router.push('/story');
    return;
  }

  loadStory();  // This calls loadMedia() internally
  
  // Cleanup on unload
  const handleUnload = () => {
    sessionStorage.removeItem('story_session');
    fetch('/api/story/auth', { method: 'DELETE' });
  };
  
  window.addEventListener('beforeunload', handleUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleUnload);
  };
}, [params.session, router]);
```

### Story Loading (includes media)

```typescript
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
    
    // Load media - THIS IS CALLED ON EVERY STORY LOAD
    loadMedia();
  } catch (err) {
    console.error('Error loading story:', err);
    router.push('/story');
  }
};
```

### Media Loading Function

```typescript
const loadMedia = async () => {
  try {
    const res = await fetch('/api/story/current-media', {
      headers: { 'Authorization': `Bearer ${params.session}` }
    });

    if (res.ok) {
      const data = await res.json();
      setMediaItems(data.media);  // Stores ALL media items in state
    }
  } catch (err) {
    console.error('Error loading media:', err);
  }
};
```

---

## 2. Click Handlers

### First 't' Click Handler

```typescript
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
  } else if (letter.toLowerCase() === 'c' && charIndex === firstCIndex) {
    setIsEditing(true);
    setIsDecoded(false); // Close decoder if open
    setMessageInput('');
    setTimeout(() => {
      paragraph3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
};
```

**Expected Behavior:**
- Toggles `isDecoded` state
- Does NOT modify `showMediaItems`
- Should only show text message in paragraph 3

### Last Letter Click Handler

```typescript
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
```

**Expected Behavior:**
- First tap: Shows upload section, keeps media hidden
- Second tap: Toggles media gallery visibility

---

## 3. Message Fetching/Displaying Logic

### Text Message Display (Paragraph 3)

```typescript
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
          <button onClick={saveMessage} ...>💾 Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </span>
      )}
    </p>
  );
}
```

**Condition:** `isDecoded && story.hiddenMessage` - Only shows when first 't' is clicked

### Media Gallery Display

```typescript
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
```

**Condition:** `showMediaItems && mediaItems.length > 0` - Should only show when last letter is tapped twice

---

## 4. API Routes

### Fetch Current Story + Text Message

**File:** `app/api/story/current/route.ts`

```typescript
export async function GET(req: NextRequest) {
  // ... auth validation ...
  
  // Get current week's Monday
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString().split('T')[0];

  // Fetch story
  let story = await db.query(
    'SELECT * FROM secret_stories WHERE week_start_date = $1',
    [weekStartDate]
  );

  // ... story generation if not exists ...

  const storyData = story.rows[0];
  const content = typeof storyData.story_content === 'string' 
    ? JSON.parse(storyData.story_content)
    : storyData.story_content;

  return NextResponse.json({
    username: payload.username,
    story: {
      title: storyData.story_title,
      paragraphs: content.paragraphs,
      hiddenMessage: storyData.hidden_message,  // TEXT MESSAGE ONLY
      messageAuthor: storyData.message_author
    }
  });
}
```

**Returns:** Story with `hiddenMessage` (text only, from `secret_stories` table)

### Fetch Media Items

**File:** `app/api/story/current-media/route.ts`

```typescript
export async function GET(req: NextRequest) {
  // ... auth validation ...
  
  // Get current week's Monday
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString().split('T')[0];

  // Get all non-expired media for current week
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
}
```

**Query Filter:**
- `week_start_date = $1` - Current week
- `message_type IN ('image', 'video')` - Only media, NOT text
- `expires_at > NOW()` - Not expired
- `is_expired = FALSE` - Not marked as expired

**Returns:** Array of media items (images/videos only)

### Save Text Message

**File:** `app/api/story/message/route.ts`

```typescript
export async function POST(req: NextRequest) {
  // ... auth validation ...
  
  const { message, author } = await req.json();

  // Get current week's Monday
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString().split('T')[0];

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Save to message history (permanent record for admin)
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

  return NextResponse.json({ 
    success: true,
    message: 'Message saved successfully'
  });
}
```

**Storage:**
1. Saves to `story_message_history` with `message_type = 'text'`
2. Updates `secret_stories.hidden_message` (overwrites previous)

### Upload Media

**File:** `app/api/story/upload-media/route.ts`

```typescript
export async function POST(req: NextRequest) {
  // ... auth validation ...
  
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const author = formData.get('author') as string;
  const providedType = formData.get('type') as string | null;

  // ... file validation ...

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
}
```

**Storage:**
1. Uploads file to Supabase Storage bucket `story-uploads`
2. Saves record to `story_message_history` with `message_type = 'image'` or `'video'`

---

## 5. Database Schema

### Table: `secret_stories`

```sql
CREATE TABLE IF NOT EXISTS secret_stories (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  theme VARCHAR(255) NOT NULL,
  story_title VARCHAR(255) NOT NULL,
  story_content JSONB NOT NULL,
  hidden_message TEXT,              -- TEXT MESSAGES STORED HERE
  message_author VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:** Stores weekly stories and the current text message (overwrites on update)

### Table: `story_message_history`

```sql
CREATE TABLE IF NOT EXISTS story_message_history (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL,
  message_type VARCHAR(20) NOT NULL,  -- 'text', 'image', 'video'
  message_content TEXT,               -- For text messages
  media_url TEXT,                     -- For images/videos
  media_filename TEXT,                 -- For images/videos
  author VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,               -- When it disappears from public view
  is_expired BOOLEAN DEFAULT FALSE
);
```

**Purpose:** Permanent history of ALL messages (text, images, videos)

**Storage Differences:**
- **Text messages:** Stored in BOTH `secret_stories.hidden_message` AND `story_message_history.message_content`
- **Media messages:** Stored ONLY in `story_message_history` with `media_url` and `media_filename`

---

## 6. How Messages Are Fetched

### For First 't' Click (Text Messages Only)

**API Route:** `/api/story/current` (GET)

**Query:**
```sql
SELECT * FROM secret_stories WHERE week_start_date = $1
```

**Returns:**
```json
{
  "story": {
    "title": "...",
    "paragraphs": [...],
    "hiddenMessage": "Text message here",  // FROM secret_stories.hidden_message
    "messageAuthor": "username"
  }
}
```

**Display Logic:**
- `isDecoded && story.hiddenMessage` shows text in paragraph 3
- Does NOT fetch or display media

### For Last Letter Click (Media Only)

**API Route:** `/api/story/current-media` (GET)

**Query:**
```sql
SELECT 
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
ORDER BY created_at DESC
```

**Returns:**
```json
{
  "media": [
    {
      "id": 1,
      "message_type": "image",
      "media_url": "https://...",
      "media_filename": "photo.jpg",
      "author": "username",
      "created_at": "2024-12-01T10:00:00Z"
    }
  ]
}
```

**Display Logic:**
- `showMediaItems && mediaItems.length > 0` shows media gallery
- Only shows when last letter is tapped twice

---

## 7. BUG IDENTIFICATION

### The Problem

**Pictures are showing when clicking the first 't' when they shouldn't.**

### Root Cause Analysis

Looking at the code flow:

1. **On Component Mount:**
   - `loadStory()` is called
   - `loadStory()` calls `loadMedia()` (line 80)
   - `loadMedia()` fetches ALL media items and stores them in `mediaItems` state
   - `showMediaItems` is initialized to `false`

2. **When Clicking First 't':**
   - `handleLetterClick()` is called
   - Only toggles `isDecoded` state
   - Does NOT modify `showMediaItems` (line 186 comment confirms this)

3. **Media Display Condition:**
   - Media gallery only shows when: `showMediaItems && mediaItems.length > 0` (line 419)

### The Bug

**The issue is that `loadMedia()` is called automatically on component mount, which loads ALL media items into state. However, there's no guarantee that `showMediaItems` stays `false` when clicking the first 't' if it was previously set to `true`.**

**Potential Issues:**

1. **State Persistence:** If `showMediaItems` was `true` from a previous interaction (clicking last letter), clicking first 't' doesn't reset it to `false`. The media would continue to show.

2. **Race Condition:** If `loadMedia()` completes after clicking first 't', and if there's any code that sets `showMediaItems` to `true` based on media being loaded, it could cause the bug.

3. **Missing Reset:** The first 't' click handler should explicitly set `showMediaItems` to `false` to ensure media doesn't show when decoding text messages.

### The Fix

**In `handleLetterClick()` function, when clicking the first 't', explicitly reset `showMediaItems` to `false`:**

```typescript
if (letter.toLowerCase() === 't' && charIndex === firstTIndex) {
  // Clicking 't' ONLY toggles the decoded message
  // It should NEVER show media items - media is controlled by last letter only
  setIsDecoded(!isDecoded);
  setIsEditing(false); // Close editor if open
  setShowMediaItems(false); // EXPLICITLY HIDE MEDIA WHEN DECODING TEXT
}
```

### Exact Code Locations

**File:** `app/story/[session]/page.tsx`

**Line 174-195:** `handleLetterClick` function
**Line 181-186:** First 't' click handler (BUG IS HERE - missing `setShowMediaItems(false)`)
**Line 197-207:** Last letter click handler (CORRECT - manages `showMediaItems`)
**Line 87-100:** `loadMedia` function (loads ALL media on mount)
**Line 419:** Media display condition (correct, but state might be wrong)

---

## 8. Complete Code Files

See the following files for full code:
- `app/story/[session]/page.tsx` - Main component
- `app/api/story/current/route.ts` - Story + text message fetch
- `app/api/story/current-media/route.ts` - Media fetch
- `app/api/story/message/route.ts` - Text message save
- `app/api/story/upload-media/route.ts` - Media upload
- `migrations/001_create_secret_story_tables.sql` - Base schema
- `migrations/009_story_admin_system.sql` - Message history schema

---

## Summary

1. **Text messages** are stored in `secret_stories.hidden_message` and fetched via `/api/story/current`
2. **Media items** are stored in `story_message_history` with `message_type IN ('image', 'video')` and fetched via `/api/story/current-media`
3. **First 't' click** should only show text messages, but doesn't explicitly hide media gallery
4. **Last letter click** controls media upload section and gallery visibility
5. **The bug:** `showMediaItems` is not reset to `false` when clicking first 't', so if it was previously `true`, media will continue to show

**Fix:** Add `setShowMediaItems(false)` in the first 't' click handler.

