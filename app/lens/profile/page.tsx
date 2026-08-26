// app/lens/profile/page.tsx — her letterhead and her voice.
//
// Two halves. The LETTERHEAD is what prints on every PDF cover, so it is edited
// as the block it will appear as rather than as a list of unrelated fields. The
// STYLE PROFILE is what the Guru is told about how she writes — and every field
// in it starts empty on purpose: a default of "medium sentences, neutral
// register" would be the app inventing a person, which is the same failure mode
// as inventing an observation.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_GHOST, BTN_PRIMARY, CARD, LABEL, RULE } from '@/lib/lens/ui';
import { LENS_LANGUAGES, type LensObserver, type LensStyleProfile } from '@/lib/lens/types';
import { ErrorNote, LensHeader } from '@/components/lens/LensChrome';

const SENTENCE = [
  ['short', 'Short and declarative'],
  ['medium', 'Medium, varied'],
  ['long', 'Long and subordinated'],
] as const;
const FORMALITY = [
  ['warm', 'Warm, first person'],
  ['neutral', 'Neutral professional'],
  ['formal', 'Formal, impersonal'],
] as const;
const DIRECTNESS = [
  ['gentle', 'Gentle — offered'],
  ['balanced', 'Balanced — clear'],
  ['blunt', 'Blunt — names it'],
] as const;

export default function LensProfilePage() {
  const router = useRouter();
  const [observer, setObserver] = useState<LensObserver | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [style, setStyle] = useState<LensStyleProfile>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await lensApi<{ observer: LensObserver }>('/api/lens/profile');
      setObserver(data.observer);
      setForm({
        name: data.observer.name ?? '',
        title: data.observer.title ?? '',
        credentials: data.observer.credentials ?? '',
        organisation: data.observer.organisation ?? '',
        letterhead_name: data.observer.letterhead_name ?? '',
        letterhead_line1: data.observer.letterhead_line1 ?? '',
        letterhead_line2: data.observer.letterhead_line2 ?? '',
        letterhead_email: data.observer.letterhead_email ?? '',
        letterhead_phone: data.observer.letterhead_phone ?? '',
        signature_text: data.observer.signature_text ?? '',
      });
      setLanguages(data.observer.default_languages ?? ['en']);
      setStyle(data.observer.style_profile ?? {});
      setError(null);
    } catch (err) {
      if (err instanceof LensApiError && err.status === 401) {
        router.replace('/lens');
        return;
      }
      setError(err instanceof LensApiError ? err.message : 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await lensApi('/api/lens/profile', {
        method: 'PATCH',
        json: { ...form, default_languages: languages, style_profile: style },
      });
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await lensApi('/api/lens/auth/logout', { method: 'POST' });
    } catch {
      /* the cookie may already be gone; go to the door either way */
    }
    router.replace('/lens');
  }

  const field = (key: string, label: string, placeholder?: string) => (
    <div>
      <label className={LABEL} htmlFor={`p-${key}`}>
        {label}
      </label>
      <input
        id={`p-${key}`}
        className="ln-field"
        placeholder={placeholder}
        value={form[key] ?? ''}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  const pick = <K extends keyof LensStyleProfile>(
    key: K,
    options: readonly (readonly [string, string])[],
    label: string,
  ) => (
    <div>
      <p className={LABEL}>{label}</p>
      <div className="ln-rail">
        {options.map(([value, text]) => (
          <button
            key={value}
            type="button"
            className="ln-chip"
            data-on={style[key] === value ? '1' : '0'}
            onClick={() =>
              setStyle((prev) => {
                const next = { ...prev };
                if (next[key] === value) delete next[key];
                else next[key] = value as LensStyleProfile[K];
                return next;
              })
            }
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16">
      <LensHeader title="Profile" back="/lens/home" />

      <ErrorNote message={error} />
      {saved && <p className="mb-3 text-[13px] text-emerald-primary">Saved.</p>}

      {loading ? (
        <p className="text-sm text-forest-muted">Loading…</p>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-5">
          <div className={CARD}>
            <h2 className="mb-1 font-serif text-lg text-forest-text">Who you are</h2>
            <div className={RULE} />
            <div className="mt-3 flex flex-col gap-3">
              {field('name', 'Name')}
              {field('title', 'Title', 'AMI Consultant, Pedagogical Director…')}
              {field('credentials', 'Credentials', 'AMI 3–6, AMS, M.Ed…')}
              {field('organisation', 'Organisation')}
            </div>
          </div>

          <div className={CARD}>
            <h2 className="mb-1 font-serif text-lg text-forest-text">Letterhead</h2>
            <div className={RULE} />
            <p className="mt-2 text-[12px] leading-snug text-forest-muted">
              This is the block that prints on the cover of every report. Leave a line
              blank and it is simply not printed.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {field('letterhead_name', 'Heading', 'Your practice name, or your own')}
              {field('letterhead_line1', 'Line 1', 'Street, city')}
              {field('letterhead_line2', 'Line 2', 'Country, registration…')}
              <div className="grid grid-cols-2 gap-3">
                {field('letterhead_email', 'Email')}
                {field('letterhead_phone', 'Phone')}
              </div>
              <div>
                <label className={LABEL} htmlFor="p-sig">
                  Signature line
                </label>
                <input
                  id="p-sig"
                  className="ln-field"
                  placeholder="Signed, name, credentials"
                  value={form.signature_text ?? ''}
                  onChange={(e) => setForm({ ...form, signature_text: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className={CARD}>
            <h2 className="mb-1 font-serif text-lg text-forest-text">Report languages</h2>
            <div className={RULE} />
            <div className="ln-rail mt-3">
              {LENS_LANGUAGES.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="ln-chip"
                  data-on={languages.includes(code) ? '1' : '0'}
                  onClick={() =>
                    setLanguages((prev) => {
                      // At least one must survive: a report in no language is
                      // not a report, and the API refuses an empty list anyway.
                      if (prev.includes(code)) {
                        return prev.length === 1 ? prev : prev.filter((c) => c !== code);
                      }
                      return [...prev, code];
                    })
                  }
                >
                  {code === 'en' ? 'English' : '中文'}
                </button>
              ))}
            </div>
          </div>

          <div className={CARD}>
            <h2 className="mb-1 font-serif text-lg text-forest-text">Your voice</h2>
            <div className={RULE} />
            <p className="mt-2 text-[12px] leading-snug text-forest-muted">
              What the Guru is told about how you write. Everything here starts empty —
              a setting you have not chosen is not passed on, because the alternative is
              the app inventing a version of you.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {pick('sentence_length', SENTENCE, 'Sentences')}
              {pick('formality', FORMALITY, 'Register')}
              {pick('directness', DIRECTNESS, 'Directness')}
              <div>
                <label className={LABEL} htmlFor="p-fav">
                  Phrases you use (comma separated)
                </label>
                <input
                  id="p-fav"
                  className="ln-field"
                  value={(style.favourite_phrases ?? []).join(', ')}
                  onChange={(e) =>
                    setStyle({
                      ...style,
                      favourite_phrases: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="p-avoid">
                  Phrases you never use
                </label>
                <input
                  id="p-avoid"
                  className="ln-field"
                  value={(style.avoid_phrases ?? []).join(', ')}
                  onChange={(e) =>
                    setStyle({
                      ...style,
                      avoid_phrases: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="p-notes">
                  Anything else about your voice
                </label>
                <textarea
                  id="p-notes"
                  className="ln-field"
                  rows={3}
                  value={style.notes ?? ''}
                  onChange={(e) => setStyle({ ...style, notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button type="submit" className={`${BTN_PRIMARY} w-full`} disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>

          <div className="flex items-center justify-between">
            <p className="text-[12px] text-forest-muted">
              Signed in{observer ? ` as ${observer.name}` : ''}.
            </p>
            <button type="button" className={BTN_GHOST} onClick={signOut}>
              Sign out
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
