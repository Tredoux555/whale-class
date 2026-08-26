// app/lens/classrooms/[id]/page.tsx — one room, its staff, and what is still
// open from the last visit.
//
// The open action items are shown HERE as well as on /lens/visits/new because
// this is the page she opens the evening before, when she is deciding what to
// look at tomorrow.

'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, CARD, LABEL } from '@/lib/lens/ui';
import {
  LEVEL_LABELS,
  STAFF_ROLES,
  STAFF_ROLE_LABELS,
  type LensActionItem,
  type LensClassroom,
  type LensSchool,
  type LensStaff,
  type StaffRole,
} from '@/lib/lens/types';
import { EmptyState, ErrorNote, LensHeader } from '@/components/lens/LensChrome';

export default function LensClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [classroom, setClassroom] = useState<LensClassroom | null>(null);
  const [school, setSchool] = useState<LensSchool | null>(null);
  const [staff, setStaff] = useState<LensStaff[]>([]);
  const [openActions, setOpenActions] = useState<LensActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    role: StaffRole;
    training: string;
    training_level: string;
    years_experience: string;
  }>({ name: '', role: 'lead_guide', training: '', training_level: '', years_experience: '' });

  const load = useCallback(async () => {
    try {
      const data = await lensApi<{
        classroom: LensClassroom;
        school: LensSchool;
        staff: LensStaff[];
        openActions: LensActionItem[];
      }>(`/api/lens/classrooms/${id}`);
      setClassroom(data.classroom);
      setSchool(data.school);
      setStaff(data.staff);
      setOpenActions(data.openActions);
      setError(null);
    } catch (err) {
      if (err instanceof LensApiError && err.status === 401) {
        router.replace('/lens');
        return;
      }
      setError(err instanceof LensApiError ? err.message : 'Could not load that classroom.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function addStaff(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !form.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await lensApi(`/api/lens/classrooms/${id}/staff`, {
        method: 'POST',
        json: {
          ...form,
          years_experience:
            form.years_experience === '' ? null : Number(form.years_experience),
        },
      });
      setForm({ name: '', role: 'lead_guide', training: '', training_level: '', years_experience: '' });
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not add that person.');
    } finally {
      setBusy(false);
    }
  }

  async function removeStaff(staffId: string) {
    setError(null);
    try {
      await lensApi(`/api/lens/staff/${staffId}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not remove that person.');
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16">
      <LensHeader
        title={classroom?.name ?? 'Classroom'}
        subtitle={
          classroom
            ? [
                school?.name,
                LEVEL_LABELS[classroom.level] ?? classroom.level,
                classroom.age_range ? `ages ${classroom.age_range}` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : null
        }
        back={school ? `/lens/schools/${school.id}` : 'auto'}
      />

      <ErrorNote message={error} />

      {loading ? (
        <p className="text-sm text-forest-muted">Loading…</p>
      ) : (
        <>
          {openActions.length > 0 && (
            <section className={`${CARD} mb-5 border-[rgba(232,201,106,0.35)]`}>
              <h2 className="mb-2 text-[12px] uppercase tracking-wider text-forest-gold">
                Still open from a previous visit
              </h2>
              <ul className="flex flex-col gap-2">
                {openActions.map((a) => (
                  <li key={a.id} className="text-[14px] leading-snug text-forest-text">
                    • {a.text}
                    {(a.owner || a.due_date) && (
                      <span className="text-forest-muted">
                        {' '}
                        — {[a.owner, a.due_date ? `due ${a.due_date}` : null].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[12px] uppercase tracking-wider text-forest-muted">Staff</h2>
              {!adding && (
                <button type="button" className={BTN_SECONDARY} onClick={() => setAdding(true)}>
                  + Add
                </button>
              )}
            </div>

            {adding && (
              <form onSubmit={addStaff} className={`${CARD} mb-4`}>
                <label className={LABEL} htmlFor="st-name">
                  Name
                </label>
                <input
                  id="st-name"
                  className="ln-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
                <div className="mt-3">
                  <label className={LABEL} htmlFor="st-role">
                    Role
                  </label>
                  <select
                    id="st-role"
                    className="ln-field"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {STAFF_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <label className={LABEL} htmlFor="st-training">
                      Training
                    </label>
                    <input
                      id="st-training"
                      className="ln-field"
                      placeholder="AMI"
                      value={form.training}
                      onChange={(e) => setForm({ ...form, training: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="st-level">
                      Level
                    </label>
                    <input
                      id="st-level"
                      className="ln-field"
                      placeholder="3–6"
                      value={form.training_level}
                      onChange={(e) => setForm({ ...form, training_level: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="st-years">
                      Years
                    </label>
                    <input
                      id="st-years"
                      className="ln-field"
                      inputMode="numeric"
                      value={form.years_experience}
                      onChange={(e) =>
                        setForm({ ...form, years_experience: e.target.value.replace(/\D/g, '') })
                      }
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="submit" className={`${BTN_PRIMARY} flex-1`} disabled={busy || !form.name.trim()}>
                    {busy ? 'Saving…' : 'Add'}
                  </button>
                  <button type="button" className={BTN_SECONDARY} onClick={() => setAdding(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {staff.length === 0 ? (
              <EmptyState
                title="No staff recorded"
                body="The report writes one subsection per adult in the room, so add whoever you will be observing."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {staff.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-[rgba(52,211,153,0.16)] bg-[rgba(8,20,12,0.5)] px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] text-forest-text">{s.name}</p>
                      <p className="truncate text-[12px] text-forest-muted">
                        {[
                          STAFF_ROLE_LABELS[s.role] ?? s.role,
                          s.training ? `${s.training}${s.training_level ? ` ${s.training_level}` : ''}` : null,
                          s.years_experience != null ? `${s.years_experience} yrs` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <button type="button" className={BTN_DANGER} onClick={() => removeStaff(s.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
