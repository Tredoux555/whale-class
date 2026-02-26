# HANDOFF: Curriculum Data Makeover

**Date:** January 26, 2026  
**Session:** 104  
**Status:** Ready to implement  

---

## ROLLBACK POINT

```bash
git checkout rollback-before-curriculum-makeover
```

Tag pushed to GitHub ✓

---

## WHAT WE DISCOVERED

Found rich curriculum JSON data in the old Montree backup (`/home/claude/montree/src/lib/curriculum/data/`) with features NOT in current Whale/Montree:

### 5 Curriculum Files
| File | Size | Description |
|------|------|-------------|
| practical-life.json | 63KB | 8 categories, 83 works |
| sensorial.json | 40KB | Visual, auditory, tactile |
| language.json | 44KB | Reading, writing, vocabulary |
| math.json | 54KB | Numbers, operations, geometry |
| cultural.json | 31KB | Geography, science, art |

### Rich Data Structure Per Work

```json
{
  "id": "pl_walking_line",
  "name": "Walking on the Line",
  "description": "Walking carefully on a line marked on the floor",
  "ageRange": "primary_year1",
  "sequence": 6,
  "chineseName": "蒙特梭利走线",  // ← FOR 1688 SOURCING!
  "prerequisites": ["pl_carrying_chair"],  // ← DEPENDENCY TRACKING
  "materials": ["Tape/painted line", "Bell", "Glass of water", "Flag", "Basket"],
  "directAims": ["Balance", "Control of movement"],
  "indirectAims": ["Concentration", "Self-discipline"],
  "controlOfError": "Stepping off the line",
  "levels": [  // ← PROGRESSION LEVELS WITH VIDEO SEARCH!
    {
      "level": 1,
      "name": "Basic Walking",
      "description": "Walk slowly heel-to-toe on line",
      "videoSearchTerms": ["montessori walking on line"]
    },
    {
      "level": 2,
      "name": "Walking with Hands Out",
      "description": "Arms extended for balance",
      "videoSearchTerms": ["montessori walking line balance"]
    },
    // ... up to 7 levels
  ]
}
```

---

## KEY FEATURES TO INTEGRATE

### From Backup (NOT in current Whale/Montree)
1. **videoSearchTerms** - YouTube search terms per level for parent/teacher reference
2. **chineseName** - Chinese translations for 1688.com material sourcing
3. **levels array** - Detailed progression steps (1-7 levels per work)
4. **prerequisites** - Work dependency tracking (e.g., must do X before Y)
5. **sequence numbers** - Proper ordering within categories

### From Current Whale/Montree (KEEP)
1. **parent_explanation_simple** - One-liner for parents
2. **parent_explanation_detailed** - Full explanation
3. **parent_why_it_matters** - Connects to child development
4. **Database integration** - Sessions, children, teachers, progress tracking
5. **Report generation** - Parent reports with observations

---

## PRACTICAL LIFE CATEGORIES (Example)

| Category | Works | Description |
|----------|-------|-------------|
| Preliminary Exercises | 10 | Mat, chair, tray, table, door, walking line, silence game |
| Transfer Activities | 10 | Hand transfer, spooning, tonging, tweezers, chopsticks, pouring |
| Dressing Frames | 12 | Velcro, snaps, buttons, zipper, hook/eye, buckles, lacing, bow |
| Care of Self | 8 | Hand/face washing, teeth, nose, hair, dressing |
| Care of Environment | 14 | Dusting, sweeping, mopping, scrubbing, polishing, plant/animal care |
| Grace and Courtesy | 12 | Greetings, please/thank you, interrupting, table manners |
| Food Preparation | 10 | Washing, spreading, peeling, cutting, grating, juicing |
| Sewing and Needlework | 7 | Threading, sewing cards, punching, stitches, weaving |

---

## INTEGRATION STRATEGY

### Option A: Merge into existing brain.json
- Add new fields to existing works
- Keep current structure, enhance with backup data
- Pros: Minimal disruption
- Cons: Manual mapping required

### Option B: Replace curriculum data entirely
- Use backup JSON as new source of truth
- Add parent explanations as new fields
- Pros: Cleaner, more complete
- Cons: Need to verify all current works exist in backup

### Option C: Hybrid database approach
- Store rich curriculum in Supabase
- API endpoints for video search, prerequisites, levels
- Pros: Scalable, queryable
- Cons: More complex

---

## RECOMMENDED NEXT STEPS

1. **Compare work IDs** - Ensure backup covers all current Whale works
2. **Create merged schema** - Combine best of both datasets
3. **Build migration script** - Transform and merge data
4. **Update Montree UI** - Display levels, video links, Chinese names
5. **Add 1688 sourcing tool** - Use chineseName for material searches

---

## FILES LOCATION

Backup curriculum files copied to Claude's computer:
- `/home/claude/montree/src/lib/curriculum/data/practical-life.json`
- `/home/claude/montree/src/lib/curriculum/data/sensorial.json`
- `/home/claude/montree/src/lib/curriculum/data/language.json`
- `/home/claude/montree/src/lib/curriculum/data/math.json`
- `/home/claude/montree/src/lib/curriculum/data/cultural.json`

---

## QUICK START FOR NEXT SESSION

```bash
# 1. View current curriculum structure
cat ~/Desktop/ACTIVE/whale/lib/montree/brain.json | head -100

# 2. Compare with backup
# Files are in Claude's computer at /home/claude/montree/src/lib/curriculum/data/

# 3. If things break
git checkout rollback-before-curriculum-makeover
```

---

**This is gold data for Montree.** The Chinese names alone are worth the integration - teachers can search 1688 directly for materials. The video search terms per level give parents YouTube guidance. The prerequisites enable smart recommendations.
