// lib/cms/i18n/dictionaries/zh.ts
// Chinese — TYPED STUB. Re-exports English verbatim so the locale is selectable,
// the app never shows a blank, and `tsc` still guarantees the key set matches.
//
// TODO(i18n): translate. Replace this file with a full `Dictionary` literal,
// key-for-key against dictionaries/en.ts, then flip LOCALE_META['zh'].status
// to 'complete' in lib/cms/i18n/config.ts. Copy ru.ts or ar.ts as the shape to
// follow — both are real, finished translations.

import type { Dictionary } from './en';
import en from './en';

const zh: Dictionary = { ...en };

export default zh;
