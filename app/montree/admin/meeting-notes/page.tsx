// app/montree/admin/meeting-notes/page.tsx
//
// Principal Meeting Notes — voice-record a parent meeting, get a 3-paragraph
// summary, save the summary (NOT the audio). Mirror of the teacher version
// at app/montree/dashboard/conversations/page.tsx.
//
// 🚨 IF YOU FIX A BUG HERE, MIRROR THE FIX in the teacher file above.
// These two pages duplicate UI on purpose for safety (working teacher path
// stays untouched). A shared component extraction is a planned future task.
//
// DIFFERENCES from teacher version:
//   - API base: /api/montree/admin/meeting-notes (vs /dashboard/conversations)
//   - Children API: /api/montree/admin/students (vs /api/montree/children)
//   - Children response key: `students` (vs `children`)
//   - Login redirect: /montree/login-select (vs /montree/login)
//   - Migration banner mentions 215 (vs 214) — both must be run
//   - Role label: "principal" (used in copy)
//   - Header copy nods to the existing encrypted vault sibling so the
//     principal understands the difference between the two surfaces.
//
// PRIVACY POSTURE:
//   - Audio processed by Whisper, then DISCARDED. Nothing in Supabase
//     Storage. Verifiable via grep — there is no upload step here.
//   - Consent banner on every recording session.
//   - Summary lives in plain text in montree_meeting_notes (not encrypted —
//     unlike the principal vault next door). The principal's encrypted
//     vault remains separately accessible at /montree/admin/conversations.
//   - Parent NEVER sees the summary unless the principal explicitly toggles
//     parent_visible=true. Even then, posting requires the parent_messaging
//     feature flag to be enabled for the school.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Trash2,
  ArrowLeft,
  Loader2,
  MessageSquareText,
  Eye,
  EyeOff,
} from 'lucide-react';
import UpgradeCard, {
  extractUpgradeFromResponse,
} from '@/components/montree/UpgradeCard';
import { useI18n, getIntlLocale, type TranslationKey } from '@/lib/montree/i18n';

// Translation helper — new meetingNotes.* keys are added to en.ts by the i18n
// team after this file ships. Cast keeps TS happy until they land.
type TFn = ReturnType<typeof useI18n>['t'];

const T = {
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.80)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSoft: '#eaf1e6',
  textSecondary: 'rgba(234,241,230,0.55)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans:
    '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
  bgGradient:
    'radial-gradient(ellipse at top, rgba(52,211,153,0.15), transparent 50%), linear-gradient(180deg, #0a1a0f 0%, #0f1f15 100%)',
};

interface MeetingRow {
  id: string;
  principal_id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  child_name: string | null;
  meeting_date: string | null;
  summary: string;
  transcript?: string | null;
  notes: string | null;
  duration_seconds: number | null;
  locale: string;
  parent_visible: boolean;
  shared_to_thread_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ChildOption {
  id: string;
  name: string;
}

type View =
  | { kind: 'list' }
  | { kind: 'new' }
  | { kind: 'detail'; meeting: MeetingRow };

function fmtDate(d: string, locale: string): string {
  try {
    return new Date(d).toLocaleString(getIntlLocale(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
}

function fmtDuration(seconds: number | null, t: TFn): string {
  if (!seconds || seconds < 1) return '—';
  if (seconds < 60) return t('meetingNotes.durationSeconds', { s: seconds });
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) {
    return s
      ? t('meetingNotes.durationMinutesSeconds', { m, s })
      : t('meetingNotes.durationMinutes', { m });
  }
  const h = Math.floor(m / 60);
  return t('meetingNotes.durationHoursMinutes', { h, m: m % 60 });
}

export default function PrincipalMeetingNotesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [view, setView] = useState<View>({ kind: 'list' });
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load — meetings + school children for the picker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [meetingsRes, childrenRes] = await Promise.all([
          fetch('/api/montree/admin/meeting-notes', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/montree/admin/students', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        if (cancelled) return;

        if (meetingsRes.ok) {
          const data = await meetingsRes.json();
          if (data?.migration_pending) setMigrationPending(true);
          setMeetings(Array.isArray(data?.meetings) ? data.meetings : []);
        } else if (meetingsRes.status === 401 || meetingsRes.status === 403) {
          router.replace('/montree/login-select');
          return;
        } else {
          setError(t('meetingNotes.errorLoad' as TranslationKey));
        }

        if (childrenRes.ok) {
          const data = await childrenRes.json();
          // Principal endpoint returns { students: [...] }, each with
          // classroom info we ignore here (one big roster is the simplest UX).
          const list = Array.isArray(data?.students) ? data.students : [];
          setChildren(
            list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
          );
        }
      } catch {
        if (!cancelled) setError(t('meetingNotes.errorNetwork' as TranslationKey));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  const refreshMeetings = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/admin/meeting-notes', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      setMeetings(Array.isArray(data?.meetings) ? data.meetings : []);
    } catch {
      /* swallow — list will refresh on next page open */
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bgGradient,
        color: T.textPrimary,
        fontFamily: T.sans,
        padding: '24px 16px 60px',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Header view={view} setView={setView} />

        {migrationPending && (
          <div
            style={{
              marginBottom: 18,
              padding: 14,
              borderRadius: 12,
              background: 'rgba(232,201,106,0.10)',
              border: '1px solid rgba(232,201,106,0.40)',
              color: T.gold,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            ⚠️ {t('meetingNotes.migrationPendingPrincipalIntro' as TranslationKey)}{' '}
            <code>migrations/214_meeting_notes.sql</code>{' '}
            {t('meetingNotes.migrationPendingAnd' as TranslationKey)}{' '}
            <code>migrations/215_meeting_notes_principal_author.sql</code>{' '}
            {t('meetingNotes.migrationPendingPrincipalOutro' as TranslationKey)}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 18,
              padding: 14,
              borderRadius: 12,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.32)',
              color: '#fecaca',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: T.textSecondary, fontSize: 14, padding: 20 }}>
            {t('meetingNotes.loadingMeetings' as TranslationKey)}
          </div>
        ) : view.kind === 'list' ? (
          <ListView
            meetings={meetings}
            onOpen={(meeting) => setView({ kind: 'detail', meeting })}
            onNew={() => setView({ kind: 'new' })}
          />
        ) : view.kind === 'new' ? (
          <NewMeetingFlow
            childrenOptions={children}
            onCancel={() => setView({ kind: 'list' })}
            onSaved={async (saved) => {
              await refreshMeetings();
              setView({ kind: 'detail', meeting: saved });
            }}
          />
        ) : (
          <DetailView
            meeting={view.meeting}
            childrenOptions={children}
            onClose={() => setView({ kind: 'list' })}
            onChanged={async () => {
              await refreshMeetings();
            }}
            onDeleted={async () => {
              await refreshMeetings();
              setView({ kind: 'list' });
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────
function Header({
  view,
  setView,
}: {
  view: View;
  setView: (v: View) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {view.kind !== 'list' && (
          <button
            type="button"
            onClick={() => setView({ kind: 'list' })}
            aria-label={t('meetingNotes.backToList' as TranslationKey)}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: T.cardBorder,
              background: T.cardBg,
              color: T.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
        )}
        <div>
          <div
            style={{
              fontFamily: T.serif,
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: -0.3,
            }}
          >
            {t('meetingNotes.principalTitle' as TranslationKey)}
          </div>
          <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>
            {t('meetingNotes.principalSubtitle' as TranslationKey)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// List view
// ─────────────────────────────────────────────────────────────────────
function ListView({
  meetings,
  onOpen,
  onNew,
}: {
  meetings: MeetingRow[];
  onOpen: (m: MeetingRow) => void;
  onNew: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <div>
      <button
        type="button"
        onClick={onNew}
        style={{
          width: '100%',
          padding: '14px 18px',
          borderRadius: 12,
          background: T.emerald,
          border: 'none',
          color: '#0a1a0f',
          fontWeight: 600,
          fontSize: 15,
          cursor: 'pointer',
          marginBottom: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Mic size={18} strokeWidth={1.75} />
        {t('meetingNotes.startNewMeeting' as TranslationKey)}
      </button>

      {meetings.length === 0 ? (
        <div
          style={{
            padding: 24,
            borderRadius: 12,
            background: T.cardBg,
            border: T.cardBorder,
            color: T.textSecondary,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {t('meetingNotes.emptyListBefore' as TranslationKey)}{' '}
          <strong style={{ color: T.textSoft }}>
            {t('meetingNotes.startNewMeeting' as TranslationKey)}
          </strong>{' '}
          {t('meetingNotes.emptyListAfter' as TranslationKey)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meetings.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpen(m)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                background: T.cardBg,
                border: T.cardBorder,
                color: T.textPrimary,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: T.sans,
                fontSize: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <span style={{ color: T.textSoft, fontWeight: 600 }}>
                  {m.child_name || t('meetingNotes.untitledMeeting' as TranslationKey)}
                </span>
                <span style={{ color: T.textMuted, fontSize: 12 }}>
                  {fmtDate(m.created_at, locale)}
                </span>
              </div>
              <div
                style={{
                  color: T.textSecondary,
                  fontSize: 13,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {m.summary.split('\n').filter(Boolean)[0] || ''}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  gap: 10,
                  fontSize: 11,
                  color: T.textMuted,
                }}
              >
                <span>⏱ {fmtDuration(m.duration_seconds, t)}</span>
                {m.parent_visible &&
                  (m.shared_to_thread_id ? (
                    <span style={{ color: T.gold }}>
                      · {t('meetingNotes.sharedWithParent' as TranslationKey)}
                    </span>
                  ) : (
                    <span style={{ color: T.textMuted }}>
                      · {t('meetingNotes.markedForParent' as TranslationKey)}
                    </span>
                  ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// New meeting flow — consent → record → review → save
// ─────────────────────────────────────────────────────────────────────
type Stage = 'consent' | 'recording' | 'transcribing' | 'review';

interface ReviewData {
  transcript: string;
  summary: string;
  duration_seconds: number | null;
}

function NewMeetingFlow({
  childrenOptions,
  onCancel,
  onSaved,
}: {
  childrenOptions: ChildOption[];
  onCancel: () => void;
  onSaved: (m: MeetingRow) => void;
}) {
  const { t } = useI18n();
  // Stable alias so the rest of the body (copied from teacher page) reads
  // naturally; renamed from `children` to avoid the React built-in prop name.
  const children = childrenOptions;
  const [stage, setStage] = useState<Stage>('consent');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);

  // Save form
  const [childId, setChildId] = useState<string>('');
  const [childName, setChildName] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>('');
  const [savingTranscript, setSavingTranscript] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Recorder refs
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingSecondsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (childId) {
      const c = children.find((x) => x.id === childId);
      if (c) setChildName(c.name);
    }
  }, [childId, children]);

  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        setStage('transcribing');
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
        await uploadForTranscription(blob, recordingSecondsRef.current);
      };
      rec.start();
      recorderRef.current = rec;
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      tickRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
      setStage('recording');
    } catch (err) {
      console.error('[principal meeting] mic error', err);
      setErrorMsg(t('meetingNotes.errorMic' as TranslationKey));
    }
    // `uploadForTranscription` is intentionally NOT in deps — it's defined in
    // the same component scope and adding it would force a circular dep
    // (uploadForTranscription would need startRecording's identity to
    // stabilize, but uploadForTranscription is referenced inside the
    // rec.onstop closure that startRecording itself sets up). The closure
    // captures the function via lexical scope which is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch (err) {
        console.error('[principal meeting] stop error', err);
      }
    }
  }, []);

  const uploadForTranscription = useCallback(
    async (blob: Blob, seconds: number) => {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      form.append('duration_seconds', String(seconds));
      try {
        const res = await fetch('/api/montree/admin/meeting-notes/transcribe', {
          method: 'POST',
          body: form,
          credentials: 'include',
        });
        if (!res.ok) {
          const upgrade = await extractUpgradeFromResponse(res);
          if (upgrade) {
            setUpgradeFeature(upgrade.feature);
            setStage('consent');
            return;
          }
          let err = t('meetingNotes.errorTranscription' as TranslationKey);
          try {
            const j = await res.json();
            err = j?.error || err;
          } catch {
            /* ignore */
          }
          setErrorMsg(err);
          setStage('consent');
          return;
        }
        const data = await res.json();
        setReview({
          transcript: data.transcript || '',
          summary: data.summary || '',
          duration_seconds:
            typeof data.duration_seconds === 'number'
              ? data.duration_seconds
              : seconds,
        });
        setStage('review');
      } catch (err) {
        console.error('[principal meeting] transcribe network error', err);
        setErrorMsg(t('meetingNotes.errorTranscribeNetwork' as TranslationKey));
        setStage('consent');
      }
    },
    [t]
  );

  const saveMeeting = useCallback(async () => {
    if (!review) return;
    if (!review.summary.trim()) {
      setErrorMsg(t('meetingNotes.errorNoSummary' as TranslationKey));
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/montree/admin/meeting-notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: review.summary,
          transcript: savingTranscript ? review.transcript : null,
          notes: notes.trim() || null,
          child_id: childId || null,
          child_name: childName.trim() || null,
          meeting_date: meetingDate || null,
          duration_seconds: review.duration_seconds,
        }),
      });
      if (!res.ok) {
        let err = t('meetingNotes.errorSave' as TranslationKey);
        try {
          const j = await res.json();
          err = j?.error || err;
        } catch {
          /* ignore */
        }
        setErrorMsg(err);
        return;
      }
      const data = await res.json();
      if (data?.meeting) onSaved(data.meeting as MeetingRow);
    } catch (err) {
      console.error('[principal meeting] save error', err);
      setErrorMsg(t('meetingNotes.errorSaveNetwork' as TranslationKey));
    } finally {
      setSaving(false);
    }
  }, [review, savingTranscript, notes, childId, childName, meetingDate, onSaved, t]);

  if (upgradeFeature) {
    return <UpgradeCard feature={upgradeFeature} />;
  }

  if (stage === 'consent') {
    return (
      <div>
        <ConsentBanner />
        {errorMsg && <ErrorBox text={errorMsg} />}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onCancel} style={ghostBtn()}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={startRecording} style={primaryBtn()}>
            <Mic size={18} strokeWidth={1.75} />
            {t('meetingNotes.startRecordingConsent' as TranslationKey)}
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'recording') {
    return (
      <div
        style={{
          padding: 28,
          borderRadius: 14,
          background: T.cardBgStrong,
          border: T.cardBorder,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)',
            border: '2px solid rgba(239,68,68,0.55)',
            margin: '0 auto 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'recPulse 1.6s ease-in-out infinite',
          }}
        >
          <Mic size={42} strokeWidth={1.5} color="#fca5a5" />
        </div>
        <div
          style={{
            fontSize: 14,
            color: T.textSecondary,
            marginBottom: 4,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {t('meetingNotes.recordingLabel' as TranslationKey)}
        </div>
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 38,
            fontWeight: 500,
            color: T.textSoft,
            marginBottom: 20,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtDuration(recordingSeconds, t)}
        </div>
        <button type="button" onClick={stopRecording} style={primaryBtn()}>
          <MicOff size={18} strokeWidth={1.75} />
          {t('meetingNotes.stopAndTranscribe' as TranslationKey)}
        </button>
        <style jsx>{`
          @keyframes recPulse {
            0%,
            100% {
              box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55);
            }
            50% {
              box-shadow: 0 0 0 14px rgba(239, 68, 68, 0);
            }
          }
        `}</style>
      </div>
    );
  }

  if (stage === 'transcribing') {
    return (
      <div
        style={{
          padding: 36,
          borderRadius: 14,
          background: T.cardBgStrong,
          border: T.cardBorder,
          textAlign: 'center',
        }}
      >
        <Loader2
          size={28}
          color={T.emerald}
          strokeWidth={1.75}
          style={{ animation: 'spin 1.4s linear infinite', marginBottom: 14 }}
        />
        <div style={{ fontSize: 14, color: T.textSecondary }}>
          {t('meetingNotes.transcribingMessage' as TranslationKey)}
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!review) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          padding: 18,
          borderRadius: 12,
          background: T.cardBg,
          border: T.cardBorder,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: T.gold,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          {t('meetingNotes.summaryLabel' as TranslationKey)}
        </div>
        <div
          style={{
            fontSize: 14,
            color: T.textPrimary,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}
        >
          {review.summary || t('meetingNotes.noSummaryProduced' as TranslationKey)}
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 10 }}>
          ⏱ {fmtDuration(review.duration_seconds, t)}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: '1fr 1fr',
        }}
      >
        <Field label={t('meetingNotes.fieldChild' as TranslationKey)}>
          <select
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            style={inputStyle()}
          >
            <option value="">{t('meetingNotes.pickAChild' as TranslationKey)}</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('meetingNotes.fieldMeetingDate' as TranslationKey)}>
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            style={inputStyle()}
          />
        </Field>
      </div>

      <Field label={t('meetingNotes.fieldYourNotesOptional' as TranslationKey)}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder={t('meetingNotes.notesPlaceholderReview' as TranslationKey)}
          style={{ ...inputStyle(), resize: 'vertical', minHeight: 90 }}
        />
      </Field>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: T.textSecondary,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={savingTranscript}
          onChange={(e) => setSavingTranscript(e.target.checked)}
        />
        {t('meetingNotes.alsoSaveTranscript' as TranslationKey)}
      </label>

      {errorMsg && <ErrorBox text={errorMsg} />}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={onCancel} style={ghostBtn()}>
          {t('meetingNotes.discard' as TranslationKey)}
        </button>
        <button
          type="button"
          onClick={saveMeeting}
          disabled={saving}
          style={primaryBtn(saving)}
        >
          {saving ? (
            <>
              <Loader2
                size={16}
                strokeWidth={1.75}
                style={{ animation: 'spin 1.4s linear infinite' }}
              />
              {t('meetingNotes.saving' as TranslationKey)}
            </>
          ) : (
            t('meetingNotes.saveMeeting' as TranslationKey)
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Detail view — saved meeting, edit notes, toggle parent_visible, delete
// ─────────────────────────────────────────────────────────────────────
function DetailView({
  meeting,
  childrenOptions,
  onClose,
  onChanged,
  onDeleted,
}: {
  meeting: MeetingRow;
  childrenOptions: ChildOption[];
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const { t, locale } = useI18n();
  const [local, setLocal] = useState<MeetingRow>(meeting);
  const [notes, setNotes] = useState<string>(meeting.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<string | null>(null);

  useEffect(() => {
    setLocal(meeting);
    setNotes(meeting.notes || '');
  }, [meeting]);

  const saveNotes = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/montree/admin/meeting-notes/${meeting.id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: notes.trim() || null }),
        }
      );
      if (!res.ok) {
        setError(t('meetingNotes.errorSaveNotes' as TranslationKey));
        return;
      }
      const data = await res.json();
      if (data?.meeting) {
        setLocal(data.meeting);
        onChanged();
      }
    } catch {
      setError(t('meetingNotes.errorNetwork' as TranslationKey));
    } finally {
      setSaving(false);
    }
  }, [meeting.id, notes, onChanged, t]);

  const togglevisible = useCallback(async () => {
    const next = !local.parent_visible;
    setShareInfo(null);
    try {
      const res = await fetch(
        `/api/montree/admin/meeting-notes/${meeting.id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent_visible: next }),
        }
      );
      if (!res.ok) {
        setError(t('meetingNotes.errorUpdateVisibility' as TranslationKey));
        return;
      }
      const data = await res.json();
      if (data?.meeting) {
        setLocal(data.meeting);
        onChanged();
      }
      // Surface helpful context if the share fell short of posting to a thread.
      if (data?.share) {
        const reason = data.share.reason as string | undefined;
        if (data.share.threadId && !reason) {
          setShareInfo(t('meetingNotes.sharePosted' as TranslationKey));
        } else if (reason === 'no_child') {
          setShareInfo(t('meetingNotes.shareNoChild' as TranslationKey));
        } else if (reason === 'feature_disabled') {
          setShareInfo(t('meetingNotes.shareFeatureDisabled' as TranslationKey));
        } else if (reason === 'no_parents') {
          setShareInfo(t('meetingNotes.shareNoParents' as TranslationKey));
        } else if (reason === 'already_shared') {
          setShareInfo(t('meetingNotes.shareAlreadyShared' as TranslationKey));
        } else if (reason === 'message_insert_failed') {
          setShareInfo(
            t('meetingNotes.shareMessageFailedPrincipal' as TranslationKey)
          );
        }
      }
    } catch {
      setError(t('meetingNotes.errorNetwork' as TranslationKey));
    }
  }, [meeting.id, local.parent_visible, onChanged, t]);

  const removeMeeting = useCallback(async () => {
    if (!window.confirm(t('meetingNotes.confirmDelete' as TranslationKey))) {
      return;
    }
    try {
      const res = await fetch(
        `/api/montree/admin/meeting-notes/${meeting.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!res.ok) {
        setError(t('meetingNotes.errorDelete' as TranslationKey));
        return;
      }
      onDeleted();
    } catch {
      setError(t('meetingNotes.errorNetwork' as TranslationKey));
    }
  }, [meeting.id, onDeleted, t]);

  const childLabel =
    local.child_name ||
    childrenOptions.find((c) => c.id === local.child_id)?.name ||
    t('meetingNotes.untitledMeeting' as TranslationKey);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          padding: 18,
          borderRadius: 12,
          background: T.cardBg,
          border: T.cardBorder,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontFamily: T.serif,
              fontSize: 20,
              color: T.textSoft,
              fontWeight: 500,
            }}
          >
            {childLabel}
          </div>
          <div style={{ color: T.textMuted, fontSize: 12 }}>
            {fmtDate(local.created_at, locale)}
          </div>
        </div>
        <div style={{ color: T.textSecondary, fontSize: 12, marginBottom: 14 }}>
          ⏱ {fmtDuration(local.duration_seconds, t)}
          {local.meeting_date && (
            <> · {t('meetingNotes.meetingDatePrefix' as TranslationKey)} {local.meeting_date}</>
          )}
        </div>

        <div
          style={{
            fontSize: 12,
            color: T.gold,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          {t('meetingNotes.summaryLabel' as TranslationKey)}
        </div>
        <div
          style={{
            fontSize: 14,
            color: T.textPrimary,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}
        >
          {local.summary}
        </div>
      </div>

      <Field label={t('meetingNotes.fieldYourNotes' as TranslationKey)}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={4}
          placeholder={t('meetingNotes.notesPlaceholderDetail' as TranslationKey)}
          style={{ ...inputStyle(), resize: 'vertical', minHeight: 90 }}
        />
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
          {saving
            ? t('meetingNotes.saving' as TranslationKey)
            : t('meetingNotes.autoSaveHint' as TranslationKey)}
        </div>
      </Field>

      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: T.cardBg,
          border: T.cardBorder,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {local.parent_visible ? (
            <Eye size={18} color={T.gold} strokeWidth={1.75} />
          ) : (
            <EyeOff size={18} color={T.textMuted} strokeWidth={1.75} />
          )}
          <div>
            <div style={{ color: T.textSoft, fontSize: 14 }}>
              {local.parent_visible
                ? t('meetingNotes.sharedWithParent' as TranslationKey)
                : t('meetingNotes.privateToYou' as TranslationKey)}
            </div>
            <div style={{ color: T.textSecondary, fontSize: 12, marginTop: 2 }}>
              {local.parent_visible
                ? local.shared_to_thread_id
                  ? t('meetingNotes.visibilityPosted' as TranslationKey)
                  : t('meetingNotes.visibilityMarkedNoThread' as TranslationKey)
                : t('meetingNotes.visibilityPrivate' as TranslationKey)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={togglevisible}
          style={ghostBtn(false, { padding: '8px 14px', fontSize: 13 })}
        >
          {local.parent_visible
            ? t('meetingNotes.makePrivate' as TranslationKey)
            : t('meetingNotes.shareWithParent' as TranslationKey)}
        </button>
      </div>

      {shareInfo && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: 'rgba(232,201,106,0.10)',
            border: '1px solid rgba(232,201,106,0.32)',
            color: T.gold,
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {shareInfo}
        </div>
      )}

      {error && <ErrorBox text={error} />}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" onClick={onClose} style={ghostBtn()}>
          {t('meetingNotes.backToList' as TranslationKey)}
        </button>
        <button
          type="button"
          onClick={removeMeeting}
          style={{
            ...ghostBtn(),
            color: '#fecaca',
            border: '1px solid rgba(239,68,68,0.45)',
            background: 'rgba(239,68,68,0.10)',
          }}
        >
          <Trash2 size={16} strokeWidth={1.75} />
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Tiny reusable bits
// ─────────────────────────────────────────────────────────────────────

function ConsentBanner() {
  const { t } = useI18n();
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 14,
        background: 'rgba(232,201,106,0.10)',
        border: '1px solid rgba(232,201,106,0.42)',
        marginBottom: 16,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <MessageSquareText size={22} color={T.gold} strokeWidth={1.75} />
      <div style={{ flex: 1, fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ color: T.gold, fontWeight: 600, marginBottom: 6 }}>
          {t('meetingNotes.consentHeading' as TranslationKey)}
        </div>
        <div style={{ color: T.textPrimary }}>
          {t('meetingNotes.consentBody' as TranslationKey)}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: T.gold,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.32)',
        color: '#fecaca',
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    background: T.inputBg,
    border: T.inputBorder,
    color: T.textPrimary,
    fontSize: 16,
    fontFamily: T.sans,
    outline: 'none',
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    flex: 1,
    padding: '12px 18px',
    borderRadius: 12,
    background: disabled ? 'rgba(52,211,153,0.35)' : T.emerald,
    border: 'none',
    color: '#0a1a0f',
    fontWeight: 600,
    fontSize: 15,
    cursor: disabled ? 'wait' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };
}

function ghostBtn(
  active = false,
  override: React.CSSProperties = {}
): React.CSSProperties {
  return {
    padding: '12px 18px',
    borderRadius: 12,
    background: active ? T.emeraldSoft : T.cardBg,
    border: T.cardBorder,
    color: T.textPrimary,
    fontWeight: 500,
    fontSize: 14,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...override,
  };
}
