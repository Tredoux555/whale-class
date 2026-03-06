'use client';

// components/montree/voice-notes/ChildVoiceNote.tsx
// Voice note recorder + accumulated notes list for child week view
// Tap mic → record → Whisper transcribe → Haiku extract → auto-update progress

import { useState, useRef, useCallback, useEffect } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface VoiceNoteData {
  id: string;
  work_name: string | null;
  area: string | null;
  proposed_status: string | null;
  behavioral_notes: string | null;
  next_steps: string | null;
  auto_applied: boolean;
  created_at: string;
  transcript: string;
}

interface ExtractionPreview {
  child_name: string;
  work_name: string | null;
  area: string | null;
  proposed_status: string | null;
  status_confidence: number;
  work_match_confidence: number;
  behavioral_notes: string | null;
  next_steps: string | null;
  auto_applied: boolean;
}

interface Props {
  childId: string;
  onNoteCreated?: () => void;
}

type RecordingState = 'idle' | 'recording' | 'transcribing' | 'extracting' | 'done' | 'error';

const AREA_COLORS: Record<string, string> = {
  practical_life: '#10B981',
  sensorial: '#F59E0B',
  mathematics: '#6366F1',
  language: '#EC4899',
  cultural: '#8B5CF6',
};

const AREA_LABELS: Record<string, string> = {
  practical_life: 'PL',
  sensorial: 'S',
  mathematics: 'M',
  language: 'L',
  cultural: 'C',
};

const STATUS_EMOJI: Record<string, string> = {
  presented: '📋',
  practicing: '🔄',
  mastered: '⭐',
};

export default function ChildVoiceNote({ childId, onNoteCreated }: Props) {
  const { t, locale } = useI18n();

  const [state, setState] = useState<RecordingState>('idle');
  const [extraction, setExtraction] = useState<ExtractionPreview | null>(null);
  const [notes, setNotes] = useState<VoiceNoteData[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load existing notes for this child this week
  const loadNotes = useCallback(async () => {
    try {
      const res = await montreeApi(`/api/montree/voice-notes?child_id=${childId}`);
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes || []);
      }
    } catch {
      // Silent fail on load
    }
  }, [childId]);

  useEffect(() => {
    loadNotes();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadNotes]);

  // Start recording
  const startRecording = useCallback(async () => {
    setErrorMsg('');
    setExtraction(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Detect supported MIME type
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

      recorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        // Process the recording
        processRecording();
      };

      recorder.start(1000); // Collect data every second
      setState('recording');
    } catch (err) {
      console.error('[voice-note] Mic access error:', err);
      setErrorMsg(t('voiceNotes.micError'));
      setState('error');
    }
  }, [t]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Process: transcribe → extract → save
  const processRecording = useCallback(async () => {
    const chunks = chunksRef.current;
    if (chunks.length === 0) {
      setState('idle');
      return;
    }

    const blob = new Blob(chunks, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
    if (blob.size < 100) {
      setErrorMsg(t('voiceNotes.tooShort'));
      setState('error');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Step 1: Transcribe via Whisper
      setState('transcribing');
      const transcribeForm = new FormData();
      transcribeForm.append('audio', blob, 'recording.webm');

      const transcribeRes = await fetch('/api/montree/voice-notes/transcribe', {
        method: 'POST',
        body: transcribeForm,
        signal: controller.signal,
      });

      if (!transcribeRes.ok) {
        throw new Error('Transcription failed');
      }

      const transcribeData = await transcribeRes.json();
      const transcript = transcribeData.transcript;

      if (!transcript || transcript.length < 3) {
        setErrorMsg(t('voiceNotes.noSpeech'));
        setState('error');
        return;
      }

      // Step 2: Extract + save via voice notes API
      setState('extracting');
      const extractRes = await montreeApi('/api/montree/voice-notes', {
        method: 'POST',
        body: JSON.stringify({
          child_id: childId,
          transcript,
          audio_duration: transcribeData.duration_seconds || 0,
          language: transcribeData.language || 'auto',
        }),
        signal: controller.signal,
      });

      if (!extractRes.ok) {
        throw new Error('Extraction failed');
      }

      const extractData = await extractRes.json();

      if (extractData.success) {
        setExtraction(
          extractData.extraction
            ? { ...extractData.extraction, auto_applied: extractData.auto_applied }
            : null
        );
        setState('done');
        loadNotes();
        onNoteCreated?.();

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setState('idle');
          setExtraction(null);
        }, 5000);
      } else {
        throw new Error(extractData.error || 'Unknown error');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('[voice-note] Process error:', err);
      setErrorMsg(t('voiceNotes.processingError'));
      setState('error');
    }
  }, [childId, loadNotes, onNoteCreated, t]);

  // Toggle recording
  const handleToggle = useCallback(() => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle' || state === 'error' || state === 'done') {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  const isProcessing = state === 'transcribing' || state === 'extracting';

  return (
    <div className="mb-4">
      {/* Record button + status */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={isProcessing}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full transition-all
            ${state === 'recording' ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30' : ''}
            ${isProcessing ? 'bg-gray-300 cursor-wait' : ''}
            ${state === 'idle' || state === 'done' || state === 'error' ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-95' : ''}
          `}
          aria-label={state === 'recording' ? t('voiceNotes.stopRecording') : t('voiceNotes.startRecording')}
        >
          {state === 'recording' ? (
            <span className="text-white text-lg">⏹</span>
          ) : isProcessing ? (
            <span className="text-white text-sm animate-spin">⏳</span>
          ) : (
            <span className="text-white text-lg">🎙️</span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {state === 'idle' && (
            <p className="text-sm text-gray-500">{t('voiceNotes.tapToRecord')}</p>
          )}
          {state === 'recording' && (
            <p className="text-sm text-red-600 font-medium animate-pulse">
              {t('voiceNotes.recording')}
            </p>
          )}
          {state === 'transcribing' && (
            <p className="text-sm text-blue-600">{t('voiceNotes.transcribing')}</p>
          )}
          {state === 'extracting' && (
            <p className="text-sm text-purple-600">{t('voiceNotes.extracting')}</p>
          )}
          {state === 'error' && (
            <p className="text-sm text-red-600">{errorMsg || t('voiceNotes.error')}</p>
          )}
          {state === 'done' && extraction && (
            <div className="text-sm">
              <span className="font-medium text-emerald-700">✓ {t('voiceNotes.saved')}</span>
              {extraction.work_name && (
                <span className="ml-2">
                  {extraction.area && (
                    <span
                      className="inline-block w-4 h-4 rounded-full mr-1 align-middle"
                      style={{ backgroundColor: AREA_COLORS[extraction.area] || '#999' }}
                      title={extraction.area}
                    />
                  )}
                  {extraction.work_name}
                  {extraction.proposed_status && (
                    <span className="ml-1">
                      → {STATUS_EMOJI[extraction.proposed_status] || ''} {extraction.proposed_status}
                    </span>
                  )}
                </span>
              )}
              {extraction.auto_applied && (
                <span className="ml-1 text-xs text-emerald-600">
                  ({t('voiceNotes.autoApplied')})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Notes count badge */}
        {notes.length > 0 && (
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-600 hover:bg-gray-200"
          >
            <span>📝</span>
            <span>{notes.length}</span>
          </button>
        )}
      </div>

      {/* Accumulated notes list */}
      {showNotes && notes.length > 0 && (
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 text-xs"
            >
              {note.area && (
                <span
                  className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold mt-0.5"
                  style={{ backgroundColor: AREA_COLORS[note.area] || '#999' }}
                >
                  {AREA_LABELS[note.area] || '?'}
                </span>
              )}
              <div className="flex-1 min-w-0">
                {note.work_name && (
                  <span className="font-medium text-gray-800">
                    {note.work_name}
                    {note.proposed_status && (
                      <span className="ml-1 text-gray-500">
                        {STATUS_EMOJI[note.proposed_status] || ''}
                      </span>
                    )}
                  </span>
                )}
                {note.behavioral_notes && (
                  <p className="text-gray-600 mt-0.5 line-clamp-2">{note.behavioral_notes}</p>
                )}
              </div>
              <span className="flex-shrink-0 text-gray-400">
                {new Date(note.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
