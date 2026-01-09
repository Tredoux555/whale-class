'use client';

import React, { useState, useEffect } from 'react';

interface TeacherNote {
  id: string;
  teacher_name: string;
  note_text: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  is_resolved: boolean;
  week_number: number | null;
  created_at: string;
}

interface TeacherNotesBoardProps {
  weekNumber?: number;
  currentTeacher?: string;
}

const PRIORITY_COLORS = {
  low: 'bg-gray-100 border-gray-300 text-gray-700',
  normal: 'bg-blue-50 border-blue-300 text-blue-700',
  high: 'bg-orange-50 border-orange-400 text-orange-700',
  urgent: 'bg-red-50 border-red-500 text-red-700',
};

const PRIORITY_ICONS = {
  low: '💬',
  normal: '📝',
  high: '⚠️',
  urgent: '🚨',
};

export default function TeacherNotesBoard({ weekNumber, currentTeacher }: TeacherNotesBoardProps) {
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [newPriority, setNewPriority] = useState<TeacherNote['priority']>('normal');
  const [submitting, setSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [weekNumber, showResolved]);

  async function fetchNotes() {
    setLoading(true);
    try {
      let url = '/api/teacher-notes/list';
      const params = new URLSearchParams();
      if (weekNumber) params.set('weekNumber', weekNumber.toString());
      if (!showResolved) params.set('activeOnly', 'true');
      if (params.toString()) url += '?' + params.toString();

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    if (!newNote.trim() || !currentTeacher) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/teacher-notes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_name: currentTeacher,
          note_text: newNote.trim(),
          priority: newPriority,
          week_number: weekNumber || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotes(prev => [data.note, ...prev]);
        setNewNote('');
        setNewPriority('normal');
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePin(id: string, currentPinned: boolean) {
    try {
      const res = await fetch('/api/teacher-notes/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_pinned: !currentPinned }),
      });
      const data = await res.json();
      if (data.success) {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, is_pinned: !currentPinned } : n));
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  }

  async function toggleResolved(id: string, currentResolved: boolean) {
    try {
      const res = await fetch('/api/teacher-notes/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_resolved: !currentResolved }),
      });
      const data = await res.json();
      if (data.success) {
        if (!showResolved && !currentResolved) {
          // Remove from list if we're hiding resolved and marking as resolved
          setNotes(prev => prev.filter(n => n.id !== id));
        } else {
          setNotes(prev => prev.map(n => n.id === id ? { ...n, is_resolved: !currentResolved } : n));
        }
      }
    } catch (err) {
      console.error('Failed to toggle resolved:', err);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/teacher-notes/delete?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setNotes(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }

  // Sort: pinned first, then by date
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const pinnedNotes = sortedNotes.filter(n => n.is_pinned);
  const regularNotes = sortedNotes.filter(n => !n.is_pinned);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          📋 Teacher Notes Board
          {weekNumber && <span className="text-sm font-normal text-gray-500">(Week {weekNumber})</span>}
        </h3>
        <label className="flex items-center gap-2 text-sm text-gray-500">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded"
          />
          Show resolved
        </label>
      </div>

      {/* Add Note Form */}
      {currentTeacher && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note for the team..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addNote()}
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TeacherNote['priority'])}
              className="px-2 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="low">💬 Low</option>
              <option value="normal">📝 Normal</option>
              <option value="high">⚠️ High</option>
              <option value="urgent">🚨 Urgent</option>
            </select>
            <button
              onClick={addNote}
              disabled={submitting || !newNote.trim()}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm font-medium"
            >
              {submitting ? '...' : 'Add'}
            </button>
          </div>
          <p className="text-xs text-gray-500">Posting as: <strong>{currentTeacher}</strong></p>
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="text-center py-4 text-gray-400">Loading notes...</div>
      ) : sortedNotes.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <span className="text-3xl mb-2 block">📝</span>
          <p className="text-sm">No notes yet. Add one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pinned Section */}
          {pinnedNotes.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                📌 Pinned
              </div>
              <div className="space-y-2">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    currentTeacher={currentTeacher}
                    onTogglePin={togglePin}
                    onToggleResolved={toggleResolved}
                    onDelete={deleteNote}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular Notes */}
          {regularNotes.length > 0 && (
            <div className="space-y-2">
              {pinnedNotes.length > 0 && (
                <div className="text-xs font-medium text-gray-500 mb-2">Other Notes</div>
              )}
              {regularNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  currentTeacher={currentTeacher}
                  onTogglePin={togglePin}
                  onToggleResolved={toggleResolved}
                  onDelete={deleteNote}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  currentTeacher,
  onTogglePin,
  onToggleResolved,
  onDelete,
}: {
  note: TeacherNote;
  currentTeacher?: string;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleResolved: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const timeAgo = getTimeAgo(note.created_at);
  const isOwner = currentTeacher === note.teacher_name;

  return (
    <div
      className={`p-3 rounded-lg border-l-4 ${PRIORITY_COLORS[note.priority]} ${
        note.is_resolved ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{note.teacher_name}</span>
            <span className="text-xs text-gray-400">{timeAgo}</span>
            <span className="text-sm">{PRIORITY_ICONS[note.priority]}</span>
            {note.is_pinned && <span className="text-xs">📌</span>}
            {note.is_resolved && <span className="text-xs text-green-600">✅</span>}
          </div>
          <p className={`text-sm ${note.is_resolved ? 'line-through text-gray-500' : ''}`}>
            {note.note_text}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTogglePin(note.id, note.is_pinned)}
            className="p-1 hover:bg-white/50 rounded text-xs"
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            {note.is_pinned ? '📌' : '📍'}
          </button>
          <button
            onClick={() => onToggleResolved(note.id, note.is_resolved)}
            className="p-1 hover:bg-white/50 rounded text-xs"
            title={note.is_resolved ? 'Mark active' : 'Mark resolved'}
          >
            {note.is_resolved ? '↩️' : '✅'}
          </button>
          {isOwner && (
            <button
              onClick={() => onDelete(note.id)}
              className="p-1 hover:bg-red-100 rounded text-xs text-red-500"
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
