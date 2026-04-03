# MONTREE — Project Handoff & Session Brain Dump
## Version 2.0 | March 29, 2026
### Everything a new session needs to continue building

---

## 1. What Is Montree

Montree is an AI-powered classroom intelligence platform for Montessori 3–6 environments. It combines frictionless daily capture (photos, notes, voice memos) with an AI teaching partner called the Guru that processes, structures, and reasons across all classroom data. The Guru doesn't replace the teacher's judgment; it amplifies it. Target pricing: $1,000/month per school.

> **Core Value Proposition:** At $100/month you sell a classroom management tool. At $1,000/month you sell a teaching partner — one that gives teachers back hours every week and improves educational outcomes because every child gets what they need.

---

## 2. What's Built — Component Status

| Component | Details | Status |
|-----------|---------|--------|
| **Curriculum Graph** | 231 exercises, 5 areas (PL 51, S 30, M 47, L 45, C 58). 91 unique skills. 24 root nodes. Full prerequisite chains + cross-area skill bridges. Validated DAG, 0 errors, all nodes reachable. | DONE |
| **V3 Reasoning Engine** | Priority scoring: unblocking +50, bridges +40, area gaps +30, reinforcement +20, age fit +15, curriculum flow +10. Age-appropriateness filter (5 classifications, 0.5yr grace). Note pattern analysis (58 keyword groups). Tier bucketing. 38/38 tests passing. | DONE |
| **Claude API Design** | 10 tool schemas for Claude tool-use: get_child_profile, get_prioritized_recommendations, get_struggling_analysis, get_attention_flags, get_classroom_overview, check_exercise_readiness, find_exercise, get_skill_analysis, compare_children, record_observation. System prompt + full tool dispatcher. | DONE |
| **Guru Chat UI** | Chat-first single-panel design. Warm sand/cream/earth theme. Child selector pills, suggestion chips, typing indicator, observation recording overlay with exercise autocomplete. V3 engine running client-side. Both .jsx (React) and .html (standalone) versions. | DONE |
| **Product Spec** | 10-section specification: vision, entities, Guru behaviour model (batch + conversational), knowledge architecture (3 layers), processing pipeline, 5 workflows, cross-area engine, UI principles, technical considerations, pricing strategy. | DONE |
| **LangGraph Scaffold** | StateGraph architecture with FastAPI streaming endpoint. Voice pipeline design. Production skeleton — not wired to live services. | PARTIAL |
| **Live Claude Integration** | Tool schemas defined but not wired. Guru currently runs hardcoded response engine, not Claude with tool-use. | NOT STARTED |
| **Persistent Data Layer** | No database. All data lives in client-side state. No event sourcing, no multi-session persistence. | NOT STARTED |
| **Capture Pipeline** | No camera, no voice recording, no photo-to-material recognition. Text observation recording only (via chat overlay). | NOT STARTED |
| **Batch Processing** | No "Process All" workflow. No transcription, no material recognition, no batch approval UI. | NOT STARTED |
| **Reporting & Admin** | No monthly updates, no parent conference summaries, no weekly admin template integration. | NOT STARTED |

**Honest assessment:** The brain is ~30% built (reasoning, graph, API design — the hardest intellectual pieces). The body is ~70% remaining (capture, storage, processing, auth, deployment).

---

## 3. V3 Reasoning Engine — Technical Detail

### 3.1 Evolution: V1 → V2 → V3

- **V1 Bug:** Treated skills as binary. If Priya mastered Cylinder Blocks (which develops pincer_grip), engine thought she had pincer grip and couldn't explain why Metal Insets was failing. Fixed in V2.
- **V2 Fix:** Skill Strength Model (count of mastered exercises per skill, threshold <3 triggers bridges). Observation Note Analysis (58 keyword patterns). Graduated Bridge Scoring.
- **V3 Addition:** Priority scoring system. Unblocking stuck exercises +50, cross-area bridges +40, area gaps +30, skill reinforcement +20, age appropriateness +15, curriculum flow +10. Tier bucketing. Age-appropriateness filter with 5 classifications and 0.5yr grace windows.

### 3.2 Core Functions

- **getProfile(child):** Computes mastered/practicing/struggling sets, skill strength scores, area coverage counts, last observation dates per area.
- **analyzeNotes(notes):** 58 keyword groups mapping teacher free-text to skill weaknesses. "Difficulty gripping" → pincer_grip. "Can't seriate" → seriation.
- **getAgeFit(exercise, childAge):** 5 classifications: ideal, slightly_young, too_young, slightly_old, too_old. 0.5yr grace windows. Hard filter on too_young.
- **getInsights(child):** Weak skills (strength <3), bridge exercises from other areas, premature introductions, area imbalance.
- **getFlags(child):** Attention flags: no observations, stale areas (>21d), prolonged struggles (3+ attempts), stalled practicing (>14d).
- **getRecommendations(child):** Full scoring hierarchy. Returns tiered list: urgent (≥40), recommended (≥20), available (≥0). Each item has exercise, score, tier, and reasons array.

### 3.3 Scoring Hierarchy

| Points | Trigger | Example |
|--------|---------|---------|
| +50 | Exercise unblocks a stuck child (its skills are prerequisites for an exercise the child is struggling with) | Brown Stair unblocks Number Rods for Marcus |
| +40 | Cross-area bridge (develops skills the child needs, from a different area) | Bead Stringing (PL) bridges to Metal Insets (L) |
| +30 | Area gap (child has <3 observations in this area) | Culture exercise for a child with no culture work |
| +20 | Skill reinforcement (develops a skill the child has but at low strength) | Second pincer_grip exercise when first is mastered |
| +15 | Ideal age fit (exercise falls in child's typical age range) | 3.5yr-old getting a 3–4yr exercise |
| +10 | Curriculum flow (natural next step in prerequisite chain) | Sandpaper Letters after phonemic awareness is solid |

---

## 4. Development Roadmap

Four phases, ordered by what unlocks the most value soonest.

### Phase 1: Live Guru — Wire the Brain
**Goal:** Replace the hardcoded response engine with Claude tool-use, so the Guru gives real, contextual answers.
**Effort:** 1–2 weeks | **Impact:** Highest | **Spec sections:** §3.1, §3.3, §9.1

1. Build lightweight backend (FastAPI or Express) that accepts chat messages and calls Claude's tool-use API with the 10 tool schemas already defined in guru-api-design.js.
2. Implement tool execution handlers that run V3 engine functions server-side. Claude calls get_prioritized_recommendations → server runs scoring → returns results → Claude composes natural-language answer.
3. Wire streaming responses to existing chat UI (typing indicator already exists).
4. Load system prompt with classroom context: child records, recent observations, curriculum graph summary.

**Deliverable:** Teacher selects a child, asks "What should I present to Amara tomorrow?" and gets a real, evidence-based answer from Claude.

### Phase 2: Persist — Build the Body
**Goal:** Real data that survives page refreshes. Real children, real observations, real progress.
**Effort:** 2–3 weeks | **Impact:** Critical | **Spec sections:** §2, §9.2, §9.3

- Database schema: Children, classrooms, teachers, observations (event-sourced), shelf inventory, curriculum graph (versioned). Postgres/Supabase.
- Authentication: Teacher login, classroom assignment. Email + password or magic link.
- Observation recording API: POST observations, GET child timeline, GET progress summary. Event-sourced.
- Child/classroom management UI: Add/edit children, manage roster, configure shelf inventory.

**Deliverable:** Teacher logs in, sees their roster, records an observation, and it persists and informs the Guru's next response.

### Phase 3: Capture — The Daily Driver
**Goal:** Camera, voice memos, quick notes — all under 3 seconds. Plus batch processing.
**Effort:** 3–4 weeks | **Impact:** Transformative | **Spec sections:** §5.1, §5.2, §3.4, §6.1–6.2

- Camera integration: One-tap photo capture. Mobile-first. No AI during capture.
- Voice recording: Hold-to-record. Transcription in batch, not real-time.
- Batch processing ("Process All"): Transcribe → identify materials (Claude Vision) → child linking → structure → update progress → flag → summary.
- Authority model: Guru proposes, teacher approves. Card-based batch approval: swipe approve, tap drill-in, flag reject.

**Deliverable:** Teacher takes photos and voice notes during the day, taps "Process All", reviews batch output, records are updated.

### Phase 4: Intelligence — The Moat
**Goal:** Automated reporting, parent summaries, shelf management — the $1,000/month features.
**Effort:** 4–6 weeks | **Impact:** Differentiating | **Spec sections:** §5.3, §6.3–6.5, §7

- Monthly update automation: "Do the monthly updates" → reviews all observations, updates records, flags gaps, drafts parent summaries.
- Parent conference reports: Per-child developmental narratives with observation evidence.
- Shelf management: Suggest rotations, flag unused materials, identify needed additions.
- Weekly admin integration: School-specific document templates.
- Intelligence loop: Teacher corrections refine the graph. Aggregate insights across schools.

**Deliverable:** "Summarise this term for parent conferences" produces polished, per-child narratives backed by real observation evidence.

### 4.5 Timeline Overview

| Phase | Duration | Target | Demo Milestone |
|-------|----------|--------|----------------|
| 1. Live Guru | 1–2 weeks | April 2026 | Real Claude answers about any child |
| 2. Persist | 2–3 weeks | May 2026 | Real data, real children, survives sessions |
| 3. Capture | 3–4 weeks | Jun–Jul 2026 | Photos + voice in, structured data out |
| 4. Intelligence | 4–6 weeks | Aug–Sep 2026 | Automated reports, parent summaries |

**Total: 10–15 weeks to feature-complete.** Phase 1 alone produces the investor demo / teacher pilot in under 2 weeks.

### 4.6 Technical Decisions (Decide Before Phase 2)

**Recommendation:** Next.js + Supabase + PWA. Fastest path with one developer. Can extract to native later.

- Hosting: Vercel + Supabase (managed Postgres, auth, storage) vs Railway/Render (more portable).
- Frontend: React/Next.js (prototype is already React) vs React Native/Expo (better camera/voice, bigger lift).
- Backend: Next.js API routes (monorepo simplicity) vs FastAPI (better for heavy AI orchestration).
- Mobile: PWA first (ship fast, web APIs for camera/mic) vs native app (better capture UX, more engineering).

---

## 5. Product Decisions — Already Made

These were discussed and agreed upon. Don't re-litigate.

| Decision | Rationale |
|----------|-----------|
| 3–6 only | Most established Montessori environment, clearest curriculum structure |
| No facial recognition | Teacher confirms which child is in photos. Privacy-first. Material identification only. |
| Batch processing, not real-time AI | No AI during classroom hours. Capture is frictionless. Process end of day/week. |
| Guru proposes, teacher confirms | Batch approval with drill-down. No permanent changes without teacher sign-off. |
| Transparent reasoning always | Guru shows its thinking chain on every suggestion. Builds trust, catches errors. |
| Camera + Notes as primary UI | Side by side, most prominent. Notes = teacher's to-do list. Under 3 seconds. |
| Brain icon = Guru chat | One tap. Always visible. Chat-first, not dashboard. |
| $1,000/month per school | Value prop is teaching partner, not record-keeping tool. |
| Warm light theme | Sand/cream/earth tones. Dark theme rejected ("looks like the dark web"). |
| Chat-first, not dashboard | Teachers are tired and want ONE thing to look at. Single panel, not tabs. |

---

## 6. Three-Layer Knowledge Architecture

- **Layer 1 — Universal Montessori Graph (BUILT):** 231-exercise DAG. Prerequisites, skills, cross-area bridges. The proprietary asset.
- **Layer 2 — School Configuration (NOT BUILT):** What's on the shelves, training tradition (AMI/AMS), age composition, school-specific adaptations.
- **Layer 3 — Living Child Data (SAMPLE ONLY):** Every observation, photo, note, voice memo. 4 sample children in test harness. Need real persistence.

> **Compounding Data Advantage:** Layers 2+3 create natural switching costs. The longer a school uses Montree, the smarter the Guru becomes. This isn't artificial lock-in — it's accumulated intelligence.

---

## 7. File Inventory

| File | Contains | Carry Forward? |
|------|----------|---------------|
| **montree-curriculum-graph.json** | 231-exercise DAG. Prerequisites, skills, age ranges, cross-area bridges. | YES – core |
| **guru-engine-v3-test.js** | V3 reasoning engine + 38 tests. All scoring, filtering, analysis logic. | YES – core |
| **guru-api-design.js** | 10 Claude tool schemas + system prompt + tool execution dispatcher. | YES – core |
| **montree-guru-prototype.jsx** | React chat UI with V3 engine integrated. Warm theme. Observation recording. | YES – UI base |
| **montree-guru-prototype.html** | Standalone HTML demo with full V3 engine running client-side. | Demo only |
| **langgraph-scaffold.py** | LangGraph + FastAPI architecture sketch. | Reference |
| **Montree_Product_Spec_v1.docx** | Full product vision, 10 sections + appendix. | YES – north star |
| **Montree_Development_Roadmap.docx** | Roadmap as standalone document. Phases, timeline, decisions. | YES – plan |
| **Montree_Handoff_v2.md** | THIS DOCUMENT. Complete brain dump for session continuity. | YES – carry always |

---

## 8. Surgery Map — Exact Code Architecture

> **CRITICAL: BUILD ON EXISTING CODE. Do NOT create new files from scratch. The files below are the codebase. Modify them, wire them together, extend them.**

### 8.1 montree-guru-prototype.jsx (713 lines) — THE UI

This is the React chat interface. It has three layers inside it:

- **Lines 7–49: Compressed exercise data (~40 exercises).** REPLACE with a fetch to the full 231-exercise graph (montree-curriculum-graph.json), or load it from the backend API.
- **Lines 60–88: NOTE_PATTERNS (keyword groups).** KEEP — these are the V3 note analysis patterns. But the canonical copy is in guru-engine-v3-test.js (58 groups vs 40 here). Use the test file's version on the server.
- **Lines 93–400: V3 engine functions (getProfile, getInsights, getFlags, getRecommendations).** These MOVE to the server. They currently run client-side. In Phase 1, the server runs them and Claude calls them as tools.
- **Lines 455–570: generateGuruResponse().** This is the HARDCODED response engine. It pattern-matches the query and returns canned HTML. **THIS IS WHAT GETS REPLACED** by Claude API calls. Delete this function and replace with a fetch to the backend.
- **Lines 570–713: React UI components (chat panel, child pills, suggestion chips, observation overlay).** KEEP ALL OF THIS. This is the UI chrome. It just needs its sendMessage function rewired to call the API instead of generateGuruResponse.

### 8.2 guru-api-design.js (1206 lines) — THE API CONTRACT

This file has everything needed to wire Claude:

- **GURU_TOOLS array (lines 21–300):** 10 tool schemas in Claude API format. Copy directly into the Anthropic SDK messages.create() call.
- **getGuruSystemPrompt() (lines ~300–400):** The system prompt that makes Claude a Montessori expert. Use as-is.
- **executeToolCall() dispatcher (lines ~400–600):** Maps tool names to engine functions. This IS the tool execution loop — it's already written.
- **Sample conversations (lines ~600–1206):** End-to-end examples showing how Claude calls tools and composes answers. Use as test cases.

### 8.3 guru-engine-v3-test.js (1152 lines) — THE ENGINE

This is the canonical V3 reasoning engine plus 38 tests. The engine functions here are the authoritative versions (the .jsx has a compressed copy). In Phase 1, extract the engine functions from this file and run them server-side. The tests validate correctness.

### 8.4 montree-curriculum-graph.json (6695 lines) — THE GRAPH

231 exercises. The server loads this at startup. The V3 engine functions query it. Do not rebuild it. The .jsx has a 40-exercise compressed subset — in production, the server serves the full graph and the client doesn't need a local copy.

---

## 9. What to Do Next Session

> **START HERE. Phase 1, Sprint 1: Wire Claude tool-use to the existing V3 engine and chat UI. Build ON these files, not from scratch.**

Specific task list:

1. **Create server.js (Express):** Import the V3 engine functions FROM guru-engine-v3-test.js (refactor exports). Import tool schemas and dispatcher FROM guru-api-design.js. Load montree-curriculum-graph.json at startup. Single POST /api/chat endpoint.
2. **Wire the Anthropic SDK:** npm install @anthropic-ai/sdk. Use getGuruSystemPrompt() from guru-api-design.js. Use GURU_TOOLS array from guru-api-design.js. Use executeToolCall() from guru-api-design.js. Almost zero new code here — it's already written.
3. **Modify montree-guru-prototype.jsx:** Delete generateGuruResponse() (lines 455–570). Replace with async function that POSTs to /api/chat. Keep all UI components (lines 570–713) untouched. Remove inline EXERCISES data (lines 7–49).
4. **Add streaming:** Server sends SSE/streaming response. Client reads chunks and updates the chat in real-time (typing indicator already exists in the .jsx).
5. **Test with existing sample data:** "What should I present to Amara?" "Who's struggling?" "Show me Liam's progress." Use the 4 sample children from guru-engine-v3-test.js. Verify Claude uses tools correctly and shows transparent reasoning.

---

## 10. Working with Tredoux — Notes for AI

If a new AI session picks this up, here's what to know about the product owner:

- **Strong product instincts.** Trusts his gut. Prefers building and testing over planning.
- **Wants to be theorized with, not lectured at.** Engage as a thinking partner. Share reasoning, invite pushback.
- **The cross-area analysis is THE feature.** It's what justifies $1,000/month. Never lose sight of this.
- **Teachers are tired.** One thing to look at. Chat-first. Not a dashboard. He's been very clear on this.
- **Dark theme = rejected.** "Looks like something off the dark web." Warm, light, earth tones only.
- **Honest about being out of his depth technically.** Wants honest assessments, not sugar-coating. But he understands the product deeply.
- **Guru must have access to everything.** "Every nook and cranny." Full context, nothing hidden.

---

## Session Continuity

Upload this document at the start of any new session. It contains everything needed to continue building without re-explaining the vision, the architecture, or the decisions. The curriculum graph JSON and V3 test harness are the two files that must always be loaded alongside it.

**Last updated:** March 29, 2026 — End of Session 2. V3 engine complete, 231 exercises, roadmap defined, ready for Phase 1.
