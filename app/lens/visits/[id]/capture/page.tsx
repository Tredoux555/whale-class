// app/lens/visits/[id]/capture/page.tsx
// The capture screen. Designed for a silent classroom and one thumb.
//
// 🚨 THE THREE RULES THIS SCREEN IS BUILT AROUND.
//
// 1. NOTHING IS EVER LOST. Every capture goes into the device queue FIRST
//    (lib/lens/offline) and is uploaded whenever the network allows. By the time
//    she sees the moment appear in the timeline it is on the device and will
//    survive a dead spot, a locked screen and a flat battery. The "N waiting"
//    pill is the honest count of what the server does not have yet.
//
// 2. NO TYPING IS REQUIRED. Photo, hold-to-talk, and chips cover a whole visit
//    without the keyboard ever appearing. The note button exists for when she
//    WANTS to type, not because anything depends on it.
//
// 3. THE CONTROLS DO NOT MOVE. The action row is pinned to the bottom of the
//    viewport at a fixed height, the tag rails scroll instead of wrapping, and
//    the timeline grows upward behind them — so the shutter is in the same place
//    on the hundredth capture as on the first, and she never has to look down.

'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { preparePhoto } from '@/lib/lens/image';
import { enqueueMoment } from '@/lib/lens/offline/sync-manager';
import { useLensQueue } from '@/lib/lens/offline/useLensQueue';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, CARD, clockLocal } from '@/lib/lens/ui';
import type {
  LensClassroom,
  LensMoment,
  LensSchool,
  LensStaff,
  LensVisit,
} from '@/lib/lens/types';
import { EMPTY_TAGS, MomentChipRails, tagSummary, type MomentTags } from '@/components/lens/MomentChips';
import { VoiceButton } from '@/components/lens/VoiceButton';
import { ErrorNote, LensHeader, QueuePill } from '@/components/lens/LensChrome';
import { MomentRow } from '@/components/lens/MomentRow';

interface VisitBundle {
  visit: LensVisit;
  school: LensSchool;
  classrooms: LensClassroom[];
  staff: LensStaff[];
  moments: LensMoment[];
}

export default function LensCapturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: visitId } = use(params);
  const router = useRouter();

  const [bundle, setBundle] = useState<VisitBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [tags, setTags] = useState<MomentTags>(EMPTY_TAGS);
  const [sheet, setSheet] = useState<null | { text: string; kind: 'text' | 'voice' }>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const queue = useLensQueue(visitId);

  const load = useCallback(async () => {
    try {
      const data = await lensApi<VisitBundle>(`/api/lens/visits/${visitId}`);
      setBundle(data);
      // One room means there is no choice to make; arm it silently.
      setRoomId((prev) => prev ?? (data.classrooms.length === 1 ? data.classrooms[0].id : null));
      setError(null);
    } catch (err) {
      if (err instanceof LensApiError && err.status === 401) {
        router.replace('/lens');
        return;
      }
      setError(err instanceof LensApiError ? err.message : 'Could not load this visit.');
    } finally {
      setLoading(false);
    }
  }, [visitId, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Pull the server's copy back whenever the queue drains, so the timeline shows
  // real rows (with real ids, which the report will cite) rather than optimistic
  // ones for any longer than it must.
  const drained = queue.waiting === 0 && !queue.syncing;
  useEffect(() => {
    if (drained && !loading) load();
  }, [drained, loading, load]);

  const staffHere = (bundle?.staff ?? []).filter((s) => !roomId || s.classroom_id === roomId);

  const save = useCallback(
    async (payload: {
      kind: 'photo' | 'voice' | 'text' | 'chip';
      transcript?: string | null;
      body?: string | null;
      caption?: string | null;
      blob?: Blob | null;
      width?: number;
      height?: number;
    }) => {
      setSaving(true);
      setError(null);
      try {
        await enqueueMoment({
          visitId,
          blob: payload.blob ?? null,
          width: payload.width,
          height: payload.height,
          payload: {
            kind: payload.kind,
            classroomId: roomId,
            transcript: payload.transcript ?? null,
            body: payload.body ?? null,
            caption: payload.caption ?? null,
            area: tags.area,
            subject: tags.subject,
            // A staff tag armed for one room must not travel to another.
            staffId: staffHere.some((s) => s.id === tags.staffId) ? tags.staffId : null,
            childAlias: tags.childAlias,
            rating: tags.rating,
          },
        });
        queue.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save that moment.');
      } finally {
        setSaving(false);
      }
    },
    [visitId, roomId, tags, staffHere, queue],
  );

  async function onPhotoPicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset immediately so picking the SAME file twice still fires a change.
    event.target.value = '';
    if (!file) return;
    setSaving(true);
    try {
      const prepared = await preparePhoto(file);
      await save({
        kind: 'photo',
        blob: prepared.blob,
        width: prepared.width,
        height: prepared.height,
      });
      URL.revokeObjectURL(prepared.previewUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that photo.');
      setSaving(false);
    }
  }

  async function saveSheet() {
    if (!sheet) return;
    const text = sheet.text.trim();
    if (!text) {
      setSheet(null);
      return;
    }
    if (sheet.kind === 'voice') await save({ kind: 'voice', transcript: text });
    else await save({ kind: 'text', body: text });
    setSheet(null);
  }

  const serverMoments = bundle?.moments ?? [];
  const armed = tagSummary(tags, staffHere);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-5 pb-2">
      <LensHeader
        title={bundle?.school.name ?? 'Capturing'}
        subtitle={
          bundle
            ? `${serverMoments.length + queue.pending.length} moment${
                serverMoments.length + queue.pending.length === 1 ? '' : 's'
              }`
            : null
        }
        back={`/lens/visits/${visitId}`}
        right={
          <QueuePill
            waiting={queue.waiting}
            syncing={queue.syncing}
            rejected={queue.rejected.length}
            onRetry={queue.retry}
          />
        }
      />

      <ErrorNote message={error} />

      {!queue.available && (
        <p className="mb-3 rounded-xl border border-[rgba(232,201,106,0.35)] bg-[rgba(232,201,106,0.08)] px-3 py-2 text-[12px] text-forest-gold">
          This browser can’t hold moments on the device — they will upload immediately
          or not at all. Avoid private browsing for a real visit.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-forest-muted">Loading…</p>
      ) : (
        <>
          {/* Room picker — only when there is a choice to make. */}
          {(bundle?.classrooms.length ?? 0) > 1 && (
            <div className="ln-rail mb-2.5" role="group" aria-label="Classroom">
              {bundle!.classrooms.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="ln-chip"
                  data-on={roomId === c.id ? '1' : '0'}
                  onClick={() => setRoomId((prev) => (prev === c.id ? null : c.id))}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <MomentChipRails tags={tags} onChange={setTags} staff={staffHere} />

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="truncate text-[12px] text-forest-muted">
              Armed: <span className="text-forest-text">{armed}</span>
            </p>
            <button
              type="button"
              className={BTN_GHOST}
              onClick={() => save({ kind: 'chip' })}
              disabled={saving}
            >
              Save tag only
            </button>
          </div>

          {/* The timeline. Newest at the bottom, next to the controls. */}
          <section className="mt-4 flex-1 overflow-y-auto pb-40">
            {serverMoments.length === 0 && queue.pending.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-forest-muted">
                Nothing captured yet. Photograph a shelf, or hold the microphone and say
                what you see.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {serverMoments.map((m) => (
                  <MomentRow
                    key={m.id}
                    moment={m}
                    staff={bundle?.staff ?? []}
                    classrooms={bundle?.classrooms ?? []}
                    onChanged={load}
                  />
                ))}
                {queue.pending.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-dashed border-[rgba(232,201,106,0.3)] bg-[rgba(232,201,106,0.05)] px-3 py-2.5"
                  >
                    <p className="text-[12px] text-forest-gold">
                      {clockLocal(entry.capturedAt)} · {entry.payload.kind} · waiting to upload
                    </p>
                    {(entry.payload.transcript || entry.payload.body) && (
                      <p className="mt-1 text-[13px] leading-snug text-forest-text">
                        {entry.payload.transcript || entry.payload.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {queue.rejected.length > 0 && (
              <div className={`${CARD} mt-4 border-[rgba(248,113,113,0.3)]`}>
                <p className="mb-2 text-[12px] uppercase tracking-wider text-forest-danger">
                  Couldn’t save
                </p>
                {queue.rejected.map((entry) => (
                  <div key={entry.id} className="mb-2 last:mb-0">
                    <p className="text-[13px] text-forest-text">
                      {clockLocal(entry.capturedAt)} · {entry.payload.kind}
                    </p>
                    <p className="text-[12px] text-forest-muted">{entry.errorMessage}</p>
                    <div className="mt-1 flex gap-2">
                      <button type="button" className={BTN_GHOST} onClick={() => queue.retryOne(entry.id)}>
                        Try again
                      </button>
                      <button type="button" className={BTN_GHOST} onClick={() => queue.discardOne(entry.id)}>
                        Discard
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* The thumb zone. Fixed, full width, three big targets. */}
          <div className="ln-thumb ln-noprint fixed inset-x-0 bottom-0 z-10 border-t border-[rgba(52,211,153,0.18)] bg-[#0A1A0F]/97 px-5 pt-3 backdrop-blur">
            <div className="mx-auto grid h-[104px] w-full max-w-2xl grid-cols-3 gap-2.5">
              <button
                type="button"
                className="ln-tap flex flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-primary text-[13px] font-semibold text-forest-ink disabled:opacity-50"
                onClick={() => fileRef.current?.click()}
                disabled={saving}
              >
                <span aria-hidden className="text-2xl leading-none">
                  📷
                </span>
                Photo
              </button>

              <VoiceButton
                disabled={saving}
                onError={setError}
                onTranscript={(text) => setSheet({ text, kind: 'voice' })}
              />

              <button
                type="button"
                className="ln-tap flex flex-col items-center justify-center gap-1 rounded-2xl border border-[rgba(52,211,153,0.28)] bg-[rgba(8,20,12,0.55)] text-[13px] font-semibold text-forest-text disabled:opacity-50"
                onClick={() => setSheet({ text: '', kind: 'text' })}
                disabled={saving}
              >
                <span aria-hidden className="text-2xl leading-none">
                  ✎
                </span>
                Note
              </button>
            </div>
            <div className="mx-auto mt-2 flex max-w-2xl items-center justify-between">
              <p className="text-[11px] text-forest-muted">
                {saving ? 'Saving to this device…' : 'Saved to this device first.'}
              </p>
              <Link href={`/lens/visits/${visitId}`} className={BTN_GHOST}>
                Done capturing
              </Link>
            </div>
          </div>

          {/* `capture="environment"` opens the rear camera directly on a phone and
              is ignored on a laptop, which falls back to the file picker. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPhotoPicked}
          />

          {/* The note sheet — the only place a keyboard ever appears. */}
          {sheet && (
            <div className="fixed inset-0 z-30 flex items-end bg-black/60 p-4">
              <div className={`${CARD} w-full`}>
                <p className="mb-2 text-[12px] uppercase tracking-wider text-forest-muted">
                  {sheet.kind === 'voice' ? 'What I heard' : 'Note'}
                </p>
                <textarea
                  className="ln-field"
                  rows={5}
                  autoFocus
                  value={sheet.text}
                  onChange={(e) => setSheet({ ...sheet, text: e.target.value })}
                  placeholder={
                    sheet.kind === 'voice'
                      ? 'Edit the transcript before saving.'
                      : 'What did you see? Times, quotes, what was on the shelf.'
                  }
                />
                <p className="mt-2 text-[11px] leading-snug text-forest-muted">
                  Tagged: {armed}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className={`${BTN_PRIMARY} flex-1`}
                    onClick={saveSheet}
                    disabled={saving || !sheet.text.trim()}
                  >
                    Save moment
                  </button>
                  <button type="button" className={BTN_SECONDARY} onClick={() => setSheet(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
