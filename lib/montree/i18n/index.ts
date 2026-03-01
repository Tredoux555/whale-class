// Barrel export — import everything from 'lib/montree/i18n'
export { en, type TranslationKey } from './en';
export { zh } from './zh';
export { I18nProvider, useI18n, useT, type Locale } from './context';
export { getTranslator, getLocaleFromRequest, getTranslatedAreaName, getTranslatedStatus } from './server';
