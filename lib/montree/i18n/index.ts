// Barrel export — import everything from 'lib/montree/i18n'

// Canonical locale definitions (single source of truth)
export { type Locale, SUPPORTED_LOCALES, DEFAULT_LOCALE, isValidLocale, LOCALE_TO_INTL, getIntlLocale, LOCALE_DISPLAY_NAMES, LOCALE_SHORT_LABELS } from './locales';

// Translation messages
export { en, type TranslationKey } from './en';
export { zh } from './zh';
export { es } from './es';

// React context + hooks (client-side)
export { I18nProvider, useI18n, useT } from './context';

// Server-side translator (API routes)
export { getTranslator, getLocaleFromRequest, getTranslatedAreaName, getTranslatedStatus } from './server';

// Locale-keyed JSONB resolvers
export { type LocalizedString, type LocalizedStringArray, resolveLocalized, resolveLocalizedArray } from './localized-types';

// DB column helpers
export { getLocalizedWorkName, getLocalizedField, getLocalizedColumn } from './db-helpers';

// AI pipeline config
export { LOCALE_AI_CONFIG, getAILanguageInstruction, getLanguageName } from './locale-config';

// Area labels
export { AREA_LABELS, AREA_LABELS_EN, AREA_LABELS_ZH, AREA_LABELS_ES, AREA_KEYS, type AreaKey, getAreaLabel, getAreaArrowExample } from './area-labels';
