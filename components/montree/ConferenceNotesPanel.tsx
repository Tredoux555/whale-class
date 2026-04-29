'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  NotebookPen, ChevronDown, Plus, Pencil, Send, Trash2, Undo2, RotateCcw, Check,
} from 'lucide-react';
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

interface ChildOption {
  id: string;
  name: string;
}

// Dark forest tokens
const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 16,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  blue: '#60a5fa',
  blueStrong: 'rgba(96,165,250,0.18)',
  blueSoft: 'rgba(96,165,250,0.08)',
  blueBorder: 'rgba(96,165,250,0.30)',
  orange: '#fb923c',
  orangeStrong: 'rgba(251,146,60,0.18)',
  orangeSoft: 'rgba(251,146,60,0.08)',
  orangeBorder: 'rgba(251,146,60,0.30)',
  red: '#f87171',
  redStrong: 'rgba(239,68,68,0.18)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: 'rgba(52,211,153,0.20)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const STATUS_CONFIG = {
  draft: {
    bg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.10)',
    badgeBg: 'rgba(255,255,255,0.08)',
    badgeBorder: 'rgba(255,255,255,0.16)',
    text: T.textSecondary,
    dot: 'rgba(255,255,255,0.45)',
  },
  shared: {
    bg: T.blueSoft,
    border: T.blueBorder,
    badgeBg: T.blueStrong,
    badgeBorder: 'rgba(96,165,250,0.40)',
    text: T.blue,
    dot: T.blue,
  },
  retracted: {
    bg: T.orangeSoft,
    border: T.orangeBorder,
    badgeBg: T.orangeStrong,
    badgeBorder: 'rgba(251,146,60,0.40)',
    text: T.orange,
    dot: T.orange,
  },
} as const;

export default function ConferenceNotesPanel() {
  const { t } = useI18n();
  const [notes, setNotes] = useState<ConferenceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

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
      <div style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        padding: 14,
        animation: 'cn-pulse 1.6s ease-in-out infinite',
      }}>
        <div style={{ height: 16, width: 160, borderRadius: 6, background: 'rgba(52,211,153,0.10)', marginBottom: 8 }} />
        <div style={{ height: 28, width: '100%', borderRadius: 8, background: 'rgba(52,211,153,0.08)' }} />
        <style>{`@keyframes cn-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </div>
    );
  }

  const draftCount = notes.filter(n => n.status === 'draft').length;
  const sharedCount = notes.filter(n => n.status === 'shared').length;

  return (
    <div
      id="panel-conference_notes"
      style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        overflow: 'hidden',
        fontFamily: T.sans,
        color: T.textPrimary,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('conferenceNotes.title')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: T.textPrimary,
          transition: 'background 140ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.06)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            background: T.blueStrong,
            border: `1px solid ${T.blueBorder}`,
            color: T.blue,
          }}>
            <NotebookPen size={16} strokeWidth={1.75} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: 15,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('conferenceNotes.title')}
            </div>
            <div style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
              marginTop: 1,
            }}>
              {notes.length === 0
                ? t('conferenceNotes.empty')
                : t('conferenceNotes.summary').replace('{total}', String(notes.length)).replace('{drafts}', String(draftCount))
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {draftCount > 0 && (
            <span style={pillStyle(T.textSecondary, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.12)')}>
              <Pencil size={9} strokeWidth={1.75} />
              {draftCount}
            </span>
          )}
          {sharedCount > 0 && (
            <span style={pillStyle(T.blue, T.blueStrong, 'rgba(96,165,250,0.40)')}>
              <Check size={9} strokeWidth={2.5} />
              {sharedCount}
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={1.75}
            color={T.textMuted}
            style={{
              marginLeft: 2,
              transition: 'transform 200ms ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div style={{
          padding: '12px 16px 14px',
          borderTop: T.cardBorder,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* Add note button */}
          {!showCreate && (
            <button
              onClick={() => {
                setShowCreate(true);
                if (children.length === 0) fetchChildren(selectedChildId);
              }}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px',
                borderRadius: 12,
                background: T.emeraldSoft,
                border: `1px dashed ${T.emerald}`,
                color: T.emerald,
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <Plus size={13} strokeWidth={2} />
              {t('conferenceNotes.addNote')}
            </button>
          )}

          {/* Create form */}
          {showCreate && (
            <div style={{
              padding: 12,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <select
                value={selectedChildId}
                onChange={e => setSelectedChildId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: T.inputBg,
                  border: `1px solid ${T.inputBorder}`,
                  color: T.textPrimary,
                  fontFamily: T.sans,
                  fontSize: 13,
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.40)' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  paddingRight: 30,
                }}
              >
                {children.length === 0 && (
                  <option value="" style={{ background: '#0a1a0f' }}>{t('common.loading')}</option>
                )}
                {children.map(child => (
                  <option key={child.id} value={child.id} style={{ background: '#0a1a0f' }}>{child.name}</option>
                ))}
              </select>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={t('conferenceNotes.placeholder')}
                maxLength={5000}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: T.inputBg,
                  border: `1px solid ${T.inputBorder}`,
                  color: T.textPrimary,
                  fontFamily: T.sans,
                  fontSize: 13,
                  lineHeight: 1.55,
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowCreate(false); setNoteText(''); }}
                  style={{
                    padding: '6px 12px',
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
                  onClick={handleCreate}
                  disabled={creating || !noteText.trim() || !selectedChildId}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: 'linear-gradient(180deg, #34d399, #10b981)',
                    border: '1px solid rgba(52,211,153,0.55)',
                    color: '#06281a',
                    fontFamily: T.sans,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: (creating || !noteText.trim() || !selectedChildId) ? 'not-allowed' : 'pointer',
                    opacity: (creating || !noteText.trim() || !selectedChildId) ? 0.55 : 1,
                  }}
                >
                  <Check size={11} strokeWidth={2.5} />
                  {creating ? '...' : t('common.save')}
                </button>
              </div>
            </div>
          )}

          {/* Notes list */}
          {notes.length === 0 && !showCreate && (
            <div style={{
              textAlign: 'center',
              padding: '20px 0',
              fontFamily: T.sans,
              fontSize: 12,
              color: T.textMuted,
            }}>
              {t('conferenceNotes.empty')}
            </div>
          )}

          {notes.map(note => {
            const cfg = STATUS_CONFIG[note.status];
            const isEditing = editingId === note.id;

            return (
              <div
                key={note.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: cfg.dot, flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: T.sans,
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.textPrimary,
                    }}>
                      {note.child_name}
                    </span>
                    <span style={{
                      fontFamily: T.sans,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.3,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: cfg.badgeBg,
                      border: `1px solid ${cfg.badgeBorder}`,
                      color: cfg.text,
                    }}>
                      {t(`conferenceNotes.status.${note.status}`)}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: T.sans,
                    fontSize: 10,
                    color: T.textMuted,
                  }}>
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      maxLength={5000}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: T.inputBg,
                        border: `1px solid ${T.inputBorder}`,
                        color: T.textPrimary,
                        fontFamily: T.sans,
                        fontSize: 13,
                        lineHeight: 1.55,
                        outline: 'none',
                        resize: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 7,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          color: T.textSecondary,
                          fontFamily: T.sans,
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={() => handleAction(note.id, 'edit', editText)}
                        disabled={actionId === note.id || !editText.trim()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '4px 10px',
                          borderRadius: 7,
                          background: 'linear-gradient(180deg, #34d399, #10b981)',
                          border: '1px solid rgba(52,211,153,0.55)',
                          color: '#06281a',
                          fontFamily: T.sans,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: (actionId === note.id || !editText.trim()) ? 'not-allowed' : 'pointer',
                          opacity: (actionId === note.id || !editText.trim()) ? 0.55 : 1,
                        }}
                      >
                        <Check size={10} strokeWidth={2.5} />
                        {actionId === note.id ? '...' : t('common.save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{
                    margin: 0,
                    fontFamily: T.sans,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: T.textSecondary,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {note.note_text}
                  </p>
                )}

                {!isEditing && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    paddingTop: 4,
                  }}>
                    <span style={{
                      flex: 1,
                      fontFamily: T.sans,
                      fontSize: 10,
                      color: T.textMuted,
                    }}>
                      {t('conferenceNotes.by').replace('{name}', note.created_by_name)}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {note.status === 'draft' && (
                        <>
                          <ActionBtn
                            onClick={() => { setEditingId(note.id); setEditText(note.note_text); }}
                            label={t('common.edit')}
                            color={T.textSecondary}
                            Icon={Pencil}
                          />
                          <ActionBtn
                            onClick={() => handleAction(note.id, 'share')}
                            disabled={actionId === note.id}
                            label={actionId === note.id ? '...' : t('conferenceNotes.share')}
                            color={T.blue}
                            Icon={Send}
                          />
                          <ActionBtn
                            onClick={() => handleDelete(note.id)}
                            disabled={actionId === note.id}
                            label={actionId === note.id ? '...' : t('common.delete')}
                            color={T.red}
                            Icon={Trash2}
                          />
                        </>
                      )}
                      {note.status === 'shared' && (
                        <ActionBtn
                          onClick={() => handleAction(note.id, 'retract')}
                          disabled={actionId === note.id}
                          label={actionId === note.id ? '...' : t('conferenceNotes.retract')}
                          color={T.orange}
                          Icon={Undo2}
                        />
                      )}
                      {note.status === 'retracted' && (
                        <ActionBtn
                          onClick={() => handleAction(note.id, 'unretract')}
                          disabled={actionId === note.id}
                          label={actionId === note.id ? '...' : t('conferenceNotes.unretract')}
                          color={T.textSecondary}
                          Icon={RotateCcw}
                        />
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

function pillStyle(color: string, bg: string, border: string) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: '"Inter", sans-serif',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 9px',
    borderRadius: 999,
    background: bg,
    border: `1px solid ${border}`,
    color,
    letterSpacing: 0.3,
  } as const;
}

function ActionBtn({ onClick, disabled, label, color, Icon }: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  color: string;
  Icon: typeof Pencil;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '4px 8px',
        borderRadius: 7,
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.10)',
        color,
        fontFamily: '"Inter", sans-serif',
        fontSize: 11,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 120ms ease',
      }}
    >
      <Icon size={10} strokeWidth={1.75} />
      {label}
    </button>
  );
}
