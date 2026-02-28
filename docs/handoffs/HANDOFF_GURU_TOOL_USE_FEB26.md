# HANDOFF: Guru Tool-Use Implementation (Guru-Driven Home System)

**Date:** February 26, 2026
**Status:** Plan FINAL (v4.1) — ready for implementation
**Plan file:** `docs/CONCEPT_GURU_DRIVEN_HOME_SYSTEM_V4.md`
**Estimated build time:** 11-14 hours

---

## What This Is

Transform the Guru from a text-only Q&A into an **autonomous orchestrator** for homeschool parents. The Guru will use Anthropic tool-use (function calling) to manage a child's Montessori shelf, track progress, save observations, and run weekly check-ins — all through natural conversation.

**Parents never touch the backend.** They just chat with the Guru.

Teachers are completely unaffected — zero changes to structured UI.

---

## Plan Evolution

The plan went through **2 full audit cycles** against the live codebase:

1. **v2.1** → Original concept doc
2. **v3** → Full rewrite after deep codebase audit (18+ files read, all schemas verified from migration SQL)
3. **v4** → v3 + Cycle 1 audit corrections (14 findings, 10 applied)
4. **v4.1 (FINAL)** → v4 + Cycle 2 audit corrections (API timeout, curriculum validation, empty response fallback)

Key things verified against actual code:
- `montree_child_focus_works` has exactly 7 columns (NO `classroom_id`, NO `work_id`)
- `@anthropic-ai/sdk@0.71.2` fully supports tool_use (all types verified in .d.ts)
- `montree_behavioral_observations` FK references wrong table (`children` not `montree_children`)
- Guru route response format: `{ success, insight, interaction_id, conversational }`
- GuruChatThread reads `data.insight` only — no `data.actions` handling exists yet

---

## Pre-Requisite Fixes (Do These First)

### Fix 0a: focus-works/route.ts sends non-existent columns
**File:** `app/api/montree/focus-works/route.ts` lines 125-133
**Action:** Remove `classroom_id` and `work_id` from the upsert object (2 lines removed)

### Fix 0b: FK references wrong table
**File:** New migration `migrations/133_fix_fk_references.sql`
**Action:** Drop and recreate FK constraints on `montree_behavioral_observations` AND `montree_guru_interactions` to reference `montree_children(id)` instead of `children(id)`

---

## Implementation Order

```
Phase 0: Pre-requisite fixes              (~30 min)
Phase 1: Context + Settings helper         (~30 min)  - 2 files
Phase 2: Tool definitions                  (~1 hour)  - 1 new file
Phase 3: Tool executor                     (~2 hours) - 1 new file
Phase 4: Multi-turn loop in guru route     (~3 hours) - 1 modified file
Phase 5: Enhanced prompts (mode detection) (~2 hours) - 1 modified file
Phase 6: Frontend action chips             (~1 hour)  - 2 modified files
Phase 7: Dashboard guru-first view         (~1 hour)  - 2 modified files
```

---

## Files Summary

### New Files (3)
| File | Lines | Purpose |
|------|-------|---------|
| `lib/montree/guru/tool-definitions.ts` | ~135 | 6 tool schemas (set_focus_work, clear_focus_work, update_progress, save_observation, save_checkin, save_child_profile) |
| `lib/montree/guru/tool-executor.ts` | ~150 | Executes tools against Supabase. Curriculum validation, enum checks, first-mastery/first-presentation protection |
| `lib/montree/guru/settings-helper.ts` | ~30 | Read-merge-write for `montree_children.settings` JSONB |

### Modified Files (7)
| File | Lines Added | Purpose |
|------|-------------|---------|
| `app/api/montree/guru/route.ts` | +110 | Multi-turn tool loop, timeout wrapper, cost logging, settings fetch |
| `lib/montree/guru/conversational-prompt.ts` | +80 | 3 modes (INTAKE/CHECKIN/NORMAL) + tool-use instructions |
| `lib/montree/guru/context-builder.ts` | +20 | Fetch focus works, add to ChildContext interface |
| `components/montree/guru/GuruChatThread.tsx` | +15 | Actions array in ChatMessage interface |
| `components/montree/guru/ChatBubble.tsx` | +20 | Action chips (green success / red failure) |
| `app/montree/dashboard/page.tsx` | +30 | Guru-first view for parents, multi-child tabs |
| `components/montree/DashboardHeader.tsx` | +10 | Advanced View toggle |

### Pre-Requisite Fixes (2 + 1 migration)
| File | Change |
|------|--------|
| `app/api/montree/focus-works/route.ts` | Remove 2 non-existent columns from upsert |
| `migrations/133_fix_fk_references.sql` | Fix FK on observations + guru_interactions |

**Total: ~650 new lines + ~340 modified across 11 files**
**No new API routes. No new tables. No new npm packages.**

---

## Key Architecture Decisions

1. **No new tables** — settings stored in `montree_children.settings` JSONB (guru_intake_complete, guru_next_checkin, guru_child_profile, etc.)

2. **No streaming** — multi-turn tool loop runs server-side. Client sends one request, gets back final text + actions array. Simpler than streaming tool calls to frontend.

3. **MAX_TOOL_ROUNDS = 3** — prevents runaway API costs. Typical flows: 1 round (question) or 2 rounds (check-in with shelf rotation).

4. **25s timeout per API call** — Promise.race wrapper. Under Vercel/Railway 30s limit.

5. **Curriculum validation** — `set_focus_work` validates work_name against static JSON curriculum (329 works) + DB custom works. Prevents Claude from hallucinating work names.

6. **Sequential tool execution** — tools run in a for loop, not Promise.all. This avoids race conditions on settings JSONB read-merge-write.

7. **Mode detection server-side** — prompt builder checks `childSettings` to determine INTAKE/CHECKIN/NORMAL mode. No frontend changes needed for mode switching.

---

## Test Account

- **Code:** ZYNXER
- **Child:** Marina
- **Type:** Teacher account (to test as homeschool parent, create a new account via /montree/try with role=homeschool_parent)

---

## What the Plan Does NOT Cover (Future Work)

- Curriculum browsing within Guru conversation (parent asks "what's next for math?")
- Push notifications for check-in reminders
- Parallel tool execution (would need PostgreSQL `jsonb_set` for settings)
- Voice-first interaction (existing VoiceNoteButton handles transcription, but Guru response is text-only)
- Report generation via Guru ("generate a report for this month")
- Photo/media context in Guru conversation

---

## Critical Patterns to Follow

1. **Every route that accepts child_id must call `verifyChildBelongsToSchool()`** — existing pattern, no exceptions

2. **Never validate `process.env.*` at module top level** — use lazy getters (Next.js build-time evaluation)

3. **Use `getSupabase()` singleton** — not `new Supabase()` or `createClient()`

4. **Homeschool gating: `isHomeschoolParent()`** — all parent-only UI changes must be gated behind this

5. **Test teacher UI after every change** — verify zero regressions for structured Guru
