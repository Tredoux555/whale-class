# SHELF AUTOPILOT PLAN AUDIT — v1

**Auditor:** Claude Opus (UX/Workflow Focus)
**Plan:** `shelf-autopilot-v1.md`
**Date:** March 27, 2026
**Focus:** Teacher trust, information density, workflow fit, integration, mobile UX, error states

---

## EXECUTIVE SUMMARY

**VERDICT: APPROVED WITH CRITICAL MODIFICATIONS**

The plan is well-architected technically (pure sequencer, JSONB storage, existing API reuse) but has **THREE CRITICAL UX ISSUES** that must be resolved before ship:

1. **CRITICAL: "Apply All" is a landmine** — Teachers can accidentally apply 50+ shelf changes to kids with high confidence but wrong work
2. **CRITICAL: Preview/apply flow insufficient for trust** — No per-proposal reasoning visible. Teacher can't understand WHY Haiku suggested Math→Spindle Boxes
3. **CRITICAL: Information density imbalance** — Shows child name + proposed move but HIDES current progress status (mastered? practicing?) and confidence scores

With these three fixes, Shelf Autopilot becomes a productivity powerhouse. Without them, it risks eroding teacher confidence in the AI system.

---

## SECTION A: TEACHER TRUST

### Issue A1: "Apply All" Button is Dangerous [CRITICAL]

**Finding:** The plan includes `[Apply All]` button to upsert all proposals to every child's focus works in one tap.

**Risk:**
- Teacher has 19 children, 12 proposals generated
- Batches them all with one `Apply All` tap
- Haiku reasoning was "encouraging" (score 80-95 across board)
- Teacher doesn't look at each one — assumes all are safe
- **Actual outcome:** Applied 5 WRONG proposals (sequencer suggested work but prerequisites weren't actually mastered in this child's curriculum)
- Now 5 children have wrong works on shelf → compounded frustration

**Why this happens:**
- Prerequisites are "hard gates" in algorithm description, BUT sequencer is pure function — it can only check student's OWN progress, not curriculum integrity
- If curriculum data is stale/incomplete, prerequisites might appear met when they're not
- Teacher sees "Apply All" next to batch of scores and taps confidently
- No transaction rollback — each upsert is independent

**Mitigation (REQUIRED):**

Option 1 (Recommended): **Selective "Apply All" with per-child preview cards**
- Remove bulk `[Apply All]` button entirely
- Show **expandable per-child result cards** in Results state (like WeeklyAdminCard does)
  ```
  ▼ Joey (3 moves)
    [✓] Math: Sandpaper Numerals → Spindle Boxes
    [✓] Lang: Pink Object Box → Blue Box
    [✓] Cult: Land/Water → Flags
    [Apply to Joey] [Skip Joey]

  ▼ Anna (1 move)
    [✓] Sens: Color Box 1 → Color Box 2
    [Apply to Anna] [Skip Anna]
  ```
- Each child gets own [Apply] button
- Teachers must opt-in per child (takes 2 more taps but prevents damage)

Option 2 (Lighter): **Confirmation modal on Apply All**
```
Are you sure you want to apply 12 shelf moves across 7 children?

This will:
- Joey: 3 moves
- Anna: 1 move
- ...
[Cancel] [Yes, Apply All]
```
- Still risky but forces pause/review

**Recommendation:** **Use Option 1.** Option 2 is still a landmine. Teachers tap through confirmation modals without reading.

---

### Issue A2: Missing Per-Proposal Reasoning [CRITICAL]

**Finding:** Results show `reason` field per proposal, BUT:
1. In Results layout, only summary visible (e.g., "5 children ready for moves")
2. Per-child details show proposal short list (area + current → proposed)
3. `reason` field not visible in UI mockup
4. Teacher can't see WHY "Sandpaper Numerals → Spindle Boxes" was chosen

**Risk:**
- Teacher sees "Joey mastered Sandpaper Numerals — next in sequence" (generic)
- Teacher doesn't understand if this is a BOOST recommendation (area balance?) or pure sequence
- Teacher can't validate the reasoning locally
- Damages trust: "Why did AI pick Spindle Boxes? Is it because I need to balance math work or because it's literally next?"

**Expectation vs Reality:**
- Plan says: `reason: "Mastered Sandpaper Numerals → next in sequence"`
- Plan description mentions Haiku adds "1-sentence teacher-friendly reason"
- UI mockup doesn't show the reason field or how it's styled

**Mitigation (REQUIRED):**

Add `reason` field to per-proposal display:
```
▼ Joey (3 moves)
  Math: Sandpaper Numerals → Spindle Boxes
  🎯 Reason: Joey mastered Numerals — Spindle Boxes is the natural next step

  Lang: Pink Object Box → Blue Box
  🎯 Reason: Pink Box mastered; Joey hasn't seen sorting boxes yet — Blue Box intro

  Cult: Land/Water → Flags
  📊 Reason: Joey has 0 cultural works mastered but 6 math; balancing area

  [Apply to Joey]
```

Styling:
- Reason badge with icon (🎯 = sequence, 📊 = balance, ⭐ = weekly admin alignment)
- Smaller text, gray color (`text-sm text-gray-600`)
- Helps teacher scan & understand quickly

---

### Issue A3: Confidence Scores Not Exposed [MEDIUM]

**Finding:** Plan includes `confidence: 'high' | 'medium' | 'low'` in ShelfProposal interface, but UI mockup doesn't show confidence level per proposal.

**Impact:**
- Teacher sees "5 children ready" — sounds high-confidence
- Doesn't know if proposals are high-confidence or mixed
- `score: number` (0-100) in interface but not displayed

**Mitigation:**
Add confidence badge to each proposal:
```
Math: Sandpaper Numerals → Spindle Boxes  [HIGH 90]
```
- Green badge for HIGH (>80), yellow for MEDIUM (50-80), gray for LOW
- Single-tap visual scan

---

## SECTION B: INFORMATION DENSITY

### Issue B1: Missing Current Work Status [HIGH]

**Finding:** Results layout shows:
```
Math: Sandpaper Numerals → Rods+Nums
```

But doesn't show if "Sandpaper Numerals" is:
- Mastered (move makes sense)
- Practicing (maybe wait another week?)
- Just introduced (ERROR — shouldn't propose next if not practicing)

**Risk:**
- Teacher sees proposal and thinks sequencer verified prerequisites
- Actually, prerequisite IS mastered (algorithm ensures this)
- **BUT** teacher can't see the status without clicking through to child's progress page

**Mitigation:**

Show status badges:
```
Math: Sandpaper Numerals [✅ Mastered] → Spindle Boxes
Lang: Pink Object Box [🔄 Practicing] → Blue Box
```

Meanings:
- `[✅ Mastered]` = Green checkmark, child ready to move
- `[🔄 Practicing]` = Blue arrows, still in learning phase
- `[📋 Presented]` = Gray label, not yet mastered (shouldn't appear — algorithm filters)

**Alternative:** If space constrained, add status in hover tooltip on desktop (info icon `ℹ️` next to current work name).

---

### Issue B2: "Score: 90" is Meaningless to Teachers [MEDIUM]

**Finding:** Plan returns `score: number (0-100)` from sequencer but doesn't explain what score MEANS.

**Questions teacher might ask:**
- Is 90 good?
- Is 50 bad?
- Does score affect anything? (It doesn't — proposals are proposals, not auto-applied by score)
- Should I skip low-score proposals?

**Mitigation:**

Option 1: **Remove score from UI entirely.** It's an internal ranking tool, not user-facing.
- Replace with confidence level (high/medium/low) which IS user-facing
- Keeps UI clean

Option 2: **Add confidence interpretation:**
```
Math: Sandpaper Numerals → Spindle Boxes
🎯 Very confident (sequence + mastered prerequisite)

Sens: Color Box 1 → Color Box 2
🎯 Confident (area balance + sequence)

Lang: Pink Object Box → Blue Box
🎯 Moderately confident (sequence but area not yet active)
```

**Recommendation:** Use Option 1. Remove score. Show confidence level instead.

---

## SECTION C: WORKFLOW FIT

### Issue C1: When Would a Teacher Use This? [MEDIUM]

**Finding:** Plan says "Monday morning" in vision, but doesn't specify:
- Is this a weekly ritual (every Monday)?
- Or on-demand whenever teacher wants to refresh shelves?
- Should proposals refresh if progress changes mid-week?
- Do proposals persist or regenerate each time teacher opens dashboard?

**Risk:**
- Teacher generates proposals Monday
- Tuesday: Joey mastered a new work
- Thursday: Teacher opens dashboard — proposals still show Monday's state
- Teacher applies stale proposals without realizing child has made progress

**Workflow Questions:**
- Should there be a "Refresh Proposals" button to regenerate?
- Should proposals auto-expire after 3 days?
- Should generation be automatic on dashboard load (expensive + annoying)?

**Current plan answer:** "Proposals generated on-demand when teacher opens dashboard" (line 19 PART 3)
- This is good! But needs clarification in UX

**Mitigation:**

Add state display in Results:
```
🚀 Shelf Autopilot              [Redo]

📅 Generated 2 hours ago — Last updated when you arrived

5 children ready for moves
7 children — shelf looks good ✓
```

And clarify in help text:
- "Proposals are fresh from right now — based on your latest progress data"
- "[Redo] button to regenerate anytime"
- "Proposals don't auto-apply; they wait for your approval"

---

### Issue C2: Integration with Weekly Admin Card [HIGH]

**Finding:** Dashboard already has `WeeklyAdminCard` that:
1. Generates per-child weekly admin plans (what will happen next week)
2. Uses Sonnet to create narrative summaries + plan tables
3. Runs sequentially (40-50s per child for 20 children = 13+ minutes)

**Shelf Autopilot also:**
1. Proposes next works for each child
2. Mentions "Weekly admin alignment" as +30 score boost
3. Suggests works based on curriculum sequence + weekly plan

**Overlap question:** Should Shelf Autopilot use the weekly admin plan data as INPUT?

**Current plan answer:** "Weekly admin plan is a BOOST, not a requirement. Proposals work without it." (line 270)

**Risk of current approach:**
- Two independent systems generating recommendations
- Teachers might get different suggestions from Weekly Admin vs Shelf Autopilot
- Both reach for same Sonnet calls; no coordination
- Weekly Admin says "Math: Golden Beads" but Shelf Autopilot says "Math: Spindle Boxes"

**Better workflow:**
1. Teacher generates weekly admin plans first (narrative + per-child focus works)
2. Shelf Autopilot reads those plans and uses them as +50 BOOST if they match
3. If no weekly admin generated yet, Shelf Autopilot works standalone

**Mitigation (OPTIONAL):**

Update plan to clarify:
```
OPTIONAL: If teacher has generated weekly admin plans this week,
Shelf Autopilot will boost matching proposals.

If not generated yet, Shelf Autopilot works standalone.

[Generate Weekly Plans First] (links to WeeklyAdminCard)
```

This isn't broken, but it could be smoother.

---

## SECTION D: i18n

### Issue D1: Key Naming Convention [LOW]

**Finding:** Plan proposes ~15 keys:
```
shelfAutopilot.title
shelfAutopilot.description
shelfAutopilot.generate
...
shelfAutopilot.error
shelfAutopilot.networkError
```

**Convention Check:**
- Existing keys use dot-notation: `batchAdmin.title`, `audit.changeArea`, `setup.subtitle`
- Proposed `shelfAutopilot.*` matches the pattern
- ✅ Correct

**Completeness check:**
- Missing key: `shelfAutopilot.redoProposals` (for [Redo] button) — add to list
- Missing key: `shelfAutopilot.applyToChild` or `shelfAutopilot.apply` — clarify per-child apply button
- Missing key: `shelfAutopilot.stable` or `shelfAutopilot.noChangesNeeded` — for "shelf looks good ✓"

**Mitigation:**

Expand key list from 15 to ~18-20 keys:
```
shelfAutopilot.title = "Shelf Autopilot"
shelfAutopilot.description = "Let AI analyze your class and suggest next week's shelf for each child."
shelfAutopilot.generate = "Generate Proposals"
shelfAutopilot.generating = "Analyzing..."
shelfAutopilot.childrenReady = "{count} children ready for moves"
shelfAutopilot.childrenStable = "{count} children — shelf looks good ✓"
shelfAutopilot.moves = "moves"
shelfAutopilot.applyToChild = "Apply to {childName}"
shelfAutopilot.skipChild = "Skip {childName}"
shelfAutopilot.reason = "Why"  (or "Reason")
shelfAutopilot.confidence = "Confidence"
shelfAutopilot.noChanges = "No changes needed"
shelfAutopilot.applied = "Shelves updated for {count} children ✅"
shelfAutopilot.redo = "Redo"
shelfAutopilot.error = "Failed to generate proposals"
shelfAutopilot.networkError = "Connection lost"
shelfAutopilot.applyFailed = "Failed to apply proposals"
shelfAutopilot.loadingProposals = "Generating proposals for {count} children..."
```

Perfect EN/ZH parity should be automatic.

---

## SECTION E: MOBILE UX

### Issue E1: Expandable Per-Child Layout on Mobile [HIGH]

**Finding:** Plan shows Results with expandable cards:
```
▼ Joey (3 moves)
  Math: Sandpaper Numerals → Rods+Nums
  Lang: Pink Object Box → Blue Box
  Cult: Land/Water → Flags
  "Joey mastered 3 works this week..."

▼ Anna (1 move)
  Sens: Color Box 1 → Color Box 2

[Apply All] [Apply Selected]
```

**Mobile issue:**
- 19 children = 19 expandable cards
- Expanding each one takes multiple taps and scrolls
- On iPhone 14" screen, each card takes ~120px collapsed, ~300px expanded
- Teacher needs to scroll past 19 items to see [Apply] buttons
- Touch targets for [Apply All] / [Apply Selected] buttons at bottom of page

**Risk:**
- Teacher taps [Apply All] without reviewing 15 of 19 kids
- Flow is tedious on mobile (primary usage for teachers with phones, not desktops)

**Mitigation (REQUIRED for mobile-first Montessori use):**

Option 1: **Tabs/Segmented Control** (Recommended)
```
[All 12 Proposals] [Ready: 5] [Stable: 7]

Tap "Ready: 5" to show only children with proposals
```
- Filters to 5 kids instead of 19
- Each expandable takes up more real estate
- Touch-friendly

Option 2: **Collapsible "Stable" group**
```
5 children ready for moves
  ▼ Joey (3 moves)
  ▼ Anna (1 move)
  ▼ Kayla (2 moves)
  ▼ Kevin (3 moves)
  ▼ Rachel (1 move)

7 children — shelf looks good ✓ [Hide]
  ▼ Amy
  ▼ Austin
  ...
```
- Default: stable children collapsed
- Teacher expands only if curious
- Reduces scrolling

Option 3: **Grid of summary cards, tap to see details in modal**
```
Joey (3 moves) [Expand]
Anna (1 move) [Expand]
...

[Tap card to see details in full-screen modal with bigger touch targets for Apply]
```

**Recommendation:** Use Option 1 (Tabs). Most teacher-friendly.

**Code location:** ShelfAutopilotCard Results state should handle filtering based on tab selection.

---

### Issue E2: Touch Targets on Proposal Cards [LOW]

**Finding:** Each expandable card has action buttons ([Apply to Joey] etc.)

**Mobile concern:**
- Buttons must be 44px minimum height for comfortable touch
- Current layout has buttons packed tightly
- Risk of accidental taps

**Mitigation:**
```
▼ Joey (3 moves)
  Math: Sandpaper Numerals → Spindle Boxes [HIGH 90]
  Lang: Pink Object Box → Blue Box [MED 75]
  Cult: Land/Water → Flags [HIGH 85]

  [Apply to Joey]  [Skip]
```

Buttons as full-width blocks on mobile:
```css
@media (max-width: 768px) {
  button { width: 100%; height: 44px; }
}
```

---

## SECTION F: ERROR STATES

### Issue F1: Partial Failures (3 of 19 Children Fail) [HIGH]

**Finding:** Plan batch-parallelizes with `Promise.allSettled` (max 5 concurrent). If 3 children fail:
- Network error
- Child not found (race condition?)
- Curriculum data stale
- Haiku timeout

**Plan response:** Returns mixed results, shows summary.

**Problem:** UI mockup doesn't show how this is displayed.

**Current guidance:**
- Line 151: `children_with_proposals: 5`
- Line 152: `children_stable: 7`
- Line 153: `total_proposals: 12`

**But what about failures?** Plan doesn't include `children_with_errors: 3` field.

**Risk:**
- Teacher sees "5 children ready for moves, 7 stable" (12 total)
- Doesn't see 3 children had ERRORS
- Thinks all 19 were analyzed
- Actually only 12 analyzed; 3 failed; 4 not analyzed yet?

**Mitigation (REQUIRED):**

Update response schema:
```json
{
  "success": true,
  "results": [...],
  "summary": {
    "total_analyzed": 19,
    "children_with_proposals": 5,
    "children_stable": 7,
    "children_with_errors": 3,
    "errors": [
      { "childId": "uuid1", "childName": "Kevin", "error": "Network timeout" },
      { "childId": "uuid2", "childName": "Lucky", "error": "Curriculum load failed" },
      { "childId": "uuid3", "childName": "MaoMao", "error": "Haiku timeout" }
    ]
  }
}
```

And display in Results state:
```
🚀 Shelf Autopilot

19 children analyzed
✅ 5 children ready for moves
✓ 7 children — shelf looks good
❌ 3 children had errors

Failed Children:
• Kevin: Network timeout [Retry]
• Lucky: Curriculum load failed [Retry]
• MaoMao: Haiku timeout [Retry]
```

With [Retry] button on each error to re-run just that child.

---

### Issue F2: Generation Fails Entirely [MEDIUM]

**Finding:** What if the Sonnet call dies on the first child? Or curriculum fails to load?

**Current plan answer:** "Route-level AbortController" but no user-facing error message guidance.

**Mitigation:**

Add error states to card:
```
State 1 (Idle):
[Generate Proposals]

State 2 (Generating):
Analyzing... 3/19 children

State 3 (Error):
Failed to generate proposals
[Retry] [Ignore]

State 4 (Results):
5 ready, 7 stable, 3 errors
```

And in error message, include actionable guidance:
```
❌ Failed to analyze the class. Try:
  1. Refresh the page
  2. Check your internet connection
  3. Try again in a few minutes

[Retry] [Close]
```

---

## SECTION G: INTEGRATION WITH EXISTING FEATURES

### Issue G1: Relationship to Photo Audit Page [MEDIUM]

**Finding:** Montree has `/montree/dashboard/photo-audit` where teachers tag photos to works, correct misclassifications.

**Shelf Autopilot proposes new works for shelves.**

**Potential confusion:**
- Teacher sees "Joey needs Spindle Boxes next" from Shelf Autopilot
- But hasn't PRESENTED Spindle Boxes yet (no photo teaching material)
- Should teacher photograph Spindle Boxes first before adding to shelf?

**Current answer:** "All recommended works are from standard curriculum (have photos in classroom setup)."

**Mitigation:** Add context to proposals:
```
Math: Sandpaper Numerals → Spindle Boxes
🎯 Reason: Joey mastered Numerals — next in sequence
📸 Photo exists: You taught this work in setup (Mar 15)
```

Communicates:
- Why the proposal was made
- That the work has been photographed for Smart Capture

---

### Issue G2: Impact on Progress Page [LOW]

**Finding:** `/montree/dashboard/[childId]/progress` shows current focus works, progress timeline.

**When teacher applies a proposal, focus work changes.**

**Mitigation:** This is fine. No changes needed. Focus work upsert will automatically update the progress page on next refresh.

---

## SECTION H: DEPLOYMENT CHECKLIST

### Pre-Ship Requirements

- [ ] **A1: Implement per-child [Apply] buttons** (remove [Apply All], add expandable cards)
- [ ] **A2: Display reason field** for each proposal in UI
- [ ] **B1: Show current work status badges** (Mastered/Practicing/Presented)
- [ ] **B2: Remove score display, show confidence badges only**
- [ ] **C1: Add timestamp** ("Generated 2 hours ago") to results
- [ ] **D1: Expand i18n keys** from 15 to ~18-20
- [ ] **E1: Implement mobile-friendly tabs** or collapsible groups for 19 children
- [ ] **E2: Ensure 44px touch targets** on mobile
- [ ] **F1: Add error summary + retry** for failed children
- [ ] **F2: Add error state** when generation fails entirely
- [ ] **G1: Add "Photo exists" indicator** per proposal

### Nice-to-Have (Post-MVP)

- Integrate with WeeklyAdminCard for cleaner workflow
- Auto-retry failed children after 30s
- Add "Apply to similar children" (if Joey needs Math move, suggest same for other math-low kids)

---

## FINAL ASSESSMENT

| Category | Status | Notes |
|----------|--------|-------|
| **Architecture** | ✅ SOLID | Pure sequencer, JSONB, no new tables, smart cost model |
| **Trust** | ⚠️ NEEDS FIXES | A1 (Apply All), A2 (reasoning), A3 (confidence) — CRITICAL |
| **Information** | ⚠️ NEEDS FIXES | B1 (status), B2 (scores) — HIGH priority |
| **Workflow** | ✅ GOOD | C1 (Monday morning), C2 (overlap with admin card) — clarifications helpful |
| **i18n** | ⚠️ MINOR | D1 — expand key list from 15 to 18-20 |
| **Mobile** | ⚠️ NEEDS FIXES | E1 (scrolling), E2 (touch targets) — HIGH for teacher usage |
| **Error Handling** | ⚠️ NEEDS FIXES | F1 (partial failures), F2 (total failure) — CRITICAL |
| **Integration** | ✅ GOOD | G1 (photo audit context), G2 (progress page) — mostly smooth |

---

## RECOMMENDATION

**APPROVE WITH REQUIRED MODIFICATIONS**

Ship this feature with the CRITICAL fixes (A1, A2, F1, F2) and HIGH fixes (B1, E1). Confidence will be high if teachers can:
1. See WHY each proposal was made (reason field)
2. Apply selectively per child (no landmine "Apply All")
3. Understand confidence + current status of each proposal
4. Navigate 19 children on mobile without tapping through 20 screens

Without these, Shelf Autopilot risks being "cool demo but I won't trust it for my actual shelf."

---

**Estimated Implementation Time:**
- Architecture (work-sequencer, API): 4-5 hours (existing plan)
- UI (per-child cards, reason display, tabs, error states): 3-4 hours
- i18n expansion: 0.5 hours
- Mobile polish: 1-2 hours
- Testing & QA: 2-3 hours
- **Total: ~12-15 hours**

Ready to build? Happy to help with component design.
