# HANDOFF: Montree Phase 3 - AI Integration (FINAL)

**Date:** 2026-01-19  
**Session:** 45  
**Status:** Phase 2 COMPLETE ✅ | Phase 3 READY

---

## ⚠️ CRITICAL ARCHITECTURE FINDING

### Two Parallel Data Systems Exist

During deep audit, discovered the codebase has **two parallel systems**:

```
┌─────────────────────────────────────────────────────────────┐
│                   LEGACY SYSTEM                              │
│  Tables: children, schools, child_work_completion           │
│  APIs: /api/montree/students, /works, /progress             │
│  Used by: app/montree/dashboard (ACTIVE UI)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (NOT CONNECTED)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               FOUNDATION SYSTEM (Phase 2)                    │
│  Tables: montree_schools, montree_classrooms,               │
│          montree_children, montree_child_assignments        │
│  APIs: /schools, /classrooms, /children, /assignments       │
│  Status: COMPLETE but not connected to UI                   │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Decision

**Phase 3 AI uses FOUNDATION tables.** Reasons:
1. Proper hierarchy: School → Classroom → Children → Assignments
2. Works belong to classrooms (customizable)
3. Clean types in `lib/montree/types/curriculum.ts`
4. Better for multi-tenant SaaS

**Future work:** Migrate dashboard UI from Legacy to Foundation

---

## PHASE 2 COMPLETE - ALL FILES

### API Routes
```
app/api/montree/
├── schools/
│   ├── route.ts         ✅ GET (list), POST (create + seed)
│   └── [id]/route.ts    ✅ GET (with stats), PUT, DELETE
├── classrooms/
│   ├── route.ts         ✅ GET (list), POST (create + seed)
│   └── [id]/route.ts    ✅ GET (with curriculum), PUT, DELETE
├── children/
│   ├── route.ts         ✅ GET (list), POST
│   └── [childId]/route.ts ✅ GET (with stats), PUT, DELETE
└── assignments/
    ├── route.ts         ✅ GET (list + filters), POST
    └── [id]/route.ts    ✅ GET (with work), PUT, DELETE
```

### Utilities Created
```
lib/montree/utils/
├── validation.ts        ✅ isValidUUID, parseDate, calculateAge
└── index.ts             ✅ Exports
```

### Features Implemented
- UUID validation on ALL routes
- Date validation for date_of_birth  
- Classroom transfer clears assignments (work IDs are classroom-specific)
- Auto-seeding: School creation seeds 268 works, classroom copies from school
- Cascade deletes properly configured
- Proper error messages with correct HTTP status codes

---

## PHASE 3: AI INTEGRATION

### The Vision
> "Not what they did — how they're developing"
>
> AI transforms "Leo did spooning" → "Leo's pincer grip is developing, preparing him for writing"

### APIs to Build

#### Step 13: POST /api/montree/ai/analyze
```typescript
// Request
{ child_id: string }

// Response
{
  child: { name, age, classroom },
  summary: "Leo is progressing well in Practical Life...",
  strengths: ["Fine motor control", "Concentration"],
  growth_areas: ["Number recognition", "Letter sounds"],
  area_insights: [
    { 
      area: "practical_life", 
      area_name: "Practical Life",
      total_works: 58,
      completed: 12,
      insight: "Strong pincer grip development through transfer activities..." 
    },
    // ... other areas
  ],
  developmental_stage: "Sensitive period for order and movement"
}
```

#### Step 14: POST /api/montree/ai/weekly-report
```typescript
// Request
{ child_id: string, week_start?: string }

// Response
{
  child: { name },
  period: { start: "2026-01-13", end: "2026-01-19" },
  highlights: [
    "Mastered pouring water exercises",
    "Started exploring number rods"
  ],
  narrative: "This week Leo showed tremendous growth in...",
  next_steps: [
    "Continue building fine motor through transfer activities",
    "Introduce sandpaper letters for tactile letter recognition"
  ],
  areas_worked: [
    { area: "Practical Life", works_completed: 2, works_in_progress: 1 }
  ]
}
```

#### Step 15: POST /api/montree/ai/suggest-next
```typescript
// Request
{ child_id: string, area?: string, limit?: number }

// Response
{
  suggestions: [
    {
      work: { 
        id: "uuid", 
        name: "Spooning - Small to Small", 
        area: "practical_life",
        category: "Transfer Activities"
      },
      readiness_score: 0.95,
      reason: "Leo has mastered large spoon transfers (prerequisite)",
      developmental_benefit: "Refines pincer grip, prepares for writing",
      prerequisites_met: ["pl_spooning_large_to_large"],
      prerequisites_missing: []
    },
    // ... more suggestions
  ]
}
```

---

## DATABASE CONTEXT FOR AI

### Tables to Query
```sql
-- Get child with classroom
SELECT c.*, cl.name as classroom_name, cl.school_id
FROM montree_children c
JOIN montree_classrooms cl ON c.classroom_id = cl.id
WHERE c.id = $child_id;

-- Get child's assignments with work details
SELECT a.*, w.name, w.work_key, w.direct_aims, w.indirect_aims, 
       w.prerequisites, w.category_key, w.category_name,
       ar.name as area_name, ar.area_key
FROM montree_child_assignments a
JOIN montree_classroom_curriculum_works w ON a.work_id = w.id
JOIN montree_classroom_curriculum_areas ar ON w.area_id = ar.id
WHERE a.child_id = $child_id;

-- Get all available works in classroom (for suggestions)
SELECT w.*, ar.name as area_name, ar.area_key
FROM montree_classroom_curriculum_works w
JOIN montree_classroom_curriculum_areas ar ON w.area_id = ar.id
WHERE w.classroom_id = $classroom_id
AND w.is_active = true;
```

### Assignment Status Flow
```
not_started → presented → practicing → mastered
              (first show)  (working on)  (independent)
```

### Work Metadata (for AI context)
- `direct_aims`: Immediate learning goals
- `indirect_aims`: Long-term developmental goals  
- `prerequisites`: Works that should be mastered first
- `materials`: Physical materials used
- `levels`: Progressive difficulty levels within the work
- `video_search_terms`: For finding demonstration videos

---

## KEY FILES TO READ FIRST

| Priority | File | Purpose |
|----------|------|---------|
| 1 | `docs/mission-control/brain.json` | Current state |
| 2 | This handoff | Context |
| 3 | `lib/montree/types/curriculum.ts` | All TypeScript types |
| 4 | `lib/montree/stem/practical-life.json` | Example curriculum (see direct_aims, prerequisites) |
| 5 | `app/api/montree/assignments/route.ts` | How assignments work |

---

## CLAUDE API INTEGRATION

The app uses Claude API. Example pattern:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: `Analyze this child's Montessori progress...`
  }]
});
```

**Model choice:** `claude-sonnet-4-20250514` for cost-effective analysis

---

## STEP-BY-STEP FOR PHASE 3

```
1. Read brain.json
2. Read this handoff completely
3. Create directory: app/api/montree/ai/
4. Build Step 13: analyze/route.ts
   - Query child + assignments
   - Build context prompt with Montessori metadata
   - Call Claude API
   - Return structured analysis
5. UPDATE BRAIN.JSON
6. Build Step 14: weekly-report/route.ts
7. UPDATE BRAIN.JSON
8. Build Step 15: suggest-next/route.ts
9. UPDATE BRAIN.JSON
```

---

## QUALITY CHECKLIST FOR PHASE 3

Each AI endpoint should:
- [ ] Validate child_id as UUID
- [ ] Check child exists before querying
- [ ] Include classroom context (for work lookup)
- [ ] Use proper TypeScript types
- [ ] Handle Claude API errors gracefully
- [ ] Return consistent response structure
- [ ] Log appropriately for debugging

---

## NEXT CHAT STARTER

```
Continue Montree Phase 3 AI Integration.

READ FIRST:
~/Desktop/whale/docs/mission-control/brain.json
~/Desktop/whale/docs/mission-control/HANDOFF_PHASE_3_FINAL.md

CRITICAL CONTEXT: There are TWO data systems. Phase 3 AI uses 
FOUNDATION tables (montree_*), not legacy tables.

Phase 3 = THE DIFFERENTIATOR (AI powers developmental insights):
* Step 13: POST /api/montree/ai/analyze
* Step 14: POST /api/montree/ai/weekly-report  
* Step 15: POST /api/montree/ai/suggest-next

This is what schools PAY for. Make it exceptional.
Think like Japanese engineers - perfection in every detail.
```

---

## VISION REMINDER

**The Product:** Montree transforms how Montessori teachers communicate 
development to parents. Instead of "Leo did pouring", parents see 
"Leo is developing fine motor control and concentration, preparing 
for writing. His progress in Practical Life shows readiness for 
more challenging sensorial work."

**The Business:** $2.50-3.00/student/month. First classroom free.
Schools pay because AI saves teachers hours of observation notes
while providing deeper developmental insights than manual tracking.

**The Mission:** Fund free schools in South Africa through Jeffy Commerce.
Montree is the engine that powers the vision.
