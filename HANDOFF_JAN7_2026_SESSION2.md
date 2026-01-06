# WHALE HANDOFF - January 7, 2026 - Session 2

## What We Built This Session

### Work Activity Guide Feature
When tapping on a work in the classroom view dropdown, users now see a comprehensive activity guide with:
- **Description** - What the activity is about
- **Chinese Name** - For ESL reference
- **Quick Stats** - Age range, progression levels, materials count
- **Direct Aims** - What the child directly learns (e.g., "Coordination", "Fine motor")
- **Indirect Aims** - Indirect preparation benefits (e.g., "Preparation for writing")
- **Materials Needed** - List of required materials
- **Control of Error** - How the child self-corrects
- **Progression Levels** - Numbered steps showing skill progression

This mirrors the English Guide format and gives teachers instant guidance on any activity.

---

## Files Created/Modified

```
# NEW - API endpoint for work descriptions
app/api/curriculum/work-description/route.ts

# NEW - Work description display component
app/admin/classroom/WorkDescription.tsx

# MODIFIED - Added activity guide to dropdown
app/admin/classroom/SwipeableWorkRow.tsx
```

---

## How It Works

1. Teacher taps a work in `/admin/classroom`
2. Dropdown expands with Notes, Photo/Video/Demo buttons
3. **NEW:** Activity guide loads below the buttons
4. Guide fetches from curriculum JSON data files in `/lib/curriculum/data/`
5. Fuzzy matching finds the work by name across all areas

---

## Curriculum Data Source

Data comes from comprehensive JSON files:
- `/lib/curriculum/data/practical-life.json` - 5 categories, 50+ works
- `/lib/curriculum/data/sensorial.json` - 7 categories, 40+ works
- `/lib/curriculum/data/math.json` - Full math curriculum
- `/lib/curriculum/data/language.json` - Oral, writing prep, reading, grammar
- `/lib/curriculum/data/cultural.json` - Geography, science, art, music

Each work includes:
```json
{
  "id": "pl_spooning",
  "name": "Spooning",
  "description": "Transferring materials using a spoon",
  "chineseName": "蒙特梭利勺子转移",
  "materials": ["Two bowls", "Spoon", "Dry materials"],
  "directAims": ["Fine motor control", "Spoon grip"],
  "indirectAims": ["Preparation for self-feeding", "Concentration"],
  "controlOfError": "Materials spill",
  "levels": [
    {"level": 1, "name": "Large Spoon - Large Materials", "description": "Large spoon with beans/pasta"},
    {"level": 2, "name": "Large Spoon - Small Materials", "description": "Large spoon with rice/lentils"},
    {"level": 3, "name": "Small Spoon - Large Materials", "description": "Teaspoon with beans"},
    {"level": 4, "name": "Small Spoon - Small Materials", "description": "Teaspoon with rice/seeds"}
  ]
}
```

---

## Previous Session Summary (from HANDOFF_JAN7_2026.md)

- Swipe navigation on Progress Tracker
- Admin hierarchy pages (`/admin/schools`, `/admin/classrooms/[id]`)
- Classroom View standalone app (`/classroom-view/[classroomId]`)
- AI Parent Reports generation

---

## To Test

1. Go to `/admin/classroom`
2. Select a week with assignments
3. Tap any work (e.g., "Spooning", "Pink Tower", "Sound Games")
4. Dropdown opens → scroll down to see **Activity Guide**
5. Guide shows description, aims, materials, control of error, levels

---

## Core URLs

| URL | Purpose |
|-----|---------|
| `/admin/classroom` | Main classroom view with activity guides |
| `/admin/classroom/print` | Print weekly plans (A4) |
| `/admin/montree` | Curriculum tree view |
| `/teacher/progress` | Teacher progress tracking (swipe + tap) |
| `/admin/english-guide` | English teaching guide |

---

## Database - No Changes

No migrations needed. Activity data comes from static JSON files.

---

## Next Steps

- [ ] Add activity guide to teacher progress view
- [ ] Add Chinese translations for guide labels
- [ ] Add "Watch Demo" video integration in guide
- [ ] Export activity guide to PDF for training

---

## Quick Reference

**Classroom view with guides:**
```
/admin/classroom → tap work → dropdown → scroll → Activity Guide
```

**Curriculum data:**
```
/lib/curriculum/data/*.json (5 area files)
```
