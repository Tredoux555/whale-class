# Handoff: Universal Search Bars + Voice Observation Bug (Mar 5, 2026)

## 1. Universal Search Bars — Feature Request

**Goal:** Every page where a user browses children or works should have a search/filter bar.

### What Already Has Search

| Page | Component | Notes |
|------|-----------|-------|
| `/montree/dashboard/curriculum` | `WorkSearchBar` | Works search by name (EN+ZH), debounced, keyboard nav |
| `/montree/dashboard/[childId]` (week view) | `WorkSearchBar` | Same component, used before adding works |
| `/montree/library/browse` | Custom inline search | Search + 5 area tabs, filters by title/description/materials |

### Pages Needing Search — Children

| Page | File | What's Displayed | Search Needed |
|------|------|-----------------|---------------|
| **Dashboard** | `app/montree/dashboard/page.tsx` | Child cards in grid | Name search (useful when 15+ kids) |
| **Students** | `app/montree/dashboard/students/page.tsx` | Bulk student add/edit form | Name search within list |
| **RAZ Tracker** | `app/montree/dashboard/raz/page.tsx` | All children with photo slots | Name search to quickly find a specific child |
| **Admin Students** | `app/montree/admin/students/page.tsx` | All students across classrooms | Already has classroom filter tabs. **Add name search within tab.** |
| **Admin Classroom Detail** | `app/montree/admin/classrooms/[classroomId]/page.tsx` | Teachers + students in one classroom | Name search for large classrooms |
| **Voice Observation Review** | `app/montree/dashboard/voice-observation/page.tsx` | Extraction cards with student names | Student name search to find specific observations |

### Pages Needing Search — Works

| Page | File | What's Displayed | Search Needed |
|------|------|-----------------|---------------|
| **WorkWheelPicker** | `components/montree/curriculum/WorkWheelPicker.tsx` | Works within a single area (used in week view) | Filter works within the picker |
| **WorkPickerModal** | `components/montree/child/WorkPickerModal.tsx` | All works to add to a child | Search by work name (currently just lists) |
| **FocusWorksSection** | `components/montree/child/FocusWorksSection.tsx` | Child's focus works (expanded view) | Maybe not needed — focus works are a small curated list |

### Pages Needing Search — Other

| Page | File | What's Displayed | Search Needed |
|------|------|-----------------|---------------|
| **Admin Overview** | `app/montree/admin/page.tsx` | Classroom tiles | Classroom name search (useful with 5+ classrooms) |
| **Media/Gallery** | `app/montree/dashboard/media/page.tsx` | All classroom photos | Search by child name or date |
| **Library Tools** | `app/montree/library/tools/page.tsx` | Tool cards | Low priority — only ~10 tools currently |

### Implementation Approach

**Reusable `ChildSearchBar` component** — Model after existing `WorkSearchBar`:
- `components/montree/shared/ChildSearchBar.tsx`
- Props: `children: Child[]`, `onSelect: (child) => void`, `placeholder?: string`
- Features: debounced (150ms), dropdown results, keyboard nav, click-outside dismiss
- Search by: `name` (English + Chinese if chineseName exists)

**For works:** The `WorkSearchBar` component already exists. Wire it into pages that currently lack it.

**For children on dashboard/RAZ/admin:** Create a simple text filter that sits above the list and filters `children` array client-side. No API call needed — all children are already loaded.

**Simplest approach per page:**
```tsx
const [searchTerm, setSearchTerm] = useState('');
const filtered = children.filter(c =>
  c.name.toLowerCase().includes(searchTerm.toLowerCase())
);
// Then render `filtered` instead of `children`
```

Add a styled search input at the top of each list. Keep it consistent across all pages — same height, border radius, placeholder style.

### Priority Order
1. **RAZ Tracker** — most urgent, teachers scroll through 20 kids to find one
2. **Dashboard** — main landing page, quick access to specific child
3. **Admin Students** — name search within classroom tab
4. **WorkPickerModal / WorkWheelPicker** — make work selection faster
5. **Admin Overview** — classroom search
6. **Everything else** — lower priority

---

## 2. Voice Observation — Recording Not Working

**Bug:** Voice recording is not functioning. Needs investigation after chat refresh.

**Relevant files:**
- `app/montree/dashboard/voice-observation/page.tsx` — Main page (6-state machine: idle→recording→paused→processing→review→committed)
- `components/montree/voice/VoiceObservationRecorder.tsx` — Recording UI component
- `components/montree/voice/VoiceObservationProgress.tsx` — Processing progress UI
- `components/montree/voice/VoiceObservationReview.tsx` — Review + commit UI
- `components/montree/voice/ExtractionCard.tsx` — Individual extraction display
- `lib/montree/voice/audio-processor.ts` — Whisper transcription orchestrator
- `lib/montree/voice/observation-analyzer.ts` — Haiku tool_use analysis
- `lib/montree/voice/student-matcher.ts` — Jaro-Winkler name matching
- `lib/montree/voice/prompts.ts` — Haiku system prompt
- 9 API routes under `app/api/montree/voice-observations/`: start, upload, pause, end, status, review, extraction/[extractionId], commit, history

**Things to check:**
1. Is the feature toggle enabled? Check `montree_classroom_features` for `voice_observations` being enabled for the school
2. Does the browser's MediaRecorder API work? (iOS Safari needs 18.4+ for WebM/Opus)
3. Are the API routes returning errors? Check browser console + network tab
4. Is the `voice-obs` private storage bucket created in Supabase? (migration 135 should have created it)
5. Does the `start` API route create a session correctly?
6. Does the `upload` API route receive and process audio chunks?
7. Is `OPENAI_API_KEY` set in Railway? (needed for Whisper transcription)
8. Is `ANTHROPIC_API_KEY` set? (needed for Haiku analysis)

**Migration dependency:** Migrations 134 (feature toggles) and 135 (voice observation tables + storage bucket) must both be run.

**Handoff for voice obs system:** `docs/handoffs/HANDOFF_VOICE_OBSERVATION_SYSTEM_MAR4.md`

---

## 3. Also Deployed This Session

- **RAZ photo upload bug fix** — `app/api/montree/raz/upload/route.ts` changed from `child-photos` bucket (doesn't exist/not public) to `montree-media` (working bucket used everywhere else). Pushed + deployed.

- **AMI English Language Progression document** — `generate-ami-language-doc.js` comprehensively rewritten (1190 lines, all 43 works). Audited and fixed: numbered list restart bug (17 lists), Grammar Box ordering mismatch with curriculum JSON, unused imports removed, VerticalAlign enum fix. Run `node generate-ami-language-doc.js` to generate `AMI_English_Language_Progression.docx`.
