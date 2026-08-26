// app/lens/visits/new/page.tsx — start a visit.
//
// School → date → engagement type → rooms. Four decisions, one screen, because
// this is usually being filled in while walking from a car park.
//
// 🚨 THE FOLLOW-UP LOOP LIVES HERE. The moment she ticks a classroom, its open
// action items from previous visits appear, and each one can be CARRIED into
// this visit. Carried items are held in sessionStorage against the new visit id
// and seeded into the report when it is finalised (see the report editor and
// lib/lens/reports/action-items.ts) — which is what turns a series of visits
// into a relationship rather than a series of documents.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_PRIMARY, CARD, LABEL } from '@/lib/lens/ui';
import {
  ENGAGEMENT_BLURBS,
  ENGAGEMENT_LABELS,
  ENGAGEMENT_TYPES,
  LEVEL_LABELS,
  type EngagementType,
  type LensActionItem,
  type LensClassroom,
  type LensSchool,
} from '@/lib/lens/types';
import { carriedStorageKey, type CarriedItem } from '@/lib/lens/carried';
import { EmptyState, ErrorNote, LensHeader } from '@/components/lens/LensChrome';

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function LensNewVisitPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<LensSchool[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [classrooms, setClassrooms] = useState<LensClassroom[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [visitDate, setVisitDate] = useState(today());
  const [engagement, setEngagement] = useState<EngagementType>('consultation');
  const [purpose, setPurpose] = useState('');
  const [openByRoom, setOpenByRoom] = useState<Record<string, LensActionItem[]>>({});
  const [carry, setCarry] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lensApi<{ schools: LensSchool[] }>('/api/lens/schools')
      .then((data) => {
        setSchools(data.schools);
        if (data.schools.length === 1) setSchoolId(data.schools[0].id);
      })
      .catch((err) => {
        if (err instanceof LensApiError && err.status === 401) router.replace('/lens');
        else setError('Could not load your schools.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!schoolId) {
      setClassrooms([]);
      setPicked(new Set());
      return;
    }
    lensApi<{ classrooms: LensClassroom[] }>(`/api/lens/schools/${schoolId}/classrooms`)
      .then((data) => setClassrooms(data.classrooms))
      .catch(() => setError('Could not load that school’s classrooms.'));
  }, [schoolId]);

  /** Pull the open follow-ups for a room the first time she ticks it. */
  const loadOpenFor = useCallback(
    async (classroomId: string) => {
      if (openByRoom[classroomId]) return;
      try {
        const data = await lensApi<{ openActions: LensActionItem[] }>(
          `/api/lens/classrooms/${classroomId}`,
        );
        setOpenByRoom((prev) => ({ ...prev, [classroomId]: data.openActions }));
      } catch {
        // Not fatal: she can still start the visit. The follow-ups simply do not
        // show, and she is told nothing false about them.
        setOpenByRoom((prev) => ({ ...prev, [classroomId]: [] }));
      }
    },
    [openByRoom],
  );

  function toggleRoom(classroomId: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(classroomId)) next.delete(classroomId);
      else {
        next.add(classroomId);
        loadOpenFor(classroomId);
      }
      return next;
    });
  }

  const pickedRooms = classrooms.filter((c) => picked.has(c.id));
  const carriable = pickedRooms.flatMap((room) =>
    (openByRoom[room.id] ?? []).map((item) => ({ room, item })),
  );

  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !schoolId) return;
    setBusy(true);
    setError(null);
    try {
      const created = await lensApi<{ visit: { id: string } }>('/api/lens/visits', {
        method: 'POST',
        json: {
          school_id: schoolId,
          visit_date: visitDate,
          engagement_type: engagement,
          purpose,
          classroom_ids: [...picked],
        },
      });
      // 🚨 sessionStorage, not the database, and on purpose: nothing is CARRIED
      // until the new report is finalised. Writing carried rows now would create
      // action items on a report that may never be written, and would double
      // every follow-up if she started the visit twice. The report editor reads
      // this key at finalise time and clears it.
      const chosen: CarriedItem[] = carriable
        .filter(({ item }) => carry.has(item.id))
        .map(({ item }) => ({
          id: item.id,
          text: item.text,
          owner: item.owner,
          due_date: item.due_date,
          classroom_id: item.classroom_id,
        }));
      if (chosen.length > 0 && typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem(carriedStorageKey(created.visit.id), JSON.stringify(chosen));
        } catch {
          /* private mode — she can re-add them by hand, the visit still starts */
        }
      }
      router.replace(`/lens/visits/${created.visit.id}/capture`);
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not start that visit.');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24">
      <LensHeader title="New visit" back="/lens/home" />

      <ErrorNote message={error} />

      {loading ? (
        <p className="text-sm text-forest-muted">Loading…</p>
      ) : schools.length === 0 ? (
        <EmptyState
          title="No schools yet"
          body="Add a school before you start a visit — the visit, its rooms and its report all hang off one."
          action={
            <button type="button" className={BTN_PRIMARY} onClick={() => router.push('/lens/schools')}>
              Add a school
            </button>
          }
        />
      ) : (
        <form onSubmit={start} className="flex flex-col gap-5">
          <div className={CARD}>
            <label className={LABEL} htmlFor="v-school">
              School
            </label>
            <select
              id="v-school"
              className="ln-field"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">Choose a school…</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="mt-3">
              <label className={LABEL} htmlFor="v-date">
                Date
              </label>
              <input
                id="v-date"
                type="date"
                className="ln-field"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </div>
          </div>

          <div className={CARD}>
            <p className={LABEL}>Engagement type</p>
            <div className="flex flex-col gap-2">
              {ENGAGEMENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEngagement(type)}
                  data-on={engagement === type ? '1' : '0'}
                  className={`ln-tap rounded-xl border px-4 py-3 text-left transition ${
                    engagement === type
                      ? 'border-emerald-primary bg-[rgba(52,211,153,0.10)]'
                      : 'border-[rgba(52,211,153,0.18)]'
                  }`}
                >
                  <span className="block text-[15px] text-forest-text">{ENGAGEMENT_LABELS[type]}</span>
                  <span className="mt-1 block text-[12px] leading-snug text-forest-muted">
                    {ENGAGEMENT_BLURBS[type]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={CARD}>
            <p className={LABEL}>Classrooms</p>
            {classrooms.length === 0 ? (
              <p className="text-[13px] text-forest-muted">
                {schoolId
                  ? 'That school has no classrooms yet. You can start the visit anyway and write a level report.'
                  : 'Choose a school first.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {classrooms.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="ln-chip"
                    data-on={picked.has(c.id) ? '1' : '0'}
                    onClick={() => toggleRoom(c.id)}
                  >
                    {c.name} · {LEVEL_LABELS[c.level] ?? c.level}
                  </button>
                ))}
              </div>
            )}
          </div>

          {carriable.length > 0 && (
            <div className={`${CARD} border-[rgba(232,201,106,0.35)]`}>
              <p className="mb-1 text-[12px] uppercase tracking-wider text-forest-gold">
                Last visit’s action items
              </p>
              <p className="mb-3 text-[12px] leading-snug text-forest-muted">
                Tick the ones to carry into this visit. Carried items are seeded into
                the new report when you finalise it, so “we asked for this last time”
                is in the record and not just in your memory.
              </p>
              <div className="flex flex-col gap-2">
                {carriable.map(({ room, item }) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-[rgba(52,211,153,0.16)] px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#34D399]"
                      checked={carry.has(item.id)}
                      onChange={(e) =>
                        setCarry((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] leading-snug text-forest-text">{item.text}</span>
                      <span className="block text-[12px] text-forest-muted">
                        {[room.name, item.owner, item.due_date ? `due ${item.due_date}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className={CARD}>
            <label className={LABEL} htmlFor="v-purpose">
              Purpose (optional)
            </label>
            <textarea
              id="v-purpose"
              className="ln-field"
              rows={2}
              placeholder="What this visit is for, in your own words."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <button type="submit" className={`${BTN_PRIMARY} w-full text-base`} disabled={busy || !schoolId}>
            {busy ? 'Starting…' : 'Start capturing'}
          </button>
        </form>
      )}
    </main>
  );
}
