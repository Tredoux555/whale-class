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
  | 'error_permission';

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

  // Refs (audio + timer + abort)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioBlobRef = useRef<Blob | null>(null); // kept around for retry-upload

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

  // ─── Recording ───
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

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        const chunks = chunksRef.current;
        chunksRef.current = [];
        console.log('[VoiceOnboarding] Recording stopped:', { chunks: chunks.length, mimeType: recorder.mimeType });
        if (chunks.length === 0) {
          console.warn('[VoiceOnboarding] No audio chunks captured');
          setErrorMsg('No audio captured. Try again.');
          setStage('idle');
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) {
          console.warn('[VoiceOnboarding] Audio too short:', blob.size);
          setErrorMsg('Recording too short. Try again.');
          setStage('idle');
          return;
        }

        audioBlobRef.current = blob;
        await transcribeAndProcess(blob);
      };

      recorder.start(1000);
      setStage('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      console.error('[VoiceOnboarding] Mic permission/start error:', err);
      setStage('error_permission');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
    }
  }, []);

  // ─── Transcribe + Process pipeline ───
  const transcribeAndProcess = async (blob: Blob) => {
    setStage('transcribing');
    setErrorMsg('');

    try {
      // Step A: Whisper
      console.log('[VoiceOnboarding] Uploading audio for transcription:', { size: blob.size, type: blob.type });
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      const tRes = await fetch('/api/montree/voice-notes/transcribe', { method: 'POST', body: form });
      if (!tRes.ok) {
        const errBody = await tRes.text().catch(() => '');
        console.error('[VoiceOnboarding] Transcribe failed', { status: tRes.status, body: errBody });
        setErrorMsg(`${t('voiceOnboarding.error.uploadFailed')} (${tRes.status})`);
        setStage('idle');
        return;
      }
      const tData = await tRes.json();
      const text = (tData.transcript || '').trim();
      console.log('[VoiceOnboarding] Transcript received:', { length: text.length, preview: text.slice(0, 80) });

      if (!text || text.length < 20) {
        setErrorMsg(t('voiceOnboarding.error.tooShort', { name: firstName }));
        setStage('idle');
        return;
      }
      setTranscript(text);

      // Step B: Sonnet onboard (profile extraction + game plan)
      setStage('processing');
      if (!currentChild) { setStage('idle'); return; }

      const onboardUrl = `/api/montree/children/${currentChild.id}/onboard`;
      console.log('[VoiceOnboarding] →POST', onboardUrl, { transcriptLength: text.length, classroomId, locale });
      let oRes: Response;
      try {
        oRes = await montreeApi(onboardUrl, {
          method: 'POST',
          timeout: 120000,
          body: JSON.stringify({
            transcript: text,
            classroom_id: classroomId,
            locale,
          }),
        });
        console.log('[VoiceOnboarding] ←onboard response', { ok: oRes.ok, status: oRes.status, statusText: oRes.statusText });
      } catch (fetchErr) {
        console.error('[VoiceOnboarding] Onboard fetch threw:', fetchErr);
        setErrorMsg(`Onboard request failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
        setStage('idle');
        return;
      }

      if (!oRes.ok) {
        const errBody = await oRes.text().catch(() => '');
        console.error('[VoiceOnboarding] Onboard failed', { status: oRes.status, body: errBody });
        setErrorMsg(`${t('voiceOnboarding.error.processingFailed')} (HTTP ${oRes.status}): ${errBody.slice(0, 200) || oRes.statusText}`);
        setStage('idle');
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
      console.error('[VoiceOnboarding] Pipeline error:', err);
      setErrorMsg(t('voiceOnboarding.error.processingFailed'));
      setStage('idle');
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

      {/* Idle / Recording */}
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
              <li style={promptItemStyle}>· {t('voiceOnboarding.recording.promptStrengths')}</li>
              <li style={promptItemStyle}>· {t('voiceOnboarding.recording.promptInterests')}</li>
              <li style={promptItemStyle}>· {t('voiceOnboarding.recording.promptFocus')}</li>
              <li style={promptItemStyle}>· {t('voiceOnboarding.recording.promptWorks')}</li>
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
              <p style={{ ...bodyStyle, marginTop: 16, fontSize: 13, fontStyle: 'italic', color: '#a7f3d0' }}>
                {recordingTime < 15
                  ? t('voiceOnboarding.recording.encourageEarly')
                  : recordingTime < 60
                    ? t('voiceOnboarding.recording.encourageMid')
                    : t('voiceOnboarding.recording.encourageLate')}
              </p>
            </>
          )}

          {/* Skip — only available when idle */}
          {stage === 'idle' && (
            <button onClick={onSkipChild} style={skipButtonStyle}>
              {t('voiceOnboarding.recording.skip', { name: firstName })}
            </button>
          )}
        </div>
      )}

      {/* Transcribing */}
      {stage === 'transcribing' && (
        <div style={centerStyle}>
          <Spinner />
          <p style={{ ...bodyStyle, marginTop: 24 }}>
            {t('voiceOnboarding.transcribing', { name: firstName })}
          </p>
        </div>
      )}

      {/* Processing */}
      {stage === 'processing' && (
        <div style={centerStyle}>
          <Spinner />
          <p style={{ ...bodyStyle, marginTop: 24 }}>
            {t('voiceOnboarding.processing', { name: firstName })}
          </p>
          {transcript && (
            <p style={{
              ...bodyStyle,
              marginTop: 12, fontSize: 14, fontStyle: 'italic',
              color: 'rgba(255,255,255,0.45)',
              maxWidth: 480, padding: '0 28px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              &ldquo;{transcript}&rdquo;
            </p>
          )}
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
