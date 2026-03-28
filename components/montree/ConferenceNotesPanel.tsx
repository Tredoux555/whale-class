'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

interface ConferenceNote {
  id: string;
  child_id: string;
  child_name: string;
  note_text: string;
  status: 'draft' | 'shared' | 'retracted';
  created_by: string;
  created_by_name: string;
  shared_at: string | null;
  retracted_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG = {
  draft: { color: 'bg-gray-50', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  shared: { color: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  retracted: { color: 'bg-orange-50', badge: 'bg-orange-100 text-orange-600', dot: 'bg-orange-400' },
} as const;

interface ChildOption {
  id: string;
  name: string;
}

export default function ConferenceNotesPanel() {
  const { t } = useI18n();
  const [notes, setNotes] = useState<ConferenceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Action in progress
  const [actionId, setActionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const childrenAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const actionRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchNotes = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/intelligence/conference-notes');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) {
          setLoading(false);
          toast.error(t('conferenceNotes.fetchFailed'));
        }
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      setNotes(json.notes || []);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[ConferenceNotes] Fetch error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [t]);

  const fetchChildren = useCallback(async (currentSelectedChildId: string) => {
    childrenAbortRef.current?.abort();
    const controller = new AbortController();
    childrenAbortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/children');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) return;
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      const kids = (json.children || json || []).map((c: { id: string; name: string }) => ({
        id: c.id,
        name: c.name,
      }));
      setChildren(kids);
      if (kids.length > 0 && !currentSelectedChildId) {
        setSelectedChildId(kids[0].id);
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[ConferenceNotes] Children fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    return () => {
      abortRef.current?.abort();
      childrenAbortRef.current?.abort();
    };
  }, [fetchNotes]);

  const handleCreate = useCallback(async () => {
    if (!selectedChildId || !noteText.trim() || creating) return;
    setCreating(true);
    try {
      const res = await montreeApi('/api/montree/intelligence/conference-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: selectedChildId, note_text: noteText.trim() }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        toast.success(t('conferenceNotes.created'));
        setNoteText('');
        setShowCreate(false);
        fetchNotes();
      } else {
        toast.error(t('conferenceNotes.createFailed'));
      }
    } catch (err) {
      console.error('[ConferenceNotes] Create error:', err);
      if (mountedRef.current) toast.error(t('conferenceNotes.createFailed'));
    } finally {
      if (mountedRef.current) setCreating(false);
    }
  }, [selectedChildId, noteText, creating, t, fetchNotes]);

  const handleAction = useCallback(async (noteId: string, action: string, text?: string) => {
    // Use ref for stale-closure-safe guard
    if (actionRef.current) return;
    actionRef.current = noteId;
    setActionId(noteId);
    try {
      const body: Record<string, string> = { note_id: noteId, action };
      if (text) body.note_text = text;

      const res = await montreeApi('/api/montree/intelligence/conference-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        if (action === 'edit') toast.success(t('conferenceNotes.saved'));
        else if (action === 'share') toast.success(t('conferenceNotes.shared'));
        else if (action === 'retract') toast.success(t('conferenceNotes.retracted'));
        else if (action === 'unretract') toast.success(t('conferenceNotes.unretracted'));
        setEditingId(null);
        fetchNotes();
      } else {
        toast.error(t('conferenceNotes.actionFailed'));
      }
    } catch (err) {
      console.error('[ConferenceNotes] Action error:', err);
      if (mountedRef.current) toast.error(t('conferenceNotes.actionFailed'));
    } finally {
      actionRef.current = null;
      if (mountedRef.current) setActionId(null);
    }
  }, [t, fetchNotes]);

  const handleDelete = useCallback(async (noteId: string) => {
    // Use ref for stale-closure-safe guard
    if (actionRef.current) return;
    actionRef.current = noteId;
    setActionId(noteId);
    try {
      const res = await montreeApi(`/api/montree/intelligence/conference-notes?note_id=${noteId}`, {
        method: 'DELETE',
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        toast.success(t('conferenceNotes.deleted'));
      } else {
        toast.error(t('conferenceNotes.deleteFailed'));
      }
    } catch (err) {
      console.error('[ConferenceNotes] Delete error:', err);
      if (mountedRef.current) toast.error(t('conferenceNotes.deleteFailed'));
    } finally {
      actionRef.current = null;
      if (mountedRef.current) setActionId(null);
    }
  }, [t]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-48 mb-2" />
        <div className="h-8 bg-gray-50 rounded w-full" />
      </div>
    );
  }

  const draftCount = notes.filter(n => n.status === 'draft').length;
  const sharedCount = notes.filter(n => n.status === 'shared').length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Summary bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('conferenceNotes.title')}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📋</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-700">
              {t('conferenceNotes.title')}
            </div>
            <div className="text-xs text-gray-500">
              {notes.length === 0
                ? t('conferenceNotes.empty')
                : t('conferenceNotes.summary')
                    .replace('{total}', String(notes.length))
                    .replace('{drafts}', String(draftCount))
              }
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {draftCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              {draftCount} ✏️
            </span>
          )}
          {sharedCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              {sharedCount} ✅
            </span>
          )}
          <span className={`text-gray-400 transition-transform duration-200 text-xs ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Add new note button */}
          {!showCreate && (
            <button
              onClick={() => {
                setShowCreate(true);
                if (children.length === 0) fetchChildren(selectedChildId);
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-2 rounded-lg transition-colors border border-dashed border-blue-200"
            >
              + {t('conferenceNotes.addNote')}
            </button>
          )}

          {/* Create form */}
          {showCreate && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
              <select
                value={selectedChildId}
                onChange={e => setSelectedChildId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              >
                {children.length === 0 && (
                  <option value="">{t('common.loading')}</option>
                )}
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={t('conferenceNotes.placeholder')}
                maxLength={5000}
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowCreate(false); setNoteText(''); }}
                  className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !noteText.trim() || !selectedChildId}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? '...' : t('common.save')}
                </button>
              </div>
            </div>
          )}

          {/* Notes list */}
          {notes.length === 0 && !showCreate && (
            <div className="text-center text-xs text-gray-400 py-4">
              {t('conferenceNotes.empty')}
            </div>
          )}

          {notes.map(note => {
            const config = STATUS_CONFIG[note.status];
            const isEditing = editingId === note.id;

            return (
              <div key={note.id} className={`${config.color} rounded-lg p-3 space-y-2`}>
                {/* Header: child name + status badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                    <span className="text-sm font-medium text-gray-700">{note.child_name}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${config.badge}`}>
                      {t(`conferenceNotes.status.${note.status}`)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Note text or edit textarea */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      maxLength={5000}
                      rows={3}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={() => handleAction(note.id, 'edit', editText)}
                        disabled={actionId === note.id || !editText.trim()}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {actionId === note.id ? '...' : t('common.save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.note_text}</p>
                )}

                {/* Action buttons */}
                {!isEditing && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-gray-400 flex-1">
                      {t('conferenceNotes.by').replace('{name}', note.created_by_name)}
                    </span>
                    <div className="flex gap-1">
                      {note.status === 'draft' && (
                        <>
                          <button
                            onClick={() => { setEditingId(note.id); setEditText(note.note_text); }}
                            className="text-[11px] px-2 py-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleAction(note.id, 'share')}
                            disabled={actionId === note.id}
                            className="text-[11px] px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                          >
                            {actionId === note.id ? '...' : t('conferenceNotes.share')}
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            disabled={actionId === note.id}
                            className="text-[11px] px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          >
                            {actionId === note.id ? '...' : t('common.delete')}
                          </button>
                        </>
                      )}
                      {note.status === 'shared' && (
                        <button
                          onClick={() => handleAction(note.id, 'retract')}
                          disabled={actionId === note.id}
                          className="text-[11px] px-2 py-1 text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
                        >
                          {actionId === note.id ? '...' : t('conferenceNotes.retract')}
                        </button>
                      )}
                      {note.status === 'retracted' && (
                        <button
                          onClick={() => handleAction(note.id, 'unretract')}
                          disabled={actionId === note.id}
                          className="text-[11px] px-2 py-1 text-gray-500 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                        >
                          {actionId === note.id ? '...' : t('conferenceNotes.unretract')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
