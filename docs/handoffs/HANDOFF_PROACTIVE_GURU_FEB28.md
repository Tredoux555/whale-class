# Handoff: Proactive Guru Intelligence — Feb 28, 2026

## What Was Built

5 features that close the "7% gap" — the Guru now proactively reaches out to parents instead of passively waiting.

## Features

### Feature 1: Cold Start Guru (Empty Shelf → Guided Setup)
- **Detection:** `focusWorksCount === 0 && intakeComplete`
- **Mode:** `SETUP_MODE` — collaborative shelf building
- **Priority:** Highest (above INTAKE)
- **What happens:** Guru asks what the child is drawn to, suggests 3-5 starter works, uses `set_focus_work` to add them

### Feature 2: Mastery Celebrations
- **Detection:** `buildCelebrationContext()` compares `mastered_count` between current state and `context_snapshot.mastered_count` from last interaction
- **Milestones:** First mastery ever, 5th, 10th, all 5 areas active
- **Injection:** Into system prompt + greeting variants

### Feature 3: Weekly Rhythm Nudge
- **Detection:** `daysSinceLastInteraction >= 5 || dayOfWeek === 0` (Sunday)
- **Mode:** `REFLECTION_MODE` — relaxed coffee chat, no guilt
- **Priority:** Below CHECKIN, above NORMAL

### Feature 4: Sensitive Period Alerts
- **New file:** `lib/montree/guru/knowledge/sensitive-periods.ts` (310 lines)
- **8 periods:** Order, Language, Refined Movement, Sensory Exploration, Small Objects, Grace & Courtesy, Writing, Reading
- **Each period:** Age range, peak window, observable behaviors, curriculum alignment, home activities
- **Injection:** `formatSensitivePeriodsForPrompt(ageMonths)` into every conversation's system prompt

### Feature 5: Stern's Vitality Affects + Emotional Mirroring
- **New function:** `buildEmotionalMirroringInstructions(parentState)`
- **Mapping:** Low confidence → "mirror first, fading affect"; Overwhelm → "fading, spacious"; Joy → "surging"; Recovering → "acknowledge growth"
- **Psychology expansion:** Stern section in `psychology-foundations.ts` expanded from 5 to 25 lines (vitality affects, affect attunement, intersubjectivity, temporal contours)

## Mode Priority System

```
SETUP (empty shelf + intake done) > INTAKE (new family) > CHECKIN (due) > REFLECTION (5+ days / Sunday) > NORMAL
```

## Files Changed

| Action | File |
|--------|------|
| Create | `lib/montree/guru/knowledge/sensitive-periods.ts` (310 lines) |
| Modify | `lib/montree/guru/conversational-prompt.ts` (added SETUP_MODE, REFLECTION_MODE, buildCelebrationContext, buildEmotionalMirroringInstructions, ProactiveContext interface, mode priority logic) |
| Modify | `app/api/montree/guru/route.ts` (greeting handler rewrite: 3 parallel queries, proactive context, celebration computation, mastered_count in context_snapshot) |
| Modify | `lib/montree/guru/context-builder.ts` (added context_snapshot to PastInteraction interface + select query) |
| Modify | `lib/montree/guru/knowledge/psychology-foundations.ts` (expanded Stern section) |

## Bugs Found During Audit (6, all fixed)

1. Duplicate `parentState` variable in same scope
2. `childContext` referenced before construction in greeting handler
3. `buildCelebrationContext` used non-existent fields on ChildContext
4. `context_snapshot` not fetched in past_interactions query
5. `PastInteraction` interface missing `context_snapshot` field
6. Duplicate local `PastInteraction` interface (should import from context-builder)

## Social Media Research

Report saved at `docs/RESEARCH_MONTESSORI_HOMESCHOOL_SOCIAL_MEDIA.md`

Key distribution channels:
- **Facebook groups** (primary): Montessori at HOME (51K), Montessori activities (157K), Montessori Works at home and in schools (121K)
- **Instagram**: @montessorifromtheheart (653K), @themontessorimethod, @montessori_homeschool
- **YouTube**: Hapa Family, The Montessori-Minded Mom
- **Podcasts**: The Montessori Podcast, Our Montessori Life
- **Reddit**: r/Montessori (16K)

## Deploy Notes

No new migrations. All changes are prompt engineering + TypeScript logic.

Push to main and Railway auto-deploys:
```bash
git add lib/montree/guru/knowledge/sensitive-periods.ts \
  lib/montree/guru/conversational-prompt.ts \
  app/api/montree/guru/route.ts \
  lib/montree/guru/context-builder.ts \
  lib/montree/guru/knowledge/psychology-foundations.ts \
  docs/RESEARCH_MONTESSORI_HOMESCHOOL_SOCIAL_MEDIA.md
git commit -m "feat: proactive guru intelligence — 5 features (cold start, celebrations, rhythm nudge, sensitive periods, emotional mirroring)"
git push origin main
```

## What's Next

- **Phase 3: Parent Community Network** — 20-25h build (chat + forums, separate session)
- **Voice notes fix** — Set `OPENAI_API_KEY` on Railway (deploy step only)
- **Stripe setup** — Deferred until HK company registered
- **Social media outreach** — Use research report to target top Facebook groups and Instagram accounts
