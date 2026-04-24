#!/usr/bin/env node
// scripts/add-language.mjs
// Onboarding guide for adding a new language to Montree.
//
// Usage:
//   node scripts/add-language.mjs <locale>
//
// Example:
//   node scripts/add-language.mjs fr
//
// This script prints the exact steps needed — including the ALTER TABLE SQL
// to run in Supabase SQL Editor and which files to create/edit.

const locale = process.argv[2];

if (!locale || locale === 'en') {
  console.error('Usage: node scripts/add-language.mjs <locale>');
  console.error('Example: node scripts/add-language.mjs fr');
  console.error('\nLocale must be a non-English BCP 47 language code (e.g. fr, de, ja, pt, ar).');
  process.exit(1);
}

const name = `name_${locale}`;
const parentDesc = `parent_description_${locale}`;
const whyItMatters = `why_it_matters_${locale}`;

console.log(`
╔══════════════════════════════════════════════════════════╗
║  Add Language: ${locale.toUpperCase().padEnd(43)}║
╚══════════════════════════════════════════════════════════╝

Adding a new language to Montree requires 5 steps.
Steps 1–4 are one-time setup. Step 5 batch-translates all
existing curriculum works for every classroom in the DB.

────────────────────────────────────────────────────────────
STEP 1 — Run this SQL in Supabase SQL Editor
────────────────────────────────────────────────────────────

ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS ${name} TEXT,
  ADD COLUMN IF NOT EXISTS ${parentDesc} TEXT,
  ADD COLUMN IF NOT EXISTS ${whyItMatters} TEXT;

────────────────────────────────────────────────────────────
STEP 2 — Add '${locale}' to ENABLED_LOCALES (one line change)
────────────────────────────────────────────────────────────

File: lib/montree/locales-config.ts

  export const ENABLED_LOCALES: Locale[] = ['zh', 'es', '${locale}'];

Also add '${locale}' to SUPPORTED_LOCALES in:
  lib/montree/i18n/locales.ts

────────────────────────────────────────────────────────────
STEP 3 — Create the UI translation file
────────────────────────────────────────────────────────────

  cp lib/montree/i18n/en.ts lib/montree/i18n/${locale}.ts

Then translate all ~3,713 keys in ${locale}.ts.
(Tip: use the same two-pass Haiku batch pipeline as es.ts —
 see docs/MULTILINGUAL_AUDIT_HANDOFF.md for the approach.)

────────────────────────────────────────────────────────────
STEP 4 — Wire up the locale metadata (3 files, ~5 min each)
────────────────────────────────────────────────────────────

  lib/montree/i18n/area-labels.ts
    → Add ${locale} entries to AREA_LABELS map

  lib/montree/i18n/locale-config.ts
    → Add LOCALE_AI_CONFIG['${locale}'] entry with:
        languageName, aiShortDirective, systemPromptSuffix, glossary

  lib/montree/i18n/locales.ts
    → Add LOCALE_TO_INTL['${locale}'] BCP 47 date format
    → Add LOCALE_DISPLAY_NAMES['${locale}'] native name
    → Add LOCALE_SHORT_LABELS['${locale}'] compact label

────────────────────────────────────────────────────────────
STEP 5 — Batch-translate all existing curriculum works
────────────────────────────────────────────────────────────

After completing Steps 1–4, call the batch-translate API
for every existing classroom. The API already accepts any
locale via the target_locale body param:

  POST /api/montree/curriculum/batch-translate
  { "classroom_id": "<id>", "target_locale": "${locale}" }

Or use the admin script (once built for your school):
  node scripts/run-batch-translate.mjs ${locale}

────────────────────────────────────────────────────────────
WHAT YOU GET FOR FREE (no additional code changes)
────────────────────────────────────────────────────────────

✓ All 5 INSERT write paths automatically include ${name}: null
✓ All new classrooms get ${locale} batch-translated on setup
✓ add-custom-work fires translateAllLocales() for ${locale}
✓ batch-translate API route accepts target_locale: '${locale}'
✓ All UI components resolve locale via t() / resolveLocalized()

────────────────────────────────────────────────────────────
`);
