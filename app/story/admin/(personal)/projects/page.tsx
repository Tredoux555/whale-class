'use client';

// Projects & Ambitions — simple cards (title / why / next action / priority)
// with add + inline edit + status + delete. Active first; done/dropped tuck
// into a collapsed section.

import { useEffect, useState, type CSSProperties } from 'react';
import { pget, ppost, ppatch, pdelete } from '@/lib/story/personal-client';
import { T, cardStyle } from '@/lib/story/personal-theme';

interface Project {
  id: string;
  title: string;
  why: string | null;
  next_action: string | null;
  status: string;
  priority: number | null;
  is_active: boolean;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: T.emerald },
  paused: { label: 'Paused', color: '#a78bfa' },
  done: { label: 'Done', color: '#60a5fa' },
  dropped: { label: 'Dropped', color: 'rgba(255,255,255,0.35)' },
};

interface FormState { title: string; why: string; next_action: string; priority: string }
const EMPTY_FORM: FormState = { title: '', why: '', next_action: '', priority: '' };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // 'new' | id | null
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const load = () =>
    pget<{ projects: Project[] }>('/api/story/projects')
      .then((d) => setProjects(d.projects || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load'));

  useEffect(() => { void load(); }, []);

  const openNew = () => { setForm(EMPTY_FORM); setEditing('new'); };
  const openEdit = (p: Project) => {
    setForm({
      title: p.title,
      why: p.why || '',
      next_action: p.next_action || '',
      priority: p.priority ? String(p.priority) : '',
    });
    setEditing(p.id);
  };
  const cancel = () => { setEditing(null); setForm(EMPTY_FORM); };

  const save = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      why: form.why.trim() || null,
      next_action: form.next_action.trim() || null,
      priority: form.priority ? Number(form.priority) : null,
    };
    try {
      if (editing === 'new') await ppost('/api/story/projects', payload);
      else if (editing) await ppatch(`/api/story/projects/${editing}`, payload);
      cancel();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (p: Project, status: string) => {
    try {
      await ppatch(`/api/story/projects/${p.id}`, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update');
    }
  };

  const remove = async (p: Project) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try {
      await pdelete(`/api/story/projects/${p.id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete');
    }
  };

  const live = (projects || []).filter((p) => p.is_active);
  const archived = (projects || []).filter((p) => !p.is_active);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.4px' }}>
          Projects &amp; Ambitions
        </h1>
        {editing === null && (
          <button onClick={openNew} style={primaryBtn}>+ Add</button>
        )}
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 14, marginBottom: 14 }}>{error}</div>}

      {editing !== null && (
        <div style={{ ...cardStyle, padding: 18, marginBottom: 18 }}>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="What is it?"
            autoFocus
            style={{ ...input, fontFamily: T.serif, fontSize: 18, fontWeight: 600, marginBottom: 10 }}
          />
          <textarea
            value={form.why}
            onChange={(e) => setForm({ ...form, why: e.target.value })}
            placeholder="Why does it matter? (optional)"
            rows={2}
            style={{ ...input, resize: 'vertical', marginBottom: 10 }}
          />
          <input
            value={form.next_action}
            onChange={(e) => setForm({ ...form, next_action: e.target.value })}
            placeholder="Next action (optional)"
            style={{ ...input, marginBottom: 10 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: T.textDim }}>Priority</label>
            <input
              type="number"
              min={1}
              max={9}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              placeholder="—"
              style={{ ...input, width: 70, padding: '7px 10px' }}
            />
            <span style={{ fontSize: 12, color: T.textDim }}>1 = highest</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={busy || !form.title.trim()} style={{ ...primaryBtn, opacity: busy || !form.title.trim() ? 0.5 : 1 }}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {projects === null && !error && <div style={{ color: T.textDim, fontSize: 14 }}>Loading…</div>}

      {projects !== null && live.length === 0 && editing === null && (
        <div style={{ ...cardStyle, padding: 26, textAlign: 'center', color: T.textMid, lineHeight: 1.7 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🎯</div>
          Nothing on the go. Add the few things that actually matter — and keep the list short.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {live.map((p) => (
          <ProjectCard key={p.id} p={p} onEdit={() => openEdit(p)} onStatus={(s) => setStatus(p, s)} onDelete={() => remove(p)} />
        ))}
      </div>

      {archived.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button onClick={() => setShowArchive((s) => !s)} style={{ ...ghostBtn, padding: '6px 0' }}>
            {showArchive ? '▾' : '▸'} Done &amp; dropped ({archived.length})
          </button>
          {showArchive && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12, opacity: 0.7 }}>
              {archived.map((p) => (
                <ProjectCard key={p.id} p={p} onEdit={() => openEdit(p)} onStatus={(s) => setStatus(p, s)} onDelete={() => remove(p)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  p, onEdit, onStatus, onDelete,
}: {
  p: Project;
  onEdit: () => void;
  onStatus: (status: string) => void;
  onDelete: () => void;
}) {
  const meta = STATUS_META[p.status] || STATUS_META.active;
  return (
    <div style={{ ...cardStyle, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {p.priority != null && (
          <span
            style={{
              flexShrink: 0,
              minWidth: 24,
              height: 24,
              borderRadius: 7,
              background: 'rgba(232,201,106,0.16)',
              color: T.gold,
              fontSize: 12.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            {p.priority}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: T.text }}>{p.title}</div>
          {p.why && <div style={{ fontSize: 13.5, color: T.textMid, marginTop: 4, lineHeight: 1.6 }}>{p.why}</div>}
          {p.next_action && (
            <div style={{ fontSize: 13.5, color: T.emerald, marginTop: 7 }}>→ {p.next_action}</div>
          )}
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            color: meta.color,
            border: `1px solid ${meta.color}55`,
            background: `${meta.color}14`,
            padding: '3px 9px',
            borderRadius: 999,
          }}
        >
          {meta.label}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={onEdit} style={miniBtn}>Edit</button>
        {p.status !== 'active' && <button onClick={() => onStatus('active')} style={miniBtn}>Activate</button>}
        {p.status === 'active' && <button onClick={() => onStatus('paused')} style={miniBtn}>Pause</button>}
        {p.status !== 'done' && <button onClick={() => onStatus('done')} style={miniBtn}>Done</button>}
        {p.status !== 'dropped' && <button onClick={() => onStatus('dropped')} style={miniBtn}>Drop</button>}
        <button onClick={onDelete} style={{ ...miniBtn, color: 'rgba(248,113,113,0.7)' }}>Delete</button>
      </div>
    </div>
  );
}

const input: CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${T.borderSoft}`,
  borderRadius: 10,
  outline: 'none',
  color: T.text,
  fontFamily: T.sans,
  fontSize: 15,
  padding: '9px 12px',
};
const primaryBtn: CSSProperties = {
  appearance: 'none',
  border: `1px solid ${T.border}`,
  background: 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(29,107,72,0.22))',
  color: T.text,
  fontFamily: T.sans,
  fontSize: 14,
  fontWeight: 600,
  padding: '9px 16px',
  borderRadius: 11,
  cursor: 'pointer',
};
const ghostBtn: CSSProperties = {
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  color: T.textDim,
  fontFamily: T.sans,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  padding: '9px 6px',
};
const miniBtn: CSSProperties = {
  appearance: 'none',
  border: `1px solid ${T.borderSoft}`,
  background: 'transparent',
  color: T.textMid,
  fontFamily: T.sans,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: 'pointer',
  padding: '5px 11px',
  borderRadius: 8,
};
