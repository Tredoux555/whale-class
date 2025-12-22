# Whale App - Comprehensive Context Files

This zip file contains **138 essential files** needed for an AI to understand the complete structure, patterns, and implementation of the Whale Class application.

## 📦 What's Included

### Configuration Files (Root)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js and PWA configuration
- `middleware.ts` - Route protection and authentication
- `eslint.config.mjs` - Linting rules
- `postcss.config.mjs` - CSS processing
- `vercel.json` - Deployment configuration

### Core Infrastructure (`lib/`)
- **Database**: `db.ts`, `db/children.ts`, `db/progress.ts`
- **Supabase**: `supabase.ts` - Client setup and storage buckets
- **Authentication**: `auth.ts`, `story-auth.ts`
- **Permissions**: `permissions/roles.ts`, `permissions/middleware.ts`
- **Data Management**: `data.ts` - Video metadata handling
- **Video Utilities**: `video-utils.ts`, `video-playback-utils.ts`
- **YouTube Integration**: `youtube/discovery.ts`, `youtube/search.ts`, `youtube/scoring.ts`
- **Algorithms**: `algorithms/activity-selection.ts`
- **Curriculum**: `curriculum/progression.ts`, `curriculum/roadmap-seed.ts`
- **Hooks**: `hooks/useVideoPlayback.ts`

### Type Definitions (`types/`)
- `database.ts` - Complete database schema types (Child, Activity, Progress, etc.)
- `montessori-works.ts` - Montessori work types

### Components (`components/`)
All React components including:
- `ChildDashboard.tsx` - Child activity dashboard
- `EnhancedChildDashboard.tsx` - Enhanced version
- `VideoPlayer.tsx` - Video playback component
- `ActivityDetailView.tsx` - Activity details
- `ProgressVisualization.tsx` - Progress charts
- `CurriculumVisualization.tsx` - Curriculum visualization
- `PermissionGate.tsx` - Permission-based access control
- And more...

### Application Pages (`app/`)
- **Root**: `layout.tsx`, `page.tsx` (homepage), `globals.css`
- **Admin**: `admin/page.tsx` and all admin sub-pages
- **Auth**: `auth/teacher-login/page.tsx`
- **Teacher**: `teacher/dashboard/page.tsx`
- **Story**: Story system pages

### API Routes (`app/api/`)
**Complete API structure** with all route handlers:
- `/api/admin/` - Admin utilities, RBAC, testing endpoints
- `/api/auth/` - Authentication endpoints
- `/api/videos/` - Video management (upload, delete, reorder, proxy)
- `/api/public/videos/` - Public video access
- `/api/whale/` - Core Montessori features:
  - `/children/` - Child CRUD operations
  - `/progress/` - Progress tracking
  - `/activities/` - Activity management
  - `/montessori-works/` - Montessori works
  - `/video-watches/` - Video watch tracking
  - `/daily-activity/` - Daily activity assignments
  - `/reports/` - Report generation
- `/api/circle-plans/` - Circle time planning
- `/api/phonics-plans/` - Phonics planning
- `/api/materials/` - Materials management
- `/api/story/` - Secret story system
- `/api/youtube/` - YouTube video discovery

### Database (`migrations/`)
All SQL migration files:
- `001_create_secret_story_tables.sql`
- `002_create_story_users.sql`
- `003_create_curriculum_tables.sql`
- `003_rbac_system.sql` - Role-based access control
- `004_youtube_video_automation.sql`
- `005_video_watch_tracking.sql`
- `create_favorites_photos_themes.sql`
- `MONTESSORI-DATABASE-SCHEMA.sql` - Complete schema
- `sample_activities_seed.sql` - Sample data
- `verify-tables.sql` - Verification queries

### Data Files (`data/`)
- `videos.json` - Video metadata
- `circle-plans.json` - Circle time plans
- `phonics-plans.json` - Phonics plans
- `materials.json` - Materials data

### Documentation
- `README.md` - Project overview
- `TECH_STACK.md` - Complete technology stack documentation
- `WHALE_ARCHITECTURE.md` - Architecture documentation

## 🎯 Key Patterns & Conventions

### Authentication
- Admin auth via JWT tokens (`lib/auth.ts`)
- Teacher/Parent auth via Supabase (`middleware.ts`)
- Role-based access control (RBAC) system

### Data Storage
- **Localhost**: Filesystem storage (`public/videos/`, `data/*.json`)
- **Vercel/Production**: Supabase Storage (`lib/data.ts` handles both)

### API Patterns
- Server-side route handlers in `app/api/*/route.ts`
- Authentication checks via `getAdminSession()` or Supabase
- Error handling with proper HTTP status codes
- Type-safe with TypeScript interfaces

### Component Patterns
- Client components marked with `'use client'`
- Server components by default
- Shared components in `/components`
- Page-specific components co-located

### Database Access
- Direct PostgreSQL via `lib/db.ts` (connection pool)
- Supabase client via `lib/supabase.ts`
- Type-safe queries with TypeScript interfaces

## 🔑 Environment Variables Needed

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=

# Admin
ADMIN_SECRET=
ADMIN_PASSWORD=
```

## 📊 File Statistics

- **Total Files**: 138
- **Zip Size**: ~290KB
- **API Routes**: 50+ endpoints
- **Components**: 15+ React components
- **Database Migrations**: 10+ SQL files
- **Type Definitions**: Complete TypeScript types

## 🚀 Usage

This context package enables an AI to:
1. Understand the complete application structure
2. Write new features following existing patterns
3. Modify existing code with full context
4. Create new API endpoints using established patterns
5. Add new components following React/Next.js conventions
6. Understand database schema and relationships
7. Implement authentication and authorization correctly

---

**Generated**: December 2024  
**Project**: Whale Class - Montessori Curriculum Tracking System  
**Version**: 0.1.3







