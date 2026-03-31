// components/montree/TeacherNotes.tsx
// Classroom-level teacher notes with voice recording
// NON-BLOCKING: Record → stop → immediately return to idle → transcribe in background
// Uses BackgroundTaskStore for lifecycle tracking + BackgroundTaskBanner for status display.
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import { toast } from 'sonner';
import {
  addTask,
  getTaskSignal,
  completeTask,
  failTask,
  deliverTranscript,
} from '@/lib/montree/background-task-store';

interface TeacherNotesProps {
  classroomId: string;
  teacherId: string;
  teacherName: string;
}

interface Note {
  id: string;
  teacher_id: string;
  teacher_name: string;
  content: string;
  transcription: string | null;
  created_at: string;
}

type MicState = 'idle' | 'recording';

export default function TeacherNotes({ classroomId, teacherId, teacherName }: TeacherNotesProps) {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Only two states: idle or recording. Transcription happens in background.
  const [micState, setMicState] = useState<MicState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await montreeApi(`/api/montree/teacher-notes?classroom_id=${classroomId}&limit=20`);
      const data = await res.json();
      if (res.ok) {
        setNotes(data.notes || []);
      }
    } catch {
      // Silent fail on fetch
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Cleanup on unmount: stop recording only (background tasks survive navigation)
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Fire-and-forget background transcription
  const processInBackground = useCallback((blob: Blob) => {
    // Register task in background store — returns immediately
    const taskId = addTask({
      type: 'voice_note',
      label: t('bgTask.transcribing'),
      childId: null as unknown as string, // classroom-level note, no child
      childName: undefined,
      onTranscript: (text: string) => {
        setContent(prev => prev ? `${prev}\n${text}` : text);
      },
      onComplete: null,
    });

    const signal = getTaskSignal(taskId);

    // Async processing — NOT awaited
    (async () => {
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        const res = await fetch('/api/montree/voice-notes/transcribe', {
          method: 'POST',
          body: formData,
          signal,
        });

        if (!res.ok) {
          let errorMessage = t('voiceNotes.transcribeError');
          try {
            const errorData = await res.json();
            if (errorData.code === 'MISSING_API_KEY') {
              errorMessage = t('voiceNotes.notConfigured');
            }
          } catch { /* ignore parse error */ }
          throw new Error(errorMessage);
        }

        const data = await res.json();
        const transcript = data.text || data.transcript;

        if (!transcript || transcript.length < 3) {
          failTask(taskId, t('voiceNotes.noSpeech'));
          return;
        }

        // Deliver transcript to textarea via callback stored in task
        deliverTranscript(taskId, transcript);

        completeTask(taskId, {
          message: `✓ ${t('teacherNotes.transcribed')}`,
        });
      } catch (err) {
        if (signal?.aborted) return; // Task was cancelled
        console.error('[teacher-notes] Background transcription error:', err);
        const errorMsg = err instanceof Error ? err.message : t('bgTask.voiceNoteFailed');
        failTask(taskId, errorMsg);
      }
    })();
  }, [t]);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        const chunks = chunksRef.current;
        chunksRef.current = [];

        if (chunks.length === 0) return;

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) return; // Too short — silent discard

        // Fire-and-forget: process in background, return mic to idle immediately
        processInBackground(blob);
      };

      recorder.start(1000);
      setMicState('recording');
    } catch {
      // Silent fail — mic permission denied or unavailable
    }
  }, [processInBackground]);

  // Stop recording → triggers onstop → fires processInBackground → returns to idle
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setMicState('idle'); // Return to idle IMMEDIATELY — no waiting
  }, []);

  const handleSave = useCallback(async () => {
    if (!content.trim() || saving) return;
    setSaving(true);

    try {
      const res = await montreeApi('/api/montree/teacher-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          content: content.trim(),
        }),
      });

      if (res.ok) {
        toast.success(t('teacherNotes.saved'));
        setContent('');
        fetchNotes();
      } else {
        const data = await res.json();
        toast.error(data.error || t('teacherNotes.saveFailed'));
      }
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setSaving(false);
    }
  }, [content, saving, classroomId, fetchNotes, t]);

  const handleDelete = useCallback(async (noteId: string) => {
    if (!confirm(t('teacherNotes.deleteConfirm'))) return;

    try {
      const res = await montreeApi(`/api/montree/teacher-notes?note_id=${noteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(t('teacherNotes.deleted'));
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch {
      toast.error(t('common.networkError'));
    }
  }, [t]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return t('time.hoursAgo', { count: diffHrs });
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
    return d.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Header — always visible, tap to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">📝</span>
          <span className="font-semibold text-gray-800">{t('teacherNotes.title')}</span>
          {notes.length > 0 && (
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {notes.length}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Input area */}
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('teacherNotes.placeholder')}
              className="w-full h-24 p-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-emerald-400 focus:outline-none resize-none"
              maxLength={5000}
            />
            <div className="flex items-center gap-2">
              {/* Voice record button — only idle or recording, transcription happens in background */}
              {micState === 'recording' ? (
                <button
                  onClick={stopRecording}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors animate-pulse"
                >
                  ⏹ {t('teacherNotes.recording')}
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  🎙️ {t('teacherNotes.record')}
                </button>
              )}

              <div className="flex-1" />

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!content.trim() || saving}
                className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? t('teacherNotes.saving') : t('teacherNotes.save')}
              </button>
            </div>
          </div>

          {/* Notes list */}
          {loading ? (
            <div className="text-center py-4 text-gray-400 text-sm">...</div>
          ) : notes.length === 0 ? (
            <p className="text-center py-4 text-gray-400 text-sm">{t('teacherNotes.empty')}</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{note.content}</p>
                    {note.teacher_id === teacherId && (
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="Delete"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-500">{note.teacher_name}</span>
                    <span>·</span>
                    <span>{formatTime(note.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
