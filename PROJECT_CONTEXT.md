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

