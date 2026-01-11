# 🏔️ MONTREE UNIFICATION MASTERPLAN
## The Brain - Read This First Every Session

**Last Updated:** January 11, 2026 08:20 Beijing  
**Status:** ✅ FLOW WORKING - Teacher→Parent→Games verified

---

## 🎯 CURRENT STATUS

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
- [x] Demo data: Amy has correct work_ids for game recommendations
- [x] **VERIFIED: Game recommendations appearing! ✅**

### Next Up 🎯
- [ ] Switch unified pages to default
- [ ] Create test family data
- [ ] Test full parent login flow in browser

---

## 🚀 PRODUCTION

**URL:** `https://www.teacherpotato.xyz` (always use www!)

**Verified Working:**
- 41/41 routes passing
- Game recommendations: Letter Sounds, Beginning Sounds, Middle Sounds
- Amy's Language progress showing correctly

---

## 🧠 THE ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│              SINGLE SOURCE OF TRUTH                 │
├─────────────────────────────────────────────────────┤
│  families          → Parent accounts                │
│  children          → Students (+ family_id)         │
│  curriculum_roadmap → 342 Montessori works          │
│  child_work_progress → Status per child per work    │
│  game_curriculum_mapping → 60 game↔work links       │
└─────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
    TEACHER              PARENT                GAMES
    writes               reads              recommended
    progress             progress           based on
                                           Language works
```

---

## 📁 KEY FILES

```
BRAIN FILES:
~/Desktop/whale/docs/mission-control/mission-control.json
~/Desktop/whale/docs/mission-control/SESSION_LOG.md
~/Desktop/whale/docs/mission-control/HANDOFF_JAN11_FLOW_FIXED.md ← LATEST

UNIFIED APIs:
/api/unified/families   - Parent login
/api/unified/children   - All kids + progress
/api/unified/progress   - Full progress for one child
/api/unified/games      - All available games
/api/unified/today      - Today's learning + game recs ⭐

UNIFIED UI:
app/parent/home/page-unified.tsx
app/parent/home/[familyId]/page-unified.tsx
app/parent/home/[familyId]/[childId]/page-unified.tsx
```

---

## 💡 KEY LEARNINGS

### Work ID Prefixes (IMPORTANT!)
| Area | Correct Prefix | Wrong Prefix |
|------|---------------|--------------|
| Language | `la_*` | `lang_*` ❌ |
| Sensorial | `se_*` | `sen_*` ❌ |
| Math | `ma_*` | `math_*` ❌ |
| Practical Life | `pl_*` | ✅ |

### Testing Game Recommendations
```bash
curl -sL "https://www.teacherpotato.xyz/api/unified/today?child_id=afbed794-4eee-4eb5-8262-30ab67638ec7" | python3 -m json.tool
```

Expected: `game_recommendations` array with 3 games

---

## 🔧 TROUBLESHOOTING

### "No game recommendations"
- Child needs Language works with status >= 1
- Work IDs must use `la_*` prefix
- Check: `SELECT * FROM child_work_progress WHERE child_id = 'xxx' AND work_id LIKE 'la_%'`

### "Unknown Work" showing
- work_id doesn't exist in curriculum_roadmap
- Check prefix is correct (la_, se_, ma_, pl_)
- Run cleanup: `migrations/026b_cleanup_amy_bad_data.sql`

### "API 500 error"
- Check Railway logs
- Usually missing table or column

---

*This is the brain. Read it first every session.*
