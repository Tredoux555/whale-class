'use client';

// Diary entry editor — distraction-free markdown editor with autosave-on-pause,
// a mood chip, an edit/preview toggle, a "Reflect" hand-off to the Coach, and
// delete. Handles both a fresh entry (id === 'new') and an existing one.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pget, ppost, ppatch, pdelete } from '@/lib/story/personal-client';
import { T, cardStyle } from '@/lib/story/personal-theme';
import Markdown from '@/components/story/personal/Markdown';

const MOODS = ['great', 'good', 'calm', 'tired', 'low', 'stressed', 'hard'];
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DiaryEditor() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const initialIsNew = params.id === 'new';

  const [currentId, setCurrentId] = useState<string | null>(initialIsNew ? null : params.id);
  const [entryDate, setEntryDate] = useState<string>(todayISO());
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(!initialIsNew);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [preview, setPreview] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  // Latest field values for the debounced saver (avoids stale closures).
  // Synced via effect (never mutate a ref during render).
  const latest = useRef({ entryDate, title, mood, body, currentId });
  useEffect(() => {
    latest.current = { entryDate, title, mood, body, currentId };
  });

  // New entry from the Planner may carry a preset ?date=YYYY-MM-DD. Seeding
  // from a client-only URL param after mount is a legitimate effect-time set
  // (keeps SSR/hydration agreeing on `today`, then adjusts once on the client).
  useEffect(() => {
    if (!initialIsNew || typeof window === 'undefined') return;
    const d = new URLSearchParams(window.location.search).get('date');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only URL seed
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setEntryDate(d);
  }, [initialIsNew]);

  // Load existing entry.
  useEffect(() => {
    if (initialIsNew) return;
    let cancelled = false;
    pget<{ entry: { entry_date: string; mood: string | null; title: string | null; body: string } }>(
      `/api/story/diary/${params.id}`,
    )
      .then((d) => {
        if (cancelled) return;
        setEntryDate(d.entry.entry_date);
        setMood(d.entry.mood);
        setTitle(d.entry.title || '');
        setBody(d.entry.body || '');
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof Error && /not found/i.test(e.message)) setNotFound(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [initialIsNew, params.id]);

  const doSave = useCallback(async (): Promise<string | null> => {
    const { entryDate: d, title: t, mood: m, body: b, currentId: id } = latest.current;
    if (!b.trim()) return id; // never save an empty entry
    setSaveState('saving');
    try {
      if (!id) {
        const res = await ppost<{ entry: { id: string } }>('/api/story/diary', {
          entry_date: d, title: t, mood: m, body: b,
        });
        const newId = res.entry.id;
        setCurrentId(newId);
        // Update the URL in place — no navigation/remount, so the editor
        // keeps its state and subsequent saves PATCH the real row.
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/story/admin/diary/${newId}`);
        }
        dirtyRef.current = false;
        setSaveState('saved');
        return newId;
      }
      await ppatch(`/api/story/diary/${id}`, { entry_date: d, title: t, mood: m, body: b });
      dirtyRef.current = false;
      setSaveState('saved');
      return id;
    } catch {
      setSaveState('error');
      return id;
    }
  }, []);

  // Autosave-on-pause: 1.2s after the last edit.
  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void doSave(); }, 1200);
  }, [doSave]);

  // Flush on unmount if there are pending edits.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current && latest.current.body.trim()) void doSave();
    };
  }, [doSave]);

  // Auto-grow the textarea.
  useEffect(() => {
    const ta = taRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.max(ta.scrollHeight, 320) + 'px';
    }
  }, [body, preview]);

  const onReflect = async () => {
    const id = await doSave();
    if (id) router.push(`/story/admin/coach?reflect=${id}`);
    else router.push('/story/admin/coach');
  };

  const onDelete = async () => {
    if (!currentId) { router.push('/story/admin/diary'); return; }
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    try {
      await pdelete(`/api/story/diary/${currentId}`);
      router.push('/story/admin/diary');
    } catch {
      setSaveState('error');
    }
  };

  if (loading) return <div style={{ color: T.textDim, fontSize: 14 }}>Loading…</div>;
  if (notFound) {
    return (
      <div style={{ color: T.textMid }}>
        <p>That entry doesn&apos;t exist.</p>
        <button onClick={() => router.push('/story/admin/diary')} style={linkBtn}>← Back to journal</button>
      </div>
    );
  }

  return (
    <div>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
        <button onClick={() => router.push('/story/admin/diary')} style={linkBtn}>← Journal</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: saveState === 'error' ? '#f87171' : T.textDim, minWidth: 56, textAlign: 'right' }}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : saveState === 'error' ? 'Save failed' : ''}
          </span>
          <button onClick={() => setPreview((p) => !p)} style={linkBtn}>{preview ? 'Edit' : 'Preview'}</button>
        </div>
      </div>

      {/* date + mood */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          type="date"
          value={entryDate}
          onChange={(e) => { setEntryDate(e.target.value); scheduleSave(); }}
          style={{
            background: 'transparent',
            border: `1px solid ${T.borderSoft}`,
            borderRadius: 9,
            color: T.textMid,
            fontFamily: T.sans,
            fontSize: 13,
            padding: '6px 10px',
            colorScheme: 'dark',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MOODS.map((mo) => {
            const active = mood === mo;
            return (
              <button
                key={mo}
                onClick={() => { setMood(active ? null : mo); scheduleSave(); }}
                style={{
                  appearance: 'none',
                  border: `1px solid ${active ? T.border : T.borderSoft}`,
                  background: active ? 'rgba(52,211,153,0.15)' : 'transparent',
                  color: active ? T.text : T.textDim,
                  fontFamily: T.sans,
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  padding: '5px 11px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {mo}
              </button>
            );
          })}
        </div>
      </div>

      {/* title */}
      <input
        value={title}
        onChange={(e) => { setTitle(e.target.value); scheduleSave(); }}
        placeholder="Title (optional)"
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: T.text,
          fontFamily: T.serif,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '-0.4px',
          marginBottom: 12,
        }}
      />

      {/* body: editor or preview */}
      {preview ? (
        <div style={{ ...cardStyle, padding: 20, minHeight: 320 }}>
          {body.trim() ? <Markdown text={body} /> : <span style={{ color: T.textDim }}>Nothing to preview yet.</span>}
        </div>
      ) : (
        <textarea
          ref={taRef}
          value={body}
          onChange={(e) => { setBody(e.target.value); scheduleSave(); }}
          placeholder="What's on your mind? Markdown welcome — # headings, **bold**, - lists."
          style={{
            width: '100%',
            minHeight: 320,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: T.text,
            fontFamily: T.sans,
            fontSize: 16,
            lineHeight: 1.75,
          }}
        />
      )}

      {/* actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
        <button onClick={onReflect} style={{
          appearance: 'none',
          border: `1px solid ${T.border}`,
          background: 'linear-gradient(135deg, rgba(232,201,106,0.18), rgba(232,201,106,0.06))',
          color: T.text,
          fontFamily: T.sans,
          fontSize: 13.5,
          fontWeight: 600,
          padding: '9px 16px',
          borderRadius: 11,
          cursor: 'pointer',
        }}>
          ✦ Reflect with Coach
        </button>
        <button onClick={onDelete} style={{ ...linkBtn, color: 'rgba(248,113,113,0.75)' }}>Delete</button>
      </div>
    </div>
  );
}

const linkBtn: CSSProperties = {
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  color: T.textDim,
  fontFamily: T.sans,
  fontSize: 13.5,
  fontWeight: 500,
  cursor: 'pointer',
  padding: 4,
};
