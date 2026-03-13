# Handoff: Guru Context-Aware Routing (Selective Knowledge Injection)

**Date:** March 13, 2026
**Sessions:** 2 conversations (context continuations)
**Methodology:** 3x3x3x3 (2 full rounds of 3×3×3 cycles + cross-cycle verifications)
**Status:** COMPLETE, NOT YET PUSHED

---

## What Was Done

Implemented in-process question classification for the Guru system to selectively inject knowledge modules based on question category. Reduces input tokens by ~30-50% per request, improving TTFT (time to first token) and response focus.

### Architecture

**Question Classifier** — Pure regex, zero latency, zero API calls:
- Priority: psychology > development > curriculum > general
- 8 psychology patterns (behavior, emotions, social, attachment, parenting, emotional state, life events, behavioral patterns)
- 5 development patterns (milestones, sensitive periods, readiness, age-appropriate, specific developmental)
- 8 curriculum patterns (shelf/works, recommendations, named materials, area-specific, teaching actions, work operations)
- Language keyword detector (separate from classification, used for conditional AMI injection)

**Selective Injection Matrix:**

| Module | curriculum | psychology | development | general |
|--------|-----------|------------|-------------|---------|
| Sensitive Periods (~300 tok) | ✅ | ❌ | ✅ | ✅ |
| Emotional Mirroring (~200 tok) | ❌ | ✅ (parent only) | ❌ | ❌ |
| Psychology Knowledge | 3 psychologists (~500 tok) | ALL 14 (~2,500 tok) | 5 (~900 tok) | 1 (~200 tok) |
| AMI Language (~400 tok) | ✅ always | Only if lang focus work | ✅ if lang keywords | ✅ if lang keywords |
| ESL Context (~300 tok) | ✅ if ESL child | ❌ | ✅ if ESL child | ✅ if ESL + lang keywords |
| Celebrations | ✅ always | ✅ always | ✅ always | ✅ always |

**Estimated token savings per category:**
- psychology: ~1,000 tokens saved (no sensitive periods, no AMI, no ESL)
- curriculum: ~2,200 tokens saved (3 vs 14 psychologists, no mirroring)
- development: ~1,800-2,200 tokens saved (5 vs 14 psychologists, no mirroring)
- general: ~3,200 tokens saved (1 vs 14 psychologists, no mirroring, no AMI/ESL unless language)

### Files Modified (4 files)

**New file (1):**
- `lib/montree/guru/question-classifier.ts` — Pure regex classifier. Exports `classifyQuestion()` and `hasLanguageKeywords()`. 93 lines.

**Modified files (3):**
- `lib/montree/guru/knowledge/psychology-foundations.ts` — Added section-based retrieval with lazy caching. `getRelevantPsychologyKnowledge()` now accepts `PsychologistKey[]` to filter sections (backward compat: empty array returns full knowledge). Added `CATEGORY_PSYCHOLOGISTS` mapping, `PsychologistKey` type, `SECTION_HEADERS` constant, `parseSections()` internal function. ~118 lines added.

- `lib/montree/guru/conversational-prompt.ts` — 2 new imports (`classifyQuestion`, `hasLanguageKeywords` from `./question-classifier` + `CATEGORY_PSYCHOLOGISTS` from `./knowledge/psychology-foundations`). `buildConversationalPrompt()` now classifies the question at entry, then conditionally injects 5 knowledge modules based on category. 5 injection blocks modified with conditional gates.

- `app/api/montree/guru/route.ts` — 1 new import (`classifyQuestion`, `QuestionCategory`). Classification called at function scope (before if/else branching). `question_category` added to all 3 `context_snapshot` objects (conversational whole-class, conversational per-child, structured).

### Issues Found and Fixed

| # | Severity | Cycle | Issue | Fix |
|---|----------|-------|-------|-----|
| 1 | MEDIUM | R1C2 | AMI Language not injected for `general` questions with language keywords (e.g., "My child struggles with reading") | Added `questionCategory === 'general'` to `shouldInjectLanguage` condition |
| 2 | MEDIUM | R1C3 | ESL context not injected for `general` questions with language keywords for ESL children | Added `(questionCategory === 'general' && isLanguageRelated)` to ESL gate |

### Audit Summary

- 2 full 3x3x3 rounds (6 build cycles total)
- Round 1: 3 cycles, 2 issues found and fixed (R1C2 + R1C3)
- Round 2: 3 cycles, 0 issues found
- 2 cross-cycle verifications (both CLEAN)
- Total plan audits: 18 (3 per cycle × 6 cycles)
- Total build audits: 18 (3 per cycle × 6 cycles)
- Final state: CLEAN

---

## Deploy

⚠️ NOT YET PUSHED. No new migrations. Include in consolidated push from Mac.

### Files to commit:

```
lib/montree/guru/question-classifier.ts
lib/montree/guru/knowledge/psychology-foundations.ts
lib/montree/guru/conversational-prompt.ts
app/api/montree/guru/route.ts
docs/handoffs/HANDOFF_GURU_CONTEXT_ROUTING_MAR13.md
```
