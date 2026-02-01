# Handoff: Presentation Steps Deep Dive

## Date: January 31, 2026

---

## What Was Done

### 1. Curriculum Flow Audit Complete ✅
- Identified the Brain (`montessori_works`) as the single source of truth
- Each classroom gets a FULL COPY of curriculum when created
- Fixed seeding in `principal/setup` and `curriculum` APIs

### 2. Database Schema Ready ✅
- **Classroom table** (`montree_classroom_curriculum_works`) has ALL columns:
  - `presentation_steps` (JSONB)
  - `presentation_notes` (TEXT)
  - `quick_guide` (TEXT)
  - `parent_description`, `why_it_matters`, etc.

### 3. Migration 100 Created ✅
Run this in Supabase SQL Editor to add columns to the Brain:
```sql
ALTER TABLE montessori_works
ADD COLUMN IF NOT EXISTS presentation_steps JSONB DEFAULT '[]';

ALTER TABLE montessori_works
ADD COLUMN IF NOT EXISTS presentation_notes TEXT;
```

---

## What Needs to Be Done

### Step 1: Run Migration 100
In Supabase SQL Editor, run the migration at:
`migrations/100_add_presentation_steps_to_brain.sql`

### Step 2: Use Claude to Generate Presentation Steps
Open the prompt file:
`docs/CLAUDE_PROMPT_PRESENTATION_STEPS.md`

Copy the entire content and paste it into regular Claude. Ask Claude to generate presentation_steps for each batch of works.

### Step 3: Update the Brain
For each work, run an UPDATE in Supabase:
```sql
UPDATE montessori_works
SET presentation_steps = '[
  {"step": 1, "title": "...", "description": "...", "tip": "..."},
  ...
]'::jsonb
WHERE slug = 'work_slug_here';
```

### Step 4: Re-seed Classrooms (Optional)
Existing classrooms won't get the new data. Either:
- Create a new school to test
- Or run the seed endpoint: POST `/api/montree/curriculum` with `{ "classroom_id": "...", "action": "seed_from_brain" }`

---

## Data Flow Summary

```
┌─────────────────────────────────────┐
│  montessori_works (Brain)           │
│  ├── name, name_chinese             │
│  ├── quick_guide                    │ ← 10-second teacher overview
│  ├── presentation_steps  ← NEW      │ ← Detailed step-by-step JSONB
│  ├── presentation_notes  ← NEW      │ ← Additional guidance
│  ├── parent_explanation_detailed    │
│  └── parent_why_it_matters          │
└──────────────┬──────────────────────┘
               │ COPIED when classroom created
               ▼
┌─────────────────────────────────────┐
│  montree_classroom_curriculum_works │
│  (Each classroom gets own copy)     │
│  ├── name, name_chinese             │
│  ├── quick_guide                    │
│  ├── presentation_steps             │
│  ├── presentation_notes             │
│  ├── parent_description             │
│  └── why_it_matters                 │
└─────────────────────────────────────┘
```

---

## Files Modified Today

| File | Change |
|------|--------|
| `migrations/099_montree_classroom_curriculum_tables.sql` | Created - classroom curriculum tables |
| `migrations/100_add_presentation_steps_to_brain.sql` | Created - adds columns to Brain |
| `app/api/montree/principal/setup/route.ts` | Seeds from Brain with ALL rich data |
| `app/api/montree/curriculum/route.ts` | Auto-seed areas, copies presentation fields |
| `components/montree/WorkWheelPicker.tsx` | Added "Add Work" form |
| `docs/CURRICULUM_FLOW_AUDIT.md` | Full documentation |
| `docs/CLAUDE_PROMPT_PRESENTATION_STEPS.md` | Prompt for Claude to generate steps |

---

## Testing

After populating the Brain:
1. Create a new school at `/montree/principal/setup`
2. Add classrooms and teachers
3. Check one work in the dashboard - should have presentation_steps
4. Verify with Supabase query:
```sql
SELECT name, presentation_steps
FROM montree_classroom_curriculum_works
WHERE classroom_id = 'YOUR_CLASSROOM_ID'
AND presentation_steps IS NOT NULL
AND presentation_steps != '[]'::jsonb
LIMIT 5;
```

---

## Ready for Production

The infrastructure is complete. Once the Brain has presentation_steps data:
- New classrooms will automatically get all the rich data
- Teachers will see step-by-step instructions
- Parents will get detailed explanations in reports

🎯 **Next Action**: Run migration 100, then use Claude with the prompt to generate presentation data.
