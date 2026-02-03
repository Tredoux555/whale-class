# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 14 app with two systems:
- **Whale Class** (`/admin/*`) - Mock data, not connected to database
- **Montree** (`/montree/*`) - Real SaaS multi-tenant school management

---

## 🎯 CURRENT STATUS (Feb 3, 2026)

**✅ DEPLOYED - All changes pushed to main**

Git push successful: `3b82f1f..da4b224 main -> main`

### ⚠️ REQUIRED: Add Environment Variable
In Railway dashboard (NOT terminal), add:
- **Variable:** `SUPER_ADMIN_PASSWORD`
- **Value:** A secure password of your choice

---

### Latest Session (Feb 3, 2026)

#### 🔒 Security Audit & Hardening (22 vulnerabilities fixed)
- **Parent routes (8 fixed):** Added session auth + ownership verification to children, announcements, milestones, photos, stats, reports routes
- **Admin routes (7 fixed):** Added auth to backfill-curriculum, backfill-guides, reseed-curriculum, import routes; fixed query parameter bypass in reports
- **Teacher routes (4 fixed):** Fixed student ID enumeration, added school verification
- **Super admin:** Removed hardcoded password, now uses `SUPER_ADMIN_PASSWORD` env var
- **Child endpoint:** Added authentication to `/api/montree/children/[childId]`

#### 🐛 Critical Bugs Fixed
1. **Report Photo Bug:** Teacher-selected photos now properly show in parent view
   - Fixed: `reports/send/route.ts` and `parent/report/[reportId]/route.ts`
   - Now queries `montree_report_media` junction table first, falls back to date range

2. **Description Cross-Area Mismatch:** "Primary Phonics - Mac and Tab" no longer matches "Carrying a Table"
   - Fixed: Area-constrained matching in `findBestDescription()`
   - Custom works (work_key starts with `custom_`) don't auto-match descriptions

#### ✨ New Features
- **Description Generator API:** `/api/montree/curriculum/generate-description` - Template-based descriptions for custom works
- **Description Review UI:** `/admin/description-review` - Wheel picker to review/edit all work descriptions
- **English Teaching Guides:** PDF downloads added to admin page
- **Montessori Materials List:** Comprehensive shopping/creation list
  - PDF: `/public/guides/Montessori-English-Materials-List.pdf`
  - Word: `/public/guides/Montessori-English-Materials-List.docx`
  - Totals: 337 pictures, 1011 three-part cards, 115 physical objects
  - Available at: `teacherpotato.xyz/admin`

### Previous Session Fixes
- Parent portal working
- Migration 095 applied
- Debug endpoint available

---

## 🔐 Parent Auth System

### How It Works
```
Teacher: Clicks "Invite Parent" → API generates 6-char code → Saved to montree_parent_invites
Parent: Enters code at /montree/parent → API validates → Sets cookie → Redirects to dashboard
```

### Database Tables
```sql
montree_parent_invites (
  id UUID PRIMARY KEY,
  child_id UUID REFERENCES montree_children(id),
  invite_code TEXT UNIQUE,  -- e.g., "ABC123"
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ    -- 30 days from creation
)
```

### Key API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/montree/invites` | POST | Generate invite code |
| `/api/montree/parent/auth/access-code` | POST | Validate code, create session |
| `/api/montree/debug/parent-link` | GET | Debug: trace code→child linkage |

### Key Files
- `app/api/montree/invites/route.ts` - Code generation
- `app/api/montree/parent/auth/access-code/route.ts` - Code validation
- `app/montree/parent/page.tsx` - Parent login page

---

## 🗄️ Database

### Supabase Project
- URL: `https://dmfncjjtsoxrnvcdnvjq.supabase.co`
- Both localhost and production use THIS SAME database

### Key Tables
- `montree_schools` - Schools
- `montree_classrooms` - Classrooms
- `montree_children` - Students
- `montree_teachers` - Teachers
- `montree_works` - Curriculum works
- `montree_child_work_progress` - Progress tracking
- `montree_parent_invites` - Parent invite codes ← NEW

### Whale Class Data
- Classroom ID: `945c846d-fb33-4370-8a95-a29b7767af54`
- 20 students: Amy, Austin, Eric, Gengerlyn, Hayden, Henry, Jimmy, Joey, Kayla, Kevin, KK, Leo, Lucky, MaoMao, MingXi, NiuNiu, Rachel, Segina, Stella, YueZe

---

## 🚀 Deployment

### Railway
- Auto-deploys on push to `main`
- Production URL: `https://teacherpotato.xyz`

### Environment Variables (Railway)
```
NEXT_PUBLIC_SUPABASE_URL=https://dmfncjjtsoxrnvcdnvjq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
ADMIN_PASSWORD=...
```

---

## 📱 Key Routes

### Teacher Portal
| Route | Purpose |
|-------|---------|
| `/montree/dashboard` | Class list |
| `/montree/dashboard/[childId]` | Child week view |
| `/montree/dashboard/[childId]/progress` | All works |
| `/montree/dashboard/capture` | Photo/video capture |

### Parent Portal
| Route | Purpose |
|-------|---------|
| `/montree/parent` | Login (enter code) |
| `/montree/parent/dashboard` | Parent home |
| `/montree/parent/photos` | Child's photos |
| `/montree/parent/milestones` | Progress timeline |

---

## 🐛 Debug Tools

### Parent Link Debug
```
GET /api/montree/debug/parent-link?code=ABC123
```
Returns: invite data, child lookup result, sample children

### Supabase SQL Editor
Direct database queries at: https://supabase.com/dashboard

---

## 🔐 Security Architecture

### Parent Authentication
- Session stored in `montree_parent_session` cookie (base64 encoded JSON)
- Contains: `child_id`, `invite_id`
- All parent routes use `getAuthenticatedSession()` helper
- Ownership verified: requested child must match session's child_id

### Admin/Teacher Authentication
- Uses `x-school-id` header for school context
- Service role key used (bypasses Supabase RLS)
- School ownership verified before data access

### Security Patterns Applied
```typescript
// Parent routes pattern:
const session = await getAuthenticatedSession();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
if (session.childId !== requestedChildId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

// Admin routes pattern:
const schoolId = request.headers.get('x-school-id');
if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

---

## 🧠 Guru System (AI Teacher Advisor)

### Overview
AI advisor that helps teachers with child development questions, tracking the full 3-year Montessori journey.

### Database Tables
- `montree_guru_interactions` - Conversation history with follow-up tracking
- `montree_child_mental_profiles` - Temperament, learning style, sensitive periods
- `montree_behavioral_observations` - ABC model tracking
- `montree_child_patterns` - Detected developmental patterns

### Key Files
- `/lib/montree/guru/context-builder.ts` - Builds child context for AI
- `/lib/montree/guru/knowledge-retrieval.ts` - Retrieves Montessori knowledge
- `/app/api/montree/guru/route.ts` - Main Guru API endpoint

### Context Gathered
- Child basic info + age
- Mental profile (temperament, learning modality)
- Current work progress (last 30 works)
- Recent observations (last 10)
- Past Guru interactions (last 5)
- Teacher notes from work sessions

---

## 📸 Report & Photo System

### Junction Tables (Important!)
- `montree_report_media` - Links reports to selected photos
- `montree_media_children` - Links group photos to multiple children

### Photo Selection Flow
```
Teacher Preview → Select Photos → Saved to montree_report_media junction table
Publish Report → send/route.ts queries junction table → Creates final report
Parent View → parent/report/[id]/route.ts queries junction table → Shows selected photos
```

### Key Fix Applied
Both `send/route.ts` and `parent/report/[reportId]/route.ts` now:
1. FIRST query `montree_report_media` junction table for explicitly selected photos
2. FALLBACK to date-range query for backwards compatibility

---

## 📝 Description Matching System

### How It Works
Parent reports show descriptions for works. System matches work names to curriculum guides.

### Key Fix: Area-Constrained Matching
```typescript
// OLD (broken): "Tab" matched "Table" across areas
if (guideWord.includes(word) || word.includes(guideWord))

// NEW (fixed): Must match area + whole-word matching
if (normalizeArea(desc.area) !== normalizedWorkArea) continue;
if (word === guideWord) score += 3;  // Exact word match
```

### Custom Works
- Identified by `work_key` starting with `custom_`
- Do NOT auto-match to standard curriculum descriptions
- Use description generator or manual entry

---

## 📋 Known Issues

1. **PWA icons not linked** - Icons exist in `/public/montree-parent/` but manifest not added to layout
2. **Email sending not tested** - Resend integration ready but not verified
3. **Guru UI access** - Currently only at `/montree/dashboard/guru`, should be accessible from child profiles too

---

## 🔧 Local Development

```bash
cd ~/whale
npm run dev
# Access at http://localhost:3000
```

Both local and production connect to the SAME Supabase database.

---

## 📁 Key Files Modified (Feb 3, 2026 Session)

### Security Fixes
| File | Change |
|------|--------|
| `api/montree/super-admin/login-as/route.ts` | Uses env var for password |
| `api/montree/children/[childId]/route.ts` | Added auth checks |
| `api/montree/parent/children/route.ts` | Added session auth |
| `api/montree/parent/announcements/route.ts` | Added session auth + ownership |
| `api/montree/parent/milestones/route.ts` | Added session auth + ownership |
| `api/montree/parent/photos/route.ts` | Added session auth + ownership |
| `api/montree/parent/stats/route.ts` | Added session auth + ownership |
| `api/montree/parent/report/[reportId]/route.ts` | Added session auth + ownership |
| `api/montree/parent/reports/route.ts` | Improved auth |
| `api/montree/parent/dashboard/route.ts` | Removed test bypass |
| `api/montree/admin/backfill-curriculum/route.ts` | Added auth |
| `api/montree/admin/backfill-guides/route.ts` | Added auth |
| `api/montree/admin/reseed-curriculum/route.ts` | Added auth |
| `api/montree/admin/import/route.ts` | Early auth check |
| `api/montree/admin/reports/route.ts` | Fixed query param bypass |
| `api/montree/admin/teachers/[teacherId]/route.ts` | Added school verification |
| `api/weekly-planning/list/route.ts` | Added auth |
| `api/weekly-planning/child-detail/route.ts` | Added auth |

### Bug Fixes
| File | Change |
|------|--------|
| `api/montree/reports/send/route.ts` | Query junction table for photos |
| `api/montree/parent/report/[reportId]/route.ts` | Query junction table + fix description matching |

### New Features
| File | Purpose |
|------|---------|
| `api/montree/curriculum/generate-description/route.ts` | Generate descriptions for custom works |
| `app/admin/description-review/page.tsx` | UI to review/edit work descriptions |
| `api/montree/curriculum/update/route.ts` | Added parent_description, why_it_matters fields |
| `app/admin/page.tsx` | Added Description Review tool + Materials List downloads |
| `public/guides/Montessori-English-Materials-List.pdf` | Shopping list PDF (337 pics, 1011 cards, 115 objects) |
| `public/guides/Montessori-English-Materials-List.docx` | Editable Word version of materials list |

---

## 📋 HANDOFF: Next Steps

### ✅ COMPLETED (Feb 3, 2026)
- [x] Security audit - 22 vulnerabilities fixed
- [x] Photo bug - Junction table queries fixed
- [x] Description mismatch - Area-constrained matching
- [x] Materials list - PDF and DOCX created with exact quantities
- [x] Git push - Successful: `3b82f1f..da4b224`

### 🔴 IMMEDIATE ACTION REQUIRED
1. **Add SUPER_ADMIN_PASSWORD in Railway:**
   - Go to railway.app → Your project → Variables tab
   - Add: `SUPER_ADMIN_PASSWORD` = `YourSecurePassword123!`
   - Railway will auto-redeploy

### 🔍 VERIFY AFTER DEPLOY
2. **Test materials downloads** - Visit `teacherpotato.xyz/admin` and download PDF/Word files
3. **Test parent portal** - Verify selected photos show in parent view
4. **Test super-admin** - Login should use the new env var password

### Short-term Features
5. **Guru enhancement** - Add Guru access button to child profile pages
6. **3-year journey view** - Timeline visualization of child's development
7. **Pattern detection** - Auto-detect developmental patterns over time

### Security Recommendations (Optional)
8. Implement session expiration/refresh
9. Add rate limiting to auth endpoints
10. Consider signed session tokens (JWT) instead of base64

---

## 📦 Materials List Summary

Created comprehensive Montessori English materials list for the complete Pink/Blue/Green reading program:

| Category | Count | Notes |
|----------|-------|-------|
| Pictures/Images | 337 | For phonogram cards and reading materials |
| 3-Part Cards | 1,011 | Object + Label + Control cards |
| Physical Objects | 115 | Miniatures and real objects |

**Files Location:**
- PDF: `/public/guides/Montessori-English-Materials-List.pdf`
- Word: `/public/guides/Montessori-English-Materials-List.docx`

**Objects Needing Duplicates (17):** bat, box, bun, cap, cat, cup, fan, fox, hat, hen, log, matdb, mop, nut, pan, pen, pig, pot, rat, rug, sun, van, wig (for matching exercises)
