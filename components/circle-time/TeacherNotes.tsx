'use client';

import React, { useState, useEffect } from 'react';

interface TeacherNote {
  id: string;
  week_number: number;
  year: number;
  teacher_name: string;
  note: string;
  created_at: string;
}

interface TeacherNotesProps {
  weekNumber: number;
  year?: number;
  currentTeacher?: string;
}

export default function TeacherNotes({ 
  weekNumber, 
  year = new Date().getFullYear(),
  currentTeacher 
}: TeacherNotesProps) {
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, [weekNumber, year]);

  async function fetchNotes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher-notes/list?weekNumber=${weekNumber}&year=${year}`);
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
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch('/api/teacher-notes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekNumber,
          year,
          teacherName: currentTeacher,
          note: newNote.trim()
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setNotes(prev => [data.note, ...prev]);
        setNewNote('');
      } else {
        setError(data.error || 'Failed to save note');
      }
    } catch (err) {
      setError('Failed to save note');
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return;
    
    try {
      const res = await fetch(`/api/teacher-notes/delete?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        setNotes(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Teacher colors for visual distinction
  const teacherColors: Record<string, string> = {
    'Jasmine': 'bg-pink-100 border-pink-300',
    'Ivan': 'bg-blue-100 border-blue-300',
    'John': 'bg-green-100 border-green-300',
    'Richard': 'bg-purple-100 border-purple-300',
    'Liza': 'bg-yellow-100 border-yellow-300',
    'Michael': 'bg-orange-100 border-orange-300',
    'Tredoux': 'bg-cyan-100 border-cyan-300',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
        📝 Teacher Notes Board
        <span className="text-sm font-normal text-gray-500">
          ({notes.length} notes)
        </span>
      </h3>

      {/* Add Note Area */}
      {currentTeacher ? (
        <div className="mb-4">
          <div className="flex gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={`Add a note as ${currentTeacher}...`}
              className="flex-1 p-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
              rows={2}
            />
            <button
              onClick={addNote}
              disabled={!newNote.trim() || saving}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {saving ? '...' : '+ Add'}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
          )}
        </div>
      ) : (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
          Login as a teacher to add notes
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="text-center py-4 text-gray-400">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-sm">
          No notes for this week yet
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notes.map((note) => (
            <div 
              key={note.id} 
              className={`p-3 rounded-lg border-l-4 ${teacherColors[note.teacher_name] || 'bg-gray-100 border-gray-300'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{note.teacher_name}</span>
                    <span className="text-xs text-gray-400">
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {note.note}
                  </p>
                </div>
                {currentTeacher === note.teacher_name && (
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1 text-gray-400 hover:text-red-500 ml-2"
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
