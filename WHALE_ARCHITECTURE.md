# Whale Architecture Documentation

**Project:** Whale Class - Montessori Curriculum Tracking System  
**Domain:** teacherpotato.xyz  
**Last Updated:** 2024

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Current Features in Montessori Section](#5-current-features-in-montessori-section)
6. [Environment & Configuration](#6-environment--configuration)
7. [Component Architecture](#7-component-architecture)

---

## 1. Project Structure

### Complete Directory Tree

```
whale/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard pages
│   │   ├── card-generator/       # Card generation tool
│   │   ├── circle-planner/       # Circle time planning
│   │   ├── daughter-activity/    # Kid-friendly activity view
│   │   ├── english-curriculum/   # English curriculum browser
│   │   ├── login/                # Admin login page
│   │   ├── materials/            # Materials management
│   │   ├── montessori/           # Montessori tracking system ⭐
│   │   │   ├── activities/       # Activities library page
│   │   │   ├── children/         # Children management
│   │   │   │   └── [id]/         # Individual child profile
│   │   │   ├── reports/          # Progress reports
│   │   │   └── page.tsx          # Montessori dashboard
│   │   ├── phonics-planner/      # Phonics lesson planning
│   │   └── page.tsx              # Main admin dashboard
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin utilities
│   │   ├── auth/                 # Authentication
│   │   ├── circle-plans/         # Circle time plans
│   │   ├── materials/            # Materials API
│   │   ├── phonics-plans/        # Phonics plans API
│   │   ├── public/               # Public endpoints
│   │   ├── story/                # Secret story system
│   │   ├── videos/               # Video management
│   │   └── whale/                # Montessori API ⭐
│   │       ├── activities/       # Activities CRUD
│   │       ├── activity-history/ # Activity history
│   │       ├── children/         # Children CRUD
│   │       │   └── [id]/         # Individual child operations
│   │       ├── daily-activity/   # Daily activity assignments
│   │       ├── favorites/        # Favorite activities
│   │       ├── photos/           # Child photos
│   │       ├── progress/         # Progress tracking
│   │       │   ├── enhanced/     # Enhanced progress stats
│   │       │   └── summary/      # Progress summaries
│   │       ├── reports/          # Report generation
│   │       │   ├── generate/     # Generate report data
│   │       │   └── pdf/          # PDF generation
│   │       └── themes/           # Activity themes
│   ├── story/                    # Story system pages
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── ActivityHistory.tsx       # Activity history component
│   ├── ChildDashboard.tsx        # Basic child dashboard
│   ├── EnhancedChildDashboard.tsx # Enhanced child dashboard ⭐
│   ├── MaintenanceScreen.tsx    # Maintenance mode
│   └── ProgressVisualization.tsx # Progress charts
├── lib/                          # Utility libraries
│   ├── algorithms/               # Business logic algorithms
│   │   └── activity-selection.ts # Activity selection algorithm ⭐
│   ├── db/                       # Database access layer
│   │   ├── children.ts           # Child database operations
│   │   └── progress.ts           # Progress database operations
│   ├── auth.ts                   # Authentication utilities
│   ├── db.ts                     # PostgreSQL connection pool
│   ├── supabase.ts               # Supabase client configuration
│   ├── story-auth.ts             # Story system auth
│   └── video-utils.ts           # Video utilities
├── types/                        # TypeScript type definitions
│   └── database.ts               # Database types & interfaces ⭐
├── data/                         # Static data files
│   ├── circle-plans.json
│   ├── materials.json
│   ├── phonics-plans.json
│   └── videos.json
├── migrations/                   # Database migrations
│   ├── 001_create_secret_story_tables.sql
│   ├── 002_create_story_users.sql
│   ├── create_favorites_photos_themes.sql
│   └── MONTESSORI-DATABASE-SCHEMA.sql ⭐
├── public/                       # Static assets
├── scripts/                      # Utility scripts
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
└── vercel.json                   # Vercel deployment config
```

### Key Files Highlighted

**Montessori Core Files:**
- `app/admin/montessori/` - All Montessori UI pages
- `app/api/whale/` - All Montessori API endpoints
- `types/database.ts` - TypeScript interfaces
- `lib/db/children.ts` & `lib/db/progress.ts` - Database layer
- `lib/algorithms/activity-selection.ts` - Activity selection logic
- `components/EnhancedChildDashboard.tsx` - Main child dashboard component

---

## 2. Technology Stack

### Frontend
- **Framework:** Next.js 16.0.7 (App Router)
- **React:** 19.2.0
- **Styling:** Tailwind CSS 4.x
- **Icons:** Lucide React 0.556.0
- **Charts:** Recharts 3.5.1
- **Drag & Drop:** @dnd-kit (core, sortable, utilities)
- **PWA:** next-pwa 5.6.0

### Backend
- **Runtime:** Node.js (via Next.js API Routes)
- **Framework:** Next.js API Routes (Server Actions)
- **Language:** TypeScript 5.x

### Database
- **Type:** PostgreSQL (via Supabase)
- **ORM/Query Builder:** Supabase JS Client 2.81.0
- **Direct Access:** pg 8.16.3 (PostgreSQL driver)
- **Connection:** Connection pooling via Supabase transaction pooler

### Authentication
- **Admin Auth:** JWT (jsonwebtoken 9.0.2) with bcryptjs 3.0.3
- **Story System:** Custom JWT with jose 5.10.0
- **Supabase Auth:** @supabase/auth-helpers-nextjs 0.15.0

### Storage
- **File Storage:** Supabase Storage
- **Blob Storage:** @vercel/blob 2.0.0 (for video uploads)
- **File Upload:** multer 2.0.2

### Hosting
- **Platform:** Vercel
- **Domain:** teacherpotato.xyz
- **Database Hosting:** Supabase (PostgreSQL)

### Key Libraries
- **UUID:** uuid 13.0.0
- **Date/Time:** Native JavaScript Date API

---

## 3. Database Schema

### Database: PostgreSQL (Supabase)

### Tables

#### 1. `children`
Stores child/student information.

```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  age_group TEXT NOT NULL CHECK (age_group IN ('2-3', '3-4', '4-5', '5-6')),
  active_status BOOLEAN NOT NULL DEFAULT true,
  photo_url TEXT,
  parent_email TEXT,
  parent_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_children_active_status` on `active_status`
- `idx_children_age_group` on `age_group`

#### 2. `skill_categories`
Organizes skills into curriculum areas and categories.

```sql
CREATE TABLE skill_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area TEXT NOT NULL CHECK (area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'english', 'cultural')),
  category TEXT NOT NULL,
  subcategory TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_skill_categories_area` on `area`

#### 3. `skills`
Individual skills within categories.

```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  description TEXT,
  age_min NUMERIC(3,1) NOT NULL DEFAULT 2.0,
  age_max NUMERIC(3,1) NOT NULL DEFAULT 6.0,
  prerequisites UUID[] DEFAULT '{}',
  order_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_skills_category_id` on `category_id`
- `idx_skills_age_range` on `age_min, age_max`

#### 4. `child_progress`
Tracks child's progress on individual skills.

```sql
CREATE TABLE child_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  status_level INTEGER NOT NULL CHECK (status_level BETWEEN 0 AND 5) DEFAULT 0,
  date_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  teacher_initials TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, skill_id)
);
```

**Status Levels:**
- `0` - Not Introduced
- `1` - Observed
- `2` - Guided Practice
- `3` - Independent
- `4` - Mastery
- `5` - Transcended

**Indexes:**
- `idx_child_progress_child_id` on `child_id`
- `idx_child_progress_skill_id` on `skill_id`
- `idx_child_progress_status` on `status_level`

#### 5. `activities`
Library of Montessori activities.

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'english', 'cultural')),
  age_min NUMERIC(3,1) NOT NULL DEFAULT 2.0,
  age_max NUMERIC(3,1) NOT NULL DEFAULT 6.0,
  skill_level INTEGER NOT NULL CHECK (skill_level BETWEEN 0 AND 5) DEFAULT 1,
  duration_minutes INTEGER,
  materials TEXT[] DEFAULT '{}',
  instructions TEXT NOT NULL,
  learning_goals TEXT[] DEFAULT '{}',
  prerequisites UUID[] DEFAULT '{}',
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_activities_area` on `area`
- `idx_activities_age_range` on `age_min, age_max`
- `idx_activities_skill_level` on `skill_level`

#### 6. `activity_log`
Historical log of completed activities.

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  engagement_level INTEGER CHECK (engagement_level BETWEEN 1 AND 5),
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  teacher_initials TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_activity_log_child_id` on `child_id`
- `idx_activity_log_activity_id` on `activity_id`
- `idx_activity_log_date` on `activity_date`

#### 7. `daily_activity_assignments`
Today's assigned activity for each child.

```sql
CREATE TABLE daily_activity_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, assigned_date)
);
```

**Indexes:**
- `idx_daily_assignments_child_id` on `child_id`
- `idx_daily_assignments_date` on `assigned_date`
- `idx_daily_assignments_completed` on `completed`

### Relationships

```
children (1) ──< (many) child_progress ──> (1) skills ──> (1) skill_categories
children (1) ──< (many) activity_log ──> (1) activities
children (1) ──< (many) daily_activity_assignments ──> (1) activities
```

### Row Level Security (RLS)

All tables have RLS enabled with policies allowing service role full access:
- `Service role can do everything on [table_name]` - FOR ALL USING (true) WITH CHECK (true)

### Storage Buckets

- `child-photos` - Public bucket for child profile photos
- `videos` - Video storage
- `activity-materials` - Activity material files
- `parent-reports` - Generated PDF reports

---

## 4. API Endpoints

### Authentication

#### `POST /api/auth/login`
Admin login endpoint.

**Request:**
```json
{
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful"
}
```

**Authentication:** Sets `admin-token` cookie (JWT)

#### `POST /api/auth/logout`
Admin logout endpoint.

**Response:**
```json
{
  "success": true
}
```

### Montessori API (`/api/whale/*`)

#### Children Management

##### `GET /api/whale/children`
Get list of children.

**Query Parameters:**
- `active` (boolean, optional) - Filter by active status
- `ageGroup` (string, optional) - Filter by age group ('2-3', '3-4', '4-5', '5-6')
- `limit` (number, optional) - Limit results
- `offset` (number, optional) - Pagination offset

**Response:**
```json
{
  "data": [Child],
  "total": number
}
```

##### `POST /api/whale/children`
Create a new child.

**Request:**
```json
{
  "name": "string",
  "date_of_birth": "YYYY-MM-DD",
  "age_group": "2-3" | "3-4" | "4-5" | "5-6",
  "enrollment_date": "YYYY-MM-DD" (optional),
  "photo_url": "string" (optional),
  "parent_email": "string" (optional),
  "parent_name": "string" (optional),
  "notes": "string" (optional)
}
```

**Response:**
```json
{
  "data": Child,
  "message": "Child created successfully"
}
```

##### `GET /api/whale/children/[id]`
Get a specific child by ID.

**Response:**
```json
{
  "data": Child
}
```

##### `PUT /api/whale/children/[id]`
Update a child.

**Request:**
```json
{
  "name": "string" (optional),
  "date_of_birth": "YYYY-MM-DD" (optional),
  "age_group": "string" (optional),
  "active_status": boolean (optional),
  "photo_url": "string" (optional),
  "parent_email": "string" (optional),
  "parent_name": "string" (optional),
  "notes": "string" (optional)
}
```

**Response:**
```json
{
  "data": Child
}
```

##### `DELETE /api/whale/children/[id]`
Delete a child (soft delete via active_status).

**Response:**
```json
{
  "success": true
}
```

#### Activities

##### `GET /api/whale/activities`
Get all activities with optional filtering.

**Query Parameters:**
- `area` (string, optional) - Filter by curriculum area
- `skillLevel` (number, optional) - Filter by skill level (0-5)
- `age` (number, optional) - Filter by age
- `search` (string, optional) - Search in name, instructions, learning goals

**Response:**
```json
{
  "success": true,
  "data": [Activity],
  "count": number
}
```

#### Daily Activity Assignments

##### `GET /api/whale/daily-activity`
Get today's activity for a child.

**Query Parameters:**
- `childId` (string, required) - Child ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "child_id": "uuid",
    "activity_id": "uuid",
    "assigned_date": "YYYY-MM-DD",
    "completed": boolean,
    "completed_date": "YYYY-MM-DD" (optional),
    "activity": Activity
  } | null
}
```

##### `POST /api/whale/daily-activity`
Generate or assign a daily activity.

**Request:**
```json
{
  "childId": "uuid" (required),
  "activityId": "uuid" (optional) - If provided, assigns specific activity; otherwise generates automatically
}
```

**Response:**
```json
{
  "success": true,
  "data": DailyActivityAssignmentWithDetails
}
```

**Logic:**
- If `activityId` provided: Assigns that specific activity
- Otherwise: Uses intelligent algorithm to select activity based on:
  - Child's age
  - Recent activities (excludes last 10 days)
  - Progress gaps (prioritizes areas with lower progress)
  - Skill level appropriateness

##### `PUT /api/whale/daily-activity`
Update activity completion status.

**Request:**
```json
{
  "assignmentId": "uuid" (required),
  "completed": boolean (required),
  "notes": "string" (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": DailyActivityAssignmentWithDetails
}
```

#### Progress Tracking

##### `GET /api/whale/progress`
Get child's progress on skills.

**Query Parameters:**
- `childId` (string, required)
- `area` (string, optional) - Filter by curriculum area

**Response:**
```json
{
  "data": [ChildProgressWithSkill]
}
```

##### `POST /api/whale/progress`
Create or update progress record.

**Request:**
```json
{
  "child_id": "uuid" (required),
  "skill_id": "uuid" (required),
  "status_level": 0-5 (required),
  "notes": "string" (optional),
  "teacher_initials": "string" (optional)
}
```

**Response:**
```json
{
  "data": ChildProgress,
  "message": "Progress updated successfully"
}
```

##### `GET /api/whale/progress/summary`
Get progress summary by curriculum area.

**Query Parameters:**
- `childId` (string, required)

**Response:**
```json
{
  "data": [ProgressSummaryByArea]
}
```

##### `GET /api/whale/progress/enhanced`
Get enhanced progress statistics.

**Query Parameters:**
- `childId` (string, required)

**Response:**
```json
{
  "data": {
    "summary": [ProgressSummaryByArea],
    "recentUpdates": [ChildProgress],
    "totalSkills": number,
    "completedSkills": number
  }
}
```

#### Activity History

##### `GET /api/whale/activity-history`
Get activity history for a child.

**Query Parameters:**
- `childId` (string, required)
- `limit` (number, optional) - Default: 50
- `offset` (number, optional)

**Response:**
```json
{
  "data": [ActivityLog],
  "total": number
}
```

#### Favorites

##### `GET /api/whale/favorites`
Get favorite activities for a child.

**Query Parameters:**
- `childId` (string, required)

**Response:**
```json
{
  "data": [Activity]
}
```

##### `POST /api/whale/favorites`
Add activity to favorites.

**Request:**
```json
{
  "childId": "uuid" (required),
  "activityId": "uuid" (required)
}
```

**Response:**
```json
{
  "success": true
}
```

##### `DELETE /api/whale/favorites`
Remove activity from favorites.

**Query Parameters:**
- `childId` (string, required)
- `activityId` (string, required)

**Response:**
```json
{
  "success": true
}
```

#### Photos

##### `GET /api/whale/photos`
Get photos for a child.

**Query Parameters:**
- `childId` (string, required)

**Response:**
```json
{
  "data": [Photo]
}
```

##### `POST /api/whale/photos`
Upload a photo.

**Request:** FormData with `file` and `childId`

**Response:**
```json
{
  "success": true,
  "data": Photo
}
```

##### `DELETE /api/whale/photos`
Delete a photo.

**Query Parameters:**
- `photoId` (string, required)

**Response:**
```json
{
  "success": true
}
```

#### Themes

##### `GET /api/whale/themes`
Get themes for activities.

**Query Parameters:**
- `activityId` (string, optional)

**Response:**
```json
{
  "data": [Theme]
}
```

##### `POST /api/whale/themes`
Add theme to activity.

**Request:**
```json
{
  "activityId": "uuid" (required),
  "theme": "string" (required)
}
```

**Response:**
```json
{
  "success": true
}
```

##### `DELETE /api/whale/themes`
Remove theme from activity.

**Query Parameters:**
- `themeId` (string, required)

**Response:**
```json
{
  "success": true
}
```

#### Reports

##### `GET /api/whale/reports/generate`
Generate report data for a child.

**Query Parameters:**
- `childId` (string, required)
- `startDate` (string, optional) - YYYY-MM-DD
- `endDate` (string, optional) - YYYY-MM-DD

**Response:**
```json
{
  "data": {
    "child": Child,
    "progress": [ProgressSummaryByArea],
    "activities": [ActivityLog],
    "summary": ReportSummary
  }
}
```

##### `POST /api/whale/reports/pdf`
Generate PDF report.

**Request:**
```json
{
  "childId": "uuid" (required),
  "startDate": "YYYY-MM-DD" (optional),
  "endDate": "YYYY-MM-DD" (optional)
}
```

**Response:** PDF file (binary)

### Other API Endpoints

#### Videos
- `GET /api/videos` - List videos
- `POST /api/videos` - Create video metadata
- `POST /api/videos/upload` - Upload video file
- `POST /api/videos/upload-url` - Get upload URL
- `DELETE /api/videos/delete` - Delete video
- `PUT /api/videos/reorder` - Reorder videos
- `GET /api/videos/proxy` - Proxy video stream
- `GET /api/videos/proxy-supabase` - Proxy from Supabase
- `POST /api/videos/save-metadata` - Save video metadata

#### Circle Plans
- `GET /api/circle-plans` - List circle plans
- `POST /api/circle-plans` - Create circle plan
- `PUT /api/circle-plans` - Update circle plan
- `DELETE /api/circle-plans` - Delete circle plan
- `POST /api/circle-plans/generate` - Generate circle plan
- `POST /api/circle-plans/upload` - Upload plan file
- `POST /api/circle-plans/files/upload` - Upload file
- `DELETE /api/circle-plans/files/delete` - Delete file
- `GET /api/circle-plans/settings` - Get settings
- `PUT /api/circle-plans/settings` - Update settings

#### Phonics Plans
- `GET /api/phonics-plans` - List phonics plans
- `PUT /api/phonics-plans` - Update phonics plan
- `DELETE /api/phonics-plans` - Delete phonics plan
- `POST /api/phonics-plans/generate` - Generate phonics plan
- `POST /api/phonics-plans/files/upload` - Upload file
- `DELETE /api/phonics-plans/files/delete` - Delete file

#### Materials
- `GET /api/materials` - List materials
- `POST /api/materials` - Create material
- `PUT /api/materials` - Update material
- `DELETE /api/materials` - Delete material
- `POST /api/materials/files/upload` - Upload file
- `DELETE /api/materials/files/delete` - Delete file

#### Story System
- `POST /api/story/auth` - Story authentication
- `DELETE /api/story/auth` - Story logout
- `GET /api/story/current` - Get current story
- `POST /api/story/message` - Send message
- `GET /api/story/message` - Get messages

#### Public
- `GET /api/public/videos` - Public video list

#### Admin
- `GET /api/admin/proxy-mode` - Get proxy mode status
- `POST /api/admin/proxy-mode` - Set proxy mode

---

## 5. Current Features in Montessori Section

### Available at `/admin/montessori`

#### 1. Montessori Dashboard (`/admin/montessori`)
- Overview of all active children
- Quick navigation to:
  - Manage Children
  - Activities Library
  - Reports
- Displays children cards with photos, names, age groups

#### 2. Children Management (`/admin/montessori/children`)
- **List View:**
  - Grid display of all children
  - Shows active/inactive status
  - Click to view individual child profile
- **Add Child Form:**
  - Name, date of birth, age group
  - Enrollment date
  - Parent information (name, email)
  - Notes field
  - Photo upload (via Supabase Storage)

#### 3. Individual Child Profile (`/admin/montessori/children/[id]`)
Uses `EnhancedChildDashboard` component with three tabs:

**Today Tab:**
- Display today's assigned activity
- Activity details (name, area, duration, instructions, materials, learning goals)
- Mark as complete button
- Generate new activity button
- Auto-generate next activity when current is completed

**Progress Tab:**
- Uses `ProgressVisualization` component
- Progress charts by curriculum area
- Status level breakdown (Not Introduced → Transcended)
- Visual progress indicators

**History Tab:**
- Uses `ActivityHistory` component
- Timeline of completed activities
- Activity details with dates
- Engagement levels and notes

#### 4. Activities Library (`/admin/montessori/activities`)
- **Browse Activities:**
  - Search by name, instructions, learning goals
  - Filter by:
    - Curriculum area (Practical Life, Sensorial, Mathematics, Language, English, Cultural)
    - Skill level (0-5)
    - Age range
- **Activity Details:**
  - Expandable cards showing:
    - Instructions
    - Materials needed
    - Learning goals
    - Prerequisites
- **Assign Activity:**
  - Assign specific activity to child
  - Modal for child selection
  - Replaces today's activity if one exists

#### 5. Reports (`/admin/montessori/reports`)
- Generate progress reports
- PDF export capability
- Report data includes:
  - Child information
  - Progress by area
  - Activity history
  - Summary statistics

### Data Flow

#### Child Profile Data Flow:
```
Database (Supabase)
  ↓
API Route (/api/whale/children/[id])
  ↓
EnhancedChildDashboard Component
  ├─→ Today Tab → /api/whale/daily-activity
  ├─→ Progress Tab → /api/whale/progress/enhanced
  └─→ History Tab → /api/whale/activity-history
```

#### Activity Generation Flow:
```
User clicks "Generate Activity"
  ↓
POST /api/whale/daily-activity { childId }
  ↓
Algorithm (in route handler):
  1. Get child details
  2. Get recent activities (last 10 days)
  3. Get child's progress
  4. Filter activities by:
     - Age appropriateness
     - Not recently done
  5. Prioritize by:
     - Areas with lower progress
     - Skill level appropriateness
     - Variety
  6. Select activity
  7. Create daily_activity_assignments record
  ↓
Return activity assignment with full activity details
  ↓
Component updates UI
```

#### Progress Update Flow:
```
User updates progress status
  ↓
POST /api/whale/progress { child_id, skill_id, status_level }
  ↓
lib/db/progress.ts → upsertProgress()
  ↓
Supabase upsert (onConflict: child_id, skill_id)
  ↓
Return updated progress record
  ↓
Component refreshes progress display
```

---

## 6. Environment & Configuration

### Environment Variables

#### Required for Production:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database
# Example: postgresql://postgres.dmfncjjtsoxrnvcdnvjq:password@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin Authentication
ADMIN_SECRET=your-secret-key-change-in-production
ADMIN_PASSWORD=your-admin-password

# Story System (optional)
STORY_JWT_SECRET=your-jwt-secret
ANTHROPIC_API_KEY=your-anthropic-key (for AI features)

# Vercel Blob Storage (optional)
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

### Configuration Files

#### `next.config.ts`
```typescript
- PWA enabled (next-pwa)
- Webpack configuration for PWA compatibility
- Transpiles 'jose' package
- Excludes admin routes from precaching
- SSL configuration for Supabase connections
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### `package.json` Scripts
```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint"
  }
}
```

### Supabase Configuration

**Storage Buckets:**
- `child-photos` - Public, for child profile photos
- `videos` - Public, for video storage
- `activity-materials` - Public, for activity material files
- `parent-reports` - Private, for generated PDF reports

**Row Level Security:**
- All tables have RLS enabled
- Service role has full access via policies
- Client-side uses anon key (limited by RLS policies)

---

## 7. Component Architecture

### React Components

#### Montessori-Specific Components

##### `EnhancedChildDashboard` (`components/EnhancedChildDashboard.tsx`)
Main component for individual child profiles.

**Props:**
```typescript
interface EnhancedChildDashboardProps {
  childId: string;
}
```

**State:**
- `child: Child | null` - Child data
- `todayActivity: DailyActivityAssignmentWithDetails | null` - Today's activity
- `loading: boolean` - Loading state
- `error: string | null` - Error message
- `activeTab: 'today' | 'progress' | 'history'` - Current tab

**Features:**
- Three-tab interface (Today, Progress, History)
- Activity generation and completion
- Progress visualization integration
- Activity history integration

**Child Components:**
- `ProgressVisualization` - Progress charts
- `ActivityHistory` - Activity timeline

##### `ProgressVisualization` (`components/ProgressVisualization.tsx`)
Displays progress charts and statistics.

**Props:**
```typescript
interface ProgressVisualizationProps {
  childId: string;
}
```

**Features:**
- Fetches progress data from `/api/whale/progress/enhanced`
- Displays charts by curriculum area
- Shows status level breakdown
- Visual progress indicators

##### `ActivityHistory` (`components/ActivityHistory.tsx`)
Displays activity history timeline.

**Props:**
```typescript
interface ActivityHistoryProps {
  childId: string;
}
```

**Features:**
- Fetches history from `/api/whale/activity-history`
- Timeline view of activities
- Shows completion status, dates, engagement levels

##### `ChildDashboard` (`components/ChildDashboard.tsx`)
Basic child dashboard (legacy, may be deprecated in favor of EnhancedChildDashboard).

### Page Components

#### `app/admin/montessori/page.tsx`
Montessori dashboard page.

**Features:**
- Lists all active children
- Navigation to sub-sections
- Quick actions

#### `app/admin/montessori/children/page.tsx`
Children management page.

**Features:**
- Add child form
- Children list/grid
- Links to individual profiles

#### `app/admin/montessori/children/[id]/page.tsx`
Individual child profile page.

**Features:**
- Wraps `EnhancedChildDashboard` component
- Handles route parameter extraction
- Authentication check

#### `app/admin/montessori/activities/page.tsx`
Activities library page.

**Features:**
- Search and filter interface
- Activity cards with expandable details
- Assign activity modal
- Real-time filtering

#### `app/admin/montessori/reports/page.tsx`
Reports page.

**Features:**
- Report generation interface
- PDF export
- Date range selection

### State Management

**Approach:** React Hooks (useState, useEffect)

- No global state management library (Redux, Zustand, etc.)
- Component-level state management
- API calls via `fetch` in `useEffect` hooks
- Props drilling for data passing between components

**Pattern:**
```typescript
const [data, setData] = useState<Type | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchData();
}, [dependencies]);

const fetchData = async () => {
  try {
    setLoading(true);
    const response = await fetch('/api/endpoint');
    const result = await response.json();
    setData(result.data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Component Hierarchy

```
app/admin/montessori/children/[id]/page.tsx
  └─→ EnhancedChildDashboard
      ├─→ ProgressVisualization (Progress Tab)
      └─→ ActivityHistory (History Tab)

app/admin/montessori/activities/page.tsx
  └─→ (Inline components for filtering, cards, modals)

app/admin/montessori/children/page.tsx
  └─→ (Inline components for form, grid)
```

### Styling

**Framework:** Tailwind CSS 4.x

**Color Scheme:**
- Primary: `#4A90E2` (Blue)
- Background: Gradient from `#E8F4F8` to `#B8E0F0`
- Text: `#2C5F7C` (Dark blue-gray)

**Component Styling Pattern:**
- Utility-first Tailwind classes
- Consistent spacing and sizing
- Responsive design (mobile-first)
- Gradient backgrounds for cards
- Shadow utilities for depth

---

## Summary

The Whale Montessori tracking system is a comprehensive curriculum management platform built on Next.js 16 with PostgreSQL (Supabase). It features:

- **Complete child management** with profiles, photos, and parent information
- **Intelligent activity selection** based on age, progress, and recent activities
- **Progress tracking** across 6 curriculum areas with 6 status levels
- **Activity library** with search, filtering, and assignment capabilities
- **History tracking** for completed activities
- **Report generation** with PDF export
- **Modern UI** with Tailwind CSS and responsive design

The system uses a clean architecture with:
- Type-safe TypeScript interfaces
- Database abstraction layer (`lib/db/`)
- Algorithm-based activity selection
- RESTful API design
- Component-based React architecture

All data is stored in Supabase PostgreSQL with proper indexing, relationships, and Row Level Security policies.

---

**Document Version:** 1.0  
**Generated:** 2024  
**For:** Claude AI Code Generation & Feature Development

