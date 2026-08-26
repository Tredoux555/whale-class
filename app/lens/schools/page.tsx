// app/lens/schools/page.tsx — the client list, plus the form that adds to it.
//
// The "add" form is inline rather than on its own route: a consultant adds a
// school perhaps once a month, usually while standing in its reception, and a
// second page load on hotel wifi to type one field is the wrong trade.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, LABEL } from '@/lib/lens/ui';
import type { LensSchool } from '@/lib/lens/types';
import { EmptyState, ErrorNote, LensHeader, RowLink } from '@/components/lens/LensChrome';

export default function LensSchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<LensSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', city: '', country: '', affiliation: '' });

  const load = useCallback(async () => {
    try {
      const data = await lensApi<{ schools: LensSchool[] }>('/api/lens/schools');
      setSchools(data.schools);
      setError(null);
    } catch (err) {
      if (err instanceof LensApiError && err.status === 401) {
        router.replace('/lens');
        return;
      }
      setError(err instanceof LensApiError ? err.message : 'Could not load your schools.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !form.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await lensApi<{ school: LensSchool }>('/api/lens/schools', {
        method: 'POST',
        json: form,
      });
      setForm({ name: '', city: '', country: '', affiliation: '' });
      setAdding(false);
      // Straight into the new school: the next thing she wants is its rooms.
      router.push(`/lens/schools/${created.school.id}`);
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not add that school.');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16">
      <LensHeader title="Schools" back="/lens/home" />

      <ErrorNote message={error} />

      {adding ? (
        <form onSubmit={create} className={`${CARD} mb-5`}>
          <label className={LABEL} htmlFor="s-name">
            School name
          </label>
          <input
            id="s-name"
            className="ln-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="s-city">
                City
              </label>
              <input
                id="s-city"
                className="ln-field"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="s-country">
                Country
              </label>
              <input
                id="s-country"
                className="ln-field"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className={LABEL} htmlFor="s-aff">
              Affiliation
            </label>
            <input
              id="s-aff"
              className="ln-field"
              placeholder="AMI, AMS, IMC, none…"
              value={form.affiliation}
              onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className={`${BTN_PRIMARY} flex-1`} disabled={busy || !form.name.trim()}>
              {busy ? 'Saving…' : 'Add school'}
            </button>
            <button type="button" className={BTN_SECONDARY} onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className={`${BTN_SECONDARY} mb-5 w-full`} onClick={() => setAdding(true)}>
          + Add a school
        </button>
      )}

      {loading ? (
        <p className="text-sm text-forest-muted">Loading…</p>
      ) : schools.length === 0 ? (
        <EmptyState
          title="No schools yet"
          body="Add the first school you visit. Its classrooms and staff hang off it, and every visit and report you write is filed under it."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {schools.map((s) => (
            <RowLink
              key={s.id}
              href={`/lens/schools/${s.id}`}
              title={s.name}
              meta={[s.city, s.country, s.affiliation].filter(Boolean).join(' · ') || null}
            />
          ))}
        </div>
      )}
    </main>
  );
}
