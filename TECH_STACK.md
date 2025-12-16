# Whale Platform - Complete Tech Stack Documentation

**Project:** Whale Class - Montessori Curriculum Tracking System  
**Version:** 0.1.3  
**Domain:** teacherpotato.xyz  
**Deployment:** Vercel

---

## 🎯 Core Framework & Runtime

### Next.js
- **Version:** 16.0.7
- **Router:** App Router (not Pages Router)
- **Build Tool:** Webpack (configured for PWA compatibility)
- **TypeScript:** Enabled with strict mode
- **Server Components:** Yes (default)
- **Client Components:** Marked with `'use client'` directive

### React
- **Version:** 19.2.0
- **React DOM:** 19.2.0
- **JSX Transform:** react-jsx (automatic)

### Node.js
- **Target:** ES2017
- **Module System:** ESNext modules
- **TypeScript:** Version 5.x

---

## 🗄️ Database & Backend Services

### Supabase (Primary Database)
- **Client Library:** @supabase/supabase-js ^2.81.0
- **Auth Helpers:** @supabase/auth-helpers-nextjs ^0.15.0
- **Database Type:** PostgreSQL (via Supabase)
- **Features Used:**
  - Authentication (JWT-based)
  - Row Level Security (RLS)
  - Storage (for videos/photos)
  - Real-time subscriptions (available but not heavily used)

### PostgreSQL Direct Access
- **Driver:** pg ^8.16.3
- **Connection:** Direct PostgreSQL connection pool (lib/db.ts)
- **Use Case:** Server-side operations requiring direct SQL

### Database Schema
- **Migrations Location:** `/migrations/`
- **Key Tables:**
  - `children` - Child profiles
  - `activities` - Montessori activities
  - `child_progress` - Progress tracking
  - `activity_log` - Activity history
  - `daily_activity_assignments` - Daily assignments
  - `user_roles` - RBAC roles
  - `role_permissions` - Permission system
  - `curriculum_roadmap` - Curriculum progression
  - `curriculum_videos` - Video associations
  - `video_search_cache` - YouTube API caching

---

## 🔐 Authentication & Authorization

### Admin Authentication
- **Method:** JWT (JSON Web Tokens)
- **Library:** jsonwebtoken ^9.0.2, jose ^5.10.0
- **Storage:** HTTP-only cookies
- **Location:** `/app/api/auth/login/route.ts`
- **Session Management:** Custom JWT implementation

### Teacher/Parent Authentication
- **Method:** Supabase Auth
- **Provider:** Supabase Auth Service
- **Storage:** Supabase session cookies
- **RBAC:** Role-based access control via `user_roles` table

### Story System Authentication
- **Method:** Custom JWT
- **Library:** jsonwebtoken
- **Storage:** sessionStorage (client-side)

### Password Hashing
- **Library:** bcryptjs ^3.0.3
- **Type Definitions:** @types/bcryptjs ^2.4.6

---

## 🎨 Frontend UI & Styling

### Tailwind CSS
- **Version:** 4.x (latest)
- **PostCSS:** @tailwindcss/postcss ^4
- **Configuration:** `postcss.config.mjs`
- **Usage:** Utility-first CSS classes
- **Customization:** Extended in `app/globals.css`

### Icons
- **Library:** lucide-react ^0.556.0
- **Usage:** React components for icons

### Drag & Drop
- **Library:** @dnd-kit/core ^6.3.1
- **Sortable:** @dnd-kit/sortable ^10.0.0
- **Utilities:** @dnd-kit/utilities ^3.2.2
- **Use Case:** Reorderable lists, drag-and-drop interfaces

### Charts & Data Visualization
- **Library:** recharts ^3.5.1
- **Use Case:** Progress charts, activity statistics

---

## 📱 Progressive Web App (PWA)

### next-pwa
- **Version:** ^5.6.0
- **Configuration:** `next.config.ts`
- **Service Worker:** Auto-registered
- **Build Excludes:** Admin routes, API generate routes
- **Disabled in:** Development mode

---

## 🔌 API & External Services

### YouTube Data API v3
- **Purpose:** Video discovery and metadata
- **Key Location:** `NEXT_PUBLIC_YOUTUBE_API_KEY`
- **Implementation:** `lib/youtube/search.ts`, `lib/youtube/discovery.ts`
- **Caching:** Database-backed cache in `video_search_cache` table

### Anthropic Claude API
- **Purpose:** AI-generated lesson plans
- **Endpoints:**
  - `/api/circle-plans/generate` - Circle time plans
  - `/api/phonics-plans/generate` - Phonics lesson plans
- **Library:** Direct fetch to Anthropic API

### Vercel Blob Storage
- **Library:** @vercel/blob ^2.0.0
- **Purpose:** File uploads and storage
- **Token:** `BLOB_READ_WRITE_TOKEN`

---

## 📦 File Upload & Processing

### Multer
- **Version:** ^2.0.2
- **Type Definitions:** @types/multer ^2.0.0
- **Use Case:** Multipart form data handling

---

## 🛠️ Development Tools

### TypeScript
- **Version:** ^5
- **Config:** `tsconfig.json`
- **Strict Mode:** Enabled
- **Path Aliases:** `@/*` maps to project root
- **Module Resolution:** bundler

### ESLint
- **Version:** ^9
- **Config:** eslint-config-next 16.0.1
- **Location:** `eslint.config.mjs`

### Type Definitions
- **@types/node:** ^20
- **@types/react:** ^19
- **@types/react-dom:** ^19
- **@types/uuid:** ^10.0.0
- **@types/pg:** ^8.16.0
- **@types/jsonwebtoken:** ^9.0.10
- **@types/bcryptjs:** ^2.4.6

### Utilities
- **uuid:** ^13.0.0 - UUID generation
- **dotenv:** ^17.2.3 (dev) - Environment variables

---

## 🏗️ Project Structure

```
whale/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard (server & client components)
│   │   ├── montessori/           # Montessori tracking system
│   │   ├── rbac-management/     # Role-based access control UI
│   │   ├── video-management/    # Video discovery & management
│   │   └── page.tsx             # Main admin dashboard
│   ├── api/                      # API routes (server-side)
│   │   ├── admin/                # Admin API endpoints
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── whale/                # Montessori API endpoints
│   │   └── youtube/              # YouTube integration
│   ├── auth/                     # Auth pages (client components)
│   │   └── teacher-login/       # Teacher login page
│   ├── teacher/                  # Teacher dashboard
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/                   # React components (mostly client)
│   ├── EnhancedChildDashboard.tsx
│   ├── PermissionGate.tsx        # RBAC permission components
│   └── VideoPlayer.tsx
├── lib/                          # Utility libraries
│   ├── algorithms/               # Business logic
│   │   └── activity-selection.ts
│   ├── curriculum/               # Curriculum progression logic
│   ├── db/                       # Database access layer
│   ├── permissions/              # RBAC middleware
│   ├── youtube/                  # YouTube API integration
│   ├── auth.ts                   # Authentication utilities
│   ├── supabase.ts               # Supabase client config
│   └── db.ts                     # PostgreSQL connection
├── types/                        # TypeScript definitions
│   ├── database.ts               # Database types
│   └── montessori-works.ts
├── migrations/                   # SQL migrations
│   ├── 003_rbac_system.sql
│   ├── 003_create_curriculum_tables.sql
│   └── 004_youtube_video_automation.sql
├── middleware.ts                 # Next.js middleware (route protection)
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                   # Dependencies
```

---

## 🔧 Key Configuration Files

### next.config.ts
- **PWA:** Configured with next-pwa
- **Webpack:** Custom configuration for PWA compatibility
- **Transpile:** jose package (for JWT)
- **Externals:** pg-native (server-side only)

### tsconfig.json
- **Target:** ES2017
- **Module:** ESNext
- **JSX:** react-jsx
- **Paths:** `@/*` alias to root
- **Strict:** Enabled

### middleware.ts
- **Purpose:** Route protection and authentication
- **Runtime:** Edge Runtime compatible
- **Auth:** Supabase session checking

---

## 🌐 Deployment

### Platform
- **Hosting:** Vercel
- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Node Version:** 20.x (inferred from @types/node)

### Environment Variables Required
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Admin Authentication
ADMIN_USERNAME=
ADMIN_PASSWORD=
ADMIN_SECRET=

# Story System
STORY_JWT_SECRET=

# AI Integration
ANTHROPIC_API_KEY=

# File Storage
BLOB_READ_WRITE_TOKEN=

# YouTube API
NEXT_PUBLIC_YOUTUBE_API_KEY=

# Database (optional, for direct PostgreSQL)
DATABASE_URL=
```

---

## 📝 Code Patterns & Conventions

### API Routes
- **Location:** `app/api/*/route.ts`
- **Methods:** Named exports (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`)
- **Request:** `NextRequest` from `next/server`
- **Response:** `NextResponse` from `next/server`
- **Example:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Server-side logic
  return NextResponse.json({ data: '...' });
}
```

### Server Components (Default)
- **Location:** `app/**/*.tsx`
- **Default:** All components are server components unless marked
- **No `'use client'` directive needed**

### Client Components
- **Marking:** `'use client'` at top of file
- **Use Cases:** Interactive UI, hooks, browser APIs
- **Example:**
```typescript
'use client';
import { useState } from 'react';
```

### Database Access
- **Supabase Client:** `createClient()` from `lib/supabase.ts` (service role)
- **Supabase Browser:** `createSupabaseClient()` (anon key)
- **PostgreSQL Direct:** Connection pool from `lib/db.ts`

### Authentication Patterns
- **Admin:** `getAdminSession()` from `lib/auth.ts`
- **Teacher/Parent:** Supabase `auth.getUser()`
- **RBAC Check:** `getUserRoles()`, `checkPermission()` from `lib/permissions/middleware.ts`

### TypeScript Types
- **Database Types:** `types/database.ts`
- **Interfaces:** Defined per module
- **Strict:** All types must be defined

---

## 🎯 Key Features & Modules

### Montessori Curriculum System
- **Activity Selection Algorithm:** `lib/algorithms/activity-selection.ts`
- **Progress Tracking:** `lib/db/progress.ts`
- **Curriculum Progression:** `lib/curriculum/progression.ts`
- **Daily Assignments:** `/api/whale/daily-activity`

### Role-Based Access Control (RBAC)
- **Tables:** `user_roles`, `role_permissions`, `features`
- **Middleware:** `lib/permissions/middleware.ts`
- **Components:** `components/PermissionGate.tsx`
- **Policies:** Row Level Security in Supabase

### Video Management
- **Discovery:** `lib/youtube/discovery.ts`
- **Search:** `lib/youtube/search.ts`
- **Storage:** Supabase Storage + Vercel Blob
- **Caching:** Database-backed cache

### Report Generation
- **PDF:** Python script (`scripts/generate_parent_report.py`)
- **Data API:** `/api/whale/reports/generate`
- **PDF API:** `/api/whale/reports/pdf`

---

## 🔄 Build & Development

### Scripts
```json
{
  "dev": "next dev --webpack",
  "build": "next build --webpack",
  "start": "next start",
  "lint": "eslint"
}
```

### Development Server
- **Command:** `npm run dev`
- **Port:** 3000 (default)
- **Hot Reload:** Enabled
- **PWA:** Disabled in development

### Production Build
- **Command:** `npm run build`
- **Output:** `.next/` directory
- **Optimization:** Automatic code splitting, tree shaking

---

## 📚 Important Notes for AI Code Generation

1. **Always use App Router patterns** - This is Next.js 16 with App Router, not Pages Router
2. **Server Components by default** - Only add `'use client'` when needed
3. **TypeScript strict mode** - All types must be properly defined
4. **Path aliases** - Use `@/` prefix for imports (e.g., `@/lib/supabase`)
5. **API routes** - Use `route.ts` files with named exports for HTTP methods
6. **Authentication** - Check existing auth patterns before creating new ones
7. **Database** - Prefer Supabase client over direct PostgreSQL when possible
8. **RLS Policies** - Be aware of Row Level Security when querying Supabase
9. **Error Handling** - Always handle errors in API routes and async functions
10. **Type Safety** - Import types from `types/database.ts` when working with database entities

---

## 🚀 Quick Start for Feature Development

1. **Create API route:** `app/api/[feature]/route.ts`
2. **Add types:** Update `types/database.ts` if needed
3. **Create UI:** `app/[section]/[feature]/page.tsx`
4. **Add components:** `components/[FeatureName].tsx` if reusable
5. **Update database:** Add migration in `migrations/` if schema changes
6. **Test:** Use `npm run dev` for local testing
7. **Deploy:** Push to main branch (auto-deploys to Vercel)

---

**Last Updated:** December 2024  
**Maintained By:** Whale Development Team

