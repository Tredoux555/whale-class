# Montree Standalone - Architecture Plan

## Vision
A plug-and-play Montessori classroom management system. Better than Transparent Classroom.
Teachers sign up, upload students, track progress. Parents view reports. Simple.

---

## Phase 1: Multi-User Auth System (CURRENT PRIORITY)

### User Roles

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Super Admin** (Tredoux) | Everything - edit master curriculum, manage all schools | - |
| **School Admin** | Manage their school, invite teachers, manage students | Edit master curriculum |
| **Teacher** | Track student progress, use tools (label maker, flashcard maker, AI planner), view curriculum | Edit curriculum, see other schools |
| **Parent** | View their child's progress and reports | Edit anything |

### Database Schema Additions

```sql
-- SCHOOLS TABLE (multi-tenant support)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- for URL: app.montree.com/school-slug
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'teacher', 'parent')),
  school_id UUID REFERENCES schools(id),  -- NULL for super_admin
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLASSROOMS TABLE
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group TEXT NOT NULL CHECK (age_group IN ('2-3', '3-4', '3-6', '4-5', '5-6', '6-9')),
  teacher_id UUID REFERENCES users(id),
  academic_year TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLASSROOM_CHILDREN (link children to classrooms)
CREATE TABLE classroom_children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  enrolled_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'withdrawn')),
  UNIQUE(classroom_id, child_id)
);

-- PARENT_CHILDREN (link parents to their children)
CREATE TABLE parent_children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  can_view_progress BOOLEAN DEFAULT true,
  UNIQUE(parent_id, child_id)
);

-- Add school_id to children table
ALTER TABLE children ADD COLUMN school_id UUID REFERENCES schools(id);
```

---

## Phase 2: Teacher Dashboard (Friend Access)

### Teacher Can Access:
1. **My Classroom** - View/manage their assigned children
2. **Progress Tracking** - Mark works as presented/practicing/mastered
3. **Tools:**
   - Label Maker ✅
   - Flashcard Maker ✅
   - AI Lesson Planner ✅
   - 3-Part Card Generator ✅
   - Weekly Planning ✅
4. **Curriculum View** - See Montree (read-only)
5. **Parent Reports** - Generate progress reports

### Teacher CANNOT Access:
1. Montree Edit Mode (add/remove/reorder works)
2. Other schools/classrooms
3. System settings
4. User management

### URL Structure
```
/teacher                    → Teacher dashboard
/teacher/classroom          → My classroom (children list)
/teacher/child/[id]         → Individual child progress
/teacher/tools              → All tools
/teacher/tools/label-maker  → Label maker
/teacher/curriculum         → Montree (read-only view)
/teacher/reports            → Generate parent reports
```

---

## Phase 3: Parent Portal

### Parent Can:
1. View their child's current progress
2. See which works are mastered/in progress
3. View teacher notes
4. Download progress reports

### URL Structure
```
/parent                     → Parent dashboard
/parent/child/[id]          → Child progress view
/parent/reports             → Download reports
```

---

## Phase 4: Standalone Onboarding Flow

### New Teacher Signup
1. **Create Account** (email/password)
2. **School Setup** (school name, optional logo)
3. **Add Students**
   - Manual entry OR
   - CSV upload (name, DOB, parent email)
4. **Curriculum Selection**
   - Use default Montessori curriculum OR
   - Customize later
5. **Set Starting Points**
   - For each child, indicate where they are in each area
   - Simple UI: "Has this child been presented this work?"

### The Magic: Starting Point Selector
```
┌─────────────────────────────────────────────────────────┐
│  Select Starting Points for: Emma (Age 4.5)             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PRACTICAL LIFE                                         │
│  ├── Care of Self                                       │
│  │   [✓] Dressing frames - buttons                      │
│  │   [✓] Dressing frames - zippers                      │
│  │   [ ] Dressing frames - lacing                       │  ← First unpresented
│  │   [ ] Polishing shoes                                │
│  │                                                      │
│  SENSORIAL                                              │
│  ├── Visual Discrimination                              │
│  │   [✓] Pink tower                                     │
│  │   [✓] Brown stair                                    │
│  │   [ ] Red rods                                       │  ← First unpresented
│  │                                                      │
│  [Mark all above as "Mastered"] [Mark as "Presented"]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 5: App Store Ready Features

### Must Have
- [ ] PWA support (installable on phone/tablet)
- [ ] Offline mode (sync when online)
- [ ] Push notifications (progress milestones)
- [ ] Multi-language support
- [ ] Data export (CSV, PDF)
- [ ] GDPR compliance (data deletion)

### Nice to Have
- [ ] Photo attachments to progress notes
- [ ] Video snippets of child working
- [ ] AI-suggested next activities
- [ ] Calendar integration
- [ ] Communication between teacher/parent

---

## Implementation Order

### Week 1: Auth Foundation
1. Create database tables (schools, users, classrooms)
2. Build login system with roles
3. Create teacher login page
4. Middleware for role-based access

### Week 2: Teacher Dashboard
1. Teacher dashboard layout
2. Classroom view (their students)
3. Progress tracking interface
4. Connect existing tools

### Week 3: Parent Portal
1. Parent signup/login
2. Child progress view
3. Report viewing

### Week 4: Standalone Onboarding
1. Teacher signup flow
2. School creation
3. Student import (CSV)
4. Starting point selector

---

## Immediate Action: Teacher Login for Friends

**Goal:** Your school friends can log in and use the tools without editing Montree.

### Files to Create:
1. `app/teacher/page.tsx` - Teacher dashboard
2. `app/teacher/login/page.tsx` - Teacher login
3. `app/teacher/layout.tsx` - Teacher layout with restricted nav
4. `lib/auth-multi.ts` - Multi-role auth system
5. `middleware.ts` - Route protection

### Quick Start for Friends:
1. You create their account (email + temp password)
2. They log in at `/teacher/login`
3. They see: Tools, Curriculum (read-only), their classroom
4. They cannot see: Montree edit, admin settings

---

## What Makes This Better Than Transparent Classroom

1. **Simpler UI** - Teacher-first design, not feature bloat
2. **Offline Ready** - Works without internet
3. **AI Powered** - Lesson planning, activity suggestions
4. **Beautiful Progress Visualization** - Montree visual tree
5. **Faster** - One-click progress updates
6. **Cheaper** - Free tier for small classrooms
7. **Better Tools** - Label maker, flashcard maker built-in

---

Ready to start Phase 1?
