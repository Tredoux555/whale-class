// app/montree/admin/parents/[parentId]/onboard/page.tsx
//
// Ultimate Tracy Phase A — voice-first parent onboarding.
//
// Mirrors the teacher voice-onboarding pattern (MediaRecorder + optional
// SpeechRecognition live transcription) but for a single parent. The
// principal taps Record, speaks 60-90s about the parent (what kind of
// parent, what matters, what to avoid, what works), Sonnet structures
// it into the canonical fields, principal reviews + edits + saves.
//
// "Type instead" link is the accessibility fallback.
//
// FLOW
//   1. Page loads with parent name + linked child names.
//   2. Big record button + ~90s suggested duration (not enforced).
//   3. Helper prompt below: "Tell me about [parent name]..."
//   4. On stop: transcript saves, Sonnet parses, editable draft appears.
//   5. Save → POST /api/montree/admin/parent-profile → persisted.

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import { Mic, Square, AlertCircle, ChevronLeft, X } from 'lucide-react';

// Dark-forest tokens — mirror /montree/admin layout.
const T = {
  bg: '#0a1a0f',
  glow:
    'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), transparent 60%)',
  card: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const ARCHETYPE_OPTIONS = [
  { key: 'expectation_driven', label: 'Expectation-driven' },
  { key: 'anxiety_projecting', label: 'Anxiety-projecting' },
  { key: 'hands_off', label: 'Hands-off' },
  { key: 'comparison_trapped', label: 'Comparison-trapped' },
  { key: 'defended', label: 'Defended' },
] as const;

const TEMP_OPTIONS = [
  { key: 'warm', label: 'Warm' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'strained', label: 'Strained' },
  { key: 'repairing', label: 'Repairing' },
] as const;

type Stage =
  | 'loading'
  | 'welcome'
  | 'recording'
  | 'transcribing'
  | 'processing'
  | 'review'
  | 'saving'
  | 'saved'
  | 'error_permission'
  | 'error';

interface ParentInfo {
  parent_id: string;
  parent_name: string;
  parent_email: string;
  child_names: string[];
  child_ids: string[];
  has_profile: boolean;
}

interface ProfileDraft {
  archetypes: string[];
  cultural_register: Record<string, string>;
  preferred_language: string;
  known_triggers: string[];
  effective_moves: string[];
  relationship_temperature: string;
  family_context: string;
  priorities_for_child: string[];
  history_notes: string;
}

const EMPTY_DRAFT: ProfileDraft = {
  archetypes: [],
  cultural_register: {},
  preferred_language: '',
  known_triggers: [],
  effective_moves: [],
  relationship_temperature: 'neutral',
  family_context: '',
  priorities_for_child: [],
  history_notes: '',
};

export default function ParentOnboardPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useI18n();
  const parentId = String(params.parentId || '');

  const [stage, setStage] = useState<Stage>('loading');
  const [parent, setParent] = useState<ParentInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveText, setLiveText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [showTypeInstead, setShowTypeInstead] = useState(false);
  const [degraded, setDegraded] = useState(false);

  // Refs (audio + timer)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const liveFinalRef = useRef<string>('');

  // Load parent info on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/admin/parent-profile/list');
        if (!res.ok) {
          setErrorMsg(`Failed to load parents: ${res.status}`);
          setStage('error');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const match = (data.parents || []).find(
          (p: ParentInfo) => p.parent_id === parentId
        );
        if (!match) {
          setErrorMsg('Parent not found in this school.');
          setStage('error');
          return;
        }
        setParent(match);
        setStage('welcome');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'unknown error');
        setStage('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* noop */
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  // Locale → SpeechRecognition lang code.
  const speechLang = (() => {
    const m: Record<string, string> = {
      en: 'en-US',
      zh: 'zh-CN',
      es: 'es-ES',
      de: 'de-DE',
      fr: 'fr-FR',
      pt: 'pt-BR',
      nl: 'nl-NL',
      it: 'it-IT',
      ja: 'ja-JP',
      ko: 'ko-KR',
      uk: 'uk-UA',
      ru: 'ru-RU',
    };
    return m[locale] || 'en-US';
  })();

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const runIntake = useCallback(
    async (text: string) => {
      try {
        const res = await fetch('/api/montree/admin/parent-profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ parent_id: parentId, transcript: text, locale }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          setErrorMsg(
            `Onboarding failed (HTTP ${res.status}): ${body.slice(0, 200)}`
          );
          setStage('error');
          return;
        }
        const data = await res.json();
        const incoming: ProfileDraft = data.draft || data.profile || EMPTY_DRAFT;
        setDraft({
          archetypes: incoming.archetypes ?? [],
          cultural_register: incoming.cultural_register ?? {},
          preferred_language: incoming.preferred_language ?? '',
          known_triggers: incoming.known_triggers ?? [],
          effective_moves: incoming.effective_moves ?? [],
          relationship_temperature:
            incoming.relationship_temperature ?? 'neutral',
          family_context: incoming.family_context ?? '',
          priorities_for_child: incoming.priorities_for_child ?? [],
          history_notes: incoming.history_notes ?? '',
        });
        setDegraded(!!data.degraded);
        setStage('review');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'unknown error');
        setStage('error');
      }
    },
    [parentId, locale]
  );

  const transcribeAndProcess = useCallback(
    async (blob: Blob, liveTranscript: string) => {
      setErrorMsg('');
      let text = (liveTranscript || '').trim();

      if (text.length >= 40) {
        // Skip Whisper — live transcript is solid.
      } else {
        setStage('transcribing');
        const form = new FormData();
        form.append('audio', blob, 'recording.webm');
        let tRes: Response;
        try {
          tRes = await fetch('/api/montree/voice-notes/transcribe', {
            method: 'POST',
            body: form,
          });
        } catch (err) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Transcription request failed'
          );
          setStage('error');
          return;
        }
        if (!tRes.ok) {
          setErrorMsg(`Transcription failed (HTTP ${tRes.status})`);
          setStage('error');
          return;
        }
        const tData = await tRes.json();
        text = (tData.transcript || '').trim();
      }

      if (!text || text.length < 30) {
        setErrorMsg('Recording too short. Try again.');
        setStage('welcome');
        return;
      }

      setTranscript(text);
      setStage('processing');
      await runIntake(text);
    },
    [runIntake]
  );

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStage('error_permission');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      liveFinalRef.current = '';
      setLiveText('');

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            /* noop */
          }
          recognitionRef.current = null;
        }

        const chunks = chunksRef.current;
        chunksRef.current = [];

        if (chunks.length === 0) {
          setErrorMsg('No audio captured. Try again.');
          setStage('welcome');
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) {
          setErrorMsg('Recording too short. Try again.');
          setStage('welcome');
          return;
        }

        await transcribeAndProcess(blob, liveFinalRef.current);
      };

      recorder.start(1000);
      setStage('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((prev) => prev + 1),
        1000
      );

      // Optional live transcription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SR) {
        try {
          const recognition = new SR();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = speechLang;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const part = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                liveFinalRef.current += part;
              } else {
                interim += part;
              }
            }
            setLiveText(liveFinalRef.current + interim);
          };
          recognition.onerror = () => {
            /* non-fatal */
          };
          recognition.onend = () => {
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state === 'recording'
            ) {
              try {
                recognition.start();
              } catch {
                /* already running */
              }
            }
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          /* fallback to Whisper */
        }
      }
    } catch {
      setStage('error_permission');
    }
  }, [speechLang, transcribeAndProcess]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
  }, []);

  const saveDraft = async () => {
    if (!parent) return;
    setStage('saving');
    try {
      // Re-POST with a generated transcript string from the current draft fields
      // — server will re-upsert with the edited values. Alternative: PATCH the
      // profile id, but we don't track that on this page. Simpler to re-POST.
      // We must reuse the existing transcript so the intake parser doesn't
      // re-run; instead, save via PATCH IF we have an existing profile id.
      // For v1 simplicity: POST again with marker transcript that says
      // "principal edited fields directly" — but that would re-trigger Sonnet.
      // Instead: fetch GET first to get profile id, then PATCH.
      const getRes = await fetch(
        `/api/montree/admin/parent-profile?parent_id=${encodeURIComponent(parentId)}`
      );
      if (!getRes.ok) {
        const body = await getRes.text().catch(() => '');
        setErrorMsg(`Save failed (HTTP ${getRes.status}): ${body.slice(0, 200)}`);
        setStage('error');
        return;
      }
      const getData = await getRes.json();
      const profileId = getData?.profile?.id;
      if (!profileId) {
        setErrorMsg('Profile not yet persisted. Recording may have failed silently.');
        setStage('error');
        return;
      }
      const patchRes = await fetch(
        `/api/montree/admin/parent-profile?id=${encodeURIComponent(profileId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(draft),
        }
      );
      if (!patchRes.ok) {
        const body = await patchRes.text().catch(() => '');
        setErrorMsg(`Save failed (HTTP ${patchRes.status}): ${body.slice(0, 200)}`);
        setStage('error');
        return;
      }
      setStage('saved');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'unknown error');
      setStage('error');
    }
  };

  // ── render helpers ────────────────────────────────────────────────────

  const toggleArchetype = (key: string) => {
    setDraft((d) => {
      const has = d.archetypes.includes(key);
      if (has) {
        return { ...d, archetypes: d.archetypes.filter((a) => a !== key) };
      }
      if (d.archetypes.length >= 2) return d;
      return { ...d, archetypes: [...d.archetypes, key] };
    });
  };

  const setTemperature = (key: string) => {
    setDraft((d) => ({ ...d, relationship_temperature: key }));
  };

  const updateList = (
    field: 'known_triggers' | 'effective_moves' | 'priorities_for_child',
    val: string
  ) => {
    setDraft((d) => ({
      ...d,
      [field]: val
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    }));
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(0,0,0,0.35)',
    color: T.textPrimary,
    border: T.cardBorder,
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: T.sans,
    resize: 'vertical',
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: T.bg,
        color: T.textPrimary,
        fontFamily: T.sans,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: T.glow,
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        style={{
          position: 'relative',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(52,211,153,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}
      >
        <Link
          href="/montree/admin/parents"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: T.textSecondary,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          <ChevronLeft size={16} /> Back to parents
        </Link>
      </header>

      <main
        style={{
          position: 'relative',
          maxWidth: 720,
          margin: '0 auto',
          padding: '32px 24px 80px',
          zIndex: 1,
        }}
      >
        {/* Loading */}
        {stage === 'loading' && (
          <p style={{ textAlign: 'center', color: T.textSecondary, marginTop: 64 }}>
            Loading parent…
          </p>
        )}

        {/* Welcome / record */}
        {stage === 'welcome' && parent && (
          <>
            <h1
              style={{
                fontFamily: T.serif,
                fontSize: 32,
                margin: '24px 0 4px',
                color: T.textPrimary,
              }}
            >
              {parent.parent_name || 'Parent'}
            </h1>
            <p style={{ color: T.textSecondary, fontSize: 14, marginBottom: 32 }}>
              {parent.child_names.length > 0
                ? `Parent of ${parent.child_names.join(', ')}`
                : 'No children linked yet'}
            </p>

            {parent.has_profile && (
              <div
                style={{
                  background: 'rgba(232,201,106,0.08)',
                  border: '1px solid rgba(232,201,106,0.30)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 24,
                  fontSize: 13,
                  color: 'rgba(232,201,106,0.92)',
                }}
              >
                A profile already exists for this parent. Recording again will
                update it.
              </div>
            )}

            <div
              style={{
                background: T.card,
                border: T.cardBorder,
                borderRadius: 16,
                padding: '32px 24px',
                textAlign: 'center',
              }}
            >
              <p style={{ color: T.textSecondary, fontSize: 15, marginBottom: 24 }}>
                Tell me about {parent.parent_name.split(' ')[0] || 'this parent'}{' '}
                — what kind of parent she is, what matters to her, what to watch
                out for, what works.
              </p>

              <button
                onClick={startRecording}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: T.emerald,
                  border: 'none',
                  cursor: 'pointer',
                  color: '#0a1a0f',
                  boxShadow: '0 0 32px rgba(52,211,153,0.35)',
                }}
                aria-label="Start recording"
              >
                <Mic size={36} />
              </button>

              <p style={{ color: T.textMuted, fontSize: 12, marginTop: 16 }}>
                Aim for about 60-90 seconds. No length cap.
              </p>

              <button
                onClick={() => setShowTypeInstead(true)}
                style={{
                  marginTop: 20,
                  background: 'transparent',
                  border: 'none',
                  color: T.emeraldDim,
                  fontSize: 13,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Type instead
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  marginTop: 16,
                  background: 'rgba(220,50,50,0.10)',
                  border: '1px solid rgba(220,50,50,0.30)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'rgba(255,180,180,0.92)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}

            {showTypeInstead && (
              <div
                style={{
                  marginTop: 24,
                  background: T.card,
                  border: T.cardBorder,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 14, color: T.textPrimary }}>
                    Type instead
                  </h3>
                  <button
                    onClick={() => setShowTypeInstead(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: T.textMuted,
                      cursor: 'pointer',
                    }}
                    aria-label="Cancel typed entry"
                  >
                    <X size={16} />
                  </button>
                </div>
                <textarea
                  rows={6}
                  placeholder={`What kind of parent is ${parent.parent_name.split(' ')[0] || 'this parent'}? What matters to her? What works? What to avoid?`}
                  style={fieldStyle}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                <button
                  onClick={async () => {
                    if (transcript.trim().length < 30) {
                      setErrorMsg(
                        'Type at least a couple of sentences (30 characters).'
                      );
                      return;
                    }
                    setStage('processing');
                    await runIntake(transcript.trim());
                  }}
                  style={{
                    marginTop: 12,
                    padding: '10px 20px',
                    background: T.emerald,
                    color: '#0a1a0f',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Process
                </button>
              </div>
            )}
          </>
        )}

        {/* Recording */}
        {stage === 'recording' && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <div
              style={{
                fontFamily: T.serif,
                fontSize: 48,
                color: T.emerald,
                marginBottom: 16,
              }}
            >
              {formatTime(recordingTime)}
            </div>
            <button
              onClick={stopRecording}
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'rgba(220,50,50,0.18)',
                border: '2px solid rgba(220,50,50,0.85)',
                cursor: 'pointer',
                color: 'rgba(255,200,200,0.95)',
                animation: 'm-pulse 1.6s ease-in-out infinite',
              }}
              aria-label="Stop recording"
            >
              <Square size={32} />
            </button>
            <style jsx>{`
              @keyframes m-pulse {
                0%,
                100% {
                  box-shadow: 0 0 0 0 rgba(220, 50, 50, 0.32);
                }
                50% {
                  box-shadow: 0 0 0 18px rgba(220, 50, 50, 0);
                }
              }
            `}</style>
            <p style={{ color: T.textMuted, fontSize: 13, marginTop: 16 }}>
              Tap to stop. Speak naturally.
            </p>
            {liveText && (
              <div
                style={{
                  marginTop: 24,
                  background: 'rgba(8,20,12,0.55)',
                  border: '1px solid rgba(52,211,153,0.18)',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 14,
                  color: T.textSecondary,
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {liveText}
              </div>
            )}
          </div>
        )}

        {/* Transcribing / processing */}
        {(stage === 'transcribing' || stage === 'processing') && (
          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <div
              style={{
                width: 48,
                height: 48,
                margin: '0 auto 16px',
                border: '3px solid rgba(52,211,153,0.18)',
                borderTopColor: T.emerald,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style jsx>{`
              @keyframes spin {
                to {
                  transform: rotate(360deg);
                }
              }
            `}</style>
            <p style={{ color: T.textSecondary, fontSize: 15 }}>
              {stage === 'transcribing'
                ? 'Transcribing your recording…'
                : 'Reading what you said…'}
            </p>
          </div>
        )}

        {/* Review */}
        {stage === 'review' && parent && (
          <>
            <h1
              style={{
                fontFamily: T.serif,
                fontSize: 28,
                marginBottom: 8,
                color: T.textPrimary,
              }}
            >
              Review {parent.parent_name.split(' ')[0]}&apos;s profile
            </h1>
            <p style={{ color: T.textSecondary, fontSize: 14, marginBottom: 24 }}>
              Tracy structured what you said. Edit any field, then save.
            </p>

            {degraded && (
              <div
                style={{
                  background: 'rgba(232,201,106,0.08)',
                  border: '1px solid rgba(232,201,106,0.30)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: 'rgba(232,201,106,0.92)',
                }}
              >
                The structuring step didn&apos;t produce all fields cleanly — your
                transcript is in the History notes. Fill in the structured
                fields by hand.
              </div>
            )}

            <Section title="Archetypes (max 2)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ARCHETYPE_OPTIONS.map((a) => {
                  const on = draft.archetypes.includes(a.key);
                  return (
                    <button
                      key={a.key}
                      onClick={() => toggleArchetype(a.key)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: 13,
                        cursor: 'pointer',
                        background: on
                          ? 'rgba(52,211,153,0.18)'
                          : 'rgba(255,255,255,0.04)',
                        border: on
                          ? '1px solid rgba(52,211,153,0.55)'
                          : '1px solid rgba(255,255,255,0.10)',
                        color: on ? T.emerald : T.textSecondary,
                      }}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Relationship temperature">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TEMP_OPTIONS.map((opt) => {
                  const on = draft.relationship_temperature === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setTemperature(opt.key)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: 13,
                        cursor: 'pointer',
                        background: on
                          ? 'rgba(52,211,153,0.18)'
                          : 'rgba(255,255,255,0.04)',
                        border: on
                          ? '1px solid rgba(52,211,153,0.55)'
                          : '1px solid rgba(255,255,255,0.10)',
                        color: on ? T.emerald : T.textSecondary,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Preferred emotional language (ISO code, e.g. zh, en)">
              <input
                type="text"
                maxLength={5}
                value={draft.preferred_language}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    preferred_language: e.target.value.trim().toLowerCase(),
                  }))
                }
                placeholder="e.g. zh, en, es"
                style={fieldStyle}
              />
            </Section>

            <Section title="Known triggers — things to AVOID (one per line)">
              <textarea
                rows={3}
                value={draft.known_triggers.join('\n')}
                onChange={(e) => updateList('known_triggers', e.target.value)}
                placeholder="e.g. comparison to older sibling"
                style={fieldStyle}
              />
            </Section>

            <Section title="Effective moves — things that WORK (one per line)">
              <textarea
                rows={3}
                value={draft.effective_moves.join('\n')}
                onChange={(e) => updateList('effective_moves', e.target.value)}
                placeholder="e.g. photo evidence; anchoring to Montessori philosophy"
                style={fieldStyle}
              />
            </Section>

            <Section title="Parent's priorities for the child (one per line)">
              <textarea
                rows={3}
                value={draft.priorities_for_child.join('\n')}
                onChange={(e) => updateList('priorities_for_child', e.target.value)}
                placeholder="e.g. academic readiness for K"
                style={fieldStyle}
              />
            </Section>

            <Section title="Family context (free-text)">
              <textarea
                rows={3}
                value={draft.family_context}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, family_context: e.target.value }))
                }
                placeholder="Siblings, profession, key family circumstances"
                style={fieldStyle}
              />
            </Section>

            <Section title="History notes (anything else)">
              <textarea
                rows={5}
                value={draft.history_notes}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, history_notes: e.target.value }))
                }
                style={fieldStyle}
              />
            </Section>

            {errorMsg && (
              <div
                style={{
                  marginTop: 16,
                  background: 'rgba(220,50,50,0.10)',
                  border: '1px solid rgba(220,50,50,0.30)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'rgba(255,180,180,0.92)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button
                onClick={saveDraft}
                style={{
                  padding: '12px 24px',
                  background: T.emerald,
                  color: '#0a1a0f',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save profile
              </button>
              <button
                onClick={() => {
                  setStage('welcome');
                  setRecordingTime(0);
                  setLiveText('');
                  setTranscript('');
                }}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: T.textSecondary,
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Re-record
              </button>
            </div>

            {transcript && (
              <details
                style={{
                  marginTop: 32,
                  fontSize: 12,
                  color: T.textMuted,
                }}
              >
                <summary style={{ cursor: 'pointer' }}>
                  Show what you said (transcript)
                </summary>
                <p
                  style={{
                    whiteSpace: 'pre-wrap',
                    background: 'rgba(0,0,0,0.20)',
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 8,
                    fontFamily:
                      '"SF Mono", Menlo, Consolas, monospace',
                    fontSize: 12,
                  }}
                >
                  {transcript}
                </p>
              </details>
            )}
          </>
        )}

        {/* Saving */}
        {stage === 'saving' && (
          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <div
              style={{
                width: 48,
                height: 48,
                margin: '0 auto 16px',
                border: '3px solid rgba(52,211,153,0.18)',
                borderTopColor: T.emerald,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: T.textSecondary, fontSize: 15 }}>Saving…</p>
          </div>
        )}

        {/* Saved */}
        {stage === 'saved' && parent && (
          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <h2
              style={{
                fontFamily: T.serif,
                fontSize: 28,
                color: T.emerald,
                marginBottom: 16,
              }}
            >
              Saved.
            </h2>
            <p style={{ color: T.textSecondary, fontSize: 15, marginBottom: 24 }}>
              {parent.parent_name}&apos;s profile is on file. Tracy will use it the
              next time you prepare for a meeting.
            </p>
            <Link
              href="/montree/admin/parents"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: T.emerald,
                color: '#0a1a0f',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Back to parents
            </Link>
          </div>
        )}

        {/* Errors */}
        {stage === 'error_permission' && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontFamily: T.serif, fontSize: 22 }}>
              Microphone permission denied
            </h2>
            <p style={{ color: T.textSecondary, fontSize: 14, marginTop: 12 }}>
              Enable microphone access in your browser settings, then return to
              this page.
            </p>
            <button
              onClick={() => router.refresh()}
              style={{
                marginTop: 16,
                padding: '10px 18px',
                background: T.emerald,
                color: '#0a1a0f',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {stage === 'error' && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontFamily: T.serif, fontSize: 22, color: 'rgba(255,180,180,0.92)' }}>
              Something went wrong
            </h2>
            <p style={{ color: T.textSecondary, fontSize: 14, marginTop: 12 }}>
              {errorMsg || 'Unknown error.'}
            </p>
            <Link
              href="/montree/admin/parents"
              style={{
                marginTop: 16,
                display: 'inline-block',
                color: T.emerald,
                fontSize: 14,
                textDecoration: 'underline',
              }}
            >
              Back to parents
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: 16,
        background: T.card,
        border: T.cardBorder,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3
        style={{
          margin: '0 0 10px',
          fontSize: 13,
          fontWeight: 600,
          color: T.emeraldDim,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
