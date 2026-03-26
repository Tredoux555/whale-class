// components/montree/TeacherNotes.tsx
// Classroom-level teacher notes with voice recording
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import { toast } from 'sonner';

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

export default function TeacherNotes({ classroomId, teacherId, teacherName }: TeacherNotesProps) {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
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

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Mounted ref to prevent state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // CRITICAL FIX: navigator.mediaDevices is undefined on HTTP pages or unsupported browsers
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error(t('teacherNotes.micNotSupported'));
        return;
      }

      // CRITICAL FIX: getUserMedia can hang indefinitely on permission denial — add 10s timeout
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Microphone permission timeout')), 10_000)
        ),
      ]);
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Release mic
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) return;

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        // Guard: component may have unmounted while recording
        if (!mountedRef.current) return;

        // Transcribe via existing Whisper endpoint
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');

          // CRITICAL FIX: Whisper transcription can hang — add 30s timeout via AbortController
          const transcribeAbort = new AbortController();
          const transcribeTimeout = setTimeout(() => transcribeAbort.abort(), 30_000);
          const res = await montreeApi('/api/montree/voice-notes/transcribe', {
            method: 'POST',
            body: formData,
            signal: transcribeAbort.signal,
          });
          clearTimeout(transcribeTimeout);

          if (!mountedRef.current) return;

          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              setContent(prev => prev ? `${prev}\n${data.text}` : data.text);
            }
          } else {
            toast.error(t('common.error'));
          }
        } catch {
          if (mountedRef.current) toast.error(t('common.error'));
        } finally {
          if (mountedRef.current) setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // 1s chunks
      setIsRecording(true);
    } catch {
      toast.error(t('common.error'));
    }
  }, [t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
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
              {/* Voice record button */}
              {isTranscribing ? (
                <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium animate-pulse">
                  {t('teacherNotes.transcribing')}
                </span>
              ) : isRecording ? (
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
