# Handoff: Guru-Guided Home Parent Experience + Voice Notes

**Date:** February 19, 2026
**Status:** Design complete, implementation not started
**Design Doc:** `Montree_Home_Guru_Design.docx` (project root)
**Design Philosophy:** `Tender_Cartography.md` (project root — for future Montree visual materials)
**Quote Poster:** `Montree_Montessori_Quote.pdf` + `.png` (project root)

---

## What Was Done This Session

### 1. Deep Codebase Audit

Thoroughly audited the current state of the homeschool system, Guru, and billing. Key findings:

**CRITICAL BLOCKER — Migrations 126, 127, 131 are STILL not run against Supabase.**
- Migration 126: `role` column on `montree_teachers` + `school_id` on `montree_children` — without this, homeschool parent signup crashes immediately
- Migration 127: Guru billing columns (`guru_plan`, `guru_prompts_used`, Stripe IDs) — without this, Guru freemium/billing fails
- Migration 131: Onboarding system tables — without this, onboarding API calls fail
- **This has been deferred across 4+ sessions. Nothing else works until these run.**

**Stripe is completely unconfigured.**
- Zero Stripe env vars set locally or on Railway
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_GURU_MONTHLY`, `STRIPE_WEBHOOK_SECRET_GURU` — all missing
- Checkout and webhook code exists but crashes on call

**Freemium gate is off.**
- `GURU_FREEMIUM_ENABLED` not set, defaults to `false`
- All users currently get unlimited Guru for free

**Homeschool code IS complete but untested:**
- "Parent at Home" button exists on try page
- `try/instant` route handles `role: 'homeschool_parent'`
- Auth route returns role in response
- `isHomeschoolParent()` helper exists in `lib/montree/auth.ts`
- Dashboard UI trimming (labels, hidden features) all wired
- BUT none of this can execute without migration 126

### 2. Guru Integration Design

Created comprehensive design document (`Montree_Home_Guru_Design.docx`) covering:

**Core Concept:** The existing interface stays exactly the same. The Guru becomes contextually present on every screen for homeschool parents only — teachers never see any of this (gated behind `isHomeschoolParent()`).

**Three New UI Primitives:**
1. **GuruContextBubble** — Floating emerald tooltip with contextual advice. Appears once per context, remembers dismissals.
2. **GuruInlinePrompt** — "Ask Guru" button next to work cards/areas. One-tap sends pre-formed question with child data attached.
3. **GuruSuggestionCard** — Proactive recommendation: "Lily mastered Pouring. Try Spooning next." One-tap "Add to Focus."

**New API Endpoints:**
- `/api/montree/guru/contextual` — Lightweight endpoint using Claude Haiku for 2-3 sentence contextual tips. Cached aggressively (24h TTL, invalidated on progress change).
- `/api/montree/guru/suggest` — Work suggestion engine based on child's current progress + age.
- `/api/montree/voice/transcribe` — Whisper API transcription for voice notes.

**Model Strategy:**
- Full Guru chat stays on Claude Sonnet (existing)
- Contextual tips use Claude Haiku (fast + cheap, ~$0.001/response)
- Full Anthropic model lineup available (Haiku, Sonnet, Opus) — not limited to any single model

**Screen-by-Screen Integration (homeschool parents only):**
- **Child Week View:** Guru icon per work card (presentation guide), status change guidance, "What's Next" on mastery, guided note prompts
- **Curriculum Page:** "What is this?" per area, suggested works in WorkPickerModal
- **Curriculum Browser:** "Guide Me" side panel, "How to present this?" per work
- **Dashboard:** Daily Guru briefing card (generated daily, cached)
- **Progress Page:** Weekly summary, contextual area tips
- **Observations:** Auto-analysis after submission
- **Guru Chat:** Dynamic suggested questions based on child's current state, voice input

**Welcome Sequence:**
- Triggers on first login when child has zero work progress
- Guru enters "onboarding mode" with special system prompt
- Asks about home environment, goals, child's interests
- Generates personalised starter set of 5-7 age-appropriate works
- Saves to guru_interactions for future context

### 3. Voice Notes Design

**Stack:** `react-media-recorder` (64K weekly downloads, actively maintained) + OpenAI Whisper API (`OPENAI_API_KEY` already in env)

**Flow:** Tap mic → record (pulsing red indicator) → tap stop → audio blob sent to Whisper → transcript appears in text field → optional Guru Enhancement (restructures raw speech into structured Montessori observation)

**Where it appears:**
1. Work session notes (child week view)
2. Behavioral observations (ABC form)
3. Standalone quick notes (floating mic button)
4. Guru chat input

**Tech details:**
- MediaRecorder API with format detection: `audio/webm;codecs=opus` preferred, WAV fallback for older Safari
- iOS Safari 18.4+ supports WebM/Opus (finally)
- Whisper API: $0.006/minute, 99+ languages
- New table: `montree_voice_notes` (id, child_id, teacher_id, work_name, audio_url, raw_transcript, enhanced_transcript, duration_seconds, created_at)
- New component: `VoiceNoteButton` — reusable, accepts `onTranscript` callback

**Guru Enhancement Example:**
- Raw: "Lily tried the pink tower today she stacked like 8 blocks right but the top ones kept falling and she got mad and left but came back and tried again"
- Enhanced: "Pink Tower: Lily successfully stacked 8/10 blocks with correct size discrimination. Struggled with smallest cubes (fine motor developing). Showed frustration but self-regulated — returned independently after 5 minutes. Strong sign of concentration development."

### 4. Monetisation Model (Updated)

**New model discussed:** Credits-based instead of flat subscription.
- Parents top up credits via Stripe ($5/$10/$20)
- Every API call deducts at 2x actual cost
- $2/month base fee covers hosting
- Simpler launch path: keep existing $5/child/month code, migrate to credits later with real usage data

**Free tier (hook):**
- Full work tracking + curriculum browser (free forever, costs nothing)
- 3 lifetime Guru chats
- First 5 contextual bubbles per area
- 3 voice transcriptions/week
- Full welcome sequence (one-time)

**Paid tier:**
- Unlimited Guru chat, contextual tips, voice notes, daily briefings, observation analysis

### 5. Visual Asset Created

**Montessori Quote Poster:**
- "Never help a child with a task at which he feels he can succeed." — Maria Montessori
- Montree brand colors (deep teal #0D3330, emerald #059669, warm cream)
- Design: "Tender Cartography" — botanical specimen plate aesthetic
- Phyllotaxis (Fibonacci) seed pattern at bottom (nature → Montessori philosophy)
- Framed as naturalist's field study: "Observation No. 1"
- Output: PDF + high-res PNG

---

## Implementation Order (Revised After Audit)

### Step 0: BLOCKER — Run Migrations (5 minutes)
```bash
psql $DATABASE_URL -f migrations/126_homeschool_tables.sql
psql $DATABASE_URL -f migrations/127_guru_freemium.sql
psql $DATABASE_URL -f migrations/131_onboarding_system.sql
```

### Step 1: Test Homeschool Flow End-to-End (30 min)
- Go to montree.xyz → Try Free → "Parent at Home"
- Create account, log in, verify dashboard UI trimming
- Add a child, open Guru, ask a question
- Fix whatever breaks

### Step 2: Set Up Stripe (1 hour)
- Create products/prices in Stripe dashboard
- Set env vars on Railway: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_GURU_MONTHLY`, `STRIPE_WEBHOOK_SECRET_GURU`
- Optionally set `GURU_FREEMIUM_ENABLED=true` to activate paywall

### Step 3: Voice Notes (3-4 hours)
- `npm install react-media-recorder`
- Create `VoiceNoteButton` component
- Create `/api/montree/voice/transcribe` route
- Create migration 132 (`montree_voice_notes` table)
- Wire mic button into work notes, observations, Guru chat

### Step 4: Contextual Guru API (3-4 hours)
- Create `/api/montree/guru/contextual` endpoint (Haiku)
- Create `/api/montree/guru/suggest` endpoint
- Create migration 133 (`montree_guru_cache` table)
- Build prompt templates in `lib/montree/guru/contextual-prompts.ts`

### Step 5: Guru UI Components (4-5 hours)
- `GuruContextBubble`, `GuruInlinePrompt`, `GuruSuggestionCard`
- Wire into child week view, curriculum, dashboard, progress, observations
- All gated behind `isHomeschoolParent()` — teachers never see any of it

### Step 6: Welcome Sequence (2-3 hours)
- Onboarding mode system prompt
- Starter works generator (age-filtered from static JSON)
- Dynamic suggested questions in Guru chat

### Step 7: Credits Billing (6-8 hours, or defer)
- `montree_credits` + `montree_credit_usage` tables
- Stripe top-up flow
- Balance check middleware
- Usage dashboard

**Total: ~20-25 hours across 7 steps. Steps 0-2 are blockers. Steps 3-4 can run in parallel.**

---

## Files Created This Session

| File | Purpose |
|------|---------|
| `Montree_Home_Guru_Design.docx` | Comprehensive design document (10 sections, tables, callout boxes) |
| `Tender_Cartography.md` | Design philosophy for Montree visual materials |
| `Montree_Montessori_Quote.pdf` | Montessori quote poster (Montree branded) |
| `Montree_Montessori_Quote.png` | Same poster as high-res PNG |
| `docs/HANDOFF_GURU_HOME_INTEGRATION_FEB19.md` | This handoff document |

---

## Key Decisions Made

1. **Guru integration is homeschool-only** — All contextual components gated behind `isHomeschoolParent()`. Teachers keep existing professional Guru as-is.
2. **Voice notes use OpenAI Whisper** — Already have API key, $0.006/min, no new accounts needed.
3. **Contextual tips use Haiku** — Fast, cheap (~$0.001/response), full Sonnet for main Guru chat stays.
4. **Credits model deferred** — Launch with existing $5/child subscription, migrate to credits once real usage data exists.
5. **Migrations are the blocker** — Must run 126, 127, 131 before anything else. This has been the #1 priority for multiple sessions.
6. **react-media-recorder for audio** — 64K weekly downloads, actively maintained, clean hook API.
