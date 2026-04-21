# Chinese Localization Handoff — Apr 20, 2026

**For:** Opus 4.6 (or any future model with full CLAUDE.md context)
**From:** Session 44 audit (Apr 20, 2026)
**Trigger:** User flagged screenshot of child page Game Plan card in Chinese locale showing English content — direction arrow `Practical Life → Sensorial → Mathematics → Language → Cultural`, work chips `Threading Beads`, `Cylinder Block 2`, `Formation of Quantity`, `Moveable Alphabet`, `Globe - Continents`, and English nudge text.

---

## The Mission

Comb through the Montree app and fix every place where English leaks through when the user has switched the UI to Chinese. Session 14 (Apr 11) closed the *display* layer for curriculum names by syncing the dual-column `name_chinese` (UI-read) + `name_zh` (auto-translate-write) pattern across all 7 write paths. This handoff closes the remaining gaps: **AI-generation prompts that don't thread locale**, **5 hardcoded `AREA_LABELS` constants scattered across the codebase**, and **render paths that render Haiku output verbatim without locale awareness**.

---

## Critical Context (read first)

### Session 14 dual-column rule (CLAUDE.md, Session 14):
- DB has TWO Chinese name columns on `montree_classroom_curriculum_works`:
  - `name_chinese` (migration 099) — **read by UI components**
  - `name_zh` (migration 149) — **written by auto-translate**
- Session 14 fixed all 7 write paths to write BOTH columns. DB synced (384 rows for Whale Class).
- **Canonical UI render pattern**: `locale === 'zh' && work.chineseName ? work.chineseName : work.name`
  - Variant for shelf data: `locale === 'zh' && focusWork.chineseName ? focusWork.chineseName : cleanWorkName(focusWork.work_name)`
  - Variant for review API data: `locale === 'zh' && work.work_name_zh ? work.work_name_zh : work.work_name`

### Canonical AREA_LABELS_ZH reference pattern (from `components/montree/reports/WeeklyWrapTab.tsx` lines 74-80):
```ts
const AREA_LABELS_ZH: Record<string, string> = {
  practical_life: '日常', sensorial: '感官', mathematics: '数学',
  language: '语言', cultural: '文化',
};
const AREA_LABELS_EN: Record<string, string> = {
  practical_life: 'Practical Life', sensorial: 'Sensorial', mathematics: 'Mathematics',
  language: 'Language', cultural: 'Cultural',
};
// Helper:
const getAreaLabel = (area: string) => locale === 'zh' ? AREA_LABELS_ZH[area] : AREA_LABELS_EN[area];
```

This is the canonical reference. Every other hardcoded `AREA_LABELS` map should be deleted in favor of a single shared helper.

### i18n hook:
```ts
import { useI18n } from '@/lib/montree/i18n/context';
const { t, locale } = useI18n();
```
Translation keys live in `lib/montree/i18n/en.ts` and `lib/montree/i18n/zh.ts`.

### Whale Class IDs (for testing/regen):
- School: `c6280fae-567c-45ed-ad4d-934eae79aabc`
- Classroom: `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`
- 20 active children

---

## Findings — 35+ leak vectors organized in 7 tiers

### TIER 1 — Game Plan card content (the user's primary complaint, hardest to fix)

The Game Plan card on a child's page renders three pieces of Haiku-generated content verbatim with NO locale layer:

**File:** `components/montree/child/FocusWorksSection.tsx`

| Lines | Issue |
|---|---|
| 262-264 | `{planNudge}` and `{planDirection}` rendered raw from `gamePlan.nudge` / `gamePlan.direction`. Haiku produced these in English regardless of locale because the prompt didn't reliably thread it. |
| 272-279 | Game Plan work chips render `{work}` — a raw string from `gamePlan.works[]` (string array). Cannot use `chineseName` check because `planWorks` is `string[]`, not work objects. Fix requires either (a) Haiku output in Chinese OR (b) resolving each name against curriculum at render time to get `name_chinese`. |
| 358 | ✅ Already correct (shelf view): `locale === 'zh' && focusWork.chineseName ? focusWork.chineseName : cleanWorkName(focusWork.work_name)` |
| 478 | ✅ Already correct (extras list): `locale === 'zh' && extra.chineseName ? extra.chineseName : cleanWorkName(extra.work_name)` |

**Root cause of the leak — TWO parallel Game Plan generators that both ignore Chinese:**

#### A. `lib/montree/reports/replan-child.ts` (Weekly Wrap auto-replan path):

| Lines | Issue | Fix |
|---|---|---|
| 44 | Tool schema description hardcodes English example: `'The area progression in arrow format. E.g. "Practical Life → Sensorial → Language"'` | When `isZh`, switch example to `"日常 → 感官 → 语言"` |
| 187-189 | `availableWorksList` fed to Haiku uses ONLY English `w.name` — curriculum has `name_chinese` but it's not passed | When `isZh`, build the list with `w.name_chinese` (fallback to `w.name`) so Haiku can pick Chinese names |
| 191-216 | Prompt has `isZh` check at line 191 prepending "IMPORTANT: Write the nudge and direction in Chinese" — but prompt body (lines 198, 206, 209-214) is English and example at line 44 is English | Strengthen the rule: tell Haiku to use the EXACT Chinese names from the curriculum list, give it the Chinese arrow example |
| 279-283, 299-315 | DOES load `name_chinese` and builds `workToArea` / `lookupToCanonical` maps for BOTH English and Chinese keys | ✅ Already correct — Chinese names from Haiku will resolve to areas correctly |
| 322-357 | `fuzzyFindWork` tokenizes on `[-_\s—()\u3000]+` (includes Chinese full-width space) | ✅ Already correct |

#### B. `app/api/montree/children/[childId]/game-plan/refresh/route.ts` (manual refresh path):

| Lines | Issue | Fix |
|---|---|---|
| 18-40 | `GAME_PLAN_TOOL` schema descriptions all in English, example at line 35 `"Practical Life → Sensorial → Language"` | Chinese example when `isZh` |
| 111-119 | Locale extracted from URL query param or body | ✅ Locale detection works |
| 122-132 | Prompt has `isZh` toggle but does NOT pass `availableWorksList` (unlike replan-child.ts which DOES pass curriculum constraint) | Add curriculum load with `name_chinese` and pass to prompt as constraint list |
| 137 | Hardcoded `HAIKU_MODEL` (NOT tier-aware — known Session 33 gap) | Out of scope for this handoff, but flag if touching |

**Recommended fix sequence for Tier 1:**
1. Fix both replan-child.ts AND game-plan/refresh/route.ts to thread Chinese curriculum names + Chinese arrow example
2. Add a small render-time fallback in FocusWorksSection.tsx lines 272-279: if `locale === 'zh'`, try to resolve each work string against a `worksByName` map (already loaded in parent) to get `chineseName`
3. **Batch regen all 20 Whale Class Chinese game plans** via `scripts/run_replan_all_whale.mjs` (or a new locale-aware variant). Existing English game plans in `montree_children.settings.game_plan` will keep showing English until refreshed.

---

### TIER 2 — Hardcoded AREA_LABELS constants (5 locations, easiest sweep)

These are duplicated everywhere. Consolidate into ONE shared helper.

| File | Lines | Used by |
|---|---|---|
| `lib/montree/guru/work-sequencer.ts` | 321, 653, 660, 840 | Sequencing logic, English labels in prompts |
| `lib/montree/guru/tool-executor.ts` | 20-26 | Tool execution responses sent back to Guru |
| `lib/montree/guru/conversational-prompt.ts` | 241, 615-642 | 10+ prompt locations |
| `components/montree/photo-audit/TellAiSheet.tsx` | 33-39 | Area dropdown — UI-facing |
| `components/montree/photo-audit/ThisIsSheet.tsx` | 26-32 | `AREAS` array — UI-facing dropdown |
| `lib/montree/types.ts` | 127-131 | `AREA_CONFIG` no Chinese variants |
| `components/montree/progress/AreaHistoryModal.tsx` | 9-15, 78 | Progress modal UI |
| `components/montree/WorkDetailModal.tsx` | 103 | `AREA_CONFIG` fallback English |
| `lib/montree/guru/classroom-context-builder.ts` | 174 | English legend sent to Haiku |

**Recommended approach:**
1. Create `lib/montree/i18n/area-labels.ts`:
   ```ts
   export const AREA_LABELS_ZH = { practical_life: '日常', sensorial: '感官', mathematics: '数学', language: '语言', cultural: '文化' } as const;
   export const AREA_LABELS_EN = { practical_life: 'Practical Life', sensorial: 'Sensorial', mathematics: 'Mathematics', language: 'Language', cultural: 'Cultural' } as const;
   export function getAreaLabel(area: string, locale: string): string {
     const map = locale === 'zh' ? AREA_LABELS_ZH : AREA_LABELS_EN;
     return map[area as keyof typeof map] ?? area;
   }
   ```
2. Replace all 9 hardcoded declarations with imports from this single source. Pass `locale` through to UI components, pass `isZh` boolean through to Haiku prompts.
3. UI components (TellAiSheet, ThisIsSheet, AreaHistoryModal, WorkDetailModal) get `useI18n()` if they don't already, then call `getAreaLabel(area, locale)`.
4. Server-side (work-sequencer, tool-executor, conversational-prompt, classroom-context-builder) accept a `locale` parameter and pick the right map. Locale must be threaded from the route handler.

---

### TIER 3 — Child Guru route doesn't thread locale to Haiku

**File:** `app/api/montree/children/[childId]/guru/route.ts`

| Line | Issue |
|---|---|
| 219 | Area enum in tool schema is hardcoded English. When user is in Chinese locale, Guru responses still use English area names. |

**Fix:** Read `locale` from request (URL or body), pass to system prompt builder, pass to tool schemas, ensure all area labels in Guru responses use the right locale via `getAreaLabel(area, locale)`.

---

### TIER 4 — Photo insight (Smart Capture) doesn't thread locale

**Files:**
- `app/api/montree/guru/photo-insight/route.ts` — lines 438, 463, 935+ where area labels appear in prompts
- `lib/montree/photo-identification/sonnet-draft.ts` — verify whether `locale` param exists

**Issue:** When a Chinese-locale user takes a photo, the AI's "I see the child working with Pink Tower" comes back in English. Smart Capture popup may render area badge in English even if the work name has Chinese.

**Fix:** Thread `locale` through the photo-insight route → Sonnet draft generator → Haiku two-pass identifier. Where Haiku is asked to produce a `proposed_name`, when `isZh`, inject the curriculum's Chinese names into the prompt and ask Haiku to respond with the Chinese name (it'll match against `name_chinese`/`name_zh` columns either way thanks to dual-column writes).

---

### TIER 5 — Voice observation extraction card

**File:** `components/montree/voice-observation/ExtractionCard.tsx` lines 35-38

| Issue |
|---|
| `EVENT_TYPE_COLORS` map uses English labels. No Chinese variants. |

**Fix:** Add Chinese variants and pick by locale, OR use i18n keys. Likely a small set of event types — check what they are first.

---

### TIER 6 — `lib/montree/types.ts` AREA_CONFIG

**File:** `lib/montree/types.ts` lines 127-131

| Issue |
|---|
| `AREA_CONFIG` is a central area metadata constant (color, icon, label) with no Chinese variants |

**Fix:** Add `labelZh` field per area, then update consumers to pick the right label by locale. Many components import from here as a fallback — fixing this single source flows through.

---

### TIER 7 — Verification checklist (run AFTER fixes)

After implementing fixes, manually verify in Chinese locale on production (after Railway deploy):

- [ ] **Child page Game Plan card** — Open any Whale Class child in Chinese locale. Verify nudge text in Chinese, direction arrow in Chinese (e.g., `日常 → 感官 → 语言`), and work chips show Chinese names (e.g., `串珠工作` not `Threading Beads`). For existing children, click Refresh on Game Plan to regenerate in Chinese.
- [ ] **Batch regen** — Run `scripts/run_replan_all_whale.mjs` (or a new locale-aware script) to refresh all 20 Whale Class game plans in Chinese.
- [ ] **Photo Audit "This is..." sheet** — Verify area dropdown shows Chinese labels.
- [ ] **Photo Audit "Tell AI" sheet** — Same.
- [ ] **Smart Capture popup** — Take a photo as a Chinese-locale teacher. Verify area badge in Chinese, work name in Chinese.
- [ ] **Child Guru chat bubble** — Ask "她最近在做什么?" — verify responses in Chinese with Chinese area names.
- [ ] **Progress modal (AreaHistoryModal)** — Open any work history. Verify area label in Chinese.
- [ ] **Work detail modal** — Open any work. Verify area badge in Chinese.

---

## What NOT to touch

- **Static `chineseName` JSON files** in `lib/curriculum/data/*.json` — Session 14 already verified these flow through correctly.
- **Auto-translate pipeline** in `lib/montree/auto-translate.ts` — Session 14 ensured it writes BOTH `name_zh` AND `name_chinese`. Don't change this.
- **Server-to-server Anthropic vision routes** that don't have a user-facing locale (e.g., `photo-identification/process` without locale param) — these run in the background and produce structured data; locale should only matter where the output is rendered for users.
- **`montree_visual_memory` corpus** — the self-learning loop. Don't touch the visual descriptions; they're a server-side moat.

---

## Recommended execution order

1. **Quick win (1-2 hours)** — Photo Audit sheets (TellAiSheet, ThisIsSheet) + AreaHistoryModal + WorkDetailModal: these are pure UI changes, swap in `useI18n()` + `getAreaLabel()`. Ship + verify.
2. **Medium (3-4 hours)** — Centralize AREA_LABELS into `lib/montree/i18n/area-labels.ts`, replace all 9 hardcoded declarations with imports. Thread `locale` parameter into Guru / work-sequencer / classroom-context-builder. Ship + verify.
3. **Bigger (half day + batch regen)** — Game Plan pipeline:
   - Update `replan-child.ts` tool schema example + availableWorksList + prompt to use Chinese when `isZh`
   - Update `game-plan/refresh/route.ts` to load `name_chinese` and pass curriculum constraint to Haiku (mirror replan-child.ts pattern)
   - Add render-time fallback in FocusWorksSection.tsx work chips (lines 272-279)
   - Run a one-off Chinese-locale batch regen for all 20 Whale Class children: copy `scripts/run_replan_all_whale.mjs` → `scripts/run_replan_all_whale_zh.mjs`, force `locale='zh'` in the refresh call. Ship + verify.
4. **Final sweep** — Child Guru route locale threading + photo-insight locale threading + voice observation event types + AREA_CONFIG in types.ts. Ship + verify.

After all 4 phases, run the Tier 7 verification checklist on production.

---

## Reference patterns

### Canonical render pattern (already in WeeklyWrapTab.tsx, FocusWorksSection.tsx shelf view):
```tsx
{locale === 'zh' && work.name_chinese ? work.name_chinese : work.name}
```

### Canonical Haiku prompt pattern (when `isZh`):
```ts
const isZh = locale === 'zh';
const prompt = `${isZh ? 'IMPORTANT: Respond entirely in Chinese (中文). Use the EXACT Chinese names from the curriculum list below.\n\n' : ''}
...
AVAILABLE WORKS — pick from this list using EXACT names as written:
${areas.map(a => `[${a.key}] ${a.works.map(w => isZh ? (w.name_chinese ?? w.name) : w.name).join(', ')}`).join('\n')}
...
Direction example: "${isZh ? '日常 → 感官 → 语言' : 'Practical Life → Sensorial → Language'}"
`;
```

### Canonical UI dropdown pattern (replace hardcoded AREAS arrays):
```tsx
import { getAreaLabel, AREA_KEYS } from '@/lib/montree/i18n/area-labels';
const { locale } = useI18n();
// ...
{AREA_KEYS.map(key => (
  <option key={key} value={key}>{getAreaLabel(key, locale)}</option>
))}
```

---

## Files to create

1. `lib/montree/i18n/area-labels.ts` — single source of truth for area label translations.

## Files to modify (count: ~13)

- `components/montree/child/FocusWorksSection.tsx` (work chips render-time fallback)
- `lib/montree/reports/replan-child.ts` (tool schema + availableWorksList + prompt)
- `app/api/montree/children/[childId]/game-plan/refresh/route.ts` (load name_chinese + pass to Haiku)
- `lib/montree/guru/work-sequencer.ts`
- `lib/montree/guru/tool-executor.ts`
- `lib/montree/guru/conversational-prompt.ts`
- `lib/montree/guru/classroom-context-builder.ts`
- `app/api/montree/children/[childId]/guru/route.ts`
- `app/api/montree/guru/photo-insight/route.ts`
- `lib/montree/photo-identification/sonnet-draft.ts`
- `components/montree/photo-audit/TellAiSheet.tsx`
- `components/montree/photo-audit/ThisIsSheet.tsx`
- `components/montree/progress/AreaHistoryModal.tsx`
- `components/montree/WorkDetailModal.tsx`
- `components/montree/voice-observation/ExtractionCard.tsx`
- `lib/montree/types.ts`

## Scripts to create

- `scripts/run_replan_all_whale_zh.mjs` — locale-aware Chinese regen for all 20 Whale Class children. Mirror existing `run_replan_all_whale.mjs`, force `locale='zh'` in the refresh call.

---

## Final notes

- Audit-fix cycle until two consecutive clean passes (per the user's standard 3x3x3x3x3 development methodology).
- After each tier ships, hard-refresh production and verify in Chinese locale.
- DO NOT touch the dual-column write paths — Session 14 already locked them down.
- DO NOT modify the visual memory corpus.
- If anything is ambiguous, default to "render in Chinese when locale === 'zh'", and add a TODO comment noting the assumption.

End of handoff.
