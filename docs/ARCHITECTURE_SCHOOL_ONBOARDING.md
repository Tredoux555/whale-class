# School Onboarding Architecture - Research & Implementation Plan

## Date: January 25, 2026

---

## ARCHITECTURE DECISIONS

### Multi-Tenancy Model
- **Single database with Row-Level Security (RLS)**
- Each school is completely isolated via `school_id` in JWT `app_metadata`
- No master admin UI needed (use Supabase dashboard for emergencies)
- Scale: 100-1000 schools on single database

### User Model
- One teacher = one classroom (enforced by UNIQUE constraint)
- Students can be added/removed from classrooms (soft delete via `left_at`)
- Principal = school admin who invites teachers

### Pricing Model
- Flat $1000/month per school
- No usage limits or tier enforcement
- Simple: paid = active, not paid = locked out

---

## DATABASE SCHEMA

### Core Tables

```sql
-- Schools (tenants)
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{"timezone": "UTC"}'::jsonb,
    subscription_status VARCHAR(50) DEFAULT 'active',
    billing_email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    _deleted BOOLEAN DEFAULT false
);

-- Classrooms
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10),  -- emoji like 🐋
    color VARCHAR(20), -- hex color
    grade_level VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    _deleted BOOLEAN DEFAULT false,
    UNIQUE(school_id, name)
);

-- Teachers (1:1 with classroom)
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, active, inactive
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    _deleted BOOLEAN DEFAULT false,
    UNIQUE(classroom_id),  -- ONE teacher per classroom
    UNIQUE(school_id, email)
);

-- Students (linked to school, enrolled in classrooms)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    date_of_birth DATE,
    photo_url TEXT,
    guardian_name VARCHAR(200),
    guardian_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    _deleted BOOLEAN DEFAULT false
);

-- Classroom enrollments (students in classrooms)
CREATE TABLE classroom_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,  -- NULL = currently enrolled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active enrollments
CREATE UNIQUE INDEX idx_unique_active_enrollment 
    ON classroom_enrollments(classroom_id, student_id) 
    WHERE left_at IS NULL;

-- Teacher invitations
CREATE TABLE teacher_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    invited_by UUID REFERENCES auth.users(id),
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, email)
);
```

### RLS Helper Function

```sql
CREATE OR REPLACE FUNCTION auth.school_id() 
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT NULLIF(
    ((current_setting('request.jwt.claims', true)::jsonb 
      -> 'app_metadata' ->> 'school_id')),
    ''
  )::UUID
$$;
```

### RLS Policies (example for classrooms)

```sql
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON classrooms
  FOR ALL TO authenticated
  USING ((SELECT auth.school_id()) = school_id)
  WITH CHECK ((SELECT auth.school_id()) = school_id);
```

---

## ONBOARDING FLOWS

### Flow 1: Principal Registers School

```
/montree/signup
    ↓
Step 1: School name, Principal email + password
    ↓
Step 2: Confirm email (Supabase magic link)
    ↓
Step 3: Redirected to /montree/admin/setup
    ↓
Principal Dashboard ready
```

### Flow 2: Principal Adds Classrooms

```
/montree/admin/classrooms
    ↓
Click "+ Add Classroom"
    ↓
Modal: Name, Icon (emoji picker), Color
    ↓
Classroom appears in grid (like Supabase tables UI)
```

### Flow 3: Principal Invites Teacher

```
/montree/admin/teachers
    ↓
Click "+ Invite Teacher"
    ↓
Modal: Email, Assign to Classroom (dropdown)
    ↓
Email sent with invite link
    ↓
Teacher clicks link → creates password → assigned to classroom
```

### Flow 4: Teacher First Login

```
Teacher clicks invite link
    ↓
/montree/accept-invite?token=xxx
    ↓
Set password form
    ↓
Redirected to /montree/dashboard
    ↓
If no students: "Add your first student" prompt
```

### Flow 5: Teacher Adds Students

```
/montree/dashboard (empty state)
    ↓
Click "Add Student" 
    ↓
Quick form: Name, DOB (optional), Photo (optional)
    ↓
Student appears in classroom grid
    ↓
Can also bulk import via CSV
```

---

## PAGES TO BUILD

### Public
- `/montree` - Landing page (exists)
- `/montree/signup` - School registration wizard

### Principal/Admin
- `/montree/admin/setup` - First-time setup after signup
- `/montree/admin/classrooms` - Classroom management (Supabase-style grid)
- `/montree/admin/teachers` - Teacher invites and management

### Teacher
- `/montree/accept-invite` - Accept invite + set password
- `/montree/dashboard` - Daily use (exists, needs school_id filter)

---

## NATIVE APP PREPARATION

### Why PowerSync
- Works with Supabase out of the box
- Syncs Postgres → local SQLite automatically
- Handles offline writes with conflict resolution
- Already supports Capacitor

### Schema Requirements (already built in)
- UUIDs everywhere ✓
- `updated_at` on all tables ✓
- Soft deletes via `_deleted` flag ✓

### Migration Path
1. **Phase 1 (now)**: Build web onboarding, schema ready
2. **Phase 2**: Abstract data layer (interface for queries)
3. **Phase 3**: Add Capacitor shell
4. **Phase 4**: Implement PowerSync for native
5. **Phase 5**: Both web and native coexist

---

## EXISTING TABLES CHECK

Need to audit what already exists in Supabase:
- `schools` - exists (needs upgrade)
- `classrooms` - may exist as `classroom_children`
- `children` - exists (rename to students or keep?)
- `teachers` - may exist in various forms

**Decision**: Create new clean tables with `montree_` prefix OR migrate existing tables.

---

## SECURITY

### JWT app_metadata
- Store `school_id` and `role` in `app_metadata` (not user_metadata)
- Users cannot modify app_metadata
- RLS policies read from JWT claims

### Invitation Security
- Tokens expire in 7 days
- One-time use (marked `accepted_at` on use)
- Validated server-side before any action

---

## REFERENCES

- Supabase Multi-Tenancy: https://roughlywritten.substack.com/p/supabase-multi-tenancy-simple-and
- RLS Best Practices: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices
- PowerSync + Supabase: https://docs.powersync.com/integration-guides/supabase-+-powersync
