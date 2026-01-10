# WHALE MASTER PLAN

## The Vision

Whale is not just a classroom tool. It's the education backbone for the Jeffy Schools mission.

**Every school funded by Jeffy Commerce will run on Whale.**

When a merit-selected student walks into a Jeffy School on Tredoux's family farm, their teacher uses Whale to:
- Track their Montessori progress
- Plan their week
- Report to their family
- Document their journey

This is the system that proves education done right.

---

## Current Reality (Jan 2026)

**1 school, 22 kids, Beijing International**

Tredoux uses this daily with his kindergarten class. Real usage, real feedback, real iteration.

---

## 🚨 PRIORITY STATUS (Jan 10, 2026 - UPDATED)

### FIXED ✅
| Issue | Status |
|-------|--------|
| Teacher Login | ✅ WORKING at /teacher |
| Admin Cards Styling | ✅ FIXED |
| Games Hub Links | ✅ FIXED - 12 games with correct routes |
| Principal Dashboard | ✅ WORKING |
| Classroom Detail | ✅ WORKING |
| Word Audio (26 words) | ✅ RECORDED |

### REMAINING ISSUES
| Issue | Status | Action |
|-------|--------|--------|
| Lesson Document Upload | 🔴 API missing | Build /api/admin/lesson-documents |
| Video Flashcard Maker | 🟡 UNTESTED | Verify yt-dlp works |
| Production Deploy | ✅ All routes live | teacherpotato.xyz |

---

## 🎮 GAMES STATUS (Jan 10, 2026) - UPDATED

### ALL GAMES WORKING ✅

| Game | Route | Status |
|------|-------|--------|
| Letter Sounds | `/games/letter-sounds` | ✅ WORKING |
| Letter Match | `/games/letter-match` | ✅ WORKING |
| Letter Tracer | `/games/letter-tracer` | ✅ WORKING |
| Word Builder | `/games/word-builder` | ✅ WORKING |
| Vocabulary Builder | `/games/vocabulary-builder` | ✅ WORKING |
| Grammar Symbols | `/games/grammar-symbols` | ✅ WORKING |
| Sentence Builder | `/games/sentence-builder` | ✅ WORKING |
| Sentence Match | `/games/sentence-match` | ✅ WORKING |
| Combined I Spy | `/games/combined-i-spy` | ✅ WORKING |
| Beginning Sounds | `/games/sound-games/beginning` | ✅ WORKING |
| Middle Sounds | `/games/sound-games/middle` | ✅ WORKING |
| Ending Sounds | `/games/sound-games/ending` | ✅ WORKING |

### Audio Status
- Letter sounds (a-z): ✅ Working
- Word audio (26 game words): ✅ Recorded & deployed

---

## 👩‍🏫 TEACHER PORTAL (NEW - Jan 9)

### Features Built
- Simple login (Jasmine, Ivan, John, Richard, Liza, Michael, Tredoux)
- Password: `123`
- Dashboard with quick links
- Circle Time Planner (teacher view)
- English Guide access
- Teacher Notes Board (collaborative, per-week)

### Shared Database
- All teachers see all lesson documents
- All teachers see all notes
- Color-coded by teacher name
- Only author can delete their notes

### Current Issue
Middleware redirecting `/teacher` to `/auth/teacher` (Montree login)
Fix deployed: `a531ebc` - explicit early return for /teacher routes

---

## 👔 PRINCIPAL FLOW (NEEDS TESTING)

| Feature | Route | Status |
|---------|-------|--------|
| Principal Dashboard | `/admin/principal` | ❓ |
| Classroom Overview | `/admin/principal` | ❓ |
| Add Classroom | `/admin/principal/add-classroom` | ❓ |
| Classroom Detail | `/admin/principal/classroom/[id]` | ❓ |
| Student List | `/admin/principal/classroom/[id]` | ❓ |
| Teachers Management | `/admin/principal/classroom/[id]/teachers` | ❓ |
| Invite Teachers | Modal | ❓ |
| Role Switching | "Become Teacher" | ❓ |

---

## 🏫 MULTI-SCHOOL ARCHITECTURE

**Current Setup:**
- 4 school slots in system
- Beijing International linked to Whale classroom
- 22 kids seeded

**Needs Testing:**
- School picker flow
- Classroom → school relationships
- Role-based access

---

## Design Principles

1. **Teacher-first** - If it doesn't help the teacher, delete it
2. **Works offline** - PWA support for bad wifi
3. **One tap** - Progress tracking = one tap
4. **Montessori native** - Not adapted from traditional ed-tech
5. **Games match curriculum** - Digital + physical materials identical

---

## Technical Philosophy

- Claude writes ALL code
- Cursor copies, never generates
- Supabase for data
- Railway for hosting
- Handoff files for continuity
- VERIFY before deploy (learned the hard way)

---

## Key Files for Next Session

```
HANDOFF.md                 - Detailed session handoff
middleware.ts              - Route protection (teacher bypass)
app/teacher/page.tsx       - Simple teacher login
app/games/*/page.tsx       - All game routes
app/admin/principal/*      - Principal flow pages
```

---

*Updated: January 10, 2026 00:40*
*Next Session: Games Audit + Principal Flow Testing*
