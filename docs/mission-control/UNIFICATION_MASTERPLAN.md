# 🏔️ MONTREE UNIFICATION MASTERPLAN
## The Brain - Read This First Every Session

**Last Updated:** January 13, 2026 01:00 Beijing  
**Status:** DATABASE LIVE ✅ | CODE READY TO PUSH ⏳

---

## 🚨 CHECKPOINT PROTOCOL (MANDATORY)

### Every 5 Minutes OR After Every Task:
```
1. SAVE work to disk (write files)
2. UPDATE this file's "Current Status" section
3. UPDATE SESSION_LOG.md with what was done
4. COMMIT to yourself: "Next I will do X"
5. CONTINUE working
```

### After Major Milestones:
```
1. Write HANDOFF_[DATE]_[TOPIC].md
2. Update memory edits if needed
3. Git commit with clear message
```

### If Interrupted/Context Lost:
```
1. READ this file first
2. READ SESSION_LOG.md
3. READ latest HANDOFF_*.md
4. Continue from "NEXT ACTIONS" below
```

---

## 📊 CURRENT STATUS

### Completed ✅
- [x] Database: families, game_curriculum_mapping tables
- [x] Database: children extended (family_id, color, journal_entries)
- [x] Database: 60 game mappings seeded
- [x] API: /api/unified/families
- [x] API: /api/unified/children
- [x] API: /api/unified/progress
- [x] API: /api/unified/games
- [x] API: /api/unified/today
- [x] UI: page-unified.tsx for all 3 parent pages
- [x] Docs: HANDOFF_JAN13_UNIFICATION.md

### In Progress ⏳
- [ ] Git push (Tredoux doing)
- [ ] Production test

### Next Up 🎯
- [ ] Switch unified pages to default
- [ ] Create test family data
- [ ] Verify game recommendations work

---

## 🎯 NEXT ACTIONS (in order)

### 1. After Git Push - Test Production
```
1. Go to teacherpotato.xyz/parent/home
2. Check page loads without errors
3. Try to login with test email
```

### 2. Create Test Data
```sql
-- Run in Supabase
INSERT INTO families (name, email) VALUES ('Demo Family', 'demo@test.com');
UPDATE children SET family_id = (SELECT id FROM families WHERE email = 'demo@test.com') WHERE name = 'Amy';
```

### 3. Switch to Unified Pages
```bash
cd ~/Desktop/whale/app/parent/home
mv page.tsx page-old.tsx && mv page-unified.tsx page.tsx
cd [familyId]
mv page.tsx page-old.tsx && mv page-unified.tsx page.tsx
cd [childId]  
mv page.tsx page-old.tsx && mv page-unified.tsx page.tsx
```

### 4. Future Work
- Teacher UI to assign families
- Journal entry from parent
- Game play tracking
- Principal family overview

---

## 📁 FILE MAP

```
docs/mission-control/
├── UNIFICATION_MASTERPLAN.md    ← THE BRAIN (this file)
├── SESSION_LOG.md               ← Session history
├── HANDOFF_JAN13_UNIFICATION.md ← Latest handoff
└── DEPLOYMENT_GUIDE.md          ← Step-by-step deploy

migrations/
├── 025_montree_unification.sql      ← Schema (DEPLOYED)
└── 025b_seed_game_mappings.sql      ← Game maps (DEPLOYED)

app/api/unified/
├── families/route.ts    ← Parent login
├── children/route.ts    ← Kids + progress
├── progress/route.ts    ← Progress + game recs
├── games/route.ts       ← All games
└── today/route.ts       ← Daily updates

app/parent/home/
├── page-unified.tsx                    ← Login (NEW)
└── [familyId]/
    ├── page-unified.tsx                ← Dashboard (NEW)
    └── [childId]/
        └── page-unified.tsx            ← Child view (NEW)
```

---

## 🧠 ARCHITECTURE

```
Teacher taps "Presented" on Sandpaper Letters
              ↓
child_work_progress updated (status=1)
              ↓
Parent opens app → calls /api/unified/today
              ↓
API reads child_work_progress + game_curriculum_mapping
              ↓
Parent sees: "Amy learned Sandpaper Letters today!"
           + "Play Letter Sounds game to practice!"
```

---

## 💡 KEY DECISIONS MADE

1. **TEXT work_id** - curriculum_roadmap.id is TEXT like "la_sandpaper_letters"
2. **Unified tables** - Extend existing teacher tables, don't rebuild
3. **60 game mappings** - All 12 games mapped to Language works
4. **page-unified.tsx** - New pages alongside old for safe rollout

---

## 🔧 TROUBLESHOOTING

### "No children found"
- Children need family_id set
- Run: `UPDATE children SET family_id = 'xxx' WHERE name = 'Amy'`

### "No game recommendations"
- Child needs Language works with status >= 1
- Check: `SELECT * FROM child_work_progress WHERE child_id = 'xxx'`

### "API 500 error"
- Check Railway logs
- Usually missing table or column

---

## 📞 CONTEXT FOR CLAUDE

When starting a new session:
1. User is Tredoux, Montessori teacher in Beijing
2. Building Whale platform (teacherpotato.xyz)
3. Just completed Montree Unification
4. Goal: Teacher→Parent→Games sync for thousands of schools

---

*This is the brain. Keep it updated. Read it first.*
