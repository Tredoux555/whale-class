// components/montree/TeacherNotes.tsx
// Classroom-level teacher notes — always visible at top of dashboard
// Features: text notes, edit/delete, voice recording with auto-transcribe + auto-save
// NON-BLOCKING: Record → stop → immediately return to idle → transcribe in background → auto-save
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';
import {
  NotebookPen, Mic, Square, Check, Pencil,
  Tag, Users, Trash2,
} from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import { toast } from 'sonner';
import {
  addTask,
  getTaskSignal,
  completeTask,
  failTask,
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

// Dark forest tokens
const T = {
  card: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.09)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  divider: 'rgba(52,211,153,0.10)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.45)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  textPlaceholder: 'rgba(255,255,255,0.35)',
  inputBg: 'rgba(0,0,0,0.25)',
  inputBorder: 'rgba(52,211,153,0.18)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '9px 14px',
  borderRadius: 10,
  background: 'linear-gradient(180deg, #34d399, #10b981)',
  border: '1px solid rgba(52,211,153,0.55)',
  color: '#06281a',
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.1,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
  transition: 'transform 120ms ease, box-shadow 120ms ease',
};

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
        fetchNotes();
      } else {
        console.error('[teacher-notes] Auto-save failed:', res.status);
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
    const taskId = addTask({
      type: 'voice_note',
      label: t('bgTask.transcribing'),
      childId: null as unknown as string,
      childName: undefined,
      onTranscript: null,
      onComplete: null,
    });

    const signal = getTaskSignal(taskId);

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

        await autoSaveVoiceNote(transcript);

        completeTask(taskId, {
          message: `✓ ${t('teacherNotes.voiceNoteSaved')}`,
        });
      } catch (err) {
        if (signal?.aborted) return;
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
        if (blob.size < 100) return;

        processInBackground(blob);
      };

      recorder.start(1000);
      setMicState('recording');
    } catch {
      toast.error(t('teacherNotes.micNotSupported'));
    }
  }, [processInBackground, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setMicState('idle');
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
  }, [content, saving, classroomId, selectedChildId, fetchNotes, t]);

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

  const recording = micState === 'recording';
  const selectedChildName = selectedChildId
    ? children.find(c => c.id === selectedChildId)?.name || ''
    : '';

  return (
    <div style={{
      background: T.card,
      border: T.cardBorder,
      borderRadius: T.cardRadius,
      backdropFilter: T.blur,
      WebkitBackdropFilter: T.blur,
      overflow: 'hidden',
      fontFamily: T.sans,
    }}>
      <style>{`
        .mt-pulse-ring {
          position: absolute; inset: -4px;
          border-radius: 14px;
          border: 1px solid rgba(239,68,68,0.55);
          animation: mt-pulse 1.4s ease-out infinite;
          pointer-events: none;
        }
        @keyframes mt-pulse {
          0%   { transform: scale(0.9); opacity: 0.9; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .mt-notes-list::-webkit-scrollbar { width: 8px; }
        .mt-notes-list::-webkit-scrollbar-track { background: transparent; }
        .mt-notes-list::-webkit-scrollbar-thumb { background: rgba(52,211,153,0.18); border-radius: 4px; }
        .mt-notes-textarea::placeholder, .mt-notes-input::placeholder { color: rgba(255,255,255,0.35); }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: T.cardBorder,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <NotebookPen size={16} strokeWidth={1.75} color={T.emerald} />
        <span style={{
          fontFamily: T.serif,
          fontSize: 16,
          fontWeight: 500,
          color: T.textPrimary,
          letterSpacing: -0.1,
          flex: 1,
        }}>
          {t('teacherNotes.title')}
        </span>
        {notes.length > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: 999,
            background: T.emeraldStrong,
            border: '1px solid rgba(52,211,153,0.30)',
            color: T.emerald,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
          }}>
            {notes.length}
          </span>
        )}
      </div>

      <div style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        {/* Child selector — pill row */}
        {children.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => setSelectedChildId(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 999,
                background: selectedChildId === null ? T.emerald : 'rgba(255,255,255,0.06)',
                border: `1px solid ${selectedChildId === null ? 'rgba(52,211,153,0.65)' : 'rgba(255,255,255,0.10)'}`,
                color: selectedChildId === null ? '#06281a' : T.textSecondary,
                fontFamily: T.sans,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 120ms ease',
              }}
            >
              <Users size={11} strokeWidth={1.75} />
              {t('teacherNotes.classNote')}
            </button>
            {children.map((child) => {
              const active = selectedChildId === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: active ? T.emerald : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${active ? 'rgba(52,211,153,0.65)' : 'rgba(255,255,255,0.10)'}`,
                    color: active ? '#06281a' : T.textSecondary,
                    fontFamily: T.sans,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 120ms ease',
                  }}
                >
                  {child.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Input row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <textarea
            className="mt-notes-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={selectedChildId
              ? t('teacherNotes.childNotePlaceholder', { name: selectedChildName })
              : t('teacherNotes.placeholder')
            }
            maxLength={5000}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
            }}
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              padding: '11px 14px',
              borderRadius: 12,
              background: T.inputBg,
              border: `1px solid ${T.inputBorder}`,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 13,
              lineHeight: 1.5,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />

          {/* Voice button */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={recording ? stopRecording : startRecording}
              aria-label={recording ? t('teacherNotes.stop') : t('teacherNotes.recordVoice')}
              title={recording ? t('teacherNotes.stop') : t('teacherNotes.recordVoice')}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 44,
                borderRadius: 12,
                background: recording ? T.redSoft : 'rgba(255,255,255,0.06)',
                border: `1px solid ${recording ? T.redBorder : 'rgba(255,255,255,0.12)'}`,
                color: recording ? T.red : T.textPrimary,
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {recording
                ? <Square size={15} strokeWidth={2} fill="currentColor" />
                : <Mic size={16} strokeWidth={1.75} />}
              {recording && <span className="mt-pulse-ring" />}
            </button>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            style={{
              ...ctaStyle,
              height: 44,
              padding: '0 16px',
              opacity: (!content.trim() || saving) ? 0.45 : 1,
              cursor: (!content.trim() || saving) ? 'not-allowed' : 'pointer',
            }}
          >
            <Check size={14} strokeWidth={2.25} />
            {saving ? '...' : t('teacherNotes.save')}
          </button>
        </div>

        {/* Notes list */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '14px 0',
            color: T.textMuted,
            fontSize: 13,
          }}>
            ...
          </div>
        ) : notes.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '24px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: T.card,
              border: T.cardBorder,
            }}>
              <NotebookPen size={20} strokeWidth={1.75} color={T.textMuted} />
            </div>
            <p style={{
              margin: 0,
              fontFamily: T.sans,
              fontSize: 13,
              color: T.textMuted,
            }}>
              {t('teacherNotes.empty')}
            </p>
          </div>
        ) : (
          <div
            className="mt-notes-list"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 360,
              overflowY: 'auto',
              paddingRight: 4,
              marginRight: -4,
            }}
          >
            {notes.map((note) => {
              const editing = editingNoteId === note.id;
              const ownsNote = note.teacher_id === teacherId;
              return (
                <div
                  key={note.id}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    padding: '12px 14px',
                  }}
                >
                  {editing ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}>
                      <textarea
                        className="mt-notes-textarea"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        autoFocus
                        rows={3}
                        maxLength={5000}
                        style={{
                          width: '100%',
                          minHeight: 60,
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: T.inputBg,
                          border: `1px solid rgba(52,211,153,0.30)`,
                          color: T.textPrimary,
                          fontFamily: T.sans,
                          fontSize: 13,
                          lineHeight: 1.5,
                          outline: 'none',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 8,
                      }}>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            color: T.textSecondary,
                            fontFamily: T.sans,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editContent.trim() || editSaving}
                          style={{
                            ...ctaStyle,
                            padding: '7px 14px',
                            fontSize: 12,
                            opacity: (!editContent.trim() || editSaving) ? 0.45 : 1,
                            cursor: (!editContent.trim() || editSaving) ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Check size={12} strokeWidth={2.5} />
                          {editSaving ? '...' : t('common.save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}>
                        <p style={{
                          margin: 0,
                          flex: 1,
                          fontFamily: T.sans,
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: T.textPrimary,
                          whiteSpace: 'pre-wrap',
                        }}>
                          {note.content}
                        </p>
                        {ownsNote && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            flexShrink: 0,
                          }}>
                            <button
                              onClick={() => handleStartEdit(note)}
                              aria-label={t('common.edit')}
                              title={t('common.edit')}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.10)',
                                color: T.textMuted,
                                cursor: 'pointer',
                                transition: 'all 120ms ease',
                              }}
                            >
                              <Pencil size={12} strokeWidth={1.75} />
                            </button>
                            <button
                              onClick={() => handleDelete(note.id)}
                              aria-label={t('common.delete')}
                              title={t('common.delete')}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.10)',
                                color: T.textMuted,
                                cursor: 'pointer',
                                transition: 'all 120ms ease',
                              }}
                            >
                              <Trash2 size={12} strokeWidth={1.75} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{
                        marginTop: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        fontFamily: T.sans,
                        fontSize: 11,
                        color: T.textMuted,
                      }}>
                        <span style={{
                          fontWeight: 600,
                          color: T.textSecondary,
                          letterSpacing: 0.2,
                        }}>
                          {note.teacher_name}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.20)' }}>·</span>
                        <span>{formatTime(note.created_at)}</span>
                        <span style={{ color: 'rgba(255,255,255,0.20)' }}>·</span>
                        {note.child_name ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 999,
                            background: T.amberSoft,
                            border: `1px solid ${T.amberBorder}`,
                            color: T.amber,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: 0.3,
                          }}>
                            <Tag size={10} strokeWidth={1.75} />
                            {note.child_name}
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 999,
                            background: T.emeraldStrong,
                            border: '1px solid rgba(52,211,153,0.30)',
                            color: T.emerald,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: 0.3,
                          }}>
                            <Users size={10} strokeWidth={1.75} />
                            {t('teacherNotes.classNote')}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
