'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { en, type TranslationKey } from './en';
import { zh } from './zh';
import { es } from './es';
import { de } from './de';
import { fr } from './fr';
import { pt } from './pt';
import { nl } from './nl';
import { it } from './it';
import { ja } from './ja';
import { ko } from './ko';
import { type Locale, DEFAULT_LOCALE, SUPPORTED_LOCALES, isValidLocale } from './locales';

// Re-export Locale for backward compat (173 files import from barrel → context)
export type { Locale };

const STORAGE_KEY = 'montree_lang';

const messages: Record<string, Record<string, string>> = { en, zh, es, de, fr, pt, nl, it, ja, ko };

// Pre-compiled regex cache for interpolation params (avoids creating new RegExp per t() call)
const regexCache = new Map<string, RegExp>();
function getParamRegex(key: string): RegExp {
  let re = regexCache.get(key);
  if (!re) {
    re = new RegExp(`\\{${key}\\}`, 'g');
    regexCache.set(key, re);
  }
  return re;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function I18nProvider({ children }: { children: ReactNode }) {
  // Start with default — useEffect reads localStorage to avoid hydration mismatch
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Read persisted language on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isValidLocale(stored)) {
        setLocaleState(stored);
      }
    } catch {
      // SSR or private browsing — keep default
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let text = (messages[locale]?.[key]) ?? messages[DEFAULT_LOCALE][key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(getParamRegex(k), String(v));
        }
      }
      return text;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Full context — locale, setLocale, t */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Shorthand — just the translate function */
export function useT() {
  return useI18n().t;
}
