# MONTREE FOUNDATION HANDOFF
**Date:** January 18, 2026  
**For:** Fresh Claude session  
**Priority:** #1 - Foundation Architecture

---

## 🎯 MISSION

Build Montree as a **standalone, duplicatable platform** where:
- Each **school** gets their own curriculum copy they can customize
- Each **classroom** gets their own curriculum copy they can fully edit
- **AI** transforms activity data into developmental intelligence

**This is what schools pay for.**

---

## 📍 START HERE

### Read First:
```
~/Desktop/whale/docs/mission-control/brain.json
```

### Work Protocol:
1. **Segment** every task into <50 line chunks
2. **Checkpoint** after every step (update brain.json)
3. **Verify** before moving to next step
4. **Never** mix /admin/ and /montree/ code

---

## 🏗️ ARCHITECTURE TO BUILD

```
MASTER CURRICULUM (Golden Source)
└── lib/montree/stem/*.json (NEVER modified at runtime)
    │
    ▼ [Seed on school creation]
SCHOOL CURRICULUM (DB tables)
└── school_curriculum_areas, school_curriculum_works
    │ School admin can: add, remove, edit, reorder
    │
    ▼ [Seed on classroom creation]
CLASSROOM CURRICULUM (DB tables)  
└── classroom_curriculum_areas, classroom_curriculum_works
    │ Teachers can: FULLY customize, delete, modify
    │
    ▼ [Tracked per child]
CHILDREN + ASSIGNMENTS
└── children, child_work_assignments
    │
    ▼ [AI Analysis]
DEVELOPMENTAL INTELLIGENCE
└── AI analyzes → Generates reports, suggestions, insights
```

---

## 🗄️ DATABASE SCHEMA NEEDED

### Tables to Create/Verify:

```sql
-- Schools table
CREATE TABLE montree_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- School-level curriculum
CREATE TABLE school_curriculum_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES montree_schools(id) ON DELETE CASCADE,
  area_key TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  sequence INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE school_curriculum_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES montree_schools(id) ON DELETE CASCADE,
  area_id UUID REFERENCES school_curriculum_areas(id) ON DELETE CASCADE,
  work_key TEXT NOT NULL,
  name TEXT NOT NULL,
  name_chinese TEXT,
  description TEXT,
  age_range TEXT,
  materials JSONB DEFAULT '[]',
  direct_aims JSONB DEFAULT '[]',
  indirect_aims JSONB DEFAULT '[]',
  control_of_error TEXT,
  prerequisites JSONB DEFAULT '[]',
  video_search_terms JSONB DEFAULT '[]',
  sequence INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classrooms table
CREATE TABLE montree_classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES montree_schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  teacher_id UUID,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classroom-level curriculum (already exists, verify structure)
-- classroom_curriculum_areas
-- classroom_curriculum_works

-- Children table
CREATE TABLE montree_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_chinese TEXT,
  birth_date DATE,
  photo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Child work assignments
CREATE TABLE child_work_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES montree_children(id) ON DELETE CASCADE,
  work_id UUID REFERENCES classroom_curriculum_works(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started', -- not_started, presented, practicing, mastered
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  presented_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(child_id, work_id)
);
```

---

## 📁 FILE STRUCTURE TO CREATE

```
lib/
└── montree/
    ├── stem/                    # Master curriculum (golden source)
    │   ├── practical-life.json
    │   ├── sensorial.json
    │   ├── mathematics.json
    │   ├── language.json
    │   └── cultural.json
    │
    ├── seed/                    # Seeding functions
    │   ├── seed-school.ts       # Master → School
    │   └── seed-classroom.ts    # School → Classroom
    │
    └── types/                   # TypeScript types
        └── curriculum.ts

app/
└── api/
    └── montree/
        ├── schools/
        │   ├── route.ts                    # GET all, POST create
        │   └── [id]/
        │       ├── route.ts                # GET, PUT, DELETE school
        │       └── curriculum/
        │           └── route.ts            # GET school curriculum
        │
        ├── classrooms/
        │   ├── route.ts                    # GET all, POST create
        │   └── [id]/
        │       ├── route.ts                # GET, PUT, DELETE classroom
        │       └── curriculum/
        │           ├── route.ts            # GET classroom curriculum
        │           └── works/
        │               └── [workId]/
        │                   └── route.ts    # PUT edit work
        │
        ├── children/
        │   ├── route.ts                    # GET all, POST create
        │   └── [id]/
        │       ├── route.ts                # GET, PUT, DELETE child
        │       └── assignments/
        │           └── route.ts            # GET, POST assignments
        │
        └── ai/
            ├── analyze-child/
            │   └── route.ts                # POST - developmental analysis
            ├── weekly-report/
            │   └── route.ts                # POST - parent report
            └── suggest-next/
                └── route.ts                # POST - next presentations
```

---

## 🔨 IMPLEMENTATION STEPS

### Phase 1: Cleanup & Foundation (Steps 1-5)

**Step 1: Audit Admin/Montree Connections**
- [ ] Check what /admin/ imports from /montree/ or vice versa
- [ ] List all shared components, APIs, types
- [ ] Plan disconnection (copy needed code, don't share)
- [ ] Update brain.json with findings

**Step 2: Create Master Curriculum Stem**
- [ ] Create `lib/montree/stem/` directory
- [ ] Copy/refine curriculum JSONs from `lib/curriculum/data/`
- [ ] Ensure all Montessori metadata is complete
- [ ] Verify Chinese translations exist
- [ ] Update brain.json

**Step 3: Create Database Migration**
- [ ] Write migration SQL for all new tables
- [ ] Include proper foreign keys and cascades
- [ ] Add indexes for performance
- [ ] Save to `supabase/migrations/`
- [ ] Update brain.json

**Step 4: Run Migration**
- [ ] Execute migration against Supabase
- [ ] Verify tables created correctly
- [ ] Test foreign key relationships
- [ ] Update brain.json

**Step 5: Create TypeScript Types**
- [ ] Create `lib/montree/types/curriculum.ts`
- [ ] Define School, Classroom, Child, Work interfaces
- [ ] Define API response types
- [ ] Update brain.json

### Phase 2: Seeding System (Steps 6-8)

**Step 6: Create School Seeding Function**
- [ ] `lib/montree/seed/seed-school.ts`
- [ ] Reads from stem JSONs
- [ ] Inserts into school_curriculum_areas/works
- [ ] Returns created IDs
- [ ] Update brain.json

**Step 7: Create Classroom Seeding Function**
- [ ] `lib/montree/seed/seed-classroom.ts`
- [ ] Reads from school's curriculum (DB)
- [ ] Inserts into classroom_curriculum_areas/works
- [ ] Returns created IDs
- [ ] Update brain.json

**Step 8: Create Seed API Endpoints**
- [ ] POST `/api/montree/schools` - creates school + seeds curriculum
- [ ] POST `/api/montree/classrooms` - creates classroom + seeds from school
- [ ] Test full flow
- [ ] Update brain.json

### Phase 3: CRUD APIs (Steps 9-12)

**Step 9: School APIs**
- [ ] GET/POST `/api/montree/schools`
- [ ] GET/PUT/DELETE `/api/montree/schools/[id]`
- [ ] GET `/api/montree/schools/[id]/curriculum`
- [ ] Update brain.json

**Step 10: Classroom APIs**
- [ ] GET/POST `/api/montree/classrooms`
- [ ] GET/PUT/DELETE `/api/montree/classrooms/[id]`
- [ ] GET `/api/montree/classrooms/[id]/curriculum`
- [ ] PUT `/api/montree/classrooms/[id]/curriculum/works/[workId]`
- [ ] Update brain.json

**Step 11: Children APIs**
- [ ] GET/POST `/api/montree/children`
- [ ] GET/PUT/DELETE `/api/montree/children/[id]`
- [ ] GET/POST `/api/montree/children/[id]/assignments`
- [ ] Update brain.json

**Step 12: Test Full Flow**
- [ ] Create school → verify curriculum seeded
- [ ] Create classroom → verify curriculum copied from school
- [ ] Add child → assign works → update status
- [ ] Document any issues
- [ ] Update brain.json

### Phase 4: AI Integration (Steps 13-16)

**Step 13: AI Analysis Endpoint**
- [ ] POST `/api/montree/ai/analyze-child`
- [ ] Takes child_id, returns developmental insights
- [ ] Uses Claude API with prompt caching
- [ ] Update brain.json

**Step 14: Weekly Report Endpoint**
- [ ] POST `/api/montree/ai/weekly-report`
- [ ] Takes child_id, date_range
- [ ] Returns parent-friendly narrative
- [ ] Update brain.json

**Step 15: Suggest Next Endpoint**
- [ ] POST `/api/montree/ai/suggest-next`
- [ ] Takes child_id
- [ ] Returns recommended presentations
- [ ] Considers prerequisites, balance, mastery
- [ ] Update brain.json

**Step 16: Integration Test**
- [ ] Full flow: School → Classroom → Child → Track → AI Report
- [ ] Verify all pieces work together
- [ ] Document any issues
- [ ] Update brain.json

---

## ⚠️ CRITICAL RULES

1. **NEVER** modify master stem files at runtime
2. **ALWAYS** copy curriculum down the hierarchy, never reference up
3. **SEGMENT** work into <50 line chunks
4. **CHECKPOINT** after every step - update brain.json
5. **DISCONNECT** /admin/ from /montree/ completely
6. **TEST** locally before committing

---

## 📍 CURRENT STATE

### What Exists:
- Master curriculum JSONs at `lib/curriculum/data/`
- Classroom-level tables (classroom_curriculum_areas, classroom_curriculum_works)
- Seed API at `/api/montree/curriculum/seed` (classroom only)
- Some /montree/ pages exist but need verification

### What's Missing:
- School-level curriculum tables
- Proper hierarchy (Master → School → Classroom)
- Clean separation from /admin/
- AI analysis endpoints
- TypeScript types for new structure

---

## 🚀 FIRST COMMAND FOR FRESH CLAUDE

```
Read ~/Desktop/whale/docs/mission-control/brain.json first.
Then read this handoff at ~/Desktop/whale/docs/mission-control/HANDOFF_MONTREE_FOUNDATION.md.
Start with Step 1: Audit Admin/Montree Connections.
Work in chunks. Update brain after every step.
```

---

## 📞 CONTACT

If stuck or need clarification, ask Tredoux. He's available and wants to verify each step.

**Goal:** Lightning-speed independence. Foundation must be rock solid.
