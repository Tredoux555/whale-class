// app/lens/schools/[id]/page.tsx — one school and its classrooms.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, LABEL } from '@/lib/lens/ui';
import {
  CLASSROOM_LEVELS,
  LEVEL_LABELS,
  type ClassroomLevel,
  type LensClassroom,
  type LensSchool,
} from '@/lib/lens/types';
import { EmptyState, ErrorNote, LensHeader, RowLink } from '@/components/lens/LensChrome';

export default function LensSchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [school, setSchool] = useState<LensSchool | null>(null);
  const [classrooms, setClassrooms] = useState<LensClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    level: ClassroomLevel;
    age_range: string;
    child_count: string;
    ratio: string;
  }>({ name: '', level: 'casa', age_range: '', child_count: '', ratio: '' });

  const load = useCallback(async () => {
    try {
      const data = await lensApi<{ school: LensSchool; classrooms: LensClassroom[] }>(
        `/api/lens/schools/${id}`,
      );
      setSchool(data.school);
      setClassrooms(data.classrooms);
      setError(null);
    } catch (err) {
      if (err instanceof LensApiError && err.status === 401) {
        router.replace('/lens');
        return;
      }
      setError(err instanceof LensApiError ? err.message : 'Could not load that school.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !form.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await lensApi(`/api/lens/schools/${id}/classrooms`, {
        method: 'POST',
        json: {
          ...form,
          // An empty box means "I don't know yet", which is a NULL, not a zero.
          child_count: form.child_count === '' ? null : Number(form.child_count),
        },
      });
      setForm({ name: '', level: 'casa', age_range: '', child_count: '', ratio: '' });
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not add that classroom.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16">
      <LensHeader
        title={school?.name ?? 'School'}
        subtitle={school ? [school.city, school.country, school.affiliation].filter(Boolean).join(' · ') : null}
        back="/lens/schools"
      />

      <ErrorNote message={error} />

      {adding ? (
        <form onSubmit={create} className={`${CARD} mb-5`}>
          <label className={LABEL} htmlFor="c-name">
            Classroom name
          </label>
          <input
            id="c-name"
            className="ln-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
          <div className="mt-3">
            <label className={LABEL} htmlFor="c-level">
              Level
            </label>
            <select
              id="c-level"
              className="ln-field"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value as ClassroomLevel })}
            >
              {CLASSROOM_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL} htmlFor="c-age">
                Ages
              </label>
              <input
                id="c-age"
                className="ln-field"
                placeholder="3–6"
                value={form.age_range}
                onChange={(e) => setForm({ ...form, age_range: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="c-count">
                Children
              </label>
              <input
                id="c-count"
                className="ln-field"
                inputMode="numeric"
                value={form.child_count}
                onChange={(e) => setForm({ ...form, child_count: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="c-ratio">
                Ratio
              </label>
              <input
                id="c-ratio"
                className="ln-field"
                placeholder="1:12"
                value={form.ratio}
                onChange={(e) => setForm({ ...form, ratio: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className={`${BTN_PRIMARY} flex-1`} disabled={busy || !form.name.trim()}>
              {busy ? 'Saving…' : 'Add classroom'}
            </button>
            <button type="button" className={BTN_SECONDARY} onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className={`${BTN_SECONDARY} mb-5 w-full`} onClick={() => setAdding(true)}>
          + Add a classroom
        </button>
      )}

      {loading ? (
        <p className="text-sm text-forest-muted">Loading…</p>
      ) : classrooms.length === 0 ? (
        <EmptyState
          title="No classrooms yet"
          body="A visit observes rooms, and a report is written per room. Add the ones you will be walking into."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {classrooms.map((c) => (
            <RowLink
              key={c.id}
              href={`/lens/classrooms/${c.id}`}
              title={c.name}
              meta={[
                LEVEL_LABELS[c.level] ?? c.level,
                c.age_range ? `ages ${c.age_range}` : null,
                c.child_count != null ? `${c.child_count} children` : null,
                c.ratio ? `ratio ${c.ratio}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
        </div>
      )}
    </main>
  );
}
