// app/montree/admin/parents/[parentId]/meetings/new/page.tsx
//
// Ultimate Astra Phase B — record a parent meeting in-app.
//
// FLOW
//   1. Pick meeting type.
//   2. Check the consent checkbox (gate). Recording button stays disabled
//      until it's checked.
//   3. Tap record → MediaRecorder starts, chunks audio every 20 minutes,
//      uploads each chunk to /transcribe-chunk.
//   4. Persistent red dot + "Recording — tap to stop" banner.
//   5. Tap stop → final chunk uploads with final=true → transcript_id returned.
//   6. Tap "Read meeting" → Sonnet analysis → redirect to /review page.
//
// PRIVACY
//   Audio is never persisted. The consent gate cannot be bypassed —
//   server-side the transcribe-chunk route enforces.

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import { Mic, Square, ChevronLeft, AlertCircle, Circle } from 'lucide-react';

const T = {
  bg: '#0a1a0f',
  glow:
    'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), transparent 60%)',
  card: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  red: '#f87171',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const MEETING_TYPES: Array<{ key: string; label: string; hint: string }> = [
  { key: 'parent_teacher_conference', label: 'Parent–teacher conference', hint: 'Scheduled, planned' },
  { key: 'intro', label: 'Intro meeting', hint: 'First meeting' },
  { key: 'escalation', label: 'Escalation', hint: 'Conflict / dispute' },
  { key: 'progress', label: 'Progress update', hint: 'Routine update' },
  { key: 'behavioural', label: 'Behavioural', hint: 'About child behaviour' },
  { key: 'exit', label: 'Exit meeting', hint: 'Family is leaving' },
  { key: 'other', label: 'Other', hint: 'Something else' },
];

type Stage =
  | 'loading'
  | 'setup'
  | 'recording'
  | 'finalizing'
  | 'analysing'
  | 'done'
  | 'error';

interface ParentInfo {
  parent_id: string;
  parent_name: string;
  child_names: string[];
  child_ids: string[];
}

// 20 minutes per chunk — Whisper's safe ceiling is ~25 min, leave headroom.
const CHUNK_MS = 20 * 60 * 1000;

export default function NewMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useI18n();
  const parentId = String(params.parentId || '');

  const [stage, setStage] = useState<Stage>('loading');
  const [parent, setParent] = useState<ParentInfo | null>(null);
  const [meetingType, setMeetingType] = useState('parent_teacher_conference');
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [chunksUploaded, setChunksUploaded] = useState(0);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef = useRef(0);
  const chunkBoundaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStoppingRef = useRef(false);

  // Load parent.
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
        if (match.child_ids.length === 1) {
          setSelectedChildId(match.child_ids[0]);
        }
        setStage('setup');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'unknown');
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
      if (chunkBoundaryTimerRef.current) clearTimeout(chunkBoundaryTimerRef.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const uploadChunk = useCallback(
    async (blob: Blob, isFinal: boolean) => {
      if (!meetingId) return;
      const idx = chunkIndexRef.current;
      chunkIndexRef.current += 1;
      const form = new FormData();
      form.append('audio', blob, `chunk-${idx}.webm`);
      form.append('chunk_index', String(idx));
      form.append('final', isFinal ? 'true' : 'false');
      form.append('consent_acknowledged', 'true');
      try {
        const res = await fetch(
          `/api/montree/admin/parent-meetings/${meetingId}/transcribe-chunk`,
          { method: 'POST', body: form }
        );
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          setErrorMsg(`Chunk upload failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
          setStage('error');
          return;
        }
        const data = await res.json();
        setChunksUploaded((c) => c + 1);
        if (isFinal && data.transcript_id) {
          setTranscriptId(data.transcript_id);
          setStage('done');
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'upload failed');
        setStage('error');
      }
    },
    [meetingId]
  );

  // Build a fresh MediaRecorder. Called on initial start AND on each
  // 20-minute boundary so we get a fresh Blob per chunk.
  const buildRecorder = useCallback((stream: MediaStream, isFinal: boolean) => {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = async () => {
      if (chunks.length === 0) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      if (blob.size < 100) return;
      await uploadChunk(blob, isFinal);
    };
    return recorder;
  }, [uploadChunk]);

  const stopRecording = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    if (chunkBoundaryTimerRef.current) {
      clearTimeout(chunkBoundaryTimerRef.current);
      chunkBoundaryTimerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStage('finalizing');
    // Stop the recorder — its onstop handler will upload as the FINAL chunk.
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        // Replace onstop with the final-flag version.
        const stream = streamRef.current;
        if (stream) {
          mediaRecorderRef.current.onstop = null;
          const finalRecorder = mediaRecorderRef.current;
          const finalChunks: Blob[] = [];
          finalRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) finalChunks.push(e.data);
          };
          // Already attached — re-build a stop handler.
          finalRecorder.addEventListener('stop', async () => {
            const blob = new Blob(finalChunks, {
              type: finalRecorder.mimeType || 'audio/webm',
            });
            if (blob.size >= 100) {
              await uploadChunk(blob, true);
            }
            stream.getTracks().forEach((t) => t.stop());
          });
          finalRecorder.stop();
        } else {
          mediaRecorderRef.current.stop();
        }
      } catch {
        /* noop */
      }
    }
  }, [uploadChunk]);

  // 20-minute chunk boundary — stops current recorder (which fires upload),
  // starts a fresh one so the next 20 minutes become a separate chunk.
  // The self-reference is via a ref so the useCallback doesn't depend on itself.
  const scheduleChunkBoundaryRef = useRef<() => void>(() => undefined);
  const scheduleChunkBoundary = useCallback(() => {
    if (chunkBoundaryTimerRef.current) clearTimeout(chunkBoundaryTimerRef.current);
    chunkBoundaryTimerRef.current = setTimeout(() => {
      const stream = streamRef.current;
      if (!stream || isStoppingRef.current) return;
      // Stop current recorder — its onstop uploads as non-final.
      const current = mediaRecorderRef.current;
      if (current && current.state === 'recording') {
        try {
          current.stop();
        } catch {
          /* noop */
        }
      }
      // Start a fresh recorder for the next chunk.
      const next = buildRecorder(stream, false);
      mediaRecorderRef.current = next;
      next.start(1000);
      // Schedule the next boundary via the ref so we don't recurse into
      // the same useCallback identity (which would otherwise be flagged).
      scheduleChunkBoundaryRef.current();
    }, CHUNK_MS);
  }, [buildRecorder]);
  // Keep the ref pointing at the latest callback identity.
  useEffect(() => {
    scheduleChunkBoundaryRef.current = scheduleChunkBoundary;
  }, [scheduleChunkBoundary]);

  const startRecording = useCallback(async () => {
    if (!parent) return;
    if (!consentAcknowledged) {
      setErrorMsg('Please confirm consent before recording.');
      return;
    }
    setErrorMsg('');

    // 1. Create the meeting row first.
    try {
      const createRes = await fetch('/api/montree/admin/parent-meetings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          parent_id: parentId,
          child_id: selectedChildId || null,
          meeting_type: meetingType,
          status: 'held',
          locale,
          held_at: new Date().toISOString(),
        }),
      });
      if (!createRes.ok) {
        const body = await createRes.text().catch(() => '');
        setErrorMsg(`Create meeting failed: ${body.slice(0, 200)}`);
        setStage('error');
        return;
      }
      const createData = await createRes.json();
      if (createData.migration_pending) {
        setErrorMsg(
          'Meeting schema not yet migrated. Tredoux needs to run migrations 239-241 in Supabase.'
        );
        setStage('error');
        return;
      }
      setMeetingId(createData.meeting?.id ?? null);
      if (!createData.meeting?.id) {
        setErrorMsg('Meeting creation returned no id.');
        setStage('error');
        return;
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'unknown');
      setStage('error');
      return;
    }

    // 2. Open mic + start recorder.
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg(
          'Microphone API not available in this browser. Use Chrome or Safari.'
        );
        setStage('error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunkIndexRef.current = 0;
      setChunksUploaded(0);
      isStoppingRef.current = false;

      const recorder = buildRecorder(stream, false);
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setStage('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      scheduleChunkBoundary();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `Microphone permission denied: ${err.message}`
          : 'Microphone permission denied'
      );
      setStage('error');
    }
  }, [
    parent,
    consentAcknowledged,
    parentId,
    selectedChildId,
    meetingType,
    locale,
    buildRecorder,
    scheduleChunkBoundary,
  ]);

  const goAnalyse = useCallback(async () => {
    if (!meetingId) return;
    setStage('analysing');
    try {
      const res = await fetch(
        `/api/montree/admin/parent-meetings/${meetingId}/analyse`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        setErrorMsg(`Analysis failed: ${body.slice(0, 200)}`);
        setStage('error');
        return;
      }
      router.push(`/montree/admin/parents/${parentId}/meetings/${meetingId}/review`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'unknown');
      setStage('error');
    }
  }, [meetingId, parentId, router]);

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

      {/* Persistent recording banner */}
      {stage === 'recording' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: 'rgba(220,50,50,0.92)',
            color: 'white',
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            zIndex: 100,
          }}
        >
          <Circle
            size={10}
            fill="white"
            style={{ animation: 'm-blink 1s ease-in-out infinite' }}
          />
          Recording — {formatTime(elapsed)} · {chunksUploaded} chunk(s) uploaded · tap stop below to finish
        </div>
      )}
      {/* 🚨 Turbopack rejects nested <style jsx>. Inline via
          dangerouslySetInnerHTML — same runtime effect (global keyframe). */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes m-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`,
        }}
      />

      <header
        style={{
          position: 'relative',
          padding: '20px 24px',
          paddingTop: stage === 'recording' ? 56 : 20,
          borderBottom: '1px solid rgba(52,211,153,0.12)',
          zIndex: 1,
        }}
      >
        <Link
          href={`/montree/admin/parents/${parentId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: T.textSecondary,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          <ChevronLeft size={16} /> Back
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
        {stage === 'loading' && (
          <p style={{ textAlign: 'center', color: T.textSecondary, marginTop: 64 }}>
            Loading parent…
          </p>
        )}

        {stage === 'setup' && parent && (
          <>
            <h1
              style={{
                fontFamily: T.serif,
                fontSize: 28,
                margin: '8px 0 4px',
                color: T.textPrimary,
              }}
            >
              New meeting with {parent.parent_name || 'Parent'}
            </h1>
            <p style={{ color: T.textSecondary, fontSize: 14, marginBottom: 24 }}>
              {parent.child_names.length > 0
                ? `Children: ${parent.child_names.join(', ')}`
                : 'No children linked'}
            </p>

            <Section title="What kind of meeting?">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                {MEETING_TYPES.map((mt) => {
                  const on = meetingType === mt.key;
                  return (
                    <button
                      key={mt.key}
                      onClick={() => setMeetingType(mt.key)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 14px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: on
                          ? 'rgba(52,211,153,0.18)'
                          : 'rgba(255,255,255,0.03)',
                        border: on
                          ? '1px solid rgba(52,211,153,0.55)'
                          : '1px solid rgba(255,255,255,0.08)',
                        color: T.textPrimary,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{mt.label}</div>
                      <div style={{ fontSize: 12, color: T.textMuted }}>{mt.hint}</div>
                    </button>
                  );
                })}
              </div>
            </Section>

            {parent.child_ids.length > 1 && (
              <Section title="Which child is this about?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                  {parent.child_ids.map((cid, idx) => {
                    const on = selectedChildId === cid;
                    return (
                      <button
                        key={cid}
                        onClick={() => setSelectedChildId(cid)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 14px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: on
                            ? 'rgba(52,211,153,0.18)'
                            : 'rgba(255,255,255,0.03)',
                          border: on
                            ? '1px solid rgba(52,211,153,0.55)'
                            : '1px solid rgba(255,255,255,0.08)',
                          color: T.textPrimary,
                        }}
                      >
                        {parent.child_names[idx] || cid.slice(0, 8)}
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            <div
              style={{
                marginTop: 24,
                background: 'rgba(232,201,106,0.08)',
                border: '1px solid rgba(232,201,106,0.30)',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h3
                style={{
                  margin: '0 0 10px',
                  fontSize: 14,
                  color: 'rgba(232,201,106,0.92)',
                }}
              >
                Consent — required before recording
              </h3>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 13,
                  color: T.textSecondary,
                  lineHeight: 1.5,
                }}
              >
                Tell the parent: <em>&ldquo;I&apos;d like to record this meeting just so
                I can take proper notes afterwards. The audio is destroyed
                straight after — only the written notes are kept, and only I see
                them. Is that okay with you?&rdquo;</em>
              </p>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 12,
                  color: T.textMuted,
                  lineHeight: 1.5,
                }}
              >
                Recording someone without telling them is illegal in many
                jurisdictions and harms trust where it&apos;s legal. Audio is destroyed
                right after transcription; the text is encrypted at rest.
              </p>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: T.textPrimary,
                }}
              >
                <input
                  type="checkbox"
                  checked={consentAcknowledged}
                  onChange={(e) => setConsentAcknowledged(e.target.checked)}
                  style={{
                    marginTop: 2,
                    width: 18,
                    height: 18,
                    cursor: 'pointer',
                    accentColor: T.emerald,
                  }}
                />
                {parent.parent_name.split(' ')[0] || 'The parent'} has been informed and agreed.
              </label>
            </div>

            <button
              onClick={startRecording}
              disabled={!consentAcknowledged}
              style={{
                marginTop: 24,
                width: '100%',
                padding: '16px',
                background: consentAcknowledged
                  ? T.emerald
                  : 'rgba(255,255,255,0.08)',
                color: consentAcknowledged ? '#0a1a0f' : T.textMuted,
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: consentAcknowledged ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Mic size={20} />
              Start recording
            </button>

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
          </>
        )}

        {stage === 'recording' && parent && (
          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <div
              style={{
                fontFamily: T.serif,
                fontSize: 64,
                color: T.emerald,
                marginBottom: 16,
              }}
            >
              {formatTime(elapsed)}
            </div>
            <button
              onClick={stopRecording}
              style={{
                width: 128,
                height: 128,
                borderRadius: '50%',
                background: 'rgba(220,50,50,0.18)',
                border: '2px solid rgba(220,50,50,0.85)',
                cursor: 'pointer',
                color: 'rgba(255,200,200,0.95)',
                animation: 'm-pulse-rec 1.8s ease-in-out infinite',
              }}
              aria-label="Stop recording"
            >
              <Square size={48} />
            </button>
            {/* 🚨 Turbopack rejects nested <style jsx>. Inline via
                dangerouslySetInnerHTML — same runtime effect (global keyframe). */}
            <style
              dangerouslySetInnerHTML={{
                __html: `@keyframes m-pulse-rec { 0%, 100% { box-shadow: 0 0 0 0 rgba(220, 50, 50, 0.4); } 50% { box-shadow: 0 0 0 20px rgba(220, 50, 50, 0); } }`,
              }}
            />
            <p style={{ color: T.textMuted, fontSize: 13, marginTop: 16 }}>
              Tap to stop. Place the phone face-down on the table — it&apos;s still picking you up.
            </p>
          </div>
        )}

        {stage === 'finalizing' && (
          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <Spinner />
            <p style={{ color: T.textSecondary, fontSize: 15 }}>
              Uploading the last chunk and transcribing…
            </p>
          </div>
        )}

        {stage === 'done' && parent && transcriptId && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontFamily: T.serif, fontSize: 24, color: T.emerald }}>
              Recording complete
            </h2>
            <p style={{ color: T.textSecondary, fontSize: 14, marginTop: 8 }}>
              {chunksUploaded} chunk(s) transcribed. The audio has been destroyed; the transcript is encrypted at rest.
            </p>
            <button
              onClick={goAnalyse}
              style={{
                marginTop: 24,
                width: '100%',
                padding: '14px',
                background: T.emerald,
                color: '#0a1a0f',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Read meeting (Astra will analyse + propose profile updates)
            </button>
            <Link
              href={`/montree/admin/parents/${parentId}`}
              style={{
                marginTop: 12,
                display: 'block',
                textAlign: 'center',
                color: T.textMuted,
                fontSize: 13,
                textDecoration: 'underline',
              }}
            >
              Skip for now — analyse later
            </Link>
          </div>
        )}

        {stage === 'analysing' && (
          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <Spinner />
            <p style={{ color: T.textSecondary, fontSize: 15 }}>
              Astra is reading the meeting…
            </p>
            <p style={{ color: T.textMuted, fontSize: 13, marginTop: 8 }}>
              About 30-60 seconds. Worth the wait.
            </p>
          </div>
        )}

        {stage === 'error' && (
          <div style={{ marginTop: 48 }}>
            <h2
              style={{
                fontFamily: T.serif,
                fontSize: 22,
                color: 'rgba(255,180,180,0.92)',
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{ color: T.textSecondary, fontSize: 14, marginTop: 12 }}
            >
              {errorMsg || 'Unknown error.'}
            </p>
            <Link
              href={`/montree/admin/parents/${parentId}`}
              style={{
                marginTop: 16,
                display: 'inline-block',
                color: T.emerald,
                fontSize: 14,
                textDecoration: 'underline',
              }}
            >
              Back to parent
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function Spinner() {
  return (
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
    >
      {/* 🚨 Turbopack rejects nested <style jsx>. Inline via
          dangerouslySetInnerHTML — same runtime effect (global keyframe). */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes spin { to { transform: rotate(360deg); } }`,
        }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
