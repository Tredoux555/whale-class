'use client';

// components/montree/onboarding/TellGuruCard.tsx
// "Tell Guru about this child" — voice-first onboarding card
// Shows when a child has no mental profile. Teacher speaks freely,
// Whisper transcribes, Guru extracts structured profile + curriculum level.

import { useState, useRef, useCallback, useEffect } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

import type { GamePlan } from '@/components/montree/child/GamePlanCard';

interface Props {
  childId: string;
  childName: string;
  classroomId: string;
  onComplete: (gamePlan?: GamePlan) => void; // Called when profile is saved, optionally with game plan
}

type Stage = 'prompt' | 'recording' | 'transcribing' | 'processing' | 'done' | 'error';

export default function TellGuruCard({ childId, childName, classroomId, onComplete }: Props) {
  const { t, locale } = useI18n();
  const [stage, setStage] = useState<Stage>('prompt');
  const [transcript, setTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedSummary, setExtractedSummary] = useState('');
  const [gamePlan, setGamePlan] = useState<GamePlan | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('Microphone not available on this device');
        setStage('error');
        return;
      }

      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Mic timeout')), 10_000)
        ),
      ]);
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (chunks.length === 0) { setStage('prompt'); return; }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) { setStage('prompt'); return; }

        // Transcribe
        setStage('transcribing');
        try {
          const form = new FormData();
          form.append('audio', blob, 'recording.webm');
          const res = await fetch('/api/montree/voice-notes/transcribe', { method: 'POST', body: form });
          if (!res.ok) throw new Error('Transcription failed');
          const data = await res.json();
          if (!data.transcript || data.transcript.length < 5) {
            setErrorMsg(locale === 'zh' ? '没有检测到语音，请再试一次' : 'No speech detected. Please try again.');
            setStage('error');
            return;
          }
          setTranscript(data.transcript);
          setEditedTranscript(data.transcript);
          // Auto-process immediately
          await processTranscript(data.transcript);
        } catch (err) {
          console.error('[TellGuru] Transcription error:', err);
          setErrorMsg(locale === 'zh' ? '转录失败，请再试一次' : 'Transcription failed. Please try again.');
          setStage('error');
        }
      };

      recorder.start(1000);
      setStage('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      setErrorMsg(locale === 'zh' ? '无法访问麦克风' : 'Could not access microphone. Please check permissions.');
      setStage('error');
    }
  }, [locale]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const processTranscript = async (text: string) => {
    setStage('processing');
    try {
      const res = await montreeApi(`/api/montree/children/${childId}/onboard`, {
        method: 'POST',
        body: JSON.stringify({
          transcript: text,
          classroom_id: classroomId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Processing failed');
      }
      const data = await res.json();
      setExtractedSummary(data.summary || '');

      if (data.game_plan) {
        setGamePlan(data.game_plan);
      }

      setStage('done');
      // Longer delay so teacher can read the summary + see game plan note
      setTimeout(() => onComplete(data.game_plan ? (data.game_plan as GamePlan) : undefined), 3000);
    } catch (err) {
      console.error('[TellGuru] Processing error:', err);
      setErrorMsg(locale === 'zh' ? '处理失败，请再试一次' : 'Processing failed. Please try again.');
      setStage('error');
    }
  };

  const handleRetry = () => {
    setStage('prompt');
    setTranscript('');
    setEditedTranscript('');
    setErrorMsg('');
    setRecordingTime(0);
  };

  const handleSubmitEdited = async () => {
    if (!editedTranscript.trim()) return;
    setIsEditing(false);
    await processTranscript(editedTranscript.trim());
  };

  const firstName = childName.split(' ')[0];

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-5 shadow-sm">

      {/* ── Prompt stage ── */}
      {stage === 'prompt' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🌱</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {locale === 'zh' ? `告诉我关于${firstName}的情况` : `Tell me about ${firstName}`}
            </h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              {locale === 'zh'
                ? '按住录音按钮，告诉我这个孩子的情况——他们的经验、优势、个性，任何对我有帮助的信息。'
                : `Tap the mic and tell me about ${firstName} — their experience, strengths, personality, anything that helps me understand them.`
              }
            </p>
          </div>
          <button
            onClick={startRecording}
            className="w-20 h-20 mx-auto bg-emerald-500 hover:bg-emerald-600 active:scale-95 rounded-full flex items-center justify-center shadow-lg transition-all"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <p className="text-xs text-gray-400">
            {locale === 'zh' ? '点击开始录音' : 'Tap to start recording'}
          </p>

          {/* Also allow typing */}
          <button
            onClick={() => { setIsEditing(true); setStage('prompt'); }}
            className="text-xs text-emerald-600 underline"
          >
            {locale === 'zh' ? '或者打字输入' : 'or type instead'}
          </button>

          {/* Inline text input */}
          {isEditing && (
            <div className="mt-3 space-y-2">
              <textarea
                value={editedTranscript}
                onChange={e => setEditedTranscript(e.target.value)}
                placeholder={locale === 'zh'
                  ? `告诉我关于${firstName}的蒙特梭利经验、性格、优势...`
                  : `Tell me about ${firstName}'s Montessori experience, personality, strengths...`
                }
                className="w-full h-32 p-3 text-sm border border-emerald-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
                autoFocus
              />
              <button
                onClick={handleSubmitEdited}
                disabled={!editedTranscript.trim()}
                className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                {locale === 'zh' ? '提交' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Recording stage ── */}
      {stage === 'recording' && (
        <div className="text-center space-y-4">
          <div className="text-sm text-gray-500">
            {locale === 'zh' ? '正在录音...' : 'Recording...'}
          </div>
          <div className="text-4xl font-light text-emerald-600 tabular-nums">
            {formatTime(recordingTime)}
          </div>
          {/* Pulsing ring */}
          <button
            onClick={stopRecording}
            className="w-20 h-20 mx-auto bg-red-500 hover:bg-red-600 active:scale-95 rounded-full flex items-center justify-center shadow-lg transition-all animate-pulse"
          >
            <div className="w-8 h-8 bg-white rounded-sm" />
          </button>
          <p className="text-xs text-gray-400">
            {locale === 'zh' ? '点击停止' : 'Tap to stop'}
          </p>
          <p className="text-xs text-emerald-600 italic">
            {recordingTime < 10
              ? (locale === 'zh' ? '尽量详细地描述...' : 'Take your time, the more detail the better...')
              : recordingTime < 30
                ? (locale === 'zh' ? '很好，继续说...' : 'Great, keep going...')
                : (locale === 'zh' ? '非常详细！随时可以停止。' : 'Wonderful detail! Stop whenever you\'re ready.')
            }
          </p>
        </div>
      )}

      {/* ── Transcribing stage ── */}
      {stage === 'transcribing' && (
        <div className="text-center space-y-4 py-4">
          <div className="w-10 h-10 mx-auto border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">
            {locale === 'zh' ? '正在转录...' : 'Transcribing your voice...'}
          </p>
        </div>
      )}

      {/* ── Processing stage ── */}
      {stage === 'processing' && (
        <div className="text-center space-y-4 py-4">
          <div className="w-10 h-10 mx-auto border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">
            {locale === 'zh' ? `正在了解${firstName}...` : `Getting to know ${firstName}...`}
          </p>
          {transcript && (
            <p className="text-xs text-gray-400 max-w-sm mx-auto line-clamp-3 italic">
              &ldquo;{transcript}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* ── Done stage ── */}
      {stage === 'done' && (
        <div className="text-center space-y-3 py-2">
          <div className="w-14 h-14 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <h3 className="text-base font-bold text-gray-800">
            {locale === 'zh' ? `我已经了解${firstName}了！` : `I know ${firstName} now!`}
          </h3>
          {extractedSummary && (
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {extractedSummary}
            </p>
          )}
          {gamePlan && (
            <div className="mt-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-700 font-medium">
                🗺️ {locale === 'zh' ? '学习计划已生成' : 'Game plan ready'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {gamePlan.headline}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Error stage ── */}
      {stage === 'error' && (
        <div className="text-center space-y-3 py-2">
          <p className="text-sm text-red-600">{errorMsg}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium active:scale-95 transition-all"
          >
            {locale === 'zh' ? '再试一次' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
}
