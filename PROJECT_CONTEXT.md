# MONTESSORI TREE - Master Project Document

## 🧠 CLAUDE: READ THIS FIRST EVERY SESSION

This document serves as persistent memory for Claude. Read this entire document at the start of every session to understand:
1. What the project is
2. What has been completed
3. What needs to be done next
4. Technical decisions made

---

## PROJECT OVERVIEW

**Project Name:** Montessori Tree
**Owner:** Tredoux (Kindergarten teacher, Chinese ESL learners ages 2-6)
**Start Date:** December 19, 2025

### Vision
A comprehensive, autonomous Montessori classroom system that:
1. Provides a complete interactive curriculum tree (all 5 areas, all works, all difficulty levels)
2. Guides children through the curriculum via RFID bracelets or dedicated devices
3. Shows real-time progress to teachers via dashboard
4. Generates automated reports (daily/weekly/monthly)
5. Links materials to commerce (purchase or print)
6. Integrates with Jeffy Commerce for 1688 sourcing

### Target Users
- Schools (subscription + materials)
- Parents with no Montessori knowledge
- Montessori educators
- Selling from China globally via app stores

### Age Ranges
- **Phase 1:** 0-3 years (Infant/Toddler)
- **Phase 2:** 3-6 years (Primary/Casa)

### Language
- Primary: English
- Future: Chinese localization

---

## TECHNICAL STACK

### Decision Log

| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Database | Supabase vs Railway | TBD - Need to evaluate | Dec 19, 2025 |
| Frontend | Next.js | Tredoux expertise | Dec 19, 2025 |
| Tree Visualization | React Flow or D3.js | Skill tree/flowchart style | Dec 19, 2025 |
| Mobile | React Native or Capacitor | App store deployment | TBD |
| IDE | Cursor | Tredoux preference | Dec 19, 2025 |

### UI / Design System (added 2026-08-10)
The Montree button design is **LOCKED IN**: "Soft Elevation" (chosen by Tredoux from a
3-option proof), rolled out to ~2,000 buttons app-wide. Lives in `app/globals.css` (`.btn`
+ `--mt-*` tokens) and `tailwind.config.ts`. All future buttons/CTAs use
`btn btn-<variant> btn-<size>` — never hand-rolled styling. Canonical spec:
`docs/design/MONTREE_DESIGN_SYSTEM.md`; conversion rules: `docs/design/CONVERSION_GUIDE.md`.
Separate protected brands (PSS/Potato Snaps, Montree Home, funnel pages, kids' games,
personal platform, Milestones child screens) keep their own systems — see the spec's §4.

### Database Discussion (PENDING)
Tredoux asked: "Should we use Railway instead of Supabase?"

**Supabase Pros:**
- Already using it for Whale platform
- Built-in auth, real-time subscriptions
- PostgreSQL under the hood
- Free tier generous

**Railway Pros:**
- More flexible deployment
- Better for complex backend services
- Can run any Docker container

**RECOMMENDATION:** Start with Supabase for consistency with existing projects. Can migrate later if needed.

---

## PROJECT PHASES

### Phase 1: Montessori Tree Foundation ✅ IN PROGRESS
**Status:** Step 1 Complete
**Goal:** Complete curriculum database + interactive visualization

#### Step 1: Curriculum Data Structure ✅ COMPLETE
- Created comprehensive JSON database of ALL Montessori works
- Covers 0-3 (Toddler) and 3-6 (Primary) age ranges
- All 5 areas: Practical Life, Sensorial, Math, Language, Cultural
- Includes difficulty levels, sequences, prerequisites
- Video placeholder structure for YouTube links

#### Step 2: Interactive Tree UI (NEXT)
- React Flow implementation
- Zoomable/pannable interface
- 5 base "roots" growing upward
- Click to expand work details
- Video modal integration

#### Step 3: YouTube Video Linking
- Search integration for presentation videos
- Manual override capability
- Video player modal

### Phase 2: Child Tracking System
- RFID bracelet integration OR
- Dedicated child device (tablet/phone style)
- Work assignment and tracking
- Progress database

### Phase 3: Teacher Dashboard
- Real-time class overview
- One icon per child
- Click to see child's tree position
- Blinking current work + recommended next

### Phase 4: Automated Reports
- Daily summaries per child
- Weekly progress reports
- Monthly comprehensive reports
- Strengths, weaknesses, recommendations

### Phase 5: Materials Commerce
- Materials list per work
- Link to commerce site (Jeffy)
- 1688 product names for sourcing
- Package deals (full classroom, by area)

### Phase 6: Printable Materials Generator
- Pink/Blue/Green series materials
- 3-part cards
- Small objects lists for beginning sounds
- All Montessori language materials

### Phase 7: Mobile App Packaging
- iOS and Android deployment
- App store submission

### Phase 8: RFID Hardware Integration
- Bracelet specs
- Reader integration
- Real-time tracking

### Phase 9: AI Camera System (FUTURE)
- Placeholder in code
- Mastery detection
- Work guidance
- Space allocation

---

## POTATO SNAPS — Weekly Photo/Video Films (added 2026-08-23)

A sub-product living inside this same repo/deploy, live at **www.teacherpotato.xyz**
(`montree.xyz/potato/*` redirects there). Teachers snap and curate classroom photos through
the day; a separate Railway worker (`potato-worker/`) renders them into weekly branded video
montages for parents. 4 teacher logins (Dana, Jenny, Vanessa, Tredoux) — name-only, no
password, ~10-year session.

**Distribution:** installable web app (PWA, Add to Home Screen) for iPhone, plus a sideloaded
APK for Chinese Android — a thin wrapper that loads the live site and auto-updates; it only
needs rebuilding if the native shell itself changes. Both channels point at the same live site.

**Current usage mode (Tredoux's explicit choice, as of this date): teacher-only.** Finished
films are downloaded by the teacher and shared elsewhere manually. The parent-send feature
exists in the code but stays **unused** until Tredoux decides otherwise — this is a deliberate
product decision, not a missing feature. Do not "helpfully" turn parent-sending on.

**Built this week:** the PWA install layer; a database fix that closed a real gap where films
were auto-visible to parents before a teacher had explicitly sent them (now correctly gated);
a teacher download button for finished films; and (today) video upload support — teachers can
upload an existing video from their phone's library (not in-app recording), capped at 3
minutes / 200MB, teacher-only, deliberately not fed into the automated montage renderer.

**Roster note:** `tp_children` / `tp_classes` are entered independently in the Potato UI — they
are **not** synced from this repo's main Montree curriculum/roster data. Don't assume otherwise.

For full technical detail on any of the above, see
`docs/handoffs/POTATO_SNAPS_HANDOFF_2026-08-23.md` and
`docs/handoffs/POTATO_SNAPS_VIDEO_HANDOFF_2026-08-23.md`.

---

## MONTREE LENS — Observation Reports for Visiting Consultants (added 2026-08-26)

A second sub-product in this same repo/deploy, built in the Potato Snaps shape but
served **on montree.xyz at `/lens*`** — it is a Montree-branded product, so unlike
Potato it is deliberately *not* bounced to teacherpotato.xyz. For Montessori
consultants, mentors and pedagogical directors who visit other people's classrooms
and write professional reports, and who have no classroom of their own in Montree.

**The loop:** she taps *New Visit*, photographs the shelves and whispers her notes
one-thumbed in a silent classroom (offline-first — nothing is lost on bad school
wi-fi), and over tea the "Lens Guru" organises those moments into a 12-section
AMI-style report she edits inline, in English and Chinese, and exports as a branded
PDF with her own letterhead. Recommendations become action items that resurface at
the next visit to that classroom.

**Self-contained, like Potato.** Own tables (`lens_*`, migration 339), own auth
(8-char invite code → `lens_observer` httpOnly cookie, `aud: lens-observer`, signed
with the existing `ADMIN_SECRET` — **no new env vars anywhere**), own PWA
manifest/icons in `public/lens/`, own private storage bucket `lens-photos`. Code
lives only under `app/lens/**`, `app/api/lens/**`, `lib/lens/**`,
`components/lens/**`. It imports nothing from Montree's school/classroom tables or
cookies. `/api/lens/*` is outside the middleware matcher and every route handler
authenticates itself — exactly like `/api/potato/*`.

**The guardrail that defines the product** (copied deliberately from Storypark):
the AI drafts **only** from what she captured, never invents an observation, and
every judgement must cite a moment id. Invented ids are stripped server-side, so an
uncited claim shows up as uncited in her review queue rather than as fake evidence.
Children are never named (Child A (4;3)); photographs are of the environment and
materials, and the PDF's photo appendix carries **captions only, never images** —
PIPL treats an image of an under-14 as sensitive personal information, and a PDF is
the artefact most likely to be forwarded.

**Chinese is glossary-locked, not left to the model.** ~60 Montessori terms
(蒙台梭利, 有准备的环境, 正常化, 工作周期, 三段式教学法, 错误控制…) are pinned in
`lib/lens/knowledge/montessori-glossary-zh.ts`, fed to the translator verbatim and
checked on the way back. A 2.4 MB Noto Serif SC subset ships in
`public/lens/fonts/` because pdfkit's standard fonts have no Chinese glyphs at all.

**Status: built, never run.** Phases 0–3 are complete and typecheck/test clean
(92 Lens tests), but **migration 339 has not been applied anywhere and the
`lens-photos` bucket does not exist yet**. Three manual steps stand between this
and live: run the migration, create the private bucket by hand (never from SQL —
that rolls the migration back, the lesson the `potato-snaps` bucket taught), and
change the seeded placeholder invite code `LENSV1AA`.

Concept and research: `docs/MONTREE_LENS_CONCEPT.md`.
Engineering record, go-live steps and known gaps: `docs/LENS_BUILD_LOG.md`.

---

## CURRICULUM STRUCTURE

### The 5 Areas (Age 3-6 Primary)

```
PRACTICAL LIFE          SENSORIAL              MATH                   LANGUAGE               CULTURAL
├── Preliminary         ├── Visual Sense       ├── Numeration         ├── Oral Language      ├── Geography
│   ├── Carrying        │   ├── Cylinder       │   ├── Number Rods    │   ├── Sound Games    │   ├── Globes
│   ├── Walking         │   │   Blocks 1-4     │   ├── Sandpaper      │   ├── Classified     │   ├── Puzzle Maps
│   ├── Pouring         │   ├── Pink Tower     │   │   Numerals       │   │   Cards          │   ├── Flags
│   └── Spooning        │   ├── Brown Stair    │   ├── Spindle Box    │   └── Vocabulary     │   └── Land Forms
├── Care of Self        │   ├── Red Rods       │   └── Cards &        ├── Written Language   ├── Botany
│   ├── Dressing        │   ├── Knobless       │       Counters       │   ├── Sandpaper      │   ├── Plant Puzzles
│   │   Frames 1-12     │   │   Cylinders      ├── Decimal System    │   │   Letters        │   ├── Parts of
│   ├── Washing         │   ├── Color Box 1    │   ├── Golden Beads   │   ├── Moveable       │   └── Classification
│   └── Grooming        │   ├── Color Box 2    │   ├── Teen Boards    │   │   Alphabet       ├── Zoology
├── Care of Environment │   ├── Color Box 3    │   ├── Ten Boards     │   └── Sand Tray      │   ├── Animal Puzzles
│   ├── Cleaning        │   └── Geometric      │   └── 100 Board      ├── Reading            │   ├── Parts of
│   ├── Polishing       │       Cabinet        ├── Operations         │   ├── Pink Series    │   └── Classification
│   └── Plant Care      ├── Tactile Sense      │   ├── Addition       │   ├── Blue Series    ├── Science
├── Grace & Courtesy    │   ├── Touch Boards   │   │   Strip Board    │   └── Green Series   │   ├── Sink/Float
│   ├── Greetings       │   ├── Touch Tablets  │   ├── Subtraction    └── Grammar            │   ├── Magnetic
│   ├── Interrupting    │   └── Fabrics        │   │   Strip Board    │   ├── Grammar        │   └── Experiments
│   └── Table Manners   ├── Auditory Sense     │   ├── Multiplication │   │   Symbols        ├── Art
└── Control of Movement │   ├── Sound Boxes    │   │   Board          │   └── Sentence       │   ├── Drawing
    ├── Walking Line    │   └── Bells          │   └── Division       │       Analysis       │   ├── Painting
    └── Silence Game    ├── Olfactory          │       Board          │                      │   └── Collage
                        │   └── Smelling Jars   ├── Memorization      │                      └── Music
                        ├── Gustatory          │   ├── Addition       │                          ├── Bells
                        │   └── Tasting        │   ├── Subtraction    │                          ├── Instruments
                        └── Stereognostic      │   ├── Multiplication │                          └── Movement
                            ├── Geometric      │   └── Division       │
                            │   Solids         └── Fractions          │
                            ├── Mystery Bag    │   └── Fraction       │
                            └── Binomial/      │       Circles        │
                                Trinomial Cube │                      │
```

### Toddler Areas (Age 0-3)

```
MOVEMENT               PRACTICAL LIFE         SENSORIAL              LANGUAGE
├── Gross Motor        ├── Self-Care          ├── Visual             ├── Vocabulary
│   ├── Climbing       │   ├── Dressing       │   ├── Sorting        │   ├── Object Naming
│   ├── Walking        │   ├── Toileting      │   ├── Matching       │   ├── Songs
│   └── Balance        │   └── Feeding        │   └── Nesting        │   └── Stories
├── Fine Motor         ├── Food Prep          ├── Tactile            └── Pre-Reading
│   ├── Grasping       │   ├── Spreading      │   ├── Textures           ├── Sound Games
│   ├── Transferring   │   ├── Cutting        │   └── Temperature        └── Rhymes
│   └── Threading      │   └── Pouring        └── Auditory
└── Coordination       └── Environment            ├── Music
    ├── Hand-Eye           ├── Sweeping           └── Nature Sounds
    └── Whole Body         └── Wiping
```

---

## FILES CREATED

### Step 1 Files
| File | Purpose | Status |
|------|---------|--------|
| `PROJECT_CONTEXT.md` | This file - persistent memory | ✅ Complete |
| `package.json` | Project dependencies | ✅ Complete |
| `README.md` | Project setup instructions | ✅ Complete |
| `tsconfig.json` | TypeScript configuration | ✅ Complete |
| `tailwind.config.ts` | Tailwind CSS configuration | ✅ Complete |
| `postcss.config.js` | PostCSS configuration | ✅ Complete |
| `next.config.js` | Next.js configuration | ✅ Complete |
| `src/types/curriculum.ts` | TypeScript types | ✅ Complete |
| `src/lib/curriculum/index.ts` | Curriculum index with helpers | ✅ Complete |
| `src/lib/curriculum/data/practical-life.json` | Practical Life data | ✅ Complete |
| `src/lib/curriculum/data/sensorial.json` | Sensorial data | ✅ Complete |
| `src/lib/curriculum/data/math.json` | Math data | ✅ Complete |
| `src/lib/curriculum/data/language.json` | Language data | ✅ Complete |
| `src/lib/curriculum/data/cultural.json` | Cultural data | ✅ Complete |
| `src/app/layout.tsx` | App layout | ✅ Complete |
| `src/app/globals.css` | Global styles | ✅ Complete |
| `src/app/page.tsx` | Main page (placeholder) | ✅ Complete |

---

## NEXT SESSION INSTRUCTIONS

When starting the next session, Claude should:

1. **Read this file first** (`PROJECT_CONTEXT.md`)
2. **Check the "CURRENT STEP" section below**
3. **Review what was completed**
4. **Continue with the next task**

---

## CURRENT STEP: 1 COMPLETE ✅

### Step 1 Deliverables (All Complete):
- ✅ PROJECT_CONTEXT.md - Persistent memory document
- ✅ README.md - Setup instructions
- ✅ package.json - Dependencies configured
- ✅ tsconfig.json - TypeScript configuration
- ✅ tailwind.config.ts - Tailwind with Montessori colors
- ✅ postcss.config.js - PostCSS configuration
- ✅ next.config.js - Next.js configuration
- ✅ src/types/curriculum.ts - All TypeScript types
- ✅ src/lib/curriculum/index.ts - Main curriculum export
- ✅ src/lib/curriculum/data/practical-life.json - 45 works, 100+ levels
- ✅ src/lib/curriculum/data/sensorial.json - 25 works, 80+ levels
- ✅ src/lib/curriculum/data/math.json - 25 works, 60+ levels
- ✅ src/lib/curriculum/data/language.json - 15 works, 40+ levels
- ✅ src/lib/curriculum/data/cultural.json - 20 works, 50+ levels
- ✅ src/app/globals.css - Global styles
- ✅ src/app/layout.tsx - Root layout
- ✅ src/app/page.tsx - Working interactive UI

### Total: ~130 Works, ~330+ Levels

## NEXT STEP: 2 - React Flow Tree Visualization

### What to Build:
1. Install and configure React Flow (@xyflow/react)
2. Create tree nodes for each area/category/work
3. Implement zoom/pan with minimap
4. Add connections showing prerequisites
5. Highlight current position for child tracking
6. Add video modal for presentations

---

## NOTES FROM TREDOUX

- Wants code that can be copy-pasted directly into Cursor
- No build errors allowed
- Step-by-step incremental development
- Save progress after each step
- Consider Railway vs Supabase (decision pending)

---

## CHANGELOG

### December 19, 2025
- Project initialized
- Research completed on complete Montessori curriculum
- Created comprehensive curriculum JSON database
- Established project phases and technical stack
- Created Step 1 deliverables

---

*Last Updated: December 19, 2025*
*Current Phase: 1 (Foundation)*
*Current Step: 1 Complete → Starting Step 2*

