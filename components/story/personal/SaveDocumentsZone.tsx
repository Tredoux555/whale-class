'use client';

// SaveDocumentsZone — the "Save to my documents" surface.
//
// DELIBERATELY SEPARATE from the composer's context-attach (📎/📄/📁 at the
// bottom of the coach): different location (a panel near the top), different
// label ("Save to my documents"), different icon (🗂️). The two intents — "let
// the coach read this for THIS message" vs "save this into my document library"
// — never share a drop target.
//
// Flow: drop / pick files OR a folder → each file is extracted INDIVIDUALLY
// (never zipped, never combined) → a preview list (editable title, doc_type,
// tags; remove per item) → "Save N documents" → one batch POST to
// /api/story/coach/documents → N rows in story_coach_documents.

import { useRef, useState } from 'react';
import { T } from '@/lib/story/personal-theme';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import {
  filesFromDataTransfer,
  extractFilesIndividually,
  type ExtractedFileDoc,
} from '@/lib/story/coach/file-attach';

const DOC_TYPES = ['design', 'brief', 'spec', 'export', 'doc'] as const;

interface PreviewItem {
  key: string;
  filename: string;
  title: string;
  doc_type: string;
  tags: string;   // comma-separated, edited as text; split on save
  content: string;
  chars: number;
}

type Phase = 'idle' | 'reading' | 'preview' | 'saving';

let keySeq = 0;

export default function SaveDocumentsZone() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const folderRef = useRef<HTMLInputElement | null>(null);
  const dragDepth = useRef(0);

  const reading = phase === 'reading';
  const saving = phase === 'saving';

  // Extract a dropped/picked set → preview items (one per valid file).
  const ingest = async (files: File[]) => {
    if (!files.length) return;
    setError('');
    setNotice('');
    const token = getStoryAdminToken();
    if (!token) { setError('Please sign in again to save documents.'); return; }
    setPhase('reading');
    try {
      const { docs, skipped, errors } = await extractFilesIndividually(files, token);
      if (!docs.length) {
        setPhase(items.length ? 'preview' : 'idle');
        setError(
          errors.length
            ? `Couldn’t read those: ${errors[0].error}`
            : 'No readable documents there (HTML, Markdown, text, or PDF).',
        );
        return;
      }
      const next: PreviewItem[] = docs.map((d: ExtractedFileDoc) => ({
        key: `d${keySeq++}`,
        filename: d.filename,
        title: d.title,
        doc_type: d.doc_type,
        tags: '',
        content: d.content,
        chars: d.chars,
      }));
      // Append to any existing preview so multiple drops accumulate.
      setItems((prev) => [...prev, ...next]);
      setPhase('preview');
      const noteBits: string[] = [`${next.length} ready`];
      if (skipped.length) noteBits.push(`${skipped.length} skipped`);
      if (errors.length) noteBits.push(`${errors.length} unreadable`);
      setNotice(noteBits.join(' · '));
    } catch (e) {
      setPhase(items.length ? 'preview' : 'idle');
      setError(e instanceof Error ? e.message : 'Could not read those files.');
    }
  };

  // stopPropagation on every drag handler is load-bearing: this zone lives inside
  // the coach page, whose root carries the composer's context-attach drop handlers.
  // Without it, a drop here would ALSO trigger the composer attach — exactly the
  // "two intents must never share a drop target" rule. stopPropagation seals it.
  const onDrop = async (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    if (reading || saving) return;
    const all = await filesFromDataTransfer(e.dataTransfer);
    await ingest(all);
  };
  const onDragEnter = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault(); e.stopPropagation(); dragDepth.current += 1; setDragOver(true);
  };
  const onDragOver = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault(); e.stopPropagation();
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await ingest(files);
  };

  const patch = (key: string, field: 'title' | 'doc_type' | 'tags', value: string) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  const removeItem = (key: string) => setItems((prev) => prev.filter((it) => it.key !== key));

  const save = async () => {
    const ready = items.filter((it) => it.title.trim() && it.content.trim());
    if (!ready.length) { setError('Nothing to save — add a title.'); return; }
    const token = getStoryAdminToken();
    if (!token) { setError('Please sign in again to save documents.'); return; }
    setError('');
    setPhase('saving');
    try {
      const res = await fetch('/api/story/coach/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: ready.map((it) => ({
            title: it.title.trim(),
            content: it.content,
            doc_type: it.doc_type,
            tags: it.tags.split(',').map((t) => t.trim()).filter(Boolean),
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { saved?: number; failed?: number; error?: string }
        | null;
      if (!res.ok) {
        setPhase('preview');
        setError(data?.error || 'Could not save those documents.');
        return;
      }
      const saved = data?.saved ?? 0;
      const failed = data?.failed ?? 0;
      setItems([]);
      setPhase('idle');
      setNotice(`Saved ${saved} document${saved === 1 ? '' : 's'} to your library${failed ? ` · ${failed} failed` : ''}.`);
    } catch {
      setPhase('preview');
      setError('Could not reach the server. Try again.');
    }
  };

  const slimBtn: React.CSSProperties = {
    appearance: 'none', border: `1px solid ${T.borderSoft}`, background: 'rgba(255,255,255,0.04)',
    color: T.textMid, borderRadius: 12, padding: '9px 13px', fontSize: 13.5, cursor: 'pointer',
    fontFamily: T.sans, display: 'inline-flex', alignItems: 'center', gap: 8,
  };
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.borderSoft}`, borderRadius: 9,
    color: T.text, fontFamily: T.sans, fontSize: 13.5, padding: '7px 10px', outline: 'none', boxSizing: 'border-box',
  };

  // Collapsed: a single distinct entry point, well clear of the composer.
  if (!open) {
    return (
      <div style={{ padding: '2px 0 12px' }}>
        <button onClick={() => { setOpen(true); setNotice(''); setError(''); }} style={slimBtn} aria-expanded={false}>
          <span aria-hidden>🗂️</span> Save to my documents
        </button>
        {notice && <span style={{ marginLeft: 10, color: T.emerald, fontSize: 12.5 }}>{notice}</span>}
      </div>
    );
  }

  return (
    <div
      style={{
        border: `1px solid ${T.border}`, borderRadius: 16, background: T.card,
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        padding: 14, margin: '2px 0 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: T.serif, fontSize: 16, color: T.text, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden>🗂️</span> Save to my documents
        </span>
        <button
          onClick={() => { setOpen(false); setItems([]); setPhase('idle'); setError(''); }}
          aria-label="Close"
          style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 18, cursor: 'pointer' }}
        >
          ×
        </button>
      </div>

      {/* Drop zone — distinct from the composer; never shares a drop target. */}
      <div
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `1.5px dashed ${dragOver ? T.gold : T.border}`, borderRadius: 12,
          background: dragOver ? 'rgba(232,201,106,0.08)' : 'rgba(255,255,255,0.02)',
          padding: '18px 14px', textAlign: 'center', color: T.textMid, fontSize: 13.5, lineHeight: 1.5,
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <div style={{ marginBottom: 10 }}>
          {reading
            ? 'Reading your files…'
            : 'Drop files or a folder here to save each as its own document.'}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => fileRef.current?.click()} disabled={reading || saving} style={slimBtn}>📄 Choose files</button>
          <button onClick={() => folderRef.current?.click()} disabled={reading || saving} style={slimBtn}>📁 Choose a folder</button>
        </div>
        <div style={{ marginTop: 8, color: T.textDim, fontSize: 11.5 }}>HTML, Markdown, text, or PDF · one document per file</div>
      </div>

      <input ref={fileRef} type="file" multiple accept=".html,.htm,.md,.markdown,.txt,.pdf,text/*,application/pdf" onChange={onPick} style={{ display: 'none' }} />
      <input
        ref={folderRef}
        type="file"
        onChange={onPick}
        style={{ display: 'none' }}
        {...({ webkitdirectory: '', directory: '', mozdirectory: '' } as Record<string, string>)}
      />

      {error && <div style={{ color: '#f87171', fontSize: 12.5, paddingTop: 10 }}>{error}</div>}
      {notice && phase === 'preview' && <div style={{ color: T.textDim, fontSize: 12.5, paddingTop: 10 }}>{notice}</div>}

      {/* Preview list — confirm or remove each detected file before saving. */}
      {items.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => (
            <div key={it.key} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 11, padding: 11, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <span style={{ color: T.textDim, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.filename} · {it.chars.toLocaleString()} chars
                </span>
                <button
                  onClick={() => removeItem(it.key)}
                  aria-label={`Remove ${it.title}`}
                  style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 16, cursor: 'pointer', flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={it.title}
                  onChange={(e) => patch(it.key, 'title', e.target.value)}
                  placeholder="Title"
                  style={{ ...inputStyle, flex: '2 1 220px' }}
                />
                <select
                  value={it.doc_type}
                  onChange={(e) => patch(it.key, 'doc_type', e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 120px', cursor: 'pointer' }}
                >
                  {(DOC_TYPES.includes(it.doc_type as typeof DOC_TYPES[number]) ? DOC_TYPES : [it.doc_type, ...DOC_TYPES]).map((dt) => (
                    <option key={dt} value={dt} style={{ background: T.cardSolid }}>{dt}</option>
                  ))}
                </select>
                <input
                  value={it.tags}
                  onChange={(e) => patch(it.key, 'tags', e.target.value)}
                  placeholder="tags (comma-separated)"
                  style={{ ...inputStyle, flex: '2 1 200px' }}
                />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={save}
              disabled={saving || reading}
              style={{
                appearance: 'none', border: 'none', borderRadius: 12, padding: '10px 16px', cursor: saving ? 'default' : 'pointer',
                background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`, color: '#06140c', fontWeight: 700, fontSize: 14,
              }}
            >
              {saving ? 'Saving…' : `Save ${items.length} document${items.length === 1 ? '' : 's'}`}
            </button>
            <button onClick={() => { setItems([]); setError(''); setNotice(''); }} disabled={saving} style={slimBtn}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
