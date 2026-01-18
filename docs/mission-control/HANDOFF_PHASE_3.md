# HANDOFF: Montree Phase 3 - AI Integration

**Date:** 2026-01-19  
**Session:** 45  
**Status:** Phase 2 COMPLETE ✅ | Phase 3 READY

---

## PHASE 2 COMPLETED - ALL CRUD APIs DONE

### Files Created/Updated
```
app/api/montree/schools/[id]/route.ts      ✅ GET, PUT, DELETE
app/api/montree/classrooms/[id]/route.ts   ✅ GET, PUT, DELETE  
app/api/montree/children/route.ts          ✅ GET (list), POST
app/api/montree/children/[childId]/route.ts ✅ GET, PUT, DELETE
app/api/montree/assignments/route.ts       ✅ GET (list), POST
app/api/montree/assignments/[id]/route.ts  ✅ GET, PUT, DELETE
```

### Complete API Inventory
| Resource | List | Create | Get | Update | Delete |
|----------|------|--------|-----|--------|--------|
| Schools | GET /schools | POST /schools | GET /schools/[id] | PUT /schools/[id] | DELETE /schools/[id] |
| Classrooms | GET /classrooms | POST /classrooms | GET /classrooms/[id] | PUT /classrooms/[id] | DELETE /classrooms/[id] |
| Children | GET /children | POST /children | GET /children/[id] | PUT /children/[id] | DELETE /children/[id] |
| Assignments | GET /assignments | POST /assignments | GET /assignments/[id] | PUT /assignments/[id] | DELETE /assignments/[id] |

### Key Features Implemented
- **Auto-seeding**: School creation seeds 268 works, classroom creation copies from school
- **Cascade deletes**: Delete school → everything goes
- **Upsert assignments**: Re-assigning same work updates rather than duplicates
- **Timestamp tracking**: presented_at, mastered_at auto-set on status change
- **Classroom transfer**: PUT /children/[id] with new classroom_id moves child

---

## PHASE 3: AI INTEGRATION - THE DIFFERENTIATOR

### The Vision
> "Not what they did — how they're developing"
> 
> AI transforms "Leo did spooning" → "Leo's pincer grip is developing, preparing him for writing"

### APIs to Build

#### Step 13: Developmental Analysis
```
POST /api/montree/ai/analyze
Body: { child_id: string }
Response: {
  child: { name, age },
  summary: "Leo is progressing well in Practical Life...",
  strengths: ["Fine motor control", "Concentration"],
  growth_areas: ["Number recognition", "Letter sounds"],
  developmental_insights: [
    { area: "practical_life", insight: "Strong pincer grip development..." },
    ...
  ]
}
```

#### Step 14: Weekly Parent Report
```
POST /api/montree/ai/weekly-report
Body: { child_id: string, week_start?: string }
Response: {
  child: { name },
  period: "Jan 13-19, 2026",
  highlights: ["Mastered pouring exercises", "Started number rods"],
  narrative: "This week Leo showed tremendous growth in...",
  next_steps: ["Continue building on...", "Introduce..."],
  pdf_url?: string  // Optional PDF generation
}
```

#### Step 15: Next Work Suggester
```
POST /api/montree/ai/suggest-next
Body: { child_id: string, area?: string }
Response: {
  suggestions: [
    {
      work: { id, name, area },
      reason: "Leo has mastered prerequisites X and Y",
      readiness_score: 0.95,
      developmental_benefit: "Builds on fine motor skills..."
    },
    ...
  ]
}
```

---

## DATABASE CONTEXT

### Tables (8 total)
```
montree_schools
├── montree_classrooms
│   ├── montree_classroom_curriculum_areas (5 per classroom)
│   ├── montree_classroom_curriculum_works (268 per classroom)
│   └── montree_children
│       └── montree_child_assignments
├── montree_school_curriculum_areas (5 per school)
└── montree_school_curriculum_works (268 per school)
```

### Assignment Status Flow
```
not_started → presented → practicing → mastered
```

### Key Tables for AI
- `montree_child_assignments` - What work has been done, status, timestamps
- `montree_classroom_curriculum_works` - Work metadata (direct_aims, indirect_aims, prerequisites)
- `montree_children` - Child info

---

## KEY FILES TO READ FIRST

| File | Purpose |
|------|---------|
| `lib/montree/types/curriculum.ts` | All TypeScript interfaces |
| `lib/montree/stem/*.json` | Master curriculum with Montessori metadata |
| `app/api/montree/assignments/route.ts` | How assignments work |
| `docs/mission-control/brain.json` | Current state |

---

## AUDIT FINDINGS (for reference)

### Improvements to Consider (Post-Phase 3)
1. **Batch assignment API** - Assign multiple works at once
2. **Pagination** - For large classrooms
3. **Progress history** - Track when status changes happened (not just latest)
4. **Prerequisite validation** - Warn if assigning work before prerequisites mastered

### Code Quality
- Consistent patterns across all APIs ✅
- Proper error handling ✅
- Type-safe with curriculum.ts ✅
- Upsert for idempotency ✅

---

## HOW TO START PHASE 3

```
1. Read brain.json first
2. Read this handoff
3. Create app/api/montree/ai/ directory
4. Build Step 13: /api/montree/ai/analyze
5. UPDATE BRAIN after Step 13
6. Build Step 14: /api/montree/ai/weekly-report
7. UPDATE BRAIN after Step 14
8. Build Step 15: /api/montree/ai/suggest-next
9. UPDATE BRAIN after Step 15
```

**REMEMBER:** Update brain.json after EVERY step. No exceptions.

---

## CLAUDE API CONTEXT

For AI endpoints, you'll use the Claude API. The app already has:
- `ANTHROPIC_API_KEY` in environment
- Claude integration patterns in other parts of the codebase

Suggested model: `claude-sonnet-4-20250514` for cost-effective analysis

---

## NEXT CHAT STARTER

```
Continue Montree Phase 3. Read the brain and handoff first.

~/Desktop/whale/docs/mission-control/brain.json
~/Desktop/whale/docs/mission-control/HANDOFF_PHASE_3.md

Phase 3 = THE DIFFERENTIATOR (AI Integration):
* Step 13: POST /api/montree/ai/analyze - Developmental analysis
* Step 14: POST /api/montree/ai/weekly-report - Parent reports  
* Step 15: POST /api/montree/ai/suggest-next - Work recommendations

This is what schools PAY for. Make it exceptional.
```
