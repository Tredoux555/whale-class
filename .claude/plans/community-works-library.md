# Montree Community Works Library — Implementation Plan

## Vision
A public, community-driven Montessori works database at `montree.xyz/library`. Teachers worldwide can browse, upload, and download Montessori works (activities/materials). Montree users get one-click "Send to My Classroom" injection via their teacher code.

**Growth engine:** Teachers discover the library via SEO/social → browse freely → see "inject into classroom" → sign up for Montree.

---

## Phase 1: Database + API Foundation

### New Database Table: `montree_community_works`

```sql
CREATE TABLE montree_community_works (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core work data
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('practical_life','sensorial','mathematics','language','cultural')),
  category TEXT,                          -- e.g. "Oral Language", "Number Operations"
  age_range TEXT DEFAULT 'all',           -- primary_year1, primary_year2, primary_year3, all

  -- Materials & guide
  materials JSONB DEFAULT '[]',           -- ["Sandpaper letters", "Tray", "Cloth"]
  direct_aims JSONB DEFAULT '[]',
  indirect_aims JSONB DEFAULT '[]',
  control_of_error TEXT,
  prerequisites JSONB DEFAULT '[]',       -- titles of prerequisite works

  -- AI-generated guide (admin-triggered)
  ai_guide JSONB,                         -- { steps: [...], tips: [...], variations: [...] }
  ai_guide_generated_at TIMESTAMPTZ,

  -- Media (photos, videos, PDFs)
  media JSONB DEFAULT '[]',               -- [{ type, storage_path, thumbnail_path, caption }]

  -- Contributor info
  contributor_name TEXT NOT NULL,
  contributor_school TEXT,                 -- optional
  contributor_country TEXT,               -- optional
  contributor_teacher_id UUID,            -- FK to montree_teachers if they're a Montree user

  -- Links to standard curriculum
  standard_work_id TEXT,                  -- e.g. "la_sandpaper_letters" if enhancing existing
  is_variation BOOLEAN DEFAULT false,     -- true if it's a variation of a standard work

  -- Moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','flagged')),
  admin_notes TEXT,

  -- Stats
  download_count INTEGER DEFAULT 0,
  inject_count INTEGER DEFAULT 0,         -- times injected into Montree classrooms
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_community_works_area ON montree_community_works(area);
CREATE INDEX idx_community_works_status ON montree_community_works(status);
CREATE INDEX idx_community_works_standard_work ON montree_community_works(standard_work_id);
CREATE INDEX idx_community_works_created ON montree_community_works(created_at DESC);
```

### New Storage Bucket
- `community-works` in Supabase Storage (public read, auth write)
- Path structure: `{work_id}/photos/{filename}`, `{work_id}/videos/{filename}`, `{work_id}/pdfs/{filename}`

---

## Phase 2: Public Browse Page

### Route: `/montree/library` (NO auth required)

**Layout:**
- Hero section: "The Montessori Works Library — By Teachers, For Teachers"
- 5 area filter tabs (P/S/M/L/C) with AREA_CONFIG colors
- Search bar (search title, description, materials)
- Age range filter pills
- Sort: Newest / Most Downloaded / Most Injected
- Grid of work cards

**Work Card (collapsed):**
- Thumbnail photo (first uploaded image)
- Title + area badge (colored circle)
- Age range pill
- Contributor name + country flag
- Download count + inject count
- "View" button

**Work Detail (expanded/modal):**
- Full photo gallery (swipeable)
- Video embed if present
- Description, materials list, aims, control of error
- AI-generated step-by-step guide (if available)
- PDF attachments (downloadable)
- **"Download" button** — always visible, no login needed
- **"Send to My Classroom" button** — prompts for teacher code if not logged in

**SEO:** Each work gets a proper `<title>` and `<meta description>` for Google indexing.

---

## Phase 3: Upload System

### Route: `/montree/library/upload` (login required OR simple name/email form)

**Two upload paths:**
1. **Montree teacher (logged in):** Auto-fills contributor info from session
2. **External teacher (not logged in):** Simple form — name, school (optional), country, email

**Upload Form:**
1. Title (required)
2. Area picker (5 colored buttons — P/S/M/L/C)
3. Category (text input or dropdown of existing categories for that area)
4. Age range (Year 1 / Year 2 / Year 3 / All Ages)
5. Description (rich text area)
6. Materials needed (tag-style input)
7. Direct aims, indirect aims (tag-style)
8. Control of error (text)
9. **Media upload zone** (drag & drop):
   - Photos (compress client-side, max 5MB each, up to 10)
   - Videos (max 50MB, up to 2)
   - PDFs (max 10MB, up to 3)
10. "Is this a variation of an existing work?" → dropdown of 329 standard works
11. Submit → status: 'pending' (needs admin approval)

### API Routes:
- `POST /api/montree/community/works` — create new work (with media upload)
- `POST /api/montree/community/works/[id]/media` — add media to existing work
- `GET /api/montree/community/works` — public browse (with filters, pagination)
- `GET /api/montree/community/works/[id]` — single work detail

---

## Phase 4: "Send to My Classroom" (The Magic Button)

### Flow:
1. Teacher clicks "Send to My Classroom" on any work
2. Modal appears: "Enter your Montree teacher code"
3. Teacher enters 6-char code
4. API validates code → finds teacher → finds their classroom
5. Work is injected into their `montree_classroom_curriculum_works` table
6. Confirmation: "✅ Added to your Language curriculum!"
7. `inject_count` incremented on the community work

### API Route:
- `POST /api/montree/community/works/[id]/inject`
  - Body: `{ teacher_code: "ABC123" }`
  - Validates teacher code against `montree_teachers`
  - Creates work entry in `montree_classroom_curriculum_works` with `is_custom: true`
  - Copies all metadata (description, materials, aims, etc.)
  - Returns success with area name

**No full login required** — just the teacher code. This is intentionally low-friction.

---

## Phase 5: Admin Panel (For Tredoux)

### Route: `/montree/super-admin/community` (password-protected)

**Features:**
1. **Moderation queue** — pending works with approve/reject/flag buttons
2. **Work detail view** — see all uploaded content
3. **"Generate AI Guide" button** — triggers Claude Haiku to create:
   - Step-by-step presentation guide
   - Tips for the teacher
   - Common mistakes to avoid
   - Variations and extensions
   - Materials sourcing suggestions
4. **Edit any work** — fix descriptions, add missing info
5. **Stats dashboard** — total works, uploads this week, top contributors, most downloaded

### AI Guide Generation:
- Uses Haiku (cheap: ~$0.001/guide)
- Prompt includes: work title, description, materials, area, age range, photos (described)
- Output: structured JSON stored in `ai_guide` column
- Admin can edit the generated guide before publishing

---

## Phase 6: Daily Backup System

### Approach: Supabase pg_dump cron

```sql
-- Nightly backup of community_works table
-- Option A: Supabase scheduled function
-- Option B: Railway cron job running pg_dump
-- Option C: Supabase point-in-time recovery (already included)
```

**Practical approach:**
- Supabase already has point-in-time recovery on paid plans
- Additionally: nightly export of `montree_community_works` to JSON, stored in Supabase Storage as `backups/community-works-{date}.json`
- Keeps last 30 daily backups
- API route: `POST /api/montree/community/backup` (admin-only, also triggerable via cron)

---

## File Summary

### New Files (~15):
```
migrations/132_community_works.sql

app/montree/library/page.tsx                         -- Public browse
app/montree/library/[workId]/page.tsx                -- Work detail
app/montree/library/upload/page.tsx                  -- Upload form
app/montree/library/layout.tsx                       -- Public layout (no auth)

app/api/montree/community/works/route.ts             -- GET (browse) + POST (create)
app/api/montree/community/works/[id]/route.ts        -- GET (detail) + PATCH (admin edit)
app/api/montree/community/works/[id]/inject/route.ts -- POST (send to classroom)
app/api/montree/community/works/[id]/media/route.ts  -- POST (upload media)
app/api/montree/community/works/[id]/guide/route.ts  -- POST (generate AI guide)
app/api/montree/community/backup/route.ts            -- POST (nightly backup)

app/montree/super-admin/community/page.tsx           -- Admin moderation panel

components/montree/community/WorkCard.tsx             -- Reusable work card
components/montree/community/InjectModal.tsx          -- "Send to My Classroom" modal
components/montree/community/UploadForm.tsx           -- Upload form component
```

### Modified Files (~3):
```
middleware.ts                -- Add /montree/library to public paths (if needed)
app/montree/library/layout.tsx -- No auth wrapper
app/montree/super-admin/page.tsx -- Add Community Library card
```

---

## Build Order

| Step | What | Est. Time |
|------|------|-----------|
| 1 | Migration + storage bucket | 15 min |
| 2 | Browse API (GET with filters/pagination) | 30 min |
| 3 | Public browse page (cards, filters, search) | 1.5 hr |
| 4 | Work detail page (gallery, guide, download) | 1 hr |
| 5 | Upload API + form page | 1.5 hr |
| 6 | "Send to My Classroom" inject API + modal | 45 min |
| 7 | Admin moderation panel | 1 hr |
| 8 | AI guide generation endpoint | 30 min |
| 9 | Backup system | 30 min |
| **Total** | | **~7.5 hours** |

---

## Key Design Decisions

1. **Teacher code for injection, not full login** — lowest friction possible. Teacher already has the code memorized.
2. **Pending → Approved moderation** — prevents spam/garbage from going live immediately.
3. **AI guides are admin-triggered** — you control quality and cost.
4. **Public SEO-friendly pages** — each work is indexable by Google.
5. **Standard work linking** — variations of existing works link back, creating a rich knowledge graph.
6. **Daily JSON backups** — in addition to Supabase's built-in recovery, gives you portable exports.
