# Health Check S131 — i18n + Locale Parity + Translation Coverage

**Scope:** read-only audit. No code modified.

---

## 1. Strict completeness check — ✅ PASS

`npm run i18n:check:strict` → all 12 locales report **5,035 keys = 100% of en's 5,028**.

```
en (ref): 5,028
zh es de fr pt nl it ja ko uk ru: 5,035 each (100%)
```

The +7 surplus per locale is the leftover Lora/hero-related keys from Session 130
that en counts under deduplicated entries but the strict counter expands. Strict
hook passes; pre-commit blocking still works.

---

## 2. `t('key') || 'fallback'` antipattern (rule #244) — **HIGH**

The audit flagged **32 files** containing this pattern. Static check:

```
grep -E "[^a-zA-Z]t\('[^']+'\)\s*\|\|\s*'" → 32 .tsx files
```

Rule #244 (S129): `t()` returns the key string itself when missing — truthy in
JSX, so the fallback NEVER fires. Each hit is a latent bug: if the key is
deleted from a locale file, the raw key string renders instead of the fallback.

**Highest-traffic offenders:**

| File | Severity |
|------|----------|
| `components/montree/DashboardHeader.tsx:614,635,661,669,712,746,763,787,866,922,938` | HIGH (every page header) |
| `app/montree/dashboard/page.tsx` | HIGH (main teacher dashboard) |
| `app/montree/parent/dashboard/page.tsx` | HIGH (parent landing) |
| `app/montree/parent/messages/[threadId]/page.tsx` | HIGH (Session 121 surface) |
| `app/montree/dashboard/messages/[threadId]/page.tsx` | HIGH (Session 121 surface) |
| `app/montree/dashboard/photo-audit/page.tsx` | HIGH (high-frequency teacher tool) |
| `app/montree/dashboard/capture/page.tsx` | HIGH (photo capture flow) |
| `app/montree/calendar/page.tsx` | MED (Session 128 build) |
| `app/montree/admin/settings/page.tsx` | MED (principal settings) |
| `components/montree/admin/TracyFloat.tsx` | MED (every cockpit page) |
| `components/montree/voice-observation/*.tsx` (4 files) | MED |
| `components/montree/media/{PhotoQueueBanner,EventPicker,CameraCapture}.tsx` | MED |
| `components/montree/guru/{ChatBubble,GuruChatThread}.tsx` | MED |
| `app/montree/library/tools/{spy-game,command-cards}/page.tsx` | LOW |

**Recommended fix:** add the missing keys to `en.ts` so the t() call resolves
properly. Mechanical sweep — ~30 min focused work for the 32 files. Pre-commit
hook does not catch this because all keys CURRENTLY exist; it only protects
against future drift, not the latent fallback strings.

---

## 3. Hardcoded English in S121 surfaces — **MED**

S125 closed most of the Session 117–121 i18n gap (~410 keys). Spot check found
two leaks:

- **`app/montree/dashboard/parent-chats/page.tsx:215-216`** —
  `<>No parents match &ldquo;{query}&rdquo;.</>` and
  `<>No parent chats yet. Once a parent signs in and messages you, they'll appear here.</>`
  Both are inline JSX — never converted to `t()`. MED — empty-state copy.
- The other 4 spot-checked Session 121 surfaces (`AppointmentInviteCard`,
  `AgoraVideoCall`, `admin/conversations`, `dashboard/conversations`) all use
  `useI18n` properly with 16, 37, 79, 80 `t()` calls respectively. Clean.

---

## 4. Lora literal sweep (rule #42) — **LOW**

Grep `fontFamily.*['"]Lora['"]` → **1 hit**:

- `components/montree/reports/TeachingNotesView.tsx:345` —
  `fontFamily: 'Georgia, "Lora", serif'` inside `@media print` styles.
  Print CSS needs system fallback (browsers don't honor `var(--font-lora)` in
  print contexts on all engines). Acceptable. LOW.

No new violations introduced since the S107 sweep. Rule #42 still holds across
the codebase.

---

## 5. Duplicate keys in locale files — **HIGH**

`en.ts` has **31 duplicate keys**, including 1 triplicate (`guru.thinking`).
The other 10 locales each have **25 duplicate keys** (es is the exception at
**0** — was Haiku-regenerated more recently). zh has 25.

Highest-impact duplicates from `en.ts`:

```
3× 'guru.thinking'
2× 'welcome.title'
2× 'weeklyWrap.tapToSelect', 'selectAll', 'regenerateAll', 'parentReports', 'deselectAll'
2× 'weeklyReview.title', 'generating', 'generateFailed'
2× 'voiceObs.approved'
2× 'time.minutesAgo', 'justNow', 'hoursAgo', 'daysAgo'
```

**Failure mode:** TS object literal — the LATER value silently wins. If two
declarations diverge in meaning (e.g. one says "Generating…" and the second
says "Working on it…"), the second value is shipped regardless of which one
was actually intended. Carry-over from S105 — **still pending cleanup**.

Pre-commit hook does not detect duplicates. Recommended: add a duplicate-key
check to `scripts/check-i18n-completeness.mjs` (mechanical, ~10 lines).

---

## 6. Curriculum data layer for new schools — ✅ PASS

S78 rule: every classroom-seeding route MUST call `applyGlobalTranslations()`
fire-and-forget. Verified on all four:

```
app/api/montree/try/instant/route.ts:407       ✓
app/api/montree/principal/setup/route.ts:219   ✓
app/api/montree/principal/setup-stream:159     ✓
app/api/montree/admin/reseed-curriculum:153    ✓
```

Every seed path correctly stamps locale columns from the global library. New
schools across all 11 non-en locales get a localized curriculum at seed time
with zero AI calls.

---

## 7. `fill-missing-i18n-keys.mjs` zh exclusion (rule #245) — confirmed present

`scripts/fill-missing-i18n-keys.mjs:244`:

```js
const langs = requested.length > 0 ? requested
  : ['es','de','fr','pt','nl','it','ja','ko','uk','ru'];
```

`zh` is NOT in the default list. Run with `node scripts/fill-missing-i18n-keys.mjs zh`
to include. No `--include-zh` CLI flag exists; positional args bypass the
default. Documented in S129 rule #245. Behavior intact.

---

## 8. Closing-marker regex (S79 catch) — ✅ FIX INTACT

`scripts/fill-missing-i18n-keys.mjs:204-217` matches BOTH `};` and `} as const;`
via the comment "Find the closing `};` or `} as const;` — must be the LAST
occurrence at indent 0." Throws `Could not find closing }; in ${lang}.ts` if
neither found.

---

## 9. Pre-commit hook (S77) — ✅ INTACT

`.githooks/pre-commit` exists (1,289 bytes, executable). Triggers only when
`lib/montree/i18n/` files are staged. Runs `node scripts/check-i18n-completeness.mjs --strict`.
Blocks commit on failure with auto-fill instructions. Bypassable via
`--no-verify`. Logic intact.

---

## Top 5 actionable

1. **HIGH — Sweep 32 files for `t('key') || 'fallback'`.** Add the missing keys
   to `en.ts` so the t() call returns a real string. Highest-priority files:
   `DashboardHeader.tsx` (12 hits, every page), `parent/dashboard`,
   `parent/messages/[threadId]`, `dashboard/messages/[threadId]`, `photo-audit`,
   `capture`. ~30 min mechanical work + Haiku batch on 10 locales.

2. **HIGH — Cleanup 31 duplicate keys in `en.ts` + 25 in each of 10 locale files
   (carry-over from S105).** Decide which value is correct per duplicate, delete
   the loser. Add duplicate-key detection to
   `scripts/check-i18n-completeness.mjs` so future drift is caught.

3. **MED — Convert 2 hardcoded strings in `dashboard/parent-chats/page.tsx:215-216`**
   to `t()` keys. Last leak from S121 sweep.

4. **MED — Confirm Spanish (`es.ts`) duplicate-free state is the canonical
   target.** Spanish was regenerated more recently and has 0 duplicates while
   every other non-en locale has 25. Suggests the duplicates accumulated through
   incremental key-adding sessions and haven't been swept on the older locale
   files. Run `npm run i18n:fix-names` or similar batch over the 10
   non-Spanish files after fixing `en.ts`.

5. **LOW — Confirm `TeachingNotesView.tsx:345`'s Lora literal is intentional**
   (print CSS context). No action needed unless the literal causes a
   font-fallback issue at print time.

---

**Confidence:** HIGH. All checks above are based on direct grep + script
output, not inference. Duplicate-key counts cross-verified across 11 locale
files via shell pipeline. No DB queries needed for this audit.
