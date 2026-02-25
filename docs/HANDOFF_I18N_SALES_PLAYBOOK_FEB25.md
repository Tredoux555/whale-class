# Handoff: Bilingual i18n System + Sales Playbook (Feb 25, 2026)

## Commit
`8259683` — "feat: bilingual i18n system + sales playbook" — 16 files pushed to `main`

## What Was Built

### 1. Bilingual i18n System (EN ↔ ZH) — 12 files

**Foundation (4 files):**
- `lib/montree/i18n/en.ts` — 140 English translation keys, TypeScript `as const` for type safety
- `lib/montree/i18n/zh.ts` — 140 matching Chinese translations
- `lib/montree/i18n/context.tsx` — `I18nProvider` + `useI18n()` + `useT()` hooks, localStorage-persisted (`montree_lang` key)
- `lib/montree/i18n/index.ts` — barrel export

**Components (2 files):**
- `components/montree/I18nClientWrapper.tsx` — client wrapper for the server layout (which exports metadata and can't be `'use client'`)
- `components/montree/LanguageToggle.tsx` — compact toggle button showing the OTHER language label (EN shows "中文", ZH shows "EN")

**Layout (1 file modified):**
- `app/montree/layout.tsx` — wrapped all children with `<I18nClientWrapper>` (provides i18n context to every Montree page)

**Pages migrated to `t()` calls (5 files):**
- `app/montree/login/page.tsx` — all strings + LanguageToggle in top-right corner
- `app/montree/try/page.tsx` — all strings across 4 steps + LanguageToggle
- `app/montree/dashboard/page.tsx` — student count, empty states, error messages
- `app/montree/principal/login/page.tsx` — all strings + LanguageToggle
- `components/montree/DashboardHeader.tsx` — LanguageToggle added + nav titles + logout button

**Architecture decisions:**
- Custom React Context over next-intl/react-i18next: all pages are `'use client'`, only 2 languages, zero npm installs, zero risk
- TypeScript objects over JSON: automatic type safety on translation keys without build steps
- `useState('en')` default + `useEffect` for localStorage read: prevents hydration mismatch
- No URL-based routing (no `/zh/` prefix): language is a UI preference, not a route

**How to use on any page:**
```tsx
import { useI18n } from '@/lib/montree/i18n';
// or just: import { useT } from '@/lib/montree/i18n';

const { t, locale, setLocale } = useI18n();
// or just: const t = useT();

return <p>{t('auth.login')}</p>; // "Login" or "登录"
```

**Adding new keys:** Add to BOTH `en.ts` and `zh.ts` simultaneously. TypeScript will catch any key used in `t()` that doesn't exist.

### 2. Sales Playbook — 3 files

- `app/montree/super-admin/marketing/sales-playbook/page.tsx` — full sales playbook page (~600 lines)
- `app/montree/super-admin/marketing/page.tsx` — added Sales Playbook card to OUTREACH TOOLS section
- `app/montree/super-admin/marketing/playbook/page.tsx` — added link to new playbook
- `public/montree-sales-playbook.html` — original HTML preserved

**4 tabs:**
1. **Schedule** — 28-day outreach plan (3 weeks) with checkboxes persisted in localStorage, progress bar
2. **Schools** — 6 deep-dived schools with intel, personalized emails, WeChat messages, follow-ups:
   - HD Qingdao (warm lead, Tredoux visited), QAIS (AMS-accredited flagship), Hongwen QD (bilingual K-12)
   - Etonkids (chain HQ, 30+ campuses), MSB Beijing (1990 founding), Nebula Shanghai (progressive)
3. **Psychology** — 6 principles, decision-maker table, 5-touch sequence, objection handling
4. **Templates** — Template A (Pure Montessori), B (Chain HQ), C (Bilingual K-12)

**Access:** `/montree/super-admin/marketing/sales-playbook` (behind marketing hub auth)

## Phase 2 Work (Future)

### i18n — Migrate more pages to `t()` calls
These pages still have hardcoded English strings:
- Child week view (`[childId]/page.tsx`)
- Curriculum pages
- Guru chat
- Reports
- Students page
- Settings
- All onboarding guides (WeekViewGuide, StudentFormGuide, etc.)
- Home parent components (ConcernCardsGrid, GuruDailyBriefing, etc.)

This is incremental — each page can be migrated independently by importing `useI18n` and replacing strings.

### Sales Playbook — Expand school list
- Only 6 of 16 target schools have deep-dive profiles
- Remaining 10 schools from the original playbook HTML can be added

## Audit Results
- Zero TypeScript errors from new files (pre-existing Next.js 16 params errors only)
- All 140 translation keys verified consistent between en.ts and zh.ts
- Sales playbook page compiles clean
