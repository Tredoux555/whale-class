# Shelf Autopilot — Plan v1

## VISION
"Teacher logs in Monday morning. AI has analyzed every child's progress, checked prerequisite chains, and proposed next week's shelf. One tap per child — or one tap for the whole class. The shelf is ready before coffee is cold."

## ARCHITECTURE OVERVIEW

### What We're Building (3 parts)

**Part 1: Work Sequencer Engine** (`lib/montree/guru/work-sequencer.ts`)
A pure function that takes a child's progress + the curriculum prerequisite graph and returns ranked next-work candidates per area. Zero AI calls — pure graph traversal + scoring. ~200 lines.

**Part 2: Shelf Proposal API** (`app/api/montree/shelf-autopilot/route.ts`)
POST endpoint that runs the sequencer for one child or batch for entire classroom, optionally enhanced by Haiku for reasoning/confidence. Stores proposals in child settings JSONB. ~250 lines.

**Part 3: Shelf Autopilot Dashboard Card** (`components/montree/ShelfAutopilotCard.tsx`)
Dashboard card showing "X children ready for shelf updates" with preview, selective apply, and batch apply. ~400 lines.

### What We're NOT Building
- No new database tables (proposals stored in settings JSONB, applied via existing focus-works API)
- No changes to existing Guru tools (propose_next_works tool deferred — teacher-facing UI is higher impact)
- No cron jobs (proposals generated on-demand when teacher opens dashboard)

---

## PART 1: Work Sequencer Engine

### File: `lib/montree/guru/work-sequencer.ts`

### Core Algorithm

```
For each of the 5 areas:
  1. Load all works in area from curriculum JSON (ordered by category.sequence → work.sequence)
  2. Get child's current progress (mastered/practicing/presented works)
  3. Get child's current focus work for this area
  4. Walk the sequence. For each work:
     a. Skip if already mastered
     b. Skip if it's the current focus work
     c. Check prerequisites: ALL must be mastered
     d. If prerequisites met → this is a CANDIDATE
  5. Score candidates:
     - Sequence proximity to current focus (closer = higher)
     - Category advancement bonus (next category = interesting)
     - Weekly admin alignment (if guru_weekly_plan_row suggests this work, +50 score)
     - Area balance (if child has 0 works mastered in this area vs 10 in another, prioritize)
  6. Return top candidate per area with score + reason
```

### Interface

```typescript
interface ShelfProposal {
  area: string;                    // 'practical_life' | 'sensorial' | etc.
  current_work: string | null;     // What's on shelf now
  proposed_work: string;           // What we're suggesting
  proposed_work_key: string;       // Curriculum ID
  reason: string;                  // "Mastered Sandpaper Numerals → next in sequence"
  confidence: 'high' | 'medium' | 'low';
  score: number;                   // 0-100
  prerequisites_met: string[];     // Which prereqs the child has mastered
  category: string;                // Which curriculum category this falls in
}

interface SequencerResult {
  child_id: string;
  child_name: string;
  proposals: ShelfProposal[];      // 0-5 proposals (one per area, only where change needed)
  areas_stable: string[];          // Areas where current shelf is good
  summary: string;                 // "3 shelf moves suggested: Math, Language, Cultural"
}
```

### Scoring Matrix

| Factor | Weight | Logic |
|--------|--------|-------|
| Sequence order | 40 | Next in curriculum sequence gets 40, +2 position gets 30, etc. |
| Prerequisites ALL met | Required | If any prereq not mastered, score = 0 (filtered out) |
| Weekly admin alignment | 30 | If guru_weekly_plan_row matches this work name, +30 |
| Area balance | 20 | If child has <3 works in this area vs >8 in others, +20 |
| Current work mastered | 10 | If current focus work is mastered, bonus for proposing ANY change |

### Key Design Decisions

1. **Pure function, no DB calls** — Takes data as input, returns proposals. Caller fetches data.
   - Why: Testable, cacheable, reusable from API route OR Guru tool

2. **Curriculum sequence is the backbone** — Prerequisites define hard constraints, sequence defines soft preference.
   - Why: Montessori has a specific order. Number Rods → Sandpaper Numerals → Spindle Boxes is not arbitrary.

3. **Weekly admin plan is a BOOST, not a requirement** — If teacher's weekly admin says "Golden Beads" for math, that gets +30 score. But if prerequisites aren't met, it's still filtered out.
   - Why: AI recommendations should respect the curriculum graph, not override it.

4. **"No change needed" is a valid result** — If child is practicing their current focus work and hasn't mastered it, return `areas_stable: ['mathematics']`.
   - Why: Don't propose changes for the sake of changes. Teacher trust depends on accuracy.

---

## PART 2: Shelf Proposal API

### File: `app/api/montree/shelf-autopilot/route.ts`

### POST — Generate proposals

**Request:**
```json
{
  "child_ids": ["uuid1", "uuid2", ...],  // or omit for entire classroom
  "classroom_id": "uuid",                // required if no child_ids
  "locale": "en",
  "include_reasoning": true              // if true, Haiku adds 1-sentence reason per proposal
}
```

**Flow:**
1. Auth + verify school access
2. If `child_ids` provided, use those. Else fetch all children in classroom.
3. For each child (parallelized with Promise.allSettled, max 5 concurrent):
   a. Fetch progress, focus works, child settings (3 parallel queries)
   b. Load curriculum (cached at module level)
   c. Run `generateShelfProposals(child, progress, focusWorks, curriculum, settings)` from sequencer
   d. If `include_reasoning` AND proposals exist, call Haiku once per child (~$0.001):
      - "Here's a child's shelf change. Write a 1-sentence teacher-friendly reason for each."
      - Replaces generic sequencer reason with natural language
   e. Save proposals to `child.settings.shelf_autopilot_proposals` + timestamp
4. Return all results

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "child_id": "uuid",
      "child_name": "Joey",
      "proposals": [
        {
          "area": "mathematics",
          "current_work": "Sandpaper Numerals",
          "proposed_work": "Number Rods with Numerals",
          "reason": "Joey mastered Sandpaper Numerals — next step combines rods with written numerals",
          "confidence": "high",
          "score": 90
        }
      ],
      "areas_stable": ["practical_life", "sensorial"],
      "summary": "2 shelf moves suggested"
    }
  ],
  "children_with_proposals": 5,
  "children_stable": 7,
  "total_proposals": 12
}
```

### POST /apply — Apply selected proposals

**Request:**
```json
{
  "applications": [
    { "child_id": "uuid", "area": "mathematics", "work_name": "Number Rods with Numerals" },
    { "child_id": "uuid", "area": "language", "work_name": "Movable Alphabet" }
  ]
}
```

**Flow:**
1. Auth + verify
2. For each application:
   a. Verify child belongs to school
   b. Upsert to `montree_child_focus_works` (same as existing focus-works POST)
   c. Ensure work exists in `montree_child_progress` with at least 'presented' status
3. Return success count

---

## PART 3: Dashboard Card UI

### File: `components/montree/ShelfAutopilotCard.tsx`

### States

1. **Idle** — "Generate shelf proposals for your class" [Generate] button
2. **Generating** — Progress bar (3/19 children analyzed...)
3. **Results** — Summary card expandable to per-child detail
4. **Applied** — "Shelves updated for 5 children" ✅

### Layout (Idle)

```
┌─────────────────────────────────────────┐
│ 🚀 Shelf Autopilot                      │
│                                         │
│ Let AI analyze your class and suggest   │
│ next week's shelf for each child.       │
│                                         │
│ [Generate Proposals]                    │
└─────────────────────────────────────────┘
```

### Layout (Results)

```
┌─────────────────────────────────────────┐
│ 🚀 Shelf Autopilot              [Redo]  │
│                                         │
│ 5 children ready for moves              │
│ 7 children — shelf looks good ✓         │
│                                         │
│ ▼ Joey (3 moves)                        │
│   Math: Sandpaper Numerals → Rods+Nums  │
│   Lang: Pink Object Box → Blue Box      │
│   Cult: Land/Water → Flags              │
│   "Joey mastered 3 works this week..."  │
│                                         │
│ ▼ Anna (1 move)                         │
│   Sens: Color Box 1 → Color Box 2      │
│                                         │
│ [Apply All] [Apply Selected]            │
└─────────────────────────────────────────┘
```

### i18n Keys (~15 new)
- `shelfAutopilot.title`, `shelfAutopilot.description`
- `shelfAutopilot.generate`, `shelfAutopilot.generating`
- `shelfAutopilot.childrenReady`, `shelfAutopilot.childrenStable`
- `shelfAutopilot.moves`, `shelfAutopilot.shelfGood`
- `shelfAutopilot.applyAll`, `shelfAutopilot.applySelected`
- `shelfAutopilot.applied`, `shelfAutopilot.redo`
- `shelfAutopilot.reason`, `shelfAutopilot.noChanges`
- `shelfAutopilot.error`, `shelfAutopilot.networkError`

---

## FILES TO CREATE (3 new)

1. `lib/montree/guru/work-sequencer.ts` (~200 lines) — Pure sequencer engine
2. `app/api/montree/shelf-autopilot/route.ts` (~250 lines) — API: generate + apply
3. `components/montree/ShelfAutopilotCard.tsx` (~400 lines) — Dashboard card

## FILES TO MODIFY (3)

1. `app/montree/dashboard/page.tsx` — Import + render ShelfAutopilotCard (after WeeklyAdminCard)
2. `lib/montree/i18n/en.ts` — ~15 new keys
3. `lib/montree/i18n/zh.ts` — ~15 matching Chinese keys

## ZERO NEW MIGRATIONS

Proposals stored in `montree_children.settings` JSONB (existing column).
Applied via existing `montree_child_focus_works` upsert pattern.

---

## COST MODEL

- Sequencer engine: $0.00 (pure code, no AI)
- Haiku reasoning (optional): ~$0.001 per child = $0.02 for 20 children
- Total per classroom per week: ~$0.02 (vs $0.60-1.00 for Sonnet-based approach)

## RISK ASSESSMENT

| Risk | Mitigation |
|------|-----------|
| Sequencer suggests wrong work | Prerequisites are HARD gates — can't suggest work unless ALL prereqs mastered |
| Teacher doesn't trust AI | Preview before apply, selective apply, easy undo (just pick different work) |
| Custom works have no prerequisites | Custom works never proposed by sequencer — only standard curriculum works |
| Performance with 20+ children | Batch parallelized with Promise.allSettled, curriculum cached at module level |
| Weekly admin not generated yet | Weekly admin alignment is a +30 BOOST, not required. Proposals work without it |
