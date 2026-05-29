# Health Check S131 — AI Cost, Model Usage & Tier-Gating

Audit date: 2026-05-27. Scope: every `anthropic.messages.create` / `openai.*` call site, model-constant hygiene, tier-gating, prompt caching, Astra + Mira posture, photo pipeline v2, replan observability, logApiUsage hygiene, free-tier UX.

---

## 1. Tier-gating compliance

99 files call AI primitives; 36 reference `resolveReportModel`. Spot-check of customer-facing routes:

| Route | Tier-gated? | Notes |
|---|---|---|
| `app/api/montree/reports/weekly-wrap/route.ts` | ✅ | Full tier ladder; 402 on free |
| `app/api/montree/admin/principal-agent/route.ts` (Astra) | ✅ | 402 `requires_upgrade` + `feature: tracy` |
| `app/api/montree/admin/parent-question/route.ts` | ✅ | model from `aiTier.model` |
| `app/api/montree/admin/child-briefing/[childId]/route.ts` | ✅ | tier-gated |
| `app/api/montree/admin/tracy/{scan-thread,draft-response}/route.ts` | ✅ | tier-gated |
| `app/api/montree/guru/snap-identify/route.ts` | ✅ | tier-gated |
| `app/api/montree/guru/generate-work-content/route.ts` | ✅ | tier-gated |
| `app/api/montree/guru/teaching-instructions/route.ts` | ✅ (per grep) | |
| `app/api/montree/weekly-review/[childId]/route.ts` | ✅ | |
| `app/api/montree/reports/language-{presentation,semester}/...` | ✅ | |
| `app/api/montree/guru/corrections/route.ts` | ✅ (skips Sonnet visual-memory build on Free per arch rule) | |
| `app/api/montree/calendar/summary/route.ts` | ✅ | Session 128 |
| `app/api/montree/admin/meeting-notes/transcribe/route.ts`, `dashboard/conversations/transcribe`, `admin/conversations/transcribe` | ✅ | gated |
| `lib/montree/appointments/transcription/summarize.ts` | ✅ | |

**Violations (no `resolveReportModel`, ungated Sonnet/Opus on customer routes):**

- **C1 — CRITICAL** — `app/api/montree/children/[childId]/onboard/route.ts:241` — uses `model: AI_MODEL` (Sonnet) for voice-onboarding profile extraction with no tier gate. At ~20 children × ~$0.10-0.30 per Sonnet call, a Free school burning through onboarding hits ~$2-6 in Sonnet spend before any monetisation event. Fix: add `resolveReportModel(supabase, auth.schoolId)` at top, route to `HAIKU_MODEL` on Haiku tier, 402 on Free.
- **C2 — HIGH** — `app/api/montree/photo-audit/tell-ai/route.ts:104` — `model: AI_MODEL` with no gate. Per-photo Sonnet call from the photo-audit "Tell AI" surface. Cost-per-tap ~$0.01-0.03. Free schools tapping repeatedly = real spend. Fix: `resolveReportModel` + 402.
- **C3 — HIGH** — `app/api/montree/children/[childId]/weekly-admin/route.ts:369` — `model: AI_MODEL` Sonnet, no tier gate. Weekly admin doc generation. Fix: tier-gate.
- **C4 — MED** — `app/api/montree/classroom-setup/describe/route.ts:106` — Sonnet for "Teach the AI" classroom setup. Whale Class has run this in production at $0.05-0.10/call; on Free schools, no gate. Fix: tier-gate, fall through to Haiku on Haiku tier.
- **C5 — MED** — `app/api/montree/onboarding/voice/custom-work/route.ts:168` — Sonnet for custom-work creation during voice onboarding (~$0.011/work). Per Session 80 architecture this is intentional ("personality matters"), but should still 402 on Free.
- **C6 — LOW** — `app/api/montree/social-guru/route.ts:49` — Sonnet ungated, but super-admin only (`verifySuperAdminPassword`). Acceptable.
- **C7 — LOW** — `app/api/montree/admin/import/route.ts:204` — Whale-Class-only admin path. Not customer-facing.
- **C8 — LOW** — `lib/montree/voice-notes/{extraction,weekly-admin}.ts` — used inside larger tier-gated routes; verified upstream gates.

`requires_upgrade: true` shape is present in Astra + Mira + recently-built routes; older snap-identify, generate-work-content also surface it. Apply the same `requires_upgrade + upgrade_url: '/montree/admin/billing' + feature` shape on every C1-C5 fix.

## 2. Hardcoded model strings

Grep for `claude-(opus|sonnet|haiku)-` and `gpt-` outside `lib/ai/anthropic.ts` / `lib/montree/reports/resolve-model.ts` / test fixtures: zero unguarded literals found in route bodies. Some scripts (`scripts/batch-translate-*`, `scripts/run_replan_*.mjs`) hardcode model strings — these are one-off Whale-Class scripts and not customer-facing. Architectural rule #135 (use `AI_MODEL` / `HAIKU_MODEL` / `OPUS_MODEL` constants) is HOLDING for production routes.

## 3. Astra + Mira enforcement

- **Astra** — `app/api/montree/admin/principal-agent/route.ts:236` pins `OPUS_MODEL` after a tier-gate (any non-free tier upgrades the principal to Opus). `assertSupportedCostModel(model)` runs, logs loudly on drift. ✅ Locked.
- **Mira** — `app/api/montree/agent/mira/route.ts:204` pins `OPUS_MODEL` for the orchestrator; `lib/montree/mira/tool-executor.ts:175` pins `HAIKU_MODEL` for draft tools. Agents have no tier gate by design (paid partners). ✅ Locked.

No drift detected.

## 4. Photo pipeline v2

`photo_pipeline_v2` flag is gating live in `app/api/montree/photo-identification/process/route.ts:248`. Confirmed:
- Pass 2 → Haiku (`two-pass.ts:560`)
- Pass 2b discriminator → Sonnet (verified in two-pass.ts)
- Sonnet auto-draft → Sonnet (`sonnet-draft.ts`)
- Fix A (`is_curriculum_work` confidence floor) — gated at line 469 of process route
- Fix C (`top_candidates` carry-through) — gated at line 677
- Fix B (visual memory budget 20KB/40 entries) — in `lib/montree/photo-identification/context-loader.ts` (verified Session 118)
- Fix D (age-decay weighting) — in context-loader

No drift detected.

## 5. Prompt caching (rule #135)

Both `lib/montree/photo-identification/two-pass.ts:567` and `lib/montree/photo-identification/sonnet-draft.ts:311` use:

```ts
system: [
  { type: 'text', text: <STATIC_INSTRUCTIONS>, cache_control: { type: 'ephemeral' } },
  { type: 'text', text: <DYNAMIC_SUFFIX> },
]
```

Dynamic content (per-locale `langInstruction`, per-classroom `correctionsContext`, `visualMemoryContext`, curriculum hint) lives AFTER the cache breakpoint in the second block. ✅ Rule #135 holding. Verify quarterly via Anthropic billing's `cache_read_input_tokens` ratio.

## 6. logApiUsage hygiene (Session 95 rule)

Grep for `logApiUsage(...).catch` against `.ts/.tsx`: zero runtime hits. Only matches are in CLAUDE.md/SESSION_95_HANDOFF.md text. The 17-day silent replan failure mode has not regressed. ✅

## 7. Health endpoint cost step

`app/api/montree/super-admin/health/route.ts:91-93` runs `ai_cost_30d` step against `montree_api_usage`. `cost_model_drift_7d` step at line 281 catches OPUS/SONNET drift. ✅ Operational.

## 8. Replan observability

`lib/montree/reports/replan-child.ts` emits `[Replan:<childName>]` at 12+ stage points (`START`, `STAGE_3`, `STAGE_3.5`, `STAGE_4`, `DONE`, plus per-stage `FAIL` lines with `stage=` + `msg=`). Session 95's diagnostic instrumentation is INTACT. ✅

## 9. Astra memory cap

`lib/montree/tracy/memory.ts:59` — `DEFAULT_LOAD_LIMIT = 30`. The cap is hard at 100 (`Math.min(limit, 100)` at line 207) — a future caller passing `limit: 100` would 3x the cost of the cached prompt prefix. Suggest tightening hard cap to 50 (5-line change) as a follow-up.

## 10. Free-tier UX

Astra (S105), generate-work-content, snap-identify, weekly-wrap, language-presentation, language-semester, parent-question, child-briefing, weekly-review — all return `{ requires_upgrade: true, upgrade_url, feature }` on Free 402. The frontend pattern from `components/montree/UpgradeCard.tsx` (Session 106) renders the warm amber card vs red error. Spot-check shows consistent shape.

C1-C5 routes above currently 500 or silently bill Sonnet — fix forces them into the same friendly upgrade path.

---

## Top 5 actionable (money-affecting first)

1. **C1 — Tier-gate `children/[childId]/onboard/route.ts`** (line 241). Highest spend leak — Sonnet × N children per onboarding session, no gate. Add `resolveReportModel` + 402 with `requires_upgrade`. **~30 min, ~$2-6/free-school savings per onboarding burst.**
2. **C2 — Tier-gate `photo-audit/tell-ai/route.ts`** (line 104). Per-tap Sonnet on a customer-facing button. Add gate + UpgradeCard surface. **~15 min.**
3. **C3 — Tier-gate `children/[childId]/weekly-admin/route.ts`** (line 369). Sonnet weekly-admin doc on Free schools is pure leak. **~15 min.**
4. **C4 + C5 — Tier-gate `classroom-setup/describe` + `onboarding/voice/custom-work`**. Same one-line `resolveReportModel` insertion + 402 shape. **~20 min combined.**
5. **Astra memory cap tightening** (`tracy/memory.ts` line 207): drop the hard cap from 100→50 to prevent future callers from accidentally tripling Astra prompt cost. Low-effort, no behavior change at current usage. **~5 min.**

All five are zero-risk to existing paid schools (only add 402 paths for Free). Combined burn-down: half a session.
