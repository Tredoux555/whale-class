# Handoff: ESL Guru Upgrade + Spy Game & Command Cards Generators

**Date:** March 7, 2026
**Commit:** `908d93bc`
**Status:** COMPLETE + DEPLOYED (9 files, 1,621 insertions)

---

## What Was Done

### Part 1 — ESL Guru Upgrade (4 files)

The Guru now recognizes it's working with L1 Chinese children learning English as a second language.

**New file:**
- `lib/montree/guru/knowledge/esl-chinese-learners.ts` (~200 lines) — Complete ESL knowledge base: 5 developmental stages (Silent Period → Advanced Fluency), phonological challenges for Mandarin speakers (th/v/r/l, consonant clusters, final consonants), L1 transfer patterns (topic-prominence, measure words, aspect vs tense), classroom strategies (TPR, comprehensible input, error correction philosophy)

**Modified files:**
- `lib/montree/guru/context-builder.ts` — New `buildESLContext()` function detects ESL status from school settings (`is_esl_program`, `primary_l1`) or school name heuristics (Chinese city names, "international", "bilingual"). Injects ESL context into every Guru conversation.
- `lib/montree/guru/conversational-prompt.ts` — ESL context injected into system prompts for both teachers and parents. Guru adjusts advice based on child's L1 and language stage.
- `lib/montree/guru/knowledge/ami-language-progression.ts` — Added `eslNotes` field to 12 language works (Sound Games I-III, Sandpaper Letters, Moveable Alphabet, Metal Insets, Object Boxes, Pink/Blue/Green Series, Classified Cards, Function of Words). Notes cover Silent Period adaptations, L1 phonological conflicts, and TPR alternatives.

### Part 2 — Spy Game Generator (1 new file, ~700 lines)

`app/montree/library/tools/spy-game/page.tsx`

Interactive generator for ESL-friendly detective spy games. 3 levels designed for L1 Chinese learners:

- **Sound Spy (Level 1):** 12 initial sounds prioritizing Mandarin-shared phonemes (/m/, /s/, /f/, /n/, /l/) first. Children find objects starting with target sounds — no speaking required (Silent Period safe).
- **Word Spy (Level 2):** CVC words grouped by vowel (a/e/i/o/u). Children decode "secret code" words and find matching objects.
- **Action Spy (Level 3):** 16 TPR commands (stand, sit, jump, clap, etc.). Proves comprehension through physical action — zero spoken English needed.

3 print modes: Mission Cards (main activity), Secret Code Cards (decoding practice), Spy Report Sheet (assessment).

Settings: cards per page (4/6), border color, font choice. Custom word/action input. Quick-add CVC word sets.

### Part 3 — Command Cards Generator (1 new file, ~480 lines)

`app/montree/library/tools/command-cards/page.tsx`

AMI Montessori Language Work #24 — reading comprehension through physical action. 3 levels:

- **Level 1 — Single Commands:** 24 action verbs (sit, stand, walk, run, jump...) with optional Chinese translation toggle for teacher reference.
- **Level 2 — Two Actions:** 16 compound commands ("Walk to the door and knock", "Pick up the pencil and write your name").
- **Level 3 — Action Chains:** 12 multi-step sequences ("Stand up, push in your chair, walk to the window, and wave").

Settings: cards per page (4/6/9), border color (auto-matches level), font choice. Custom command input. Chinese translation only available for Level 1 (single verbs).

### Part 4 — Integration (3 modified files)

- `app/montree/library/tools/page.tsx` — Added 2 TOOLS entries (spy-game with 🔍 slate gradient, command-cards with 📋 pink gradient)
- `lib/montree/i18n/en.ts` — 30 new keys (`tools.spy_*`, `tools.cmd_*`, `tools.border_color`, `tools.font`, `tools.generating`, `tools.print`, `tools.back_to_tools`)
- `lib/montree/i18n/zh.ts` — 30 matching Chinese translations

---

## Audit Results

4 issues found and fixed before push:

1. **Comment concatenation** — Missing newline in header comment block (cosmetic)
2. **Dead code** — Unused `MissionCard` interface removed
3. **Unused variable** — `pageNum` in `generateMissionCards()` removed
4. **XSS consistency** — Chinese translation in command-cards wrapped with `escapeHtml()`

TypeScript: zero errors (`npx tsc --noEmit`)
i18n parity: perfect (30/30 keys in both en.ts and zh.ts)

---

## Architecture Notes

Both generators follow the established pattern from label-maker/page.tsx:
- `'use client'` React page with `useState` for all settings
- `useI18n()` for all user-facing strings
- `escapeHtml()` from `@/lib/sanitize` for all dynamic content in generated HTML
- Print via `window.open()` + `document.write()` + inline HTML/CSS
- CSS Grid measured in cm for precise A4 printing
- `@page { size: A4; margin: 0; }` + `print-color-adjust: exact`
- Screen preview with gray background, print hides settings panel

---

## Previous Session Work (also in this commit)

- Fixed 500 error on POST `/api/montree/sessions` (work_id NOT NULL constraint)
- Fixed context-builder querying wrong column (work_name → work_id)
- Reverted voice note extraction model from Sonnet back to Haiku
