'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { en, type TranslationKey } from './en';
import { type Locale, DEFAULT_LOCALE, isValidLocale } from './locales';

// Re-export Locale for backward compat (173 files import from barrel → context)
export type { Locale };

const STORAGE_KEY = 'montree_lang';
const COOKIE_KEY = 'mt_locale';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year
// Window event broadcast on every setLocale — see the listener in the provider.
const LOCALE_EVENT = 'montree:locale-change';

// 🚨 Perf Tier 1.4 (PERF_HEALTH_CHECK.md): only English ships in the initial
// page bundle. The 11 other locale files (zh/es/de/fr/pt/nl/it/ja/ko/uk/ru)
// load lazily via dynamic import — webpack splits each into its own chunk.
// Saves ~700KB gzip on every initial page load for the ~95% of users who
// never switch language.
//
// Module-level `messages` map accumulates locale data as it's loaded. en is
// pre-populated; everything else lands here after loadLocale() resolves.
const messages: Record<string, Record<string, string>> = { en };

/**
 * Lazy-load a locale file. Cached by module — calling twice for the same
 * locale only fetches once. Returns the message map (the same object that
 * gets assigned into the module-level `messages` cache).
 *
 * Switch statement (rather than dynamic `import(./${locale})` template) so
 * webpack can statically analyse which chunks exist. Each `import('./xx')`
 * becomes a separate code-split chunk that downloads on demand.
 */
async function loadLocale(locale: Locale): Promise<Record<string, string>> {
  if (messages[locale]) return messages[locale];
  let data: Record<string, string>;
  switch (locale) {
    case 'en': data = en; break;
    case 'zh': data = (await import('./zh')).zh; break;
    case 'es': data = (await import('./es')).es; break;
    case 'de': data = (await import('./de')).de; break;
    case 'fr': data = (await import('./fr')).fr; break;
    case 'pt': data = (await import('./pt')).pt; break;
    case 'nl': data = (await import('./nl')).nl; break;
    case 'it': data = (await import('./it')).it; break;
    case 'ja': data = (await import('./ja')).ja; break;
    case 'ko': data = (await import('./ko')).ko; break;
    case 'uk': data = (await import('./uk')).uk; break;
    case 'ru': data = (await import('./ru')).ru; break;
    default: data = en;
  }
  messages[locale] = data;
  return data;
}

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
export function I18nProvider({
  children,
  initialLocale,
  initialMessages,
}: {
  children: ReactNode;
  /**
   * Locale read from the `mt_locale` cookie on the server in app/montree/layout.tsx.
   * Lets the provider start with the right locale instead of defaulting to en
   * and flashing on mount. Falls back to DEFAULT_LOCALE if not provided.
   */
  initialLocale?: Locale;
  /**
   * Server-loaded message data for the initialLocale. Eliminates the English
   * flash on first paint by seeding the module-level cache before render.
   * Only set when initialLocale is non-en (en is already statically imported).
   */
  initialMessages?: Record<string, string>;
}) {
  const seedLocale: Locale = initialLocale && isValidLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE;
  // Seed module-level cache with the server-resolved messages BEFORE useState
  // runs. This makes t() return the right locale on the very first render —
  // no English flash, no useEffect round-trip needed for the initial paint.
  if (initialMessages && seedLocale !== 'en' && !messages[seedLocale]) {
    messages[seedLocale] = initialMessages;
  }
  const [locale, setLocaleState] = useState<Locale>(seedLocale);
  // Track which locales are loaded so re-renders happen when async load lands.
  // en is always pre-loaded (static import). The initial locale is also
  // pre-loaded when initialMessages was provided by the server.
  const [loadedLocales, setLoadedLocales] = useState<Set<Locale>>(() => {
    const set = new Set<Locale>(['en']);
    if (initialMessages && seedLocale !== 'en') set.add(seedLocale);
    return set;
  });

  // Load the active locale's data on mount (and whenever locale changes).
  // Server-passed initialLocale + cookie skip the localStorage round-trip, but
  // we still read localStorage as a fallback for users where the cookie was
  // cleared but localStorage persists (private browsing, etc.).
  useEffect(() => {
    let cancelled = false;
    // If no initialLocale came from the server, try localStorage on mount.
    if (!initialLocale) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isValidLocale(stored) && stored !== locale) {
          setLocaleState(stored);
          return; // The next effect run will load it
        }
      } catch {
        // SSR or private browsing — keep default
      }
    }
    if (loadedLocales.has(locale)) return;
    // Lazy-load the locale chunk WITH retry. A transient chunk-load failure
    // (network blip on the dynamic import) would otherwise leave `locale`
    // set but its messages never loaded — so t() falls back to English and
    // the UI is stuck in English until a hard reload, even though the
    // switcher + cookie say otherwise. Retrying the import recovers it.
    const tryLoad = (attempt: number) => {
      loadLocale(locale)
        .then(() => {
          if (!cancelled) setLoadedLocales((prev) => new Set([...prev, locale]));
        })
        .catch((err) => {
          console.error(`[i18n] locale "${locale}" load failed (attempt ${attempt})`, err);
          if (!cancelled && attempt < 2) {
            setTimeout(() => { if (!cancelled) tryLoad(attempt + 1); }, 400 * (attempt + 1));
          }
        });
    };
    tryLoad(0);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Keep the document's <html lang> attribute in sync with the active locale.
  // It was stuck at "en" across every locale switch — an a11y/SEO correctness
  // nit (screen readers + search engines read the document language from it).
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      // Cookie persists across origins + lets the server pre-resolve the
      // locale on next page load so there's no English flash.
      // SameSite=Lax is correct for first-party app cookies; Secure is safe
      // because the app is HTTPS-only in production.
      if (typeof document !== 'undefined') {
        document.cookie = `${COOKIE_KEY}=${l}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        // Broadcast so EVERY language switcher on the page updates at once —
        // not just the one that was clicked (handoff bug #22). A single
        // provider already shares state via context, but this also keeps
        // any future second provider instance + other browser tabs in sync.
        window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: l }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Listen for locale changes broadcast by another switcher / another tab and
  // mirror them into this provider's state. Keeps the whole UI consistent.
  useEffect(() => {
    const onLocaleEvent = (e: Event) => {
      const next = (e as CustomEvent).detail;
      if (isValidLocale(next)) setLocaleState((cur) => (cur === next ? cur : next));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isValidLocale(e.newValue)) {
        setLocaleState((cur) => (cur === e.newValue ? cur : (e.newValue as Locale)));
      }
    };
    window.addEventListener(LOCALE_EVENT, onLocaleEvent);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(LOCALE_EVENT, onLocaleEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      // Fallback chain: requested locale (if loaded) → en → key. The loadedLocales
      // dep is read by useCallback so consumers re-evaluate t() the moment a
      // newly-loaded locale lands.
      const localeData = loadedLocales.has(locale) ? messages[locale] : undefined;
      let text = localeData?.[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(getParamRegex(k), String(v));
        }
      }
      return text;
    },
    [locale, loadedLocales],
  );

  // Memoized so consumers only re-render when locale (or t/setLocale) actually changes,
  // not on every parent render. With 173 files importing via the barrel, this matters.
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={value}>
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
