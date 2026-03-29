# HANDOFF: V3 Guru Intelligence Integration
## March 29, 2026 — Integration Plan for Production Codebase

---

## 1. SITUATION

Montree has two separate guru implementations that need to become one:

**Production App** (whale folder, deployed at montree.xyz):
- Full Next.js + Supabase app, live with schools looking at it
- Guru system: 19 tools, brain learning, work sequencer, context builder, conversational prompts
- Curriculum: 270 works across 5 JSON stem files + curriculum loader
- Smart Capture: CLIP photo recognition, Haiku/Sonnet vision pipeline
- Teacher OS: attendance, stale works, conference notes, evidence, pulse reports

**V3 Research** (standalone files in `docs/montree-v3-research/`):
- 231-exercise DAG with prerequisite chains and cross-area skill bridges (`montree-curriculum-graph.json`)
- Priority scoring engine with 8-factor ranking (`guru-engine-v3-test.js`, 38 tests passing)
- 10 Claude tool schemas with system prompt + dispatcher (`guru-api-design.js`)
- Chat UI prototype (`montree-guru-prototype.jsx` + `.html`)
- Product spec + roadmap documents

**The Gap:** The production guru's `work-sequencer.ts` (319 lines) does basic shelf proposals — sequence proximity, area balance, mastery bonus. The V3 engine does priority scoring with cross-area bridges, note analysis, and attention flags. V3 is significantly smarter about *what to present next*.

---

## 2. WHAT V3 HAS THAT PRODUCTION DOESN'T

### 2.1 Priority Scoring System (V3's core innovation)
Production `work-sequencer.ts` scores candidates with: sequence proximity + area balance + mastery bonus.
V3 scores with 8 factors (6 bonuses + 2 penalties):
| Points | Trigger | Why it matters |
|--------|---------|----------------|
| +50 | Unblocking — exercise develops skills needed by a stuck child | Highest urgency: child is blocked |
| +40 | Cross-area bridge — develops needed skills from a different area | THE differentiator for premium pricing |
| +30 | Area gap — child has <3 observations in this area | Prevents tunnel vision |
| +20 | Skill reinforcement — strengthens a weak skill | Builds foundation |
| +15 | Age-appropriate — falls in child's typical range | Developmental fit |
| +10 | Curriculum flow — natural next in prerequisite chain | Sequence alignment |
| -10 | Age penalty — exercise is slightly outside child's age range | Soft discouragement |
| -30 | Age hard block — exercise is >1 year above child's age | Hard filter |

### 2.2 Cross-Area Bridge Detection
When a child struggles with Language (e.g., Metal Insets), V3 traces back through the skill graph to find that pincer_grip is weak, then recommends Practical Life exercises (Spooning, Threading) that develop that skill. Production doesn't do this.

### 2.3 Note Analysis (60 keyword patterns)
V3 maps teacher free-text observations to skill weaknesses:
- "difficulty gripping" → pincer_grip, fine_motor, tripod_grip
- "loses count" → one_to_one_correspondence, number_sequence
- "can't seriate" → seriation, visual_discrimination
Production has no observation-to-skill mapping.

### 2.4 Attention Flags
V3 detects: stale areas (>21 days without observation), prolonged struggles (3+ attempts), area imbalance (>60% in one area), no recent observations. Production's `DailyBriefPanel.tsx` does some of this but not with skill-level granularity.

### 2.5 Age-Appropriateness Filter
V3 classifies exercises into 5 age-fit categories (ideal, slightly_young, too_young, slightly_old, too_old) with 0.5-year grace windows. Hard-filters exercises >1 year above child's age. Production doesn't filter by age.

---

## 3. PRODUCTION FILES TO MODIFY (the surgery map)

### 3.1 `lib/montree/guru/work-sequencer.ts` (319 lines) — ENHANCE
**Current:** `generateShelfProposals()` scores via sequence proximity + area balance + mastery bonus.
**Target:** Add V3's 6-factor scoring, cross-area bridge detection, and age filter.
**How:** Import skill-to-exercise mapping (derived from curriculum graph). Add `scoreCandidate()` with the 8 factors (6 bonuses + 2 penalties). Add `findCrossAreaBridges()`. Add `analyzeNotes()` with 60 keyword patterns. Keep existing `ShelfProposal` interface (which already has `score`, `reason`, `confidence`), ADD new fields: `v3_score`, `tier`, `reasons[]`, `bridge_from_area?`. Existing consumers continue working — new fields are additive only.
**Fallback:** If a child has no skill data (e.g., only does production-only works), gracefully degrade to existing 3-factor scoring (sequence proximity + area balance + mastery bonus). Log `[V3] No skill data, using legacy scoring`.
**Reference:** `guru-engine-v3-test.js` — `getPrioritizedRecommendations()` (8-factor scoring), `analyzeNotes()` (60 patterns), `detectCrossAreaInsights()` (bridge detection).

### 3.2 `lib/montree/guru/tool-definitions.ts` (552 lines) — EXTEND
**Current:** 19 tools (9 action, 3 curriculum read, 1 custom work, 3 classroom, 1 analytics, 2 daily activity).
**Target:** Add V3's missing tool types that don't overlap.
**New tools to add (4):**
- `get_prioritized_recommendations` — Top-N exercises ranked by V3 scoring (doesn't exist in production)
- `get_struggling_analysis` — Deep dive into why a child is stuck + cross-area bridges (doesn't exist)
- `get_attention_flags` — Morning briefing alerts with skill-level granularity (production has daily-brief but not skill-level)
- `get_skill_analysis` — How strong is a specific skill across all exercises (doesn't exist)
**DO NOT add:** `get_child_profile` (covered by existing context builder), `get_classroom_overview` (already exists), `find_exercise` (covered by `search_curriculum`), `compare_children` (already exists as `group_students`), `record_observation` (already exists as `save_observation`), `check_exercise_readiness` (can be derived from existing tools).
**Reference:** `guru-api-design.js` lines 1-200 (tool schemas).

### 3.3 `lib/montree/guru/tool-executor.ts` (1,585 lines) — EXTEND
**Current:** Executes 19 tools against Supabase.
**Target:** Add execution handlers for the 4 new tools.
**How:** Each new tool calls the enhanced work-sequencer or new skill-analysis functions. `get_prioritized_recommendations` calls `generateShelfProposals()` (now with V3 scoring). `get_struggling_analysis` calls new `analyzeStruggles()` function. `get_attention_flags` calls new `generateAttentionFlags()` function. `get_skill_analysis` calls new `analyzeSkillStrength()` function.

### 3.4 `lib/montree/guru/conversational-prompt.ts` (1,100 lines) — MINOR EDIT
**Current:** Warm conversational system prompt with psychological depth.
**Target:** Add cross-area reasoning instruction so Claude knows to USE the bridge tools.
**How:** Add ~20 lines to TOOL_USE_INSTRUCTIONS explaining: "When a child is struggling, always check for cross-area skill bridges before recommending more of the same area. Use get_struggling_analysis to find prerequisite gaps."

### 3.5 NEW FILE: `lib/montree/guru/skill-graph.ts` — CREATE
**Purpose:** Skill-to-exercise mapping derived from the V3 curriculum graph. This is the data layer that powers cross-area bridge detection.
**Contents:**
- `SKILL_EXERCISE_MAP`: Maps each of 91 skills to exercises that develop it
- `EXERCISE_SKILL_MAP`: Maps each exercise to skills it develops/requires
- `getSkillStrength(childProgress, skillName)`: Count mastered exercises for a skill
- `findBridgeExercises(weakSkills, currentArea)`: Find exercises in OTHER areas that develop needed skills
- `analyzeNotes(notes)`: 58 keyword patterns → skill weakness detection
**Source data:** Reconciled from `montree-curriculum-graph.json` (231 exercises) mapped to production curriculum (270 works). The production curriculum has 39 more works; the V3 graph has richer skill metadata. Reconciliation means: for each V3 exercise, find the matching production work by name/key, and carry over the skill data.

---

## 4. CURRICULUM RECONCILIATION

**V3 graph:** 231 exercises with skills_developed, skills_required, prerequisites, successors, age ranges.
**Production:** 270 works across 5 JSON files (practical_life.json, sensorial.json, mathematics.json, language.json, cultural.json) with categories, guides, materials — but NO skill metadata and NO cross-area prerequisite links.

**Reconciliation approach:**
1. Map V3 exercise names to production work_keys (most will match by name with minor normalization)
2. For the ~231 that match: carry over skills_developed, skills_required, age_range from V3 graph
3. For the ~39 production works not in V3: leave without skill data initially (they still work in the existing system)
4. Store the reconciled skill data in `skill-graph.ts` as a static map (no migration needed)
5. Over time, teachers' observations + corrections will fill in skill data for the remaining 39 works

**DO NOT:** Replace the production curriculum files. They power the entire existing system (classroom setup, reports, photo audit, etc.). The skill graph is an OVERLAY, not a replacement.

---

## 5. WHAT NOT TO TOUCH

- `app/api/montree/guru/route.ts` — The main guru route orchestration stays. New tools plug in via tool-definitions + tool-executor.
- `lib/montree/guru/brain.ts` — Brain learning system stays unchanged.
- `lib/montree/guru/context-builder.ts` — Context building stays unchanged.
- `lib/montree/guru/knowledge-retriever.ts` — Knowledge retrieval stays unchanged.
- `lib/montree/classifier/*` — CLIP/SigLIP photo recognition is separate, don't touch.
- `app/api/montree/guru/photo-insight/*` — Smart Capture pipeline is separate, don't touch.
- `components/montree/guru/*` — Chat UI components stay. New tools surface through existing chat.
- ALL curriculum JSON files — Don't modify. Skill graph is an overlay.
- ALL migrations, auth, dashboard, parent portal — Don't touch.

---

## 6. SPRINT PLAN

### Sprint 1: Skill Graph + Note Analysis
- Create `lib/montree/guru/skill-graph.ts`
- Reconcile V3 exercise→skill mappings with production work_keys
- Implement `analyzeNotes()` with 60 keyword patterns
- Implement `getSkillStrength()` and `findBridgeExercises()`
- Test: verify bridge detection finds PL→Language connections

### Sprint 2: Enhanced Work Sequencer
- Refactor `work-sequencer.ts` to use V3's 8-factor scoring
- Add age-appropriateness filter
- Add cross-area bridge scoring
- Keep existing `ShelfProposal` interface, extend with score/tier/reasons
- Test: verify scoring produces different (better) results than current

### Sprint 3: New Tools + Wiring
- Add 4 new tool definitions to `tool-definitions.ts`
- Add 4 execution handlers to `tool-executor.ts`
- Add cross-area reasoning instruction to `conversational-prompt.ts`
- Test: end-to-end — ask Guru "What should I present to [child] next?" and verify it uses V3 scoring

### Sprint 4: Attention Flags + Polish
- Implement `generateAttentionFlags()` with skill-level granularity
- Wire into DailyBriefPanel or create new morning briefing view
- Audit all changes (3×3 cycle)
- Update CLAUDE.md with new files and architecture

---

## 7. FILES REFERENCE

### V3 Research Files (in `docs/montree-v3-research/`)
| File | What | Use |
|------|------|-----|
| `montree-curriculum-graph.json` | 231-exercise DAG with skills | Source for skill-graph.ts |
| `guru-engine-v3-test.js` | V3 engine + 38 tests | Reference for 8-factor scoring logic |
| `guru-api-design.js` | 10 tool schemas + system prompt | Reference for new tool definitions |
| `montree-guru-prototype.jsx` | React chat UI | Reference only — production UI already exists |
| `montree-guru-prototype.html` | Standalone chat UI | Reference only |
| `Montree_Product_Spec_v1.docx` | Full product vision | Reference for intent |
| `Montree_Development_Roadmap.docx` | Phased plan | Reference for priorities |
| `Montree_Handoff_v2.md` | Previous handoff (standalone focus) | Superseded by this document |

### Production Files to Modify
| File | Lines | Action |
|------|-------|--------|
| `lib/montree/guru/work-sequencer.ts` | 319 | ENHANCE with V3 8-factor scoring |
| `lib/montree/guru/tool-definitions.ts` | 552 | ADD 4 new tools |
| `lib/montree/guru/tool-executor.ts` | 1,585 | ADD 4 execution handlers |
| `lib/montree/guru/conversational-prompt.ts` | 1,100 | ADD ~20 lines cross-area instruction |

### New File to Create
| File | Purpose |
|------|---------|
| `lib/montree/guru/skill-graph.ts` | Skill-exercise mapping, bridge detection, note analysis |

---

## 8. CRITICAL RULES

1. **BUILD ON EXISTING CODE.** Do not create a new app, new framework, or new architecture. The production app is live.
2. **The skill graph is an OVERLAY.** It adds intelligence on top of the existing curriculum. It does NOT replace the JSON stem files.
3. **Follow the 3×3 audit cycle.** Build → audit (3 agents) → fix → audit → fix → audit → CLEAN before moving to next sprint.
4. **Test against real data.** The production database has real children (Austin, Jimmy, Joey, etc. in classroom 945c846d). Use their actual progress data to verify V3 scoring produces better recommendations.
5. **Don't break what works.** The existing guru, Smart Capture, photo audit, reports, weekly admin — all stay working. Run the app after each sprint to verify.
6. **This folder is home.** All work happens in the whale folder. No side projects, no standalone prototypes.

---

## 9. HOW TREDOUX WORKS

- Wants aggressive audit cycles (plan → audit → re-plan → audit, 3× minimum)
- Expects clear handoff docs after every sprint
- Cares deeply about the product — this is a real classroom tool for real teachers
- Will push back hard if you're building in the wrong place or creating new files from scratch
- Values honesty about what's broken over optimistic summaries
- The app is LIVE — schools are looking at it. Don't break production.
