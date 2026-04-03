// components/montree/TeacherNotes.tsx
// Classroom-level teacher notes — always visible at top of dashboard
// Features: text notes, edit/delete, voice recording with auto-transcribe + auto-save
// NON-BLOCKING: Record → stop → immediately return to idle → transcribe in background → auto-save
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

interface Child {
  id: string;
  name: string;
}

interface TeacherNotesProps {
  classroomId: string;
  teacherId: string;
  teacherName: string;
  children?: Child[];
}

interface Note {
  id: string;
  teacher_id: string;
  teacher_name: string;
  child_id: string | null;
  child_name: string | null;
  content: string;
  transcription: string | null;
  created_at: string;
}

type MicState = 'idle' | 'recording';

export default function TeacherNotes({ classroomId, teacherId, teacherName, children = [] }: TeacherNotesProps) {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Edit state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);

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

  // Auto-save a voice note directly to the API (called after transcription completes)
  const autoSaveVoiceNote = useCallback(async (transcript: string) => {
    try {
      const res = await montreeApi('/api/montree/teacher-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          content: transcript.trim(),
          transcription: transcript.trim(),
          child_id: selectedChildId || null,
        }),
      });

      if (res.ok) {
        // Refresh notes list to show the new auto-saved note
        fetchNotes();
      } else {
        console.error('[teacher-notes] Auto-save failed:', res.status);
        // On failure, put the transcript in the textarea so teacher can manually save
        setContent(prev => prev ? `${prev}\n${transcript}` : transcript);
        toast.error(t('teacherNotes.autoSaveFailed'));
      }
    } catch (err) {
      console.error('[teacher-notes] Auto-save error:', err);
      setContent(prev => prev ? `${prev}\n${transcript}` : transcript);
      toast.error(t('teacherNotes.autoSaveFailed'));
    }
  }, [classroomId, selectedChildId, fetchNotes, t]);

  // Fire-and-forget background transcription + auto-save
  const processInBackground = useCallback((blob: Blob) => {
    // Register task in background store — returns immediately
    const taskId = addTask({
      type: 'voice_note',
      label: t('bgTask.transcribing'),
      childId: null as unknown as string, // classroom-level note, no child
      childName: undefined,
      onTranscript: null, // We handle transcript delivery ourselves via auto-save
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

        // Auto-save the transcribed note
        await autoSaveVoiceNote(transcript);

        completeTask(taskId, {
          message: `✓ ${t('teacherNotes.voiceNoteSaved')}`,
        });
      } catch (err) {
        if (signal?.aborted) return; // Task was cancelled
        console.error('[teacher-notes] Background transcription error:', err);
        const errorMsg = err instanceof Error ? err.message : t('bgTask.voiceNoteFailed');
        failTask(taskId, errorMsg);
      }
    })();
  }, [t, autoSaveVoiceNote]);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error(t('teacherNotes.micNotSupported'));
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
      toast.error(t('teacherNotes.micNotSupported'));
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
          child_id: selectedChildId || null,
        }),
      });

      if (res.ok) {
        toast.success(t('teacherNotes.saved'));
        setContent('');
        setSelectedChildId(null);
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

  // Edit handlers
  const handleStartEdit = useCallback((note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null);
    setEditContent('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingNoteId || !editContent.trim() || editSaving) return;
    setEditSaving(true);

    try {
      const res = await montreeApi('/api/montree/teacher-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: editingNoteId,
          content: editContent.trim(),
        }),
      });

      if (res.ok) {
        toast.success(t('teacherNotes.updated'));
        // Update the note in local state without refetching
        setNotes(prev => prev.map(n =>
          n.id === editingNoteId ? { ...n, content: editContent.trim() } : n
        ));
        setEditingNoteId(null);
        setEditContent('');
      } else {
        const data = await res.json();
        toast.error(data.error || t('teacherNotes.updateFailed'));
      }
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setEditSaving(false);
    }
  }, [editingNoteId, editContent, editSaving, t]);

  const handleDelete = useCallback(async (noteId: string) => {
    if (!confirm(t('teacherNotes.deleteConfirm'))) return;

    try {
      const res = await montreeApi(`/api/montree/teacher-notes?note_id=${noteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(t('teacherNotes.deleted'));
        setNotes(prev => prev.filter(n => n.id !== noteId));
        // Clear edit state if deleting the note being edited
        if (editingNoteId === noteId) {
          setEditingNoteId(null);
          setEditContent('');
        }
      } else {
        toast.error(t('teacherNotes.saveFailed'));
      }
    } catch {
      toast.error(t('common.networkError'));
    }
  }, [t, editingNoteId]);

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header — prominent, always visible */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">📝</span>
        <span className="font-semibold text-gray-800 text-sm">{t('teacherNotes.title')}</span>
        {notes.length > 0 && (
          <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {notes.length}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Child selector — pill row */}
        {children.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedChildId(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedChildId === null
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              📋 {t('teacherNotes.classNote')}
            </button>
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedChildId === child.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {/* Input area — compact inline row */}
        <div className="flex items-center gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={selectedChildId
              ? t('teacherNotes.childNotePlaceholder', { name: children.find(c => c.id === selectedChildId)?.name || '' })
              : t('teacherNotes.placeholder')
            }
            className="flex-1 h-10 min-h-[40px] max-h-24 p-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-emerald-400 focus:outline-none resize-y"
            maxLength={5000}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
            }}
          />

          {/* Voice record button */}
          {micState === 'recording' ? (
            <button
              onClick={stopRecording}
              className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors animate-pulse flex-shrink-0"
            >
              ⏹ {t('teacherNotes.stop')}
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors flex-shrink-0"
              title={t('teacherNotes.recordVoice')}
            >
              🎙️
            </button>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {saving ? '...' : t('teacherNotes.save')}
          </button>
        </div>

        {/* Notes list */}
        {loading ? (
          <div className="text-center py-2 text-gray-400 text-sm">...</div>
        ) : notes.length === 0 ? (
          <p className="text-center py-2 text-gray-400 text-xs">{t('teacherNotes.empty')}</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notes.map((note) => (
              <div key={note.id} className="bg-gray-50 rounded-lg p-3 group">
                {editingNoteId === note.id ? (
                  /* Edit mode */
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2.5 border border-emerald-300 rounded-lg text-sm text-gray-800 focus:border-emerald-400 focus:outline-none resize-y min-h-[60px]"
                      maxLength={5000}
                      autoFocus
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editContent.trim() || editSaving}
                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {editSaving ? '...' : t('common.save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{note.content}</p>
                      {note.teacher_id === teacherId && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => handleStartEdit(note)}
                            className="text-gray-400 hover:text-emerald-500 text-xs p-1"
                            title={t('common.edit')}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="text-gray-400 hover:text-red-400 text-xs p-1"
                            title={t('common.delete')}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      <span className="font-medium text-gray-500">{note.teacher_name}</span>
                      <span>·</span>
                      <span>{formatTime(note.created_at)}</span>
                      {note.child_name ? (
                        <>
                          <span>·</span>
                          <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                            👶 {note.child_name}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>·</span>
                          <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">
                            📋 {t('teacherNotes.classNote')}
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
