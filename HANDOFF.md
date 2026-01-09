# WHALE HANDOFF - January 10, 2026
## Session: Teacher Portal, Document Upload, Bug Fixes

---

## 🔴 CRITICAL ISSUES TO FIX TOMORROW

### 1. Teacher Login Portal - BLOCKED
**Problem:** `/teacher` redirects to `/auth/teacher` (Montree login) instead of simple login
**Root Cause:** Unknown - middleware has correct code but Railway may not be deploying properly
**Latest Commit:** `a531ebc fix: FORCE /teacher to bypass all middleware`
**Action Required:** 
- Wait for Railway deployment
- If still broken, check Railway build logs
- Test: `teacherpotato.xyz/teacher` should show 🐋 with teacher name dropdown (Jasmine, Ivan, John, Richard, Liza, Michael, Tredoux)
- Password: `123`

### 2. Lesson Document Upload - 500 Error
**Problem:** Upload fails at `/api/lesson-documents/upload`
**Root Cause:** Storage bucket `lesson-documents` may not exist in Supabase
**Action Required:**
- Create bucket in Supabase Dashboard → Storage → New Bucket
- Name: `lesson-documents`
- Public: Yes
- Add policies for INSERT, SELECT, DELETE with `true`

### 3. Video Flashcard Maker - 500 Error  
**Problem:** yt-dlp failing to download YouTube videos
**Root Cause:** yt-dlp version outdated (YouTube changes frequently)
**Fix Applied:** Updated Dockerfile to install latest yt-dlp from GitHub releases
**Action Required:** Verify Railway rebuilt with new Dockerfile

### 4. Vocabulary Flashcard Generator - Partial Match
**Problem:** Only matching 2/10 images to vocabulary words
**Status:** Needs investigation - worked before, no code changes found
**Action Required:** Test with exact filename matches (e.g., `winter.jpg` for word "winter")

### 5. 3-Part Card Generator - Picture Card Sizing
**Problem:** Picture card preview not matching Control card size
**Fix Applied:** Changed `aspectRatio: '1'` to explicit `width: 92px; height: 92px`
**Status:** Should be fixed after deploy

---

## ✅ COMPLETED THIS SESSION

### Teacher Portal System (NEW)
| Component | Path | Status |
|-----------|------|--------|
| Simple Login Page | `/app/teacher/page.tsx` | Created ✅ |
| Dashboard | `/app/teacher/dashboard/page.tsx` | Created ✅ |
| Circle Planner | `/app/teacher/circle-planner/page.tsx` | Created ✅ |
| English Guide | `/app/teacher/english-guide/page.tsx` | Created ✅ |
| Layout | `/app/teacher/layout.tsx` | Created ✅ |

**Teachers:** Jasmine, Ivan, John, Richard, Liza, Michael, Tredoux
**Password:** `123` (shared)
**Auth:** localStorage (teacherName key)

### Teacher Notes Board (NEW)
| Component | Path | Status |
|-----------|------|--------|
| Notes Component | `/components/circle-time/TeacherNotes.tsx` | Created ✅ |
| List API | `/app/api/teacher-notes/list/route.ts` | Created ✅ |
| Add API | `/app/api/teacher-notes/add/route.ts` | Created ✅ |
| Delete API | `/app/api/teacher-notes/delete/route.ts` | Created ✅ |
| Migration | `/migrations/021_teacher_notes_and_auth.sql` | Created ✅ |

**Features:**
- Per-week notes (all teachers see all notes)
- Color-coded by teacher name
- Only author can delete their own notes
- Integrated into Circle Time Planner

### Homepage Updates
- Added 👩‍🏫 Teacher button (cyan) next to Games and Admin

---

## 📋 TOMORROW'S PRIORITIES

### Priority 1: Fix Blocking Issues
1. **Verify Teacher Login works** (after Railway deploy)
2. **Create lesson-documents bucket** in Supabase
3. **Test document upload** at Circle Time Planner

### Priority 2: Games Audit & Polish
Run through each game and test functionality:

| Game | Route | Test Status |
|------|-------|-------------|
| Beginning Sounds | `/games/beginning-sounds` | ❓ |
| Ending Sounds | `/games/ending-sounds` | ❓ |
| Combined I Spy | `/games/combined-i-spy` | ❓ |
| Word Builder | `/games/word-builder` | ❓ |
| Phonogram Match | `/games/phonogram-match` | ❓ |
| Sight Words | `/games/sight-words` | ❓ |
| Vocabulary Builder | `/games/vocabulary-builder` | ❓ |
| Object Box | `/games/object-box` | ❓ |
| Grammar Symbols | `/games/grammar-symbols` | ❓ |

**Known Issues:** User reported "many games are not functional"

### Priority 3: Principal Flow Testing
| Page | Route | Test Status |
|------|-------|-------------|
| Principal Dashboard | `/admin/principal` | ❓ |
| Classroom Detail | `/admin/principal/classroom/[id]` | ❓ |
| Teachers Management | `/admin/principal/classroom/[id]/teachers` | ❓ |
| Add Classroom | `/admin/principal/add-classroom` | ❓ |

### Priority 4: Multi-School Architecture
- Test school picker flow
- Verify classroom → school relationships
- Test "become teacher" role switching

---

## 🗂️ DATABASE STATUS

### Tables Needing Creation (Run in Supabase SQL Editor)
```sql
-- Teacher Notes (if not created)
CREATE TABLE IF NOT EXISTS teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  teacher_name VARCHAR(100) NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lesson Documents (if not created)
CREATE TABLE IF NOT EXISTS lesson_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  public_url TEXT NOT NULL,
  description TEXT,
  uploaded_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Storage Buckets Needed
- `lesson-documents` - Public bucket for Circle Time Planner uploads

---

## 🛤️ RAILWAY DEPLOYMENT

**Latest Commits (not yet verified deployed):**
1. `a531ebc` - FORCE /teacher to bypass all middleware
2. `96268d3` - restore simple teacher login
3. `6098017` - update yt-dlp to latest version
4. `d1728ad` - add Teacher login button to homepage
5. `a5ff83e` - card preview sizing fix

**Check Railway Dashboard:**
- Verify latest deployment shows commit `a531ebc`
- Check build logs for any errors
- If stuck, trigger manual redeploy

---

## 📁 KEY FILES MODIFIED THIS SESSION

```
middleware.ts                           (teacher bypass)
app/page.tsx                           (teacher button)
app/teacher/page.tsx                   (simple login)
app/teacher/dashboard/page.tsx         (teacher dashboard)
app/teacher/circle-planner/page.tsx    (teacher view)
app/teacher/english-guide/page.tsx     (teacher view)
app/teacher/layout.tsx                 (no auth layout)
components/circle-time/TeacherNotes.tsx
app/api/teacher-notes/list/route.ts
app/api/teacher-notes/add/route.ts
app/api/teacher-notes/delete/route.ts
app/api/lesson-documents/upload/route.ts (debug logging)
app/admin/card-generator/page.tsx      (sizing fix)
Dockerfile                             (yt-dlp update)
migrations/021_teacher_notes_and_auth.sql
```

---

## 🎯 STRATEGY FOR TOMORROW

### Morning (Fix Critical)
1. Check Railway deployment status
2. Test teacher login at `/teacher`
3. Create Supabase bucket if needed
4. Test document upload

### Afternoon (Audit & Polish)
1. Open multiple Claude browser tabs
2. Systematically test each game
3. Document what's broken vs working
4. Fix issues one by one

### Evening (Principal Flow)
1. Test principal dashboard
2. Test classroom management
3. Test teacher invites
4. Test role switching

---

*Updated: January 10, 2026 00:35*
*Next Session: Games Audit + Principal Flow Testing*
