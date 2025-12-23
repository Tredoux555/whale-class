# Whale Class Project Structure & Story System Overview

**Project:** teacherpotato.xyz (Whale Class)  
**Framework:** Next.js 16  
**Database:** Supabase (PostgreSQL)  
**Deployment:** Vercel

---

## 📁 Complete Directory Structure

```
whale/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard pages
│   │   ├── ai-planner/
│   │   ├── card-generator/
│   │   ├── child-progress/
│   │   ├── children/
│   │   ├── circle-planner/
│   │   ├── curriculum-progress/
│   │   ├── daughter-activity/
│   │   ├── english-curriculum/
│   │   ├── flashcard-maker/
│   │   ├── login/
│   │   ├── material-generator/
│   │   ├── materials/
│   │   ├── montessori/
│   │   ├── montree/
│   │   ├── parent-signups/
│   │   ├── phonics-planner/
│   │   ├── progress/
│   │   ├── rbac-management/
│   │   ├── site-tester/
│   │   ├── video-management/
│   │   └── videos/
│   │
│   ├── api/                      # API Routes
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── circle-plans/
│   │   ├── materials/
│   │   ├── montree/
│   │   ├── permissions/
│   │   ├── phonics-plans/
│   │   ├── public/
│   │   ├── story/                 # ⭐ STORY SYSTEM API ROUTES
│   │   │   ├── admin/
│   │   │   │   ├── auth/route.ts
│   │   │   │   ├── login-logs/route.ts
│   │   │   │   ├── message-history/route.ts
│   │   │   │   ├── online-users/route.ts
│   │   │   │   └── send-message/route.ts
│   │   │   ├── auth/route.ts
│   │   │   ├── current/route.ts
│   │   │   ├── current-media/route.ts
│   │   │   ├── debug/route.ts
│   │   │   ├── message/route.ts
│   │   │   ├── test-connection/route.ts
│   │   │   └── upload-media/route.ts
│   │   ├── videos/
│   │   ├── whale/
│   │   └── youtube/
│   │
│   ├── auth/                      # Auth pages
│   │   ├── student-login/
│   │   ├── student-signup/
│   │   └── teacher-login/
│   │
│   ├── games/                     # Educational games
│   │   ├── [gameId]/
│   │   ├── letter-match/
│   │   ├── letter-sounds/
│   │   ├── letter-tracer/
│   │   ├── sentence-builder/
│   │   ├── sentence-match/
│   │   └── word-builder/
│   │
│   ├── parent/                    # Parent portal
│   │   └── dashboard/
│   │
│   ├── story/                     # ⭐ STORY SYSTEM PAGES
│   │   ├── [session]/            # Story viewer (dynamic session)
│   │   │   └── page.tsx
│   │   ├── admin/                # Story admin dashboard
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   └── page.tsx              # Story login page
│   │
│   ├── student/                   # Student portal
│   │
│   ├── teacher/                   # Teacher portal
│   │
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx                 # ⭐ ROOT LAYOUT
│   └── page.tsx                   # Home page
│
├── components/                    # React components
│   ├── games/                     # Game components
│   ├── flashcard-maker/
│   ├── materials/
│   ├── parent/
│   ├── teacher/
│   └── tree/
│
├── lib/                           # Library/utility code
│   ├── circle-time/              # Circle time curriculum
│   ├── curriculum/               # Montessori curriculum
│   ├── games/                    # Game data & utilities
│   ├── materials/                # Material generators
│   ├── montree/                  # Montree system
│   ├── permissions/              # RBAC system
│   ├── story/                    # ⭐ STORY SYSTEM LIBRARY
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── generate.ts
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── week.ts
│   ├── story-auth.ts             # Story auth utilities
│   ├── supabase.ts
│   └── youtube/                  # YouTube integration
│
├── migrations/                    # Database migrations
│   ├── 001_create_secret_story_tables.sql
│   ├── 001_create_secret_story_tables_step_by_step.sql
│   ├── 002_create_story_users.sql
│   ├── 009_story_admin_system.sql
│   ├── 009_story_admin_system_simple.sql
│   ├── 009_verify_story_admin.sql
│   ├── 010_story_uploads_storage.sql
│   ├── story_complete_schema.sql  # ⭐ COMPLETE STORY SCHEMA
│   ├── story_fix_existing_database.sql
│   ├── story_migration_update.sql
│   └── story_simple_fix.sql
│
├── public/                        # Static assets
│   ├── audio/                    # Audio files
│   ├── images/                   # Images
│   └── ...
│
├── data/                          # JSON data files
│   ├── circle-plans.json
│   ├── materials.json
│   ├── phonics-plans.json
│   └── videos.json
│
├── types/                         # TypeScript types
│   ├── database.ts
│   └── montessori-works.ts
│
├── middleware.ts                  # Next.js middleware (auth, redirects)
├── next.config.ts                 # Next.js configuration
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
└── vercel.json                    # Vercel deployment config
```

---

## 📚 Story System Files

### **Frontend Pages (app/story/)**

1. **`app/story/page.tsx`** - Story login page
   - User authentication form
   - Routes to `/story/[session]` on success

2. **`app/story/[session]/page.tsx`** - Story viewer
   - Displays weekly story content
   - Shows shared images, videos, and audio
   - Allows users to upload media
   - Displays hidden messages

3. **`app/story/admin/page.tsx`** - Admin login page
   - Admin authentication form

4. **`app/story/admin/dashboard/page.tsx`** - Admin dashboard
   - View message history
   - Send secret messages
   - View login logs
   - Monitor online users

### **API Routes (app/api/story/)**

1. **`app/api/story/auth/route.ts`** - User authentication
   - POST: Login with username/password
   - Returns JWT token

2. **`app/api/story/message/route.ts`** - Message handling
   - POST: Save text messages
   - GET: Check for messages

3. **`app/api/story/current/route.ts`** - Get current week's story
   - Returns story content for current week

4. **`app/api/story/current-media/route.ts`** - Get current week's media
   - Returns images, videos, and audio for current week

5. **`app/api/story/upload-media/route.ts`** - Upload media files
   - Handles image, video, and audio uploads
   - Stores in Supabase Storage

6. **`app/api/story/debug/route.ts`** - Debug endpoint
   - Shows system status, database connection, tables

7. **`app/api/story/test-connection/route.ts`** - Connection test
   - Tests database connectivity

8. **`app/api/story/admin/auth/route.ts`** - Admin authentication
   - POST: Admin login

9. **`app/api/story/admin/message-history/route.ts`** - Get message history
   - Returns all messages for admin dashboard

10. **`app/api/story/admin/send-message/route.ts`** - Send secret message
    - POST: Admin sends message to current week

11. **`app/api/story/admin/login-logs/route.ts`** - Get login logs
    - Returns login history

12. **`app/api/story/admin/online-users/route.ts`** - Get online users
    - Returns currently active users

### **Library Files (lib/story/)**

1. **`lib/story/types.ts`** - TypeScript interfaces
   - `Story`, `StoryUser`, `StoryAdminUser`
   - `MessageHistory`, `MediaItem`, `OnlineUser`
   - `StoryResponse`, `JWTPayload`, `GeneratedStory`

2. **`lib/story/auth.ts`** - Authentication utilities
   - JWT token generation/verification
   - Password hashing

3. **`lib/story/db.ts`** - Database utilities
   - Database connection helpers
   - Query functions

4. **`lib/story/generate.ts`** - Story generation
   - AI-powered story generation

5. **`lib/story/week.ts`** - Week calculation utilities
   - Get current week start date

6. **`lib/story/index.ts`** - Exports

7. **`lib/story-auth.ts`** - Additional auth utilities

### **Database Schema**

**Main Schema File:** `migrations/story_complete_schema.sql`

#### Tables:

1. **`secret_stories`**
   ```sql
   - id (SERIAL PRIMARY KEY)
   - week_start_date (DATE, UNIQUE)
   - theme (VARCHAR)
   - story_title (VARCHAR)
   - story_content (JSONB) -- { paragraphs: string[] }
   - hidden_message (TEXT)
   - message_author (VARCHAR)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)
   ```

2. **`story_users`**
   ```sql
   - username (VARCHAR, UNIQUE)
   - password_hash (VARCHAR)
   - created_at (TIMESTAMP)
   ```

3. **`story_admin_users`**
   ```sql
   - username (VARCHAR, UNIQUE)
   - password_hash (VARCHAR)
   - created_at (TIMESTAMP)
   - last_login (TIMESTAMP)
   ```

4. **`story_message_history`**
   ```sql
   - id (SERIAL PRIMARY KEY)
   - week_start_date (DATE)
   - message_type (VARCHAR) -- 'text', 'image', 'video', 'audio'
   - content (TEXT) -- Note: was message_content, renamed to content
   - media_url (TEXT)
   - media_filename (TEXT)
   - author (VARCHAR)
   - created_at (TIMESTAMP)
   - expires_at (TIMESTAMP)
   - is_expired (BOOLEAN)
   - is_from_admin (BOOLEAN)
   ```

5. **`story_login_logs`**
   ```sql
   - id (SERIAL PRIMARY KEY)
   - username (VARCHAR)
   - login_at (TIMESTAMP) -- or login_time (backward compat)
   - session_id (TEXT)
   - session_token (TEXT)
   - ip_address (VARCHAR)
   - user_agent (TEXT)
   - logout_at (TIMESTAMP)
   ```

#### Storage:
- **Bucket:** `story-uploads` (Supabase Storage)
- **Public:** Yes
- **Policies:** Public read, authenticated upload

#### Default Users:
- **Regular Users:**
  - Username: `T`, Password: `redoux`
  - Username: `Z`, Password: `oe`
- **Admin User:**
  - Username: `T`, Password: `redoux`

---

## 🎨 Main Layout

**File:** `app/layout.tsx`

```typescript
- Root HTML structure
- Inter font configuration
- Global CSS imports
- GlobalVideoSetup component
- Metadata (title, description, icons, PWA manifest)
- Viewport configuration
```

**Key Features:**
- PWA support (manifest.json)
- Apple touch icons
- Responsive viewport
- Global video setup

---

## 🔧 Key Configuration Files

1. **`middleware.ts`** - Route protection
   - Public routes: `/`, `/games`, `/story`
   - API routes bypassed
   - Auth checks for protected routes

2. **`next.config.ts`** - Next.js config
   - PWA configuration
   - Webpack settings

3. **`vercel.json`** - Deployment config
   - Vercel-specific settings

4. **`package.json`** - Dependencies
   - Next.js 16
   - Supabase client
   - JWT (jose)
   - PostgreSQL (pg)
   - Bcryptjs

---

## 📊 Database Schema Files

1. **`migrations/story_complete_schema.sql`** - Complete story system schema
2. **`MONTESSORI-DATABASE-SCHEMA.sql`** - Main Montessori tracking schema
3. **`migrations/001_create_secret_story_tables.sql`** - Initial story tables
4. **`migrations/002_create_story_users.sql`** - User authentication
5. **`migrations/009_story_admin_system.sql`** - Admin system
6. **`migrations/010_story_uploads_storage.sql`** - Storage setup

---

## 🔍 Story System Flow

1. **User Login** (`/story`)
   - User enters username/password
   - POST to `/api/story/auth`
   - Receives JWT token
   - Redirected to `/story/[session]`

2. **View Story** (`/story/[session]`)
   - Fetches current week's story from `/api/story/current`
   - Fetches media from `/api/story/current-media`
   - Displays story paragraphs
   - Shows shared images/videos/audio
   - Allows media upload

3. **Admin Dashboard** (`/story/admin/dashboard`)
   - Admin logs in via `/story/admin`
   - Views message history
   - Sends secret messages
   - Monitors users

4. **Message System**
   - Users can send text messages (saved to `story_message_history`)
   - Messages expire after 7 days
   - Admin can send secret messages (stored in `secret_stories.hidden_message`)

---

## 🚀 Environment Variables Required

```env
DATABASE_URL=postgresql://...          # Supabase connection string
STORY_JWT_SECRET=...                   # JWT secret (min 32 chars)
NEXT_PUBLIC_SUPABASE_URL=...          # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=...         # Supabase service role key
```

---

## 📝 Notes

- Story system uses **weekly stories** based on Monday start dates
- Media files stored in **Supabase Storage** bucket `story-uploads`
- Authentication uses **JWT tokens** stored in sessionStorage
- Messages expire after **7 days** automatically
- Database uses **PostgreSQL** via Supabase
- All API routes are **self-contained** with inline database connections

