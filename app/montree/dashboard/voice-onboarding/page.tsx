// app/montree/dashboard/voice-onboarding/page.tsx
// Smart Voice Onboarding — orchestrator that walks the teacher through every
// un-onboarded child in the classroom, one at a time, via voice.
//
// Stages: welcome → recording → transcribing → processing → review →
//         custom_work_catch (per unmatched work) → transition → loop OR complete
//
// Reuses existing /voice-notes/transcribe (Whisper) and /children/:id/onboard (Sonnet
// profile extraction + curriculum seeding + game plan). Adds a scan-custom step
// to detect off-curriculum mentions, and a custom-work creation route to add them.
//
// Closing the tab mid-flow loses nothing — the pending list is recomputed from the
// database on next dashboard load.

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import MontreeLogo from '@/components/montree/MonteeLogo';

type Stage =
  | 'loading'
  | 'welcome'
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'processing'
  | 'review'
  | 'custom_work_catch'
  | 'custom_work_adding'
  | 'transition'
  | 'complete'
  | 'error_permission'
  | 'debug_error';

interface DebugError {
  step: string;
  url?: string;
  status?: number;
  statusText?: string;
  body?: string;
  jsError?: string;
  transcriptLength?: number;
  audioSize?: number;
}

interface PendingChild {
  id: string;
  name: string;
  photo_url: string | null;
}

interface UnmatchedWork {
  work_name: string;
  area: string;
  teacher_phrase: string;
  confidence: number;
}

interface ProcessResult {
  summary: string;
  experience_level?: string;
  game_plan?: { headline?: string; nudge?: string } | null;
}

const AREA_KEYS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;

export default function VoiceOnboardingPage() {
  const router = useRouter();
  const { t, locale } = useI18n();

  // Queue state
  const [pending, setPending] = useState<PendingChild[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Stage + per-child state
  const [stage, setStage] = useState<Stage>('loading');
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [unmatchedQueue, setUnmatchedQueue] = useState<UnmatchedWork[]>([]);
  const [currentUnmatchedIndex, setCurrentUnmatchedIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [debugError, setDebugError] = useState<DebugError | null>(null);

  // Refs (audio + timer + abort)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioBlobRef = useRef<Blob | null>(null); // kept around for retry-upload

  // Web Speech API (live transcription) — shows text on screen as the teacher speaks.
  // Hybrid pipeline: live text via SpeechRecognition for instant feedback; we still
  // upload audio to Whisper as a backup for accuracy and accent handling.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const liveFinalRef = useRef<string>(''); // accumulates final results across pauses
  const [liveText, setLiveText] = useState(''); // final + interim, displayed live

  // Child identity locked in at recording-start time. Decouples the in-flight pipeline
  // from React state — if `pending` is reset by a refetch/remount mid-flow, the
  // pipeline still knows which child it's processing. This prevents the silent
  // bump-to-idle bug caused by `currentChild` becoming undefined between render cycles.
  const recordingChildRef = useRef<{ id: string; name: string } | null>(null);

  // Load pending children
  const loadPending = useCallback(async () => {
    try {
      const res = await montreeApi('/api/montree/onboarding/voice/status');
      if (!res.ok) {
        // If unauthorized, bounce to login
        if (res.status === 401) {
          router.replace('/montree/login');
          return;
        }
        // Soft-fail: redirect to dashboard
        router.replace('/montree/dashboard');
        return;
      }
      const data = await res.json();
      const list = (data.pending as PendingChild[]) || [];
      setPending(list);
      setCompletedCount(data.completed_count || 0);
      setTotal(data.total || 0);
      setClassroomId(data.classroom_id || null);

      if (list.length === 0) {
        // Nothing to do — go to dashboard
        router.replace('/montree/dashboard');
        return;
      }

      setStage('welcome');
    } catch (err) {
      console.error('[VoiceOnboarding] Failed to load pending:', err);
      router.replace('/montree/dashboard');
    }
  }, [router]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // Cleanup on unmount — release mic, clear timer
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentChild = pending[currentIndex];
  const firstName = currentChild?.name?.split(' ')[0] || '';

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Web Speech API locale mapping (browser SpeechRecognition lang codes)
  const speechLang = (() => {
    const m: Record<string, string> = {
      en: 'en-US', zh: 'zh-CN', es: 'es-ES', de: 'de-DE', fr: 'fr-FR',
      pt: 'pt-BR', nl: 'nl-NL', it: 'it-IT', ja: 'ja-JP', ko: 'ko-KR',
      uk: 'uk-UA', ru: 'ru-RU',
    };
    return m[locale] || 'en-US';
  })();

  // ─── Recording ───
  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStage('error_permission');
        return;
      }

      // CRITICAL: Lock the child identity for this entire recording flow into a ref.
      // If `pending` gets refetched mid-flow (or React remounts), we still know
      // which child the recording is for. Without this, the pipeline silently bails
      // at the !currentChild check.
      if (!currentChild?.id) {
        console.error('[VoiceOnboarding] No currentChild at start — aborting');
        setStage('idle');
        return;
      }
      recordingChildRef.current = { id: currentChild.id, name: currentChild.name };
      console.log('[VoiceOnboarding] Locked child for recording:', recordingChildRef.current);

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

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        // Stop live recognition too
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch { /* noop */ }
          recognitionRef.current = null;
        }

        const chunks = chunksRef.current;
        chunksRef.current = [];
        console.log('[VoiceOnboarding] Recording stopped:', {
          chunks: chunks.length,
          liveTranscriptLength: liveFinalRef.current.length,
          mimeType: recorder.mimeType,
        });

        if (chunks.length === 0) {
          setErrorMsg('No audio captured. Try again.');
          setStage('idle');
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) {
          setErrorMsg('Recording too short. Try again.');
          setStage('idle');
          return;
        }

        audioBlobRef.current = blob;
        await transcribeAndProcess(blob, liveFinalRef.current);
      };

      recorder.start(1000);
      setStage('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);

      // Start Web Speech API for LIVE transcription (best-effort; not all browsers support)
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
              const transcriptPart = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                liveFinalRef.current += transcriptPart;
              } else {
                interim += transcriptPart;
              }
            }
            setLiveText(liveFinalRef.current + interim);
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onerror = (e: any) => {
            console.warn('[VoiceOnboarding] SpeechRecognition error (non-fatal):', e?.error);
          };

          recognition.onend = () => {
            // If user is still recording, the API auto-stopped (it does this on long silences).
            // Only restart if the recorder is still active.
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              try { recognition.start(); } catch { /* already running */ }
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (err) {
          // Silent fail — Whisper backup will still capture audio
          console.warn('[VoiceOnboarding] SpeechRecognition unavailable; falling back to Whisper:', err);
        }
      } else {
        console.log('[VoiceOnboarding] No SpeechRecognition support; using Whisper only');
      }
    } catch (err) {
      console.error('[VoiceOnboarding] Mic permission/start error:', err);
      setStage('error_permission');
    }
  }, [speechLang, currentChild]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
    }
  }, []);

  // ─── Transcribe + Process pipeline ───
  // text-first design: if Web Speech API gave us a usable live transcript, we use that
  // and skip Whisper entirely (faster, free). Whisper is the fallback for browsers without
  // SpeechRecognition support or when the live transcript is too thin.
  const transcribeAndProcess = async (blob: Blob, liveTranscript: string) => {
    setErrorMsg('');
    let text = (liveTranscript || '').trim();

    // If live transcript is solid (≥40 chars), skip Whisper entirely
    if (text.length >= 40) {
      console.log('[VoiceOnboarding] Using live transcript (skipping Whisper):', { length: text.length });
    } else {
      // Fall back to Whisper
      setStage('transcribing');
      console.log('[VoiceOnboarding] Live transcript too short; uploading to Whisper:', { liveLength: text.length, audioSize: blob.size });
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      let tRes: Response;
      try {
        tRes = await fetch('/api/montree/voice-notes/transcribe', { method: 'POST', body: form });
      } catch (fetchErr) {
        setDebugError({
          step: 'TRANSCRIBE — fetch threw',
          url: '/api/montree/voice-notes/transcribe',
          jsError: fetchErr instanceof Error ? `${fetchErr.name}: ${fetchErr.message}` : String(fetchErr),
          audioSize: blob.size,
        });
        setStage('debug_error');
        return;
      }
      if (!tRes.ok) {
        const errBody = await tRes.text().catch(() => '(could not read body)');
        setDebugError({
          step: 'TRANSCRIBE — server returned error',
          url: '/api/montree/voice-notes/transcribe',
          status: tRes.status,
          statusText: tRes.statusText,
          body: errBody,
          audioSize: blob.size,
        });
        setStage('debug_error');
        return;
      }
      const tData = await tRes.json();
      text = (tData.transcript || '').trim();
      console.log('[VoiceOnboarding] Whisper transcript received:', { length: text.length, preview: text.slice(0, 80) });
    }

    if (!text || text.length < 20) {
      setErrorMsg(t('voiceOnboarding.error.tooShort', { name: firstName }));
      setStage('idle');
      return;
    }
    setTranscript(text);

    try {

      // Step B: Sonnet onboard (profile extraction + game plan)
      setStage('processing');

      // Use the LOCKED child identity from the recording-start ref, not the
      // possibly-stale React state. This prevents the silent bump-to-idle bug.
      const lockedChild = recordingChildRef.current;
      if (!lockedChild?.id) {
        setDebugError({
          step: 'PIPELINE — child identity lost',
          jsError: 'recordingChildRef.current is null at onboard step. This should be impossible if startRecording succeeded.',
          transcriptLength: text.length,
        });
        setStage('debug_error');
        return;
      }

      const onboardUrl = `/api/montree/children/${lockedChild.id}/onboard`;
      console.log('[VoiceOnboarding] →POST', onboardUrl, { transcriptLength: text.length, classroomId, childName: lockedChild.name });
      let oRes: Response;
      try {
        // Body shape mirrors TellGuruCard exactly (which is known-working).
        // No `locale` field — /onboard reads locale from URL/Accept-Language headers.
        oRes = await montreeApi(onboardUrl, {
          method: 'POST',
          timeout: 120000,
          body: JSON.stringify({
            transcript: text,
            classroom_id: classroomId,
          }),
        });
        console.log('[VoiceOnboarding] ←onboard response', { ok: oRes.ok, status: oRes.status, statusText: oRes.statusText });
      } catch (fetchErr) {
        setDebugError({
          step: 'ONBOARD — fetch threw',
          url: onboardUrl,
          jsError: fetchErr instanceof Error ? `${fetchErr.name}: ${fetchErr.message}` : String(fetchErr),
          transcriptLength: text.length,
        });
        setStage('debug_error');
        return;
      }

      if (!oRes.ok) {
        const errBody = await oRes.text().catch(() => '(could not read body)');
        setDebugError({
          step: 'ONBOARD — server returned error',
          url: onboardUrl,
          status: oRes.status,
          statusText: oRes.statusText,
          body: errBody,
          transcriptLength: text.length,
        });
        setStage('debug_error');
        return;
      }

      const oData = await oRes.json();
      setResult({
        summary: oData.summary || '',
        experience_level: oData.experience_level,
        game_plan: oData.game_plan,
      });

      // Step C: Scan for custom works (fire-and-forget on error — don't block flow)
      try {
        const sRes = await fetch('/api/montree/onboarding/voice/scan-custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text, classroom_id: classroomId }),
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          const works = (sData.unmatched as UnmatchedWork[]) || [];
          setUnmatchedQueue(works);
          setCurrentUnmatchedIndex(0);
        } else {
          setUnmatchedQueue([]);
        }
      } catch {
        setUnmatchedQueue([]);
      }

      setStage('review');
    } catch (err) {
      setDebugError({
        step: 'PIPELINE — unexpected exception',
        jsError: err instanceof Error ? `${err.name}: ${err.message}\n${err.stack?.slice(0, 500) || ''}` : String(err),
      });
      setStage('debug_error');
    }
  };

  // ─── Review actions ───
  const onConfirmReview = () => {
    if (unmatchedQueue.length > 0) {
      setStage('custom_work_catch');
      return;
    }
    advanceToNext();
  };

  const onTryAgain = () => {
    // Discard current result and re-record
    // Note: profile is already saved server-side. This is acceptable —
    // the next confirm will UPSERT and overwrite.
    setTranscript('');
    setResult(null);
    setUnmatchedQueue([]);
    setStage('idle');
  };

  // ─── Custom work actions ───
  const onAddCustomWork = async (workName: string, area: string, teacherPhrase: string) => {
    setStage('custom_work_adding');
    try {
      const res = await fetch('/api/montree/onboarding/voice/custom-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workName,
          area,
          classroom_id: classroomId,
          teacher_phrase: teacherPhrase,
        }),
      });
      if (!res.ok) {
        console.error('[VoiceOnboarding] Custom work add failed');
      }
    } catch (err) {
      console.error('[VoiceOnboarding] Custom work add error:', err);
    }

    // Move to next unmatched, or advance if done
    const nextIdx = currentUnmatchedIndex + 1;
    if (nextIdx < unmatchedQueue.length) {
      setCurrentUnmatchedIndex(nextIdx);
      setStage('custom_work_catch');
    } else {
      advanceToNext();
    }
  };

  const onSkipCustomWork = () => {
    const nextIdx = currentUnmatchedIndex + 1;
    if (nextIdx < unmatchedQueue.length) {
      setCurrentUnmatchedIndex(nextIdx);
      setStage('custom_work_catch');
    } else {
      advanceToNext();
    }
  };

  // ─── Skip (per-child) ───
  // Skipped children re-appear in the queue on next dashboard load (they still
  // lack a profile). This is intentional — the only way to truly finish onboarding
  // is to confirm or fill in the profile via the existing TellGuruCard later.
  const onSkipChild = () => {
    if (!currentChild) return;
    advanceToNext({ skipped: true });
  };

  // ─── Advance to next or complete ───
  const advanceToNext = (opts?: { skipped?: boolean }) => {
    setRecordingTime(0);
    setTranscript('');
    setResult(null);
    setUnmatchedQueue([]);
    setCurrentUnmatchedIndex(0);
    if (!opts?.skipped) {
      setCompletedCount(c => c + 1);
    }

    const nextIdx = currentIndex + 1;
    if (nextIdx < pending.length) {
      setCurrentIndex(nextIdx);
      setStage('transition');
      setTimeout(() => setStage('idle'), 1200);
    } else {
      setStage('complete');
    }
  };

  // ─── Render ───

  // Single root render so keyframes inject reliably across all stage transitions
  const renderInner = () => {
    if (stage === 'loading') {
      return <div style={centerStyle}><Spinner /></div>;
    }

    if (stage === 'welcome') {
      return (
        <div style={{ ...centerStyle, maxWidth: 640, padding: '0 28px' }}>
          <h1 style={titleStyle}>{t('voiceOnboarding.welcome.title')}</h1>
          <p style={{ ...bodyStyle, marginTop: 28 }}>{t('voiceOnboarding.welcome.body')}</p>
          <p style={{ ...bodyStyle, marginTop: 20, color: 'rgba(255,255,255,0.65)' }}>
            {t('voiceOnboarding.welcome.takeBreak')}
          </p>
          <p style={{ ...bodyStyle, marginTop: 18, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            {t('voiceOnboarding.welcome.duration')}
          </p>
          <button onClick={() => setStage('idle')} style={{ ...primaryButtonStyle, marginTop: 36 }}>
            {t('voiceOnboarding.welcome.cta')}
          </button>
        </div>
      );
    }

    if (stage === 'error_permission') {
      return (
        <div style={{ ...centerStyle, maxWidth: 480, padding: '0 28px' }}>
          <p style={{ ...bodyStyle, color: '#fca5a5' }}>
            {t('voiceOnboarding.error.permissionDenied')}
          </p>
          <button onClick={() => setStage('idle')} style={{ ...primaryButtonStyle, marginTop: 24 }}>
            {t('voiceOnboarding.review.tryAgain')}
          </button>
        </div>
      );
    }

    if (stage === 'debug_error' && debugError) {
      return (
        <div style={{
          maxWidth: 720,
          width: '100%',
          padding: '40px 28px',
          textAlign: 'left',
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 14,
            padding: '24px 28px',
          }}>
            <h2 style={{ ...titleStyle, fontSize: 22, color: '#fca5a5', marginBottom: 16 }}>
              Something failed during onboarding
            </h2>
            <p style={{ ...bodyStyle, fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
              Screenshot this whole panel and send it to Tredoux. It tells us exactly where things broke.
            </p>
            <DebugRow label="Step" value={debugError.step} />
            {debugError.url && <DebugRow label="URL" value={debugError.url} mono />}
            {debugError.status !== undefined && (
              <DebugRow
                label="HTTP Status"
                value={`${debugError.status} ${debugError.statusText || ''}`}
                highlight
              />
            )}
            {debugError.body && (
              <DebugRow label="Server response" value={debugError.body.slice(0, 1000)} mono pre />
            )}
            {debugError.jsError && (
              <DebugRow label="JS error" value={debugError.jsError} mono pre />
            )}
            {debugError.audioSize !== undefined && (
              <DebugRow label="Audio size" value={`${debugError.audioSize} bytes`} />
            )}
            {debugError.transcriptLength !== undefined && (
              <DebugRow label="Transcript length" value={`${debugError.transcriptLength} chars`} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
            <button
              onClick={() => { setDebugError(null); setStage('idle'); }}
              style={primaryButtonStyle}
            >
              Try recording again
            </button>
            <button
              onClick={() => router.replace('/montree/dashboard?skipOnboarding=1')}
              style={secondaryButtonStyle}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      );
    }

    if (stage === 'complete') {
      return (
        <div style={{ ...centerStyle, maxWidth: 520, padding: '0 28px' }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🌱</div>
          <h1 style={titleStyle}>{t('voiceOnboarding.complete.title')}</h1>
          <p style={{ ...bodyStyle, marginTop: 20 }}>{t('voiceOnboarding.complete.subtitle')}</p>
          <button
            onClick={() => router.replace('/montree/dashboard')}
            style={{ ...primaryButtonStyle, marginTop: 36 }}
          >
            {t('voiceOnboarding.complete.cta')}
          </button>
        </div>
      );
    }

    if (stage === 'transition' && currentChild) {
      return (
        <div style={centerStyle}>
          <p style={{ ...bodyStyle, color: 'rgba(255,255,255,0.6)', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {t('voiceOnboarding.transition.next', { name: firstName })}
          </p>
        </div>
      );
    }

    if (!currentChild) {
      return <div style={centerStyle}><Spinner /></div>;
    }

    // Stages that need progress strip and a current child
    return (
      <>
        <div style={progressStripStyle}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            {t('voiceOnboarding.progress.label', {
              completed: String(completedCount),
              total: String(total),
            })}
          </span>
        </div>

      {/* Idle / Recording — child name + prompts + mic + (live transcript while recording).
          On stop, this whole shell unmounts and the dedicated Processing screen below
          takes over: clean Montree logo + "Processing", no transcript visible. */}
      {(stage === 'idle' || stage === 'recording') && (
        <div style={{ ...centerStyle, maxWidth: 520, padding: '0 28px' }}>
          {currentChild.photo_url ? (
            <div style={avatarStyle}>
              <img
                src={getProxyUrl(currentChild.photo_url)}
                alt=""
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div style={avatarStyle}>
              <span style={{
                fontFamily: "'Lora', Georgia, serif", fontSize: 56,
                color: '#fff',
              }}>
                {firstName.charAt(0)}
              </span>
            </div>
          )}

          <h2 style={{ ...titleStyle, fontSize: 32, marginTop: 24 }}>
            {t('voiceOnboarding.recording.titleAbout', { name: firstName })}
          </h2>

          {/* Prompts */}
          <div style={promptsStyle}>
            <p style={promptHeadingStyle}>{t('voiceOnboarding.recording.promptHeading')}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={promptItemStyle}>· {t('voiceOnboarding.recording.promptTime')}</li>
              <li style={promptItemStyle}>· {t('voiceOnboarding.recording.promptFocusArea')}</li>
              <li style={promptItemStyle}>· {t('voiceOnboarding.recording.promptBehavior')}</li>
              <li style={promptItemStyle}>· {t('voiceOnboarding.recording.promptInterestedWork')}</li>
            </ul>
          </div>

          {/* Mic / Stop */}
          {stage === 'idle' && (
            <>
              <button onClick={startRecording} style={micButtonStyle} aria-label="Record">
                <MicIcon />
              </button>
              <p style={{ ...bodyStyle, marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
                {t('voiceOnboarding.recording.tapToStart')}
              </p>
              {errorMsg && (
                <div style={{
                  marginTop: 24,
                  padding: '14px 20px',
                  background: 'rgba(239, 68, 68, 0.14)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  borderRadius: 14,
                  maxWidth: 460,
                }}>
                  <p style={{ ...bodyStyle, fontSize: 15, color: '#fca5a5', margin: 0, lineHeight: 1.5 }}>
                    ⚠️ {errorMsg}
                  </p>
                  <p style={{ ...bodyStyle, marginTop: 6, fontSize: 12, color: 'rgba(252,165,165,0.7)' }}>
                    Open browser console for details. If this keeps happening, check Railway runtime logs.
                  </p>
                </div>
              )}
            </>
          )}

          {stage === 'recording' && (
            <>
              <div style={{ marginTop: 32 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {t('voiceOnboarding.recording.recordingLabel')}
                </p>
                <p style={{ fontSize: 36, color: '#34d399', fontFamily: 'monospace', marginTop: 8 }}>
                  {formatTime(recordingTime)}
                </p>
              </div>
              <button onClick={stopRecording} style={stopButtonStyle} aria-label="Stop">
                <div style={{ width: 28, height: 28, background: 'white', borderRadius: 4 }} />
              </button>
            </>
          )}

          {/* Live transcript — only while recording. On stop, this unmounts and the
              dedicated processing screen takes over (see below). */}
          {stage === 'recording' && (
            liveText ? (
              <div style={{
                marginTop: 28,
                padding: '20px 24px',
                background: 'rgba(167,243,208,0.06)',
                border: '1px solid rgba(167,243,208,0.18)',
                borderRadius: 16,
                maxWidth: 600,
                width: '100%',
                textAlign: 'left',
                maxHeight: 240,
                overflowY: 'auto',
              }}>
                <p style={{
                  ...bodyStyle,
                  fontSize: 17,
                  lineHeight: 1.5,
                  color: '#e6fff4',
                  margin: 0,
                }}>
                  {liveText}
                </p>
              </div>
            ) : (
              <p style={{ ...bodyStyle, marginTop: 16, fontSize: 13, fontStyle: 'italic', color: '#a7f3d0' }}>
                {recordingTime < 15
                  ? t('voiceOnboarding.recording.encourageEarly')
                  : recordingTime < 60
                    ? t('voiceOnboarding.recording.encourageMid')
                    : t('voiceOnboarding.recording.encourageLate')}
              </p>
            )
          )}

          {/* Skip — only available when idle */}
          {stage === 'idle' && (
            <button onClick={onSkipChild} style={skipButtonStyle}>
              {t('voiceOnboarding.recording.skip', { name: firstName })}
            </button>
          )}
        </div>
      )}

      {/* Processing — clean takeover screen with the Montree logo.
          On stop, the recording shell (transcript, prompts, mic) all unmounts.
          This screen is what the teacher sees while transcribe + Sonnet are running.
          When the summary is ready, stage flips to 'review'. */}
      {(stage === 'transcribing' || stage === 'processing') && (
        <div style={{
          ...centerStyle,
          gap: 28,
        }}>
          <div style={{
            position: 'relative',
            width: 120,
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Pulsing emerald glow ring around the logo */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24,
              boxShadow: '0 0 60px 12px rgba(52,211,153,0.45)',
              animation: 'voiceonb-glow 2s ease-in-out infinite',
            }} />
            <MontreeLogo size={120} showBackground={true} />
          </div>
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 28,
            fontWeight: 500,
            color: '#fff',
            margin: 0,
            letterSpacing: 0.3,
          }}>
            Processing
          </p>
          <p style={{
            ...bodyStyle,
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            margin: 0,
          }}>
            {t('voiceOnboarding.processing', { name: firstName })}
          </p>
        </div>
      )}

      {/* Review */}
      {stage === 'review' && result && (
        <div style={{ ...centerStyle, maxWidth: 560, padding: '32px 28px', overflowY: 'auto' }}>
          <h2 style={{ ...titleStyle, fontSize: 24, marginBottom: 20 }}>
            {t('voiceOnboarding.review.title', { name: firstName })}
          </h2>
          {result.summary && (
            <p style={{ ...bodyStyle, lineHeight: 1.6 }}>{result.summary}</p>
          )}
          {result.game_plan?.nudge && (
            <div style={{
              marginTop: 20, padding: '16px 20px',
              background: 'rgba(167,243,208,0.08)',
              border: '1px solid rgba(167,243,208,0.18)',
              borderRadius: 14,
            }}>
              <p style={{ ...bodyStyle, fontSize: 14, color: '#a7f3d0', margin: 0, lineHeight: 1.5 }}>
                {result.game_plan.nudge}
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onConfirmReview} style={primaryButtonStyle}>
              {t('voiceOnboarding.review.confirm')}
            </button>
            <button onClick={onTryAgain} style={secondaryButtonStyle}>
              {t('voiceOnboarding.review.tryAgain')}
            </button>
          </div>
        </div>
      )}

      {/* Custom work catch */}
      {stage === 'custom_work_catch' && unmatchedQueue[currentUnmatchedIndex] && (
        <CustomWorkCatchPanel
          work={unmatchedQueue[currentUnmatchedIndex]}
          onAdd={onAddCustomWork}
          onSkip={onSkipCustomWork}
          t={t}
        />
      )}

      {stage === 'custom_work_adding' && unmatchedQueue[currentUnmatchedIndex] && (
        <div style={centerStyle}>
          <Spinner />
          <p style={{ ...bodyStyle, marginTop: 24 }}>
            {t('voiceOnboarding.customWork.adding', {
              name: unmatchedQueue[currentUnmatchedIndex].work_name,
            })}
          </p>
        </div>
      )}
      </>
    );
  };

  return (
    <div style={pageStyle}>
      <style jsx global>{`
        @keyframes voiceonb-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes voiceonb-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55); }
          50% { box-shadow: 0 0 0 24px rgba(239, 68, 68, 0); }
        }
        @keyframes voiceonb-glow {
          0%, 100% { box-shadow: 0 0 50px 8px rgba(52,211,153,0.35); transform: scale(1); }
          50%      { box-shadow: 0 0 80px 18px rgba(52,211,153,0.65); transform: scale(1.04); }
        }
      `}</style>
      {/* Off-centre radial glow — matches dashboard aesthetic */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), rgba(39,129,90,0.18) 30%, transparent 60%)',
      }} />
      {renderInner()}
    </div>
  );
}

// ─── Custom Work Catch sub-component ───
function CustomWorkCatchPanel({
  work,
  onAdd,
  onSkip,
  t,
}: {
  work: UnmatchedWork;
  onAdd: (name: string, area: string, teacherPhrase: string) => void;
  onSkip: () => void;
  t: (k: string, v?: Record<string, string>) => string;
}) {
  const [selectedArea, setSelectedArea] = useState<string>(work.area);

  const areaLabel = (key: string) => {
    const map: Record<string, string> = {
      practical_life: t('voiceOnboarding.customWork.areaPracticalLife'),
      sensorial: t('voiceOnboarding.customWork.areaSensorial'),
      mathematics: t('voiceOnboarding.customWork.areaMathematics'),
      language: t('voiceOnboarding.customWork.areaLanguage'),
      cultural: t('voiceOnboarding.customWork.areaCultural'),
    };
    return map[key] || key;
  };

  return (
    <div style={{ ...centerStyle, maxWidth: 520, padding: '32px 28px' }}>
      <p style={{
        ...bodyStyle, fontSize: 14, letterSpacing: 1.5,
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase', marginBottom: 12,
      }}>
        {t('voiceOnboarding.customWork.notice', { name: work.work_name })}
      </p>
      <p style={{ ...bodyStyle, lineHeight: 1.5, marginBottom: 24 }}>
        {t('voiceOnboarding.customWork.body')}
      </p>
      <p style={{ ...bodyStyle, fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
        {t('voiceOnboarding.customWork.areaPrompt')}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
        {AREA_KEYS.map(k => (
          <button
            key={k}
            onClick={() => setSelectedArea(k)}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: `1.5px solid ${selectedArea === k ? '#34d399' : 'rgba(255,255,255,0.18)'}`,
              background: selectedArea === k ? 'rgba(52,211,153,0.18)' : 'transparent',
              color: selectedArea === k ? '#a7f3d0' : 'rgba(255,255,255,0.7)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {areaLabel(k)}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => onAdd(work.work_name, selectedArea, work.teacher_phrase)}
          style={primaryButtonStyle}
        >
          {t('voiceOnboarding.customWork.add')}
        </button>
        <button onClick={onSkip} style={secondaryButtonStyle}>
          {t('voiceOnboarding.customWork.skipForNow')}
        </button>
      </div>
    </div>
  );
}

// ─── Debug row for the inline error screen ───
function DebugRow({
  label,
  value,
  mono,
  pre,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  pre?: boolean;
  highlight?: boolean;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : "'Inter', sans-serif",
        fontSize: highlight ? 18 : 13,
        fontWeight: highlight ? 600 : 400,
        color: highlight ? '#fca5a5' : 'rgba(255,255,255,0.92)',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '8px 12px',
        whiteSpace: pre ? 'pre-wrap' : 'normal',
        wordBreak: 'break-word',
        maxHeight: pre ? 220 : 'auto',
        overflow: 'auto',
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── UI atoms ───
function Spinner() {
  return (
    <div style={{
      width: 40, height: 40,
      border: '3px solid rgba(255,255,255,0.15)',
      borderTopColor: '#34d399',
      borderRadius: '50%',
      animation: 'voiceonb-spin 0.8s linear infinite',
    }} />
  );
}

function MicIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="white" stroke="none">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Inline styles (matches dark forest aesthetic from Session 75) ───
const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background: '#0a1a0f',
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center', // horizontally centre all content blocks
  justifyContent: 'center', // vertically centre when content is short
};

const centerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  zIndex: 1,
  position: 'relative',
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Lora', Georgia, serif",
  fontSize: 36,
  fontWeight: 500,
  lineHeight: 1.2,
  margin: 0,
  color: '#fff',
};

const bodyStyle: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, sans-serif",
  fontSize: 17,
  lineHeight: 1.55,
  color: 'rgba(255,255,255,0.85)',
  margin: 0,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '14px 28px',
  background: '#34d399',
  color: '#0a1a0f',
  border: 'none',
  borderRadius: 999,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: 0.2,
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '14px 28px',
  background: 'transparent',
  color: 'rgba(255,255,255,0.85)',
  border: '1.5px solid rgba(255,255,255,0.25)',
  borderRadius: 999,
  fontSize: 16,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const skipButtonStyle: React.CSSProperties = {
  marginTop: 28,
  background: 'transparent',
  border: 'none',
  color: 'rgba(255,255,255,0.4)',
  fontSize: 13,
  cursor: 'pointer',
  textDecoration: 'underline',
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const micButtonStyle: React.CSSProperties = {
  marginTop: 28,
  width: 96,
  height: 96,
  borderRadius: '50%',
  border: 'none',
  background: '#34d399',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 40px 8px rgba(52,211,153,0.35)',
};

const stopButtonStyle: React.CSSProperties = {
  marginTop: 28,
  width: 96,
  height: 96,
  borderRadius: '50%',
  border: 'none',
  background: '#ef4444',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'voiceonb-pulse 1.5s ease-in-out infinite',
};

const avatarStyle: React.CSSProperties = {
  width: 120,
  height: 120,
  borderRadius: '50%',
  background: 'rgba(52,211,153,0.18)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  boxShadow: '0 0 32px 8px rgba(52,211,153,0.32)',
};

const promptsStyle: React.CSSProperties = {
  marginTop: 24,
  padding: '16px 20px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  textAlign: 'left',
};

const promptHeadingStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.5)',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  margin: '0 0 10px 0',
};

const promptItemStyle: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, sans-serif",
  fontSize: 14,
  color: 'rgba(255,255,255,0.78)',
  marginBottom: 6,
  lineHeight: 1.4,
};

const progressStripStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 0,
  right: 0,
  textAlign: 'center',
  zIndex: 2,
};
