# HANDOFF: School Onboarding System Build

## Session: 84 | Date: January 25, 2026

---

## CONTEXT

Montree is a Montessori classroom management app. Currently works for ONE school (Whale Class). Now building multi-tenant onboarding so ANY school can sign up and use it.

**Business model**: $1000/month flat fee per school. No usage limits.

**User hierarchy**:
```
School
  └── Principal (admin)
        └── Classrooms (🐋 Whale, 🐼 Panda, etc.)
              └── Teacher (1 per classroom)
                    └── Students (many per classroom)
```

---

## WHAT WAS COMPLETED THIS SESSION

1. ✅ Demo tutorial system with visual icons
2. ✅ Database performance indexes
3. ✅ Demo link on admin page
4. ✅ Architecture research for multi-tenant SaaS
5. ✅ Gameplan documented

---

## THE GAMEPLAN (6-8 sessions)

### Phase 1: Database Foundation (START HERE)
- Create migration with new tables + RLS
- Tables: schools, classrooms, teachers, students, classroom_enrollments, teacher_invitations
- RLS policies for tenant isolation

### Phase 2: Principal Signup Flow
- `/montree/signup` - registration wizard
- Creates school + admin user + links them
- Redirects to setup wizard

### Phase 3: Classroom Management
- `/montree/admin/classrooms` - grid UI like Supabase
- Add/edit/delete classrooms
- Emoji picker for classroom icons

### Phase 4: Teacher Invitations
- `/montree/admin/teachers` - invite teachers
- Email with invite link
- `/montree/accept-invite` - set password, get assigned

### Phase 5: Connect to Dashboard
- Filter existing dashboard by school_id
- Teacher sees only their classroom
- Empty states for new users

### Phase 6: Student Management Polish
- Quick add student modal
- CSV import
- Transfer between classrooms

---

## NEXT SESSION: Phase 1 + 3

### Step 1: Audit Existing Tables

Check what already exists in Supabase. Run this SQL:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('schools', 'classrooms', 'teachers', 'children', 'students', 'classroom_children');
```

Also check the codebase:
```bash
grep -r "from('schools')" --include="*.ts" ~/Desktop/whale
grep -r "from('classrooms')" --include="*.ts" ~/Desktop/whale
```

### Step 2: Create Migration

File: `/supabase/migrations/064_school_onboarding.sql`

```sql
-- School Onboarding Migration
-- Multi-tenant tables with RLS

-- ============================================
-- HELPER FUNCTION
-- ============================================

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

-- ============================================
-- TABLES (only create if not exists)
-- ============================================

-- Schools table (may need ALTER if exists)
CREATE TABLE IF NOT EXISTS montree_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    subscription_status VARCHAR(50) DEFAULT 'active',
    billing_email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    _deleted BOOLEAN DEFAULT false
);

-- Classrooms
CREATE TABLE IF NOT EXISTS montree_classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '📚',
    color VARCHAR(20) DEFAULT '#10b981',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    _deleted BOOLEAN DEFAULT false,
    UNIQUE(school_id, name)
);

-- Teachers
CREATE TABLE IF NOT EXISTS montree_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    _deleted BOOLEAN DEFAULT false,
    UNIQUE(classroom_id),
    UNIQUE(school_id, email)
);

-- Students
CREATE TABLE IF NOT EXISTS montree_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
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

-- Classroom Enrollments
CREATE TABLE IF NOT EXISTS montree_classroom_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES montree_students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_enrollment 
    ON montree_classroom_enrollments(classroom_id, student_id) 
    WHERE left_at IS NULL;

-- Teacher Invitations
CREATE TABLE IF NOT EXISTS montree_teacher_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES montree_schools(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    invited_by UUID,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, email)
);

-- School Members (links users to schools with roles)
CREATE TABLE IF NOT EXISTS montree_school_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES montree_schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('principal', 'teacher')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_montree_classrooms_school ON montree_classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_teachers_school ON montree_teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_students_school ON montree_students(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_enrollments_classroom ON montree_classroom_enrollments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_montree_enrollments_student ON montree_classroom_enrollments(student_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE montree_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_classroom_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_teacher_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_school_members ENABLE ROW LEVEL SECURITY;

-- Schools: users can only see their own school
CREATE POLICY "school_isolation" ON montree_schools
  FOR ALL TO authenticated
  USING (id = (SELECT auth.school_id()))
  WITH CHECK (id = (SELECT auth.school_id()));

-- Classrooms: school-scoped
CREATE POLICY "classroom_isolation" ON montree_classrooms
  FOR ALL TO authenticated
  USING (school_id = (SELECT auth.school_id()))
  WITH CHECK (school_id = (SELECT auth.school_id()));

-- Teachers: school-scoped
CREATE POLICY "teacher_isolation" ON montree_teachers
  FOR ALL TO authenticated
  USING (school_id = (SELECT auth.school_id()))
  WITH CHECK (school_id = (SELECT auth.school_id()));

-- Students: school-scoped
CREATE POLICY "student_isolation" ON montree_students
  FOR ALL TO authenticated
  USING (school_id = (SELECT auth.school_id()))
  WITH CHECK (school_id = (SELECT auth.school_id()));

-- Enrollments: via classroom's school
CREATE POLICY "enrollment_isolation" ON montree_classroom_enrollments
  FOR ALL TO authenticated
  USING (
    classroom_id IN (
      SELECT id FROM montree_classrooms 
      WHERE school_id = (SELECT auth.school_id())
    )
  );

-- Invitations: school-scoped
CREATE POLICY "invitation_isolation" ON montree_teacher_invitations
  FOR ALL TO authenticated
  USING (school_id = (SELECT auth.school_id()))
  WITH CHECK (school_id = (SELECT auth.school_id()));

-- School members: school-scoped
CREATE POLICY "member_isolation" ON montree_school_members
  FOR ALL TO authenticated
  USING (school_id = (SELECT auth.school_id()))
  WITH CHECK (school_id = (SELECT auth.school_id()));

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_montree_schools_updated BEFORE UPDATE ON montree_schools 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_montree_classrooms_updated BEFORE UPDATE ON montree_classrooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_montree_teachers_updated BEFORE UPDATE ON montree_teachers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_montree_students_updated BEFORE UPDATE ON montree_students 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_montree_enrollments_updated BEFORE UPDATE ON montree_classroom_enrollments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Step 3: Build Classrooms UI

After migration runs, build `/montree/admin/classrooms`:

**File**: `app/montree/admin/classrooms/page.tsx`

UI should look like:
```
┌─────────────────────────────────────────────────┐
│  Classrooms                      [+ Add Class]  │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 🐋       │  │ 🐼       │  │ + Add    │      │
│  │ Whale    │  │ Panda    │  │          │      │
│  │ Tredoux  │  │ [Empty]  │  │          │      │
│  │ 22 kids  │  │ 0 kids   │  │          │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

**API endpoints needed**:
- `GET /api/montree/classrooms` - list school's classrooms
- `POST /api/montree/classrooms` - create classroom
- `PATCH /api/montree/classrooms/[id]` - update classroom
- `DELETE /api/montree/classrooms/[id]` - soft delete

---

## KEY DECISIONS MADE

1. **Table prefix**: Using `montree_` prefix for new tables to avoid conflicts
2. **RLS via JWT**: School ID stored in `app_metadata`, extracted via `auth.school_id()` function
3. **Soft deletes**: `_deleted` flag + `left_at` for enrollments (PowerSync ready)
4. **No master admin UI**: Use Supabase dashboard directly for emergencies
5. **One teacher per classroom**: Enforced by UNIQUE constraint on `classroom_id`

---

## FILES REFERENCE

### Documentation
- `docs/ARCHITECTURE_SCHOOL_ONBOARDING.md` - Full technical spec
- `docs/GAMEPLAN_SCHOOL_ONBOARDING.md` - Implementation phases
- `docs/HANDOFF_SESSION_84.md` - Previous session work

### Existing Montree Files
- `app/montree/admin/page.tsx` - Admin dashboard (has demo banner)
- `app/montree/dashboard/page.tsx` - Teacher classroom view
- `app/montree/dashboard/student/[id]/page.tsx` - Student detail

---

## COMMANDS

```bash
# Start dev server
cd ~/Desktop/whale && npm run dev

# Push changes
git add -A && git commit -m "message" && git push
```

---

## CRITICAL REMINDERS

1. **Always audit existing tables first** before creating migration
2. **Test RLS** - Policies fail silently (return empty, not error)
3. **Use service role key** for admin operations (bypasses RLS)
4. **Check build** before pushing: `npm run build`

---

## SUCCESS CRITERIA FOR NEXT SESSION

By end of next session:
- [ ] Migration 064 created and run in Supabase
- [ ] `/montree/admin/classrooms` page working
- [ ] Can add/edit/delete classrooms
- [ ] Classrooms display in grid with emoji icons

---

*Handoff complete. Ready to build.*
