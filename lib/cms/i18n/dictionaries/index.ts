// lib/cms/i18n/dictionaries/index.ts
// The locale → dictionary registry. Static imports (not dynamic) so a missing
// dictionary is a build error and so the bundler can tree-shake per route.

import type { Locale } from '../config';
import type { Dictionary } from './en';
import en from './en';
import fr from './fr';
import es from './es';
import ru from './ru';
import ar from './ar';
import sw from './sw';
import zh from './zh';

export const DICTIONARIES: Record<Locale, Dictionary> = { en, fr, es, ru, ar, sw, zh };

export type { Dictionary };
export type { TranslationKey } from './en';
