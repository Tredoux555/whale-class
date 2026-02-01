# Comprehensive Curriculum Guides

This folder contains AMI-quality teacher guides for all Montessori works.

## Structure

Each area has its own JSON file:
- `practical-life-guides.json` - 83 works
- `sensorial-guides.json` - 35 works
- `math-guides.json` - 57 works
- `language-guides.json` - 43 works
- `cultural-guides.json` - 50 works

## Data Format

Each work contains:

```json
{
  "work_id": "pl_pouring_dry",
  "name": "Dry Pouring",
  "slug": "dry-pouring",
  "area": "practical_life",
  "category": "Transfer Activities",

  "quick_guide": "• 3-5 bullet points\n• 10-second teacher scan\n• Action-oriented tips",

  "presentation_steps": [
    {"step": 1, "title": "Invitation", "description": "...", "tip": "..."},
    {"step": 2, "title": "...", "description": "...", "tip": "..."}
  ],

  "points_of_interest": ["...", "..."],
  "control_of_error": "How child self-corrects",
  "direct_aims": ["...", "..."],
  "indirect_aims": ["...", "..."],
  "materials": ["...", "..."],
  "variations": ["...", "..."],
  "common_challenges": ["...", "..."],
  "video_search_term": "montessori ... presentation"
}
```

## Usage

### 1. Migration to Supabase Brain
Run the migration scripts in `/migrations/` to populate `montessori_works` table.

### 2. Classroom Onboarding
When a new classroom is created, data is copied from Brain to `montree_classroom_curriculum_works`.
See: `app/api/montree/principal/setup-stream/route.ts` lines 192-220

### 3. API Access
Teachers can fetch guide data via:
```
GET /api/montree/works/guide?name=Work+Name&classroom_id=xxx
```

## Coverage Status

| Area | Works | quick_guide | presentation_steps |
|------|-------|-------------|-------------------|
| Practical Life | 83 | ⏳ In Progress | ⏳ In Progress |
| Sensorial | 35 | ⏳ Pending | ⏳ Pending |
| Math | 57 | ⏳ Pending | ⏳ Pending |
| Language | 43 | ✅ Partial | ✅ Partial |
| Cultural | 50 | ⏳ Pending | ⏳ Pending |

## Data Sources

- AMI (Association Montessori Internationale) training materials
- Montessori Album references
- Research conducted Session 132 (2026-01-31)

Last Updated: 2026-01-31
