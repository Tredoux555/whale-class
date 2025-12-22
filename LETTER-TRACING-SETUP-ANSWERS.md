# Letter Tracing Feature - Setup Questions Answered

This document answers all questions needed for an AI to implement a letter tracing feature in the Whale app.

---

## 1. ✅ Students Table in Supabase

**YES**, you have a `children` table (not called "students" but serves the same purpose).

### Table Structure:
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

### Key Details:
- **Primary Key**: `id` (UUID)
- **Table Name**: `children` (not `students`)
- **Location**: Supabase PostgreSQL database
- **Access**: Via Supabase client (`lib/supabase.ts`) or direct PostgreSQL (`lib/db.ts`)
- **TypeScript Type**: `Child` interface in `types/database.ts`

### How to Query:
```typescript
import { getChildren, getChildById } from '@/lib/db/children';

// Get all active children
const children = await getChildren({ activeOnly: true });

// Get specific child
const child = await getChildById(childId);
```

---

## 2. 📊 Progress Tracking Recommendation

**RECOMMENDATION: Use detailed progress tracking** (similar to existing `child_progress` table pattern)

### Why Detailed Tracking?
Your app already uses a sophisticated progress system with:
- **Status levels** (0-5): Not Introduced → Observed → Guided Practice → Independent → Mastery → Transcended
- **Date tracking**: `date_updated` field
- **Notes**: Optional teacher notes
- **Teacher initials**: Who recorded the progress

### Suggested Schema for Letter Tracing:
```sql
CREATE TABLE letter_tracing_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  letter TEXT NOT NULL CHECK (letter ~ '^[A-Z]$'), -- Single uppercase letter
  status_level INTEGER NOT NULL CHECK (status_level BETWEEN 0 AND 5) DEFAULT 0,
  -- Detailed metrics
  attempt_count INTEGER DEFAULT 0,
  completion_date DATE,
  accuracy_score DECIMAL(5,2), -- Percentage (0-100)
  best_attempt_date DATE,
  best_attempt_accuracy DECIMAL(5,2),
  -- Metadata
  notes TEXT,
  teacher_initials TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, letter)
);
```

### Status Levels (matching existing pattern):
- `0` = Not Introduced
- `1` = Observed (student has seen/tried)
- `2` = Guided Practice (needs help)
- `3` = Independent (can do alone)
- `4` = Mastery (consistent completion)
- `5` = Transcended (perfect, no longer needs practice)

### Alternative: Simple Completion
If you prefer simpler tracking:
```sql
CREATE TABLE letter_tracing_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  letter TEXT NOT NULL CHECK (letter ~ '^[A-Z]$'),
  completed BOOLEAN DEFAULT false,
  completed_date DATE,
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, letter)
);
```

**Recommendation**: Use the detailed version to match your existing Montessori progress tracking system.

---

## 3. 🔐 Authentication & Teacher-Student Linking

### How Teachers Are Identified:

1. **Authentication Method**: Supabase Auth (JWT tokens)
   - Teachers log in via `/auth/teacher-login`
   - Uses `supabase.auth.signInWithPassword()`
   - Session stored in cookies/headers

2. **Teacher Identification**:
   ```typescript
   // Get current user from Supabase session
   const supabase = createSupabaseClient();
   const { data: { session } } = await supabase.auth.getSession();
   const teacherId = session?.user?.id; // UUID from auth.users table
   ```

3. **Teacher-Student Linking**:
   - **Table**: `teacher_students` (from RBAC migration)
   ```sql
   CREATE TABLE teacher_students (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     student_id UUID NOT NULL, -- References children.id
     assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     notes TEXT,
     is_active BOOLEAN DEFAULT true,
     UNIQUE(teacher_id, student_id)
   );
   ```

4. **How to Get Teacher's Students**:
   ```typescript
   // In API route or component
   const supabase = createServerClient();
   const { data: { session } } = await supabase.auth.getSession();
   const teacherId = session?.user?.id;
   
   // Get teacher's assigned students
   const { data: assignments } = await supabase
     .from('teacher_students')
     .select('student_id, children(*)')
     .eq('teacher_id', teacherId)
     .eq('is_active', true);
   ```

5. **Role Verification**:
   - Teachers have role `'teacher'` in `user_roles` table
   - Check via `/api/auth/check-teacher-role` endpoint
   - Middleware (`middleware.ts`) handles route protection

### Current Flow:
```
Teacher Login → Supabase Auth → JWT Token → Session
  ↓
Check Role (user_roles table) → Verify 'teacher' role
  ↓
Get Students (teacher_students table) → Filter by teacher_id
  ↓
Access Child Data → Use child_id for all operations
```

---

## 4. 🎨 UI Flow Recommendation

**RECOMMENDED: Teacher selects student → launches tracer → auto-saves**

### Recommended Flow:

1. **Teacher Dashboard** (`/teacher/dashboard`):
   - Teacher sees list of their assigned students
   - Clicks "Letter Tracing" for a specific student
   - Student ID passed as URL parameter: `/letter-tracing?childId=xxx`

2. **Letter Tracing Page** (`/letter-tracing`):
   - **Top Display**: Student name/photo (read-only, for context)
   - **Letter Selection**: Teacher or student selects letter (A-Z)
   - **Tracing Canvas**: Interactive tracing component
   - **Auto-Save**: Progress saved automatically as student traces
   - **Completion**: When letter completed, update `letter_tracing_progress` table

3. **Implementation Pattern**:
   ```typescript
   // Page component
   'use client';
   
   export default function LetterTracingPage() {
     const searchParams = useSearchParams();
     const childId = searchParams.get('childId');
     
     // Fetch child data
     const { data: child } = await fetch(`/api/whale/children/${childId}`);
     
     // Display child name at top
     // Render tracing component below
     // Auto-save on completion
   }
   ```

### Alternative Flow (Simpler):
- Student name/ID displayed at top (read-only)
- Tracing happens below
- Save button or auto-save on completion

**Recommendation**: Use the teacher-selects-student flow for better organization and to match existing patterns in your app.

---

## 5. 🗄️ Database Table Decision

**RECOMMENDATION: Create new `letter_tracing_progress` table**

### Why New Table?

1. **Separation of Concerns**: Letter tracing is a specific skill, different from general Montessori progress
2. **Different Metrics**: Letter tracing needs:
   - Letter-specific tracking (A, B, C, etc.)
   - Accuracy scores
   - Attempt counts
   - Best attempt tracking
3. **Existing Tables Don't Fit**:
   - `child_progress`: Tracks skills by `skill_id` (not letters)
   - `child_work_completion`: Tracks curriculum works (not letter-specific)
   - `activity_log`: Tracks activities (not letter tracing)

### Table Schema (Recommended):

```sql
-- Letter Tracing Progress Table
CREATE TABLE letter_tracing_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  letter TEXT NOT NULL CHECK (letter ~ '^[A-Z]$'),
  
  -- Progress tracking (matching child_progress pattern)
  status_level INTEGER NOT NULL CHECK (status_level BETWEEN 0 AND 5) DEFAULT 0,
  date_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Letter-specific metrics
  attempt_count INTEGER DEFAULT 0,
  completion_date DATE,
  accuracy_score DECIMAL(5,2), -- 0-100 percentage
  best_attempt_date DATE,
  best_attempt_accuracy DECIMAL(5,2),
  
  -- Metadata
  notes TEXT,
  teacher_initials TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(child_id, letter)
);

-- Indexes for performance
CREATE INDEX idx_letter_tracing_child_id ON letter_tracing_progress(child_id);
CREATE INDEX idx_letter_tracing_letter ON letter_tracing_progress(letter);
CREATE INDEX idx_letter_tracing_status ON letter_tracing_progress(status_level);
CREATE INDEX idx_letter_tracing_completion ON letter_tracing_progress(completion_date);

-- Row Level Security (matching existing pattern)
ALTER TABLE letter_tracing_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view/manage their students' progress
CREATE POLICY "Teachers can manage their students' letter tracing"
  ON letter_tracing_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teacher_students
      WHERE teacher_students.student_id = letter_tracing_progress.child_id
      AND teacher_students.teacher_id = auth.uid()
      AND teacher_students.is_active = true
    )
  );

-- Policy: Admins can view all
CREATE POLICY "Admins can view all letter tracing progress"
  ON letter_tracing_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role_name IN ('admin', 'super_admin')
    )
  );
```

### TypeScript Type (add to `types/database.ts`):

```typescript
export interface LetterTracingProgress {
  id: string;
  child_id: string;
  letter: string; // 'A' to 'Z'
  status_level: StatusLevel; // 0-5
  date_updated: string;
  attempt_count: number;
  completion_date?: string;
  accuracy_score?: number; // 0-100
  best_attempt_date?: string;
  best_attempt_accuracy?: number;
  notes?: string;
  teacher_initials?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLetterTracingProgressInput {
  child_id: string;
  letter: string;
  status_level?: StatusLevel;
  attempt_count?: number;
  accuracy_score?: number;
  notes?: string;
  teacher_initials?: string;
}
```

---

## 📋 Summary for AI Implementation

### Quick Reference:

1. **Students Table**: ✅ `children` table with UUID `id` field
2. **Tracking Type**: ✅ Detailed progress (status_level 0-5, dates, accuracy, attempts)
3. **Authentication**: ✅ Supabase Auth, teacher identified via `auth.uid()`, students linked via `teacher_students` table
4. **UI Flow**: ✅ Teacher selects student → launches tracer → auto-saves progress
5. **Database**: ✅ Create new `letter_tracing_progress` table (don't reuse existing tables)

### Implementation Checklist:

- [ ] Create migration file: `migrations/006_letter_tracing_progress.sql`
- [ ] Add TypeScript types to `types/database.ts`
- [ ] Create API routes: `/api/whale/letter-tracing/route.ts`
- [ ] Create database functions: `lib/db/letter-tracing.ts`
- [ ] Create UI component: `components/LetterTracing.tsx`
- [ ] Create page: `app/letter-tracing/page.tsx`
- [ ] Add to teacher dashboard: Link to letter tracing for each student
- [ ] Implement auto-save functionality
- [ ] Add progress visualization

---

**Generated**: December 2024  
**App**: Whale Class - Montessori Curriculum Tracking System  
**Version**: 0.1.3







