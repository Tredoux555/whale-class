# Session 102 HANDOFF - Montree Dashboard

## ✅ WORKING NOW

**URL**: https://www.teacherpotato.xyz/montree/dashboard  
**Login**: Demo / 123

### Features Working:
| Feature | Status |
|---------|--------|
| Login with teacher credentials | ✅ |
| See all 20 students in classroom | ✅ |
| Click student → see Week tab | ✅ |
| Assigned works for Week 2 | ✅ |
| **Click work → EXPANDS** | ✅ |
| Demo button → YouTube search | ✅ |
| Capture button → hint message | ✅ |
| Find Work → full curriculum | ✅ |

---

## 🏗️ ARCHITECTURE - Multi-Teacher Support

**YES, the architecture supports multiple teachers sharing the same classroom data.**

### How It Works:

```
┌─────────────────────────────────────────────────────────────┐
│  montree_teachers                                            │
│  ├── Teacher 1 (classroom_id: "whale-class")                │
│  ├── Teacher 2 (classroom_id: "whale-class")  ← SAME        │
│  ├── Teacher 3 (classroom_id: "whale-class")  ← SAME        │
│  └── Teacher 4 (classroom_id: "whale-class")  ← SAME        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  montree_children (classroom_id: "whale-class")              │
│  ├── Amy                                                     │
│  ├── Austin                                                  │
│  ├── ... 18 more students                                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  montree_work_sessions (child_id based)                      │
│  ├── session 1: Amy + "Colored Globe" + notes               │
│  ├── session 2: Austin + "Review Box 1" + photo              │
│  └── ALL teachers see ALL sessions (no teacher filter)       │
└─────────────────────────────────────────────────────────────┘
```

### Key Points:

1. **Teachers share data by classroom_id**
   - All teachers with same `classroom_id` see same children
   - Work sessions are linked to `child_id` (not teacher_id)
   - Any teacher can add notes, any teacher can see them

2. **Data Storage**:
   - `montree_teachers` - teacher logins with classroom_id
   - `montree_children` - students with classroom_id
   - `montree_work_sessions` - notes/photos linked to child_id
   - `weekly_assignments` - assigned works per child

3. **New API Added**:
   - `POST /api/montree/sessions` - Save notes/observations
   - `GET /api/montree/sessions?child_id=X` - Get child's history

---

## 📋 DATABASE TABLES

```sql
-- Teachers (4+ can share same classroom)
montree_teachers
├── id, name, password_hash
├── school_id, classroom_id  ← KEY: classroom_id links teachers
└── is_active, role

-- Children (belong to classroom)
montree_children  
├── id, name, age, photo_url
├── classroom_id  ← Links to teacher's classroom
└── notes

-- Work Sessions (linked to child, not teacher)
montree_work_sessions
├── child_id, work_id  ← KEY: no teacher_id!
├── session_type (presentation/practice/observation)
├── notes  ← Teacher notes, visible to ALL teachers
├── media_urls (photos)
└── observed_at
```

---

## 🔮 NEXT SESSION - TODO

### Priority 1: Wire up Notes in Week Tab
Currently notes save to sessions API but aren't displayed:
1. Add notes textarea to expanded panel
2. Load existing notes from `/api/montree/sessions?child_id=X&work_id=Y`
3. Save notes on blur/button click

### Priority 2: Wire Capture Button
Currently shows hint - should:
1. Open camera
2. Save photo to storage
3. Record session with media_url

### Priority 3: Progress Tab
Shows placeholder - needs real data from:
- `/api/classroom/child/{childId}/progress`

### Priority 4: Reports Tab  
Generate button exists but API may not work yet.

---

## 🔧 FILES CHANGED THIS SESSION

```
app/montree/dashboard/page.tsx    - Expandable works fixed
app/api/montree/sessions/route.ts - NEW: Notes API
brain.json                        - Updated
docs/HANDOFF_SESSION102.md        - This file
```

---

## 🐋 CREDENTIALS

| Login | Password | Role |
|-------|----------|------|
| Demo | 123 | Teacher (Whale Class) |
| Tredoux | 870602 | Admin |

---

## ⚠️ ARCHITECTURE CONFIRMATION

**Q: Can 4+ teachers share the same classroom data?**  
**A: YES.** All teachers with matching `classroom_id` see:
- Same children
- Same work sessions
- Same notes
- Same photos

Data is linked by **child_id**, not teacher_id. RLS policies allow all authenticated users to read/write sessions.
