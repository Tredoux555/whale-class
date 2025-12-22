# Story Application - Complete Context for Opus
## Application: teacherpotato.xyz/story

This document provides complete information about the Story application for error checking and corrections.

---

## 📁 Application Structure

### Frontend Pages (Next.js App Router)

#### 1. Story Login Page
**File:** `app/story/page.tsx`
- **Route:** `/story`
- **Purpose:** User authentication for story viewers (T and Z)
- **Features:**
  - Username/password login form
  - Session management via sessionStorage
  - Redirects to `/story/[session]` on success
  - Error handling with user-friendly messages
- **Key State:**
  - `username`, `password`, `error`, `isLoading`
- **API Call:** `POST /api/story/auth`

#### 2. Story Viewer Page
**File:** `app/story/[session]/page.tsx`
- **Route:** `/story/[session]` (dynamic route)
- **Purpose:** Main story viewing interface with interactive features
- **Features:**
  - Displays weekly story (5 paragraphs)
  - Interactive letter clicking:
    - First 't' in paragraph 1: Toggle hidden text message
    - First 'c' in paragraph 1: Edit/create text message
    - Last letter of last paragraph: Toggle media upload/gallery
  - Media upload (images/videos)
  - Media gallery display
  - Auto-logout on window close
- **Key State:**
  - `story`, `isDecoded`, `isEditing`, `messageInput`, `username`
  - `mediaItems`, `isUploadingMedia`, `uploadError`
  - `showUploadSection`, `showMediaItems`, `lastLetterTapped`
- **API Calls:**
  - `GET /api/story/current` - Fetch story and text message
  - `GET /api/story/current-media` - Fetch media items
  - `POST /api/story/message` - Save text message
  - `POST /api/story/upload-media` - Upload image/video

#### 3. Admin Login Page
**File:** `app/story/admin/page.tsx`
- **Route:** `/story/admin`
- **Purpose:** Admin authentication
- **Features:**
  - Admin login form
  - Session management via sessionStorage
  - Redirects to `/story/admin/dashboard` on success
- **API Call:** `POST /api/story/admin/auth`

#### 4. Admin Dashboard Page
**File:** `app/story/admin/dashboard/page.tsx`
- **Route:** `/story/admin/dashboard`
- **Purpose:** Admin portal for managing story system
- **Features:**
  - Three tabs: "Who's Online", "Login Logs", "Message History"
  - Send secret messages (appears when users click first 't')
  - View online users (auto-refresh every 5 seconds)
  - View login history with IP addresses
  - View complete message history (text, images, videos)
  - Statistics dashboard
- **Key State:**
  - `activeTab`, `loginLogs`, `messages`, `statistics`
  - `onlineUsers`, `onlineCount`, `totalUsers`
  - `adminMessage`, `sendingMessage`, `messageSent`
- **API Calls:**
  - `GET /api/story/admin/auth` - Verify session
  - `GET /api/story/admin/online-users` - Get online users
  - `GET /api/story/admin/login-logs` - Get login history
  - `GET /api/story/admin/message-history` - Get message history
  - `POST /api/story/admin/send-message` - Send admin message

---

## 🔌 API Routes

### User Authentication & Story

#### `/api/story/auth` (POST, DELETE)
**File:** `app/api/story/auth/route.ts`
- **POST:** Authenticate user and create JWT session
  - Validates `username` and `password`
  - Queries `story_users` table
  - Uses bcrypt to verify password
  - Creates JWT token (24h expiry)
  - Logs login to `story_login_logs` table
  - Returns: `{ session: token }`
- **DELETE:** Logout (cleanup endpoint)
- **Error Handling:** Comprehensive error messages for missing env vars, DB errors, invalid credentials

#### `/api/story/current` (GET)
**File:** `app/api/story/current/route.ts`
- **Purpose:** Get current week's story and hidden message
- **Auth:** Requires JWT token in Authorization header
- **Logic:**
  - Calculates current week's Monday
  - Checks if story exists for that week
  - If not, generates new story using Claude API
  - Returns story with hidden message if exists
- **Story Generation:**
  - Uses Anthropic Claude API (claude-sonnet-4-20250514)
  - Tries to match current Whale curriculum theme
  - Validates story has 't' and 'c' in first paragraph
  - Fallback story if API fails
- **Returns:** `{ username, story: { title, paragraphs, hiddenMessage, messageAuthor } }`

#### `/api/story/current-media` (GET)
**File:** `app/api/story/current-media/route.ts`
- **Purpose:** Get all non-expired media (images/videos) for current week
- **Auth:** Requires JWT token
- **Logic:**
  - Gets current week's Monday
  - Queries `story_message_history` for media items
  - Filters: `message_type IN ('image', 'video')`, `is_expired = FALSE`, `expires_at > NOW()`
- **Returns:** `{ media: MediaItem[] }`

#### `/api/story/message` (POST, GET)
**File:** `app/api/story/message/route.ts`
- **POST:** Save text message
  - Validates message and author
  - Saves to `story_message_history` (permanent record)
  - Updates `secret_stories.hidden_message` (overwrites previous)
  - Sets expiration to 7 days from now
- **GET:** Check if message exists
  - Returns `{ hasMessage: boolean, author?, timestamp? }`
- **Auth:** Requires JWT token

#### `/api/story/upload-media` (POST)
**File:** `app/api/story/upload-media/route.ts`
- **Purpose:** Upload images or videos
- **Auth:** Requires JWT token
- **Features:**
  - File type detection (image/video)
  - File size validation (50MB images, 100MB videos)
  - Supports: JPEG, PNG, GIF, WebP, HEIC, MP4, WebM, MOV, AVI, MKV
  - Uploads to Supabase Storage bucket `story-uploads`
  - Saves metadata to `story_message_history`
  - Sets expiration to 7 days
- **Returns:** `{ success: true, mediaUrl, fileName }`
- **Error Handling:** Detailed error messages for file type, size, upload failures

### Admin API Routes

#### `/api/story/admin/auth` (POST, GET, PUT)
**File:** `app/api/story/admin/auth/route.ts`
- **POST:** Admin login
  - Queries `story_admin_users` table
  - Verifies password with bcrypt
  - Creates JWT token with `role: 'admin'` (8h expiry)
  - Updates `last_login` timestamp
- **GET:** Verify admin session
  - Validates JWT and checks `role === 'admin'`
- **PUT:** Hash password (development only)
- **Uses:** `STORY_ADMIN_JWT_SECRET` or falls back to `STORY_JWT_SECRET`

#### `/api/story/admin/login-logs` (GET)
**File:** `app/api/story/admin/login-logs/route.ts`
- **Purpose:** Get login history
- **Auth:** Requires admin JWT with `role: 'admin'`
- **Query Params:** `limit`, `offset`
- **Returns:** `{ logs: LoginLog[], total, limit, offset }`

#### `/api/story/admin/message-history` (GET)
**File:** `app/api/story/admin/message-history/route.ts`
- **Purpose:** Get complete message history
- **Auth:** Requires admin JWT
- **Query Params:** `limit`, `offset`, `type` (text/image/video), `showExpired`
- **Returns:** `{ messages: MessageHistory[], total, statistics: Statistics[] }`

#### `/api/story/admin/online-users` (GET)
**File:** `app/api/story/admin/online-users/route.ts`
- **Purpose:** Get users currently online (logged in within last 10 minutes)
- **Auth:** Requires admin JWT
- **Logic:**
  - Queries `story_login_logs` for recent logins
  - Groups by username, gets most recent login
  - Calculates seconds ago
- **Returns:** `{ onlineUsers: OnlineUser[], onlineCount, totalUsers, thresholdMinutes }`

#### `/api/story/admin/send-message` (POST)
**File:** `app/api/story/admin/send-message/route.ts`
- **Purpose:** Send secret message from admin dashboard
- **Auth:** Requires admin JWT
- **Logic:**
  1. Validates message and admin session
  2. Checks if tables exist (returns clear error if missing)
  3. Saves to `story_message_history`
  4. Creates or updates `secret_stories` with hidden message
- **Returns:** `{ success: true, message, sentAt, weekStartDate }`
- **Error Handling:** Comprehensive logging and error messages

---

## 🗄️ Database Schema

### Tables

#### `secret_stories`
**Migration:** `migrations/001_create_secret_story_tables.sql`
```sql
CREATE TABLE secret_stories (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  theme VARCHAR(255) NOT NULL,
  story_title VARCHAR(255) NOT NULL,
  story_content JSONB NOT NULL,  -- { paragraphs: string[] }
  hidden_message TEXT,
  message_author VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```
- **Purpose:** Stores weekly stories with hidden messages
- **Key:** One story per week (week_start_date is unique)

#### `story_users`
**Migration:** `migrations/002_create_story_users.sql`
```sql
CREATE TABLE story_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(10) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```
- **Purpose:** User authentication for story viewers
- **Current Users:** T (password: redoux), Z (password: oe)

#### `story_login_logs`
**Migration:** `migrations/009_story_admin_system.sql`
```sql
CREATE TABLE story_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(10) NOT NULL,
  login_time TIMESTAMP DEFAULT NOW(),
  session_id TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT
);
```
- **Purpose:** Track all logins for admin monitoring
- **Indexes:** `login_time DESC`, `username`

#### `story_message_history`
**Migration:** `migrations/009_story_admin_system.sql`
```sql
CREATE TABLE story_message_history (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL,
  message_type VARCHAR(20) NOT NULL,  -- 'text', 'image', 'video'
  message_content TEXT,
  media_url TEXT,
  media_filename TEXT,
  author VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_expired BOOLEAN DEFAULT FALSE
);
```
- **Purpose:** Complete history of all messages and media (never deleted)
- **Indexes:** `week_start_date`, `created_at DESC`, `is_expired, expires_at`

#### `story_admin_users`
**Migration:** `migrations/009_story_admin_system.sql`
```sql
CREATE TABLE story_admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```
- **Purpose:** Admin authentication
- **Current Admin:** T (password: redoux) - Note: Should match story_users

### Functions

#### `mark_expired_messages()`
**Migration:** `migrations/009_story_admin_system.sql`
- **Purpose:** Automatically mark messages as expired when `expires_at < NOW()`
- **Scheduled:** Runs every hour via pg_cron (if enabled)

### Storage

#### Supabase Storage Bucket: `story-uploads`
- **Purpose:** Store uploaded images and videos
- **Public:** Yes (for easy access)
- **Path Structure:** `story-media/{weekStartDate}/{timestamp}-{author}.{ext}`
- **Policies:**
  - Authenticated users can INSERT
  - Public can SELECT

---

## 🔐 Authentication

### User Authentication (Story Viewers)
- **Library:** `jose` (JWT)
- **Secret:** `STORY_JWT_SECRET` environment variable
- **Token Expiry:** 24 hours
- **Storage:** sessionStorage (cleared on browser close)
- **Helper:** `lib/story-auth.ts` - `verifyToken()` function

### Admin Authentication
- **Library:** `jose` (JWT)
- **Secret:** `STORY_ADMIN_JWT_SECRET` (falls back to `STORY_JWT_SECRET`)
- **Token Expiry:** 8 hours
- **Token Payload:** `{ username, role: 'admin' }`
- **Storage:** sessionStorage

### Password Hashing
- **Library:** `bcryptjs`
- **Rounds:** 10
- **Used in:** Both user and admin authentication

---

## 🔧 Environment Variables

### Required
```env
# Database
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres

# JWT Secrets
STORY_JWT_SECRET=your-secret-key-min-32-chars
STORY_ADMIN_JWT_SECRET=your-admin-secret-key (optional, falls back to STORY_JWT_SECRET)

# Supabase (for media uploads)
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic API (for story generation)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Database Connection
- **Library:** `pg` (PostgreSQL client)
- **Connection Pool:** Configured in `lib/db.ts`
- **SSL:** Enabled for Supabase connections
- **Pool Settings:** max: 10, idleTimeout: 30s, connectionTimeout: 30s

---

## 📦 Dependencies

### Core
- `next`: 16.0.7
- `react`: 19.2.0
- `react-dom`: 19.2.0

### Authentication & Security
- `jose`: ^5.10.0 (JWT)
- `bcryptjs`: ^3.0.3 (Password hashing)

### Database
- `pg`: ^8.16.3 (PostgreSQL client)

### Supabase
- `@supabase/supabase-js`: ^2.81.0 (Storage uploads)

---

## 🎯 Key Features & Interactions

### Story Viewer Interactions

1. **Click First 't' in Paragraph 1:**
   - Toggles display of hidden text message
   - Message appears at end of paragraph 3
   - Hides media gallery if open

2. **Click First 'c' in Paragraph 1:**
   - Opens message editor
   - Scrolls to paragraph 3
   - Allows typing and saving message
   - Hides media gallery if open

3. **Click Last Letter of Last Paragraph:**
   - First click: Shows upload section AND media gallery
   - Second click: Hides both
   - Toggles `lastLetterTapped` state

### Message Flow

1. **Admin sends message:**
   - Admin logs into `/story/admin/dashboard`
   - Types message in "Send Secret Message" box
   - Clicks "Send Message"
   - Message saved to `story_message_history` AND `secret_stories.hidden_message`

2. **User views message:**
   - User logs into `/story`
   - Views weekly story
   - Clicks first 't' in paragraph 1
   - Hidden message appears at end of paragraph 3

### Media Upload Flow

1. **User uploads media:**
   - User clicks last letter of last paragraph
   - Upload section appears
   - Selects image/video file
   - File validated (type, size)
   - Uploaded to Supabase Storage
   - Metadata saved to `story_message_history`
   - Expires after 7 days

2. **Media display:**
   - Media gallery shows when last letter clicked
   - Only shows non-expired media for current week
   - Displays images and videos with author and date

---

## 🐛 Known Issues & Error Patterns

### Common Errors

1. **"Failed to check child existence: TypeError: fetch failed"**
   - **Location:** `lib/montree/db.ts` (not story-related, but in same codebase)
   - **Cause:** Network error when checking database
   - **Status:** Should be handled with try-catch

2. **"Cannot read properties of undefined (reading 'map')"**
   - **Location:** Various components
   - **Cause:** Missing null/undefined checks
   - **Fix:** Add defensive checks like `(array || []).map(...)`

3. **"null value in column violates not-null constraint"**
   - **Location:** Database inserts
   - **Cause:** Missing required fields
   - **Fix:** Ensure all required fields are provided

4. **"Failed to upload file" / Storage bucket errors**
   - **Location:** `/api/story/upload-media`
   - **Cause:** Missing Supabase storage bucket or incorrect policies
   - **Fix:** Create `story-uploads` bucket in Supabase Storage

5. **"Database table missing"**
   - **Location:** Various API routes
   - **Cause:** Migration not run
   - **Fix:** Run migration SQL files in Supabase

### Authentication Errors

- **"Invalid credentials"** - Wrong username/password
- **"Unauthorized"** - Missing or invalid JWT token
- **"Forbidden"** - Valid token but wrong role (admin routes)

### Story Generation Errors

- **"Failed to generate story"** - Claude API failure
- **"First paragraph missing required letters"** - Generated story doesn't have 't' and 'c'
- **Fallback:** Uses default "The Kind Doctor" story

---

## 🔍 Code Patterns & Conventions

### Week Calculation
All routes use this pattern to get current week's Monday:
```typescript
const today = new Date();
const dayOfWeek = today.getDay();
const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday
const monday = new Date(today);
monday.setDate(today.getDate() + diff);
monday.setHours(0, 0, 0, 0);
const weekStartDate = monday.toISOString().split('T')[0];
```

### JWT Verification Pattern
```typescript
const authHeader = req.headers.get('authorization');
if (!authHeader) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
const token = authHeader.replace('Bearer ', '');
const { payload } = await jwtVerify(token, JWT_SECRET);
```

### Error Response Pattern
```typescript
return NextResponse.json(
  { 
    error: 'Error message',
    details: process.env.NODE_ENV === 'development' ? errorMessage : 'User-friendly message'
  },
  { status: 500 }
);
```

### Expiration Calculation
```typescript
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
```

---

## 📝 File Locations Summary

### Frontend
- `app/story/page.tsx` - Login page
- `app/story/[session]/page.tsx` - Story viewer
- `app/story/admin/page.tsx` - Admin login
- `app/story/admin/dashboard/page.tsx` - Admin dashboard

### API Routes
- `app/api/story/auth/route.ts` - User auth
- `app/api/story/current/route.ts` - Get story
- `app/api/story/current-media/route.ts` - Get media
- `app/api/story/message/route.ts` - Save message
- `app/api/story/upload-media/route.ts` - Upload media
- `app/api/story/admin/auth/route.ts` - Admin auth
- `app/api/story/admin/login-logs/route.ts` - Login logs
- `app/api/story/admin/message-history/route.ts` - Message history
- `app/api/story/admin/online-users/route.ts` - Online users
- `app/api/story/admin/send-message/route.ts` - Send admin message

### Utilities
- `lib/story-auth.ts` - JWT verification helper
- `lib/db.ts` - Database connection pool

### Migrations & Setup Scripts
- `migrations/001_create_secret_story_tables.sql` - Base tables (secret_stories, story_users)
- `migrations/002_create_story_users.sql` - User table setup (T and Z users)
- `migrations/009_story_admin_system.sql` - Admin system tables (login_logs, message_history, admin_users)
- `migrations/010_story_uploads_storage.sql` - Storage bucket setup
- `FIX_STORY_TABLES_NOW.sql` - Emergency fix script (creates all tables if missing)
- `UPDATE_ADMIN_USER_TO_T.sql` - Updates admin username to "T" (if exists)

### Documentation
- `STORY_SYSTEM_COMPLETE_GUIDE.md` - User guide
- `STORY-ADMIN-SETUP.md` - Admin setup guide
- `STORY_SYSTEM_ANALYSIS.md` - System analysis
- `STORY_LOGIN_DIAGNOSTIC.md` - Login troubleshooting

---

## 🎨 UI/UX Details

### Story Viewer
- **Background:** Gradient from amber-50 to orange-100
- **Story Card:** White background, rounded-lg, shadow-xl
- **Interactive Letters:** Hover effect (text-indigo-600), cursor-pointer
- **Message Editor:** Inline input with border-b-2, animate-pulse
- **Media Gallery:** Grid layout (1 col mobile, 2 cols desktop)

### Admin Dashboard
- **Background:** Gradient from gray-50 to gray-100
- **Tabs:** Purple accent color (border-purple-600)
- **Online Users:** Green pulse indicator, gradient avatars
- **Statistics Cards:** White background with colored text

### Color Scheme
- **Primary:** Indigo (buttons, links)
- **Success:** Green (online status, success messages)
- **Error:** Red (error messages, expired badges)
- **Warning:** Orange/Amber (story background)

---

## 🔄 Data Flow Diagrams

### Story Loading Flow
```
User Login → JWT Token → GET /api/story/current
  → Check if story exists for week
  → If not: Generate with Claude API
  → Save to secret_stories
  → Return story + hidden message
```

### Message Saving Flow
```
User clicks 'c' → Types message → POST /api/story/message
  → Save to story_message_history (permanent)
  → Update secret_stories.hidden_message (overwrites)
  → Set expires_at = now + 7 days
```

### Media Upload Flow
```
User clicks last letter → Select file → POST /api/story/upload-media
  → Validate file (type, size)
  → Upload to Supabase Storage
  → Save metadata to story_message_history
  → Set expires_at = now + 7 days
  → Return public URL
```

### Admin Message Flow
```
Admin types message → POST /api/story/admin/send-message
  → Verify admin session
  → Check tables exist
  → Save to story_message_history
  → Create/update secret_stories
  → Return success
```

---

## ⚠️ Important Notes for Opus

1. **Week Calculation:** All routes calculate week_start_date the same way. If you change it, update all routes.

2. **Message Overwriting:** The `secret_stories.hidden_message` field is overwritten (not appended). Only one message per week.

3. **Expiration:** Messages expire after 7 days but remain in `story_message_history` permanently.

4. **Session Storage:** Both user and admin sessions use sessionStorage (not localStorage). Cleared on browser close.

5. **JWT Secrets:** Admin can fall back to user secret if `STORY_ADMIN_JWT_SECRET` not set.

6. **Story Generation:** Requires Anthropic API key. Falls back to default story if API fails.

7. **Storage Bucket:** Must be created manually in Supabase. Name must be exactly `story-uploads`.

8. **Interactive Letters:** Only the FIRST 't' and 'c' in paragraph 1 are clickable. Only the LAST letter of the last paragraph is clickable.

9. **Media Types:** Supports HEIC/HEIF (iOS) and various video formats. File type detection uses both MIME type and extension.

10. **Error Handling:** Most routes have comprehensive error handling with detailed messages in development mode.

---

## 🧪 Testing Checklist

When checking for errors, verify:

- [ ] User login works (`/story`)
- [ ] Admin login works (`/story/admin`)
- [ ] Story loads and displays correctly
- [ ] First 't' toggles message display
- [ ] First 'c' opens message editor
- [ ] Message saving works
- [ ] Last letter toggles media section
- [ ] Media upload works (images and videos)
- [ ] Media gallery displays correctly
- [ ] Admin can send messages
- [ ] Admin can view online users
- [ ] Admin can view login logs
- [ ] Admin can view message history
- [ ] Expired messages don't show in public view
- [ ] Expired messages still show in admin view
- [ ] JWT tokens expire correctly
- [ ] Session cleanup on window close

---

## 📚 Additional Context Files

- `STORY_SYSTEM_COMPLETE_GUIDE.md` - Complete user guide
- `STORY-ADMIN-SETUP.md` - Admin setup instructions
- `STORY_SYSTEM_ANALYSIS.md` - Technical analysis
- `STORY_LOGIN_DIAGNOSTIC.md` - Login troubleshooting
- `STORY_LOGIN_ISSUE_FOUND.md` - Known login issues
- `HOW_TO_FIX_STORY_MESSAGES.md` - Message troubleshooting

---

## 🎯 Current Status

**Production URL:** https://www.teacherpotato.xyz/story

**Login Credentials:**
- Story Viewer: T / redoux (or Z / oe)
- Admin Dashboard: T / redoux

**Known Working:**
- ✅ User authentication
- ✅ Story generation and display
- ✅ Text message sending and viewing
- ✅ Media upload (images/videos)
- ✅ Admin dashboard
- ✅ Online user tracking
- ✅ Login logging
- ✅ Message history

**Potential Issues to Check:**
- Story generation API failures
- Storage bucket configuration
- Database connection timeouts
- JWT token expiration handling
- Media file type detection edge cases
- Week calculation edge cases (Sunday handling)

---

---

## 📋 SQL Scripts Reference

### Setup Scripts (Run in Order)

#### 1. Base Tables
**File:** `migrations/001_create_secret_story_tables.sql`
```sql
CREATE TABLE IF NOT EXISTS secret_stories (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  theme VARCHAR(255) NOT NULL,
  story_title VARCHAR(255) NOT NULL,
  story_content JSONB NOT NULL,
  hidden_message TEXT,
  message_author VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(10) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secret_stories_week ON secret_stories(week_start_date);
```

#### 2. Create Users
**File:** `migrations/002_create_story_users.sql`
```sql
INSERT INTO story_users (username, password_hash)
VALUES
  ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'),
  ('Z', '$2b$10$o8s80aV2vWkgVjZKSsIRKu7IPvNbuLwb08HiWECZ7xCtv4f5bQkPK')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;
-- T / redoux, Z / oe
```

#### 3. Admin System
**File:** `migrations/009_story_admin_system.sql`
- Creates `story_login_logs`, `story_message_history`, `story_admin_users`
- Creates `mark_expired_messages()` function
- Sets up pg_cron job (if extension enabled)

#### 4. Storage Bucket
**File:** `migrations/010_story_uploads_storage.sql`
- Creates `story-uploads` bucket
- Sets up storage policies

#### 5. Emergency Fix
**File:** `FIX_STORY_TABLES_NOW.sql`
- Drops and recreates all tables if corrupted
- Use when tables are missing or have issues

#### 6. Update Admin User
**File:** `UPDATE_ADMIN_USER_TO_T.sql`
```sql
UPDATE story_admin_users 
SET username = 'T',
    password_hash = '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'
WHERE username = 'Tredoux';

INSERT INTO story_admin_users (username, password_hash)
VALUES ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;
```

---

## 🔍 Error Checking Checklist for Opus

When reviewing the story application, check for:

### Authentication Issues
- [ ] JWT token generation/verification
- [ ] Password hashing/verification
- [ ] Session storage handling
- [ ] Token expiration logic
- [ ] Admin role verification

### Database Issues
- [ ] Table existence checks
- [ ] Foreign key constraints
- [ ] NULL value handling
- [ ] Week calculation accuracy
- [ ] Query parameterization (SQL injection prevention)

### API Route Issues
- [ ] Error handling completeness
- [ ] Response status codes
- [ ] Environment variable checks
- [ ] Input validation
- [ ] File upload validation

### Frontend Issues
- [ ] State management
- [ ] Event handlers
- [ ] API call error handling
- [ ] Loading states
- [ ] User feedback (success/error messages)

### Story Generation Issues
- [ ] Claude API error handling
- [ ] Story validation (t and c in first paragraph)
- [ ] Fallback story availability
- [ ] Theme matching logic

### Media Upload Issues
- [ ] File type detection
- [ ] File size validation
- [ ] Storage bucket access
- [ ] Public URL generation
- [ ] Error messages clarity

### Expiration Logic
- [ ] Expiration date calculation
- [ ] Expired message filtering
- [ ] Auto-expiry function execution
- [ ] Admin view vs public view filtering

---

## 📊 Database Relationships

```
story_users (1) ──< (many) story_login_logs
secret_stories (1) ──< (many) story_message_history
story_admin_users (1) ──< (many) story_login_logs (via admin actions)
```

**Key Relationships:**
- `story_message_history.week_start_date` → `secret_stories.week_start_date`
- `story_login_logs.username` → `story_users.username`
- Media files stored in Supabase Storage, URLs saved in `story_message_history.media_url`

---

## 🎯 Quick Reference

### URLs
- Story Login: `/story`
- Story Viewer: `/story/[session]`
- Admin Login: `/story/admin`
- Admin Dashboard: `/story/admin/dashboard`

### Credentials
- User: T / redoux or Z / oe
- Admin: T / redoux

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `STORY_JWT_SECRET` - JWT signing secret
- `STORY_ADMIN_JWT_SECRET` - Admin JWT (optional)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key
- `ANTHROPIC_API_KEY` - Claude API key

### Key Functions
- Week calculation: Monday of current week
- Expiration: 7 days from creation
- Token expiry: 24h (users), 8h (admin)
- Online threshold: 10 minutes

---

**End of Document**


