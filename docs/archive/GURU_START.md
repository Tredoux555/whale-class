# 🔮 MONTESSORI GURU - STARTUP PROMPT

Copy and paste this to start your next session:

---

## THE PROMPT:

```
Read the brain, then read docs/HANDOFF_MONTESSORI_GURU.md

We're building the Montessori Guru - an AI assistant for teachers. The planning is 100% done:

- 7 Montessori books collected (96,877 lines) ✅
- Architecture designed ✅
- Implementation plan done ✅
- Gaps audited ✅

Now BUILD IT. Start with Phase 1:
1. Build topic_index.json (automate it - 97K lines is too much to do manually)
2. Create migration 110_guru_tables.sql and run it
3. Build /app/api/montree/guru/route.ts
4. Build /app/montree/dashboard/guru/page.tsx

The Anthropic client already exists at /lib/ai/anthropic.ts - use it.

Go.
```

---

## FILES LOCATION

All in your folder at `/whale/`:

| File | What it is |
|------|------------|
| `BRAIN.md` | Project brain - start here |
| `docs/HANDOFF_MONTESSORI_GURU.md` | Quick-start handoff |
| `docs/MONTESSORI_GURU_IMPLEMENTATION_PLAN.md` | Full 10-day plan |
| `docs/MONTESSORI_GURU_ARCHITECTURE.md` | System design |
| `docs/GURU_PLAN_AUDIT.md` | Gap analysis |
| `data/guru_knowledge/sources/*.txt` | 7 Montessori books |
| `data/guru_knowledge/manifest.json` | Book metadata |

---

## WHAT'S ALREADY WORKING

- Anthropic API key in `.env.local` ✅
- Anthropic client at `/lib/ai/anthropic.ts` ✅
- Teacher notes in `montree_work_sessions` table ✅
- Child data in `montree_children` table ✅
- Empty guru folder at `/app/montree/dashboard/guru/` ✅

---

*Created: Feb 1, 2026*
