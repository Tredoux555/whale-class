# Montree Multilingual Architecture

## Status: Phase 1 Complete (EN/ZH), Generalizable to N Languages

## Core Pattern: Bilingual JSONB Storage

All user-facing AI-generated content is stored as locale-keyed JSON objects instead of plain strings. This pattern generalizes from 2 languages to N languages without schema changes.

### Data Shape

```typescript
// Single value
type LocalizedString = string | Record<string, string>;
// Example: { en: "Ready for the brown stair", zh: "准备好棕色楼梯了" }

// Array value
type LocalizedStringArray = string[] | Record<string, string[]>;
// Example: { en: ["Pink Tower", "Brown Stair"], zh: ["粉红塔", "棕色楼梯"] }
```

### Resolver Functions

```typescript
function resolveLocalized(val: LocalizedString | undefined, locale: string): string {
  if (!val) return '';
  if (typeof val === 'string') return val;          // legacy plain string
  return val[locale] || val.en || Object.values(val)[0] || '';
}

function resolveLocalizedArray(val: LocalizedStringArray | undefined, locale: string): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;               // legacy plain array
  return val[locale] || val.en || Object.values(val)[0] || [];
}
```

These resolvers handle three cases seamlessly:
1. **New bilingual format**: `{ en: "...", zh: "..." }` → picks by locale
2. **Legacy plain string**: `"some text"` → returns as-is
3. **Missing locale**: falls back to `en`, then first available value

### Canonical Location

Types and resolvers live in `components/montree/child/GamePlanCard.tsx` and are exported for use across the codebase. When more components need them, extract to `lib/montree/i18n/localized-types.ts`.

## How It Works Today (Game Plans)

### Generation Pipeline

Haiku always generates **English canonical content** for DB matching reliability. Chinese is derived post-generation:

1. **Nudge**: Haiku generates both `nudge_en` and `nudge_zh` in a single `tool_use` call (two separate fields in the tool schema). This is the only field where AI translates.

2. **Works**: Haiku picks from English curriculum names (the `name` column in `montree_classroom_curriculum_works`). Chinese work names are looked up from the `name_chinese` column in the same table. No AI translation needed — the DB already has both.

3. **Direction**: Haiku writes English area names ("Practical Life → Sensorial → Language"). Chinese direction is derived by string-replacing English area names with Chinese equivalents from `AREA_LABELS_ZH`.

### Storage

```json
{
  "nudge": { "en": "Ready for the brown stair", "zh": "准备好棕色楼梯了" },
  "works": { "en": ["Pink Tower", "Brown Stair"], "zh": ["粉红塔", "棕色楼梯"] },
  "direction": { "en": "Sensorial → Mathematics", "zh": "感官 → 数学" },
  "generated_at": "2026-04-21T...",
  "updated_at": "2026-04-21T...",
  "child_name": "Amy",
  "source": "weekly_wrap"
}
```

### Render Path

`FocusWorksSection.tsx` calls `resolveLocalized(gamePlan?.nudge, locale)` and `resolveLocalizedArray(gamePlan?.works, locale)`. The `locale` comes from `useI18n()`. Switching language in the UI instantly resolves the other language — no API call, no regeneration.

### Fill-Shelf

Always sends English canonical names to the server (`planWorksEn`), regardless of current display locale. The server matches against the `name` column which is always English.

## Files Implementing This Pattern

| File | Role |
|------|------|
| `components/montree/child/GamePlanCard.tsx` | Type definitions + resolver functions |
| `components/montree/child/FocusWorksSection.tsx` | Render path (resolves by locale) |
| `lib/montree/reports/replan-child.ts` | Weekly Wrap replan (generates bilingual JSONB) |
| `app/api/montree/children/[childId]/game-plan/refresh/route.ts` | Interactive refresh (same pattern) |
| `scripts/run_replan_all_whale.mjs` | Manual batch replan (same pattern) |
| `lib/montree/i18n/area-labels.ts` | Centralized area name translations |

## Adding a Third Language

To add Japanese (`ja`) support, for example:

### 1. Area Labels
Add to `lib/montree/i18n/area-labels.ts`:
```typescript
export const AREA_LABELS_JA: Record<string, string> = {
  practical_life: '日常生活',
  sensorial: '感覚',
  mathematics: '数学',
  language: '言語',
  cultural: '文化',
};
```

### 2. Curriculum Work Names
Add a `name_ja` column to `montree_classroom_curriculum_works` (or reuse the JSONB pattern). Populate via batch translation.

### 3. AI Generation
Add `nudge_ja` to the tool schema. In post-processing, add `ja` key to the works/direction JSONB by looking up `name_ja` and replacing area labels.

### 4. i18n Keys
Add Japanese translations to `lib/montree/i18n/ja.ts` (create file following `en.ts`/`zh.ts` pattern).

### 5. No Render Changes
The resolver functions already handle N languages — `resolveLocalized(val, 'ja')` just works. The `useI18n()` locale would need to support `'ja'` as a value.

## Future Considerations

### Content Tiers

Not all content needs AI translation. Three tiers:

1. **Static UI strings**: i18n key files (`en.ts`, `zh.ts`). Human-translated, committed to repo. This is the existing system.

2. **AI-generated per-child content**: Bilingual JSONB (this doc). Generated once, stored, resolved at render time. Game plans, activity summaries, weekly nudges.

3. **Curriculum data**: DB columns (`name`, `name_chinese`, `parent_description_zh`). Populated by batch translation pipelines. Shared across all children in a classroom.

### Performance

Bilingual JSONB adds ~50-100 bytes per field per language. For a game plan with nudge + 5 works + direction, that's ~300 bytes extra for Chinese. Negligible.

### Migration Path

The resolver functions' backward compatibility means migration is gradual. Old plans with plain strings continue to work. New plans get bilingual JSONB. No bulk migration needed — plans naturally upgrade on next refresh/replan.
