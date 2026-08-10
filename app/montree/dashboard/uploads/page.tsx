// app/montree/dashboard/uploads/page.tsx
// "Uploads" — a school-wide drag-and-drop filing cabinet for ANY file type:
// video, pictures, PDFs, documents, spreadsheets, zips — anything. Files are
// stored in the montree-media bucket under uploads/{schoolId}/ and listed,
// previewed, downloaded and deleted here. Backed by /api/montree/uploads
// (no DB table, no child tagging). Dark forest visual treatment to match the
// rest of the teacher dashboard.
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UploadCloud, File as FileIcon, FileText, FileArchive, FileSpreadsheet,
  Film, Image as ImageIcon, Music, Trash2, Download, X, Loader2,
} from 'lucide-react';

// ── Dark forest tokens (shared with capture / tools pages) ──────────────────
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), rgba(39,129,90,0.12) 30%, transparent 60%)',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  border: 'rgba(52,211,153,0.15)',
  borderHi: 'rgba(52,211,153,0.45)',
  textHi: 'rgba(255,255,255,0.95)',
  textMd: 'rgba(255,255,255,0.65)',
  textLo: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// ── Types ───────────────────────────────────────────────────────────────────
interface UploadedFile {
  path: string;
  name: string;
  size: number;
  type: string;
  createdAt: string | null;
  url: string;
  thumbUrl: string | null;
}

interface ActiveUpload {
  id: string;
  name: string;
  progress: number; // 0..100
  error?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (!bytes || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function isImage(f: { type: string }) { return f.type.startsWith('image/'); }
function isVideo(f: { type: string }) { return f.type.startsWith('video/'); }
function isAudio(f: { type: string }) { return f.type.startsWith('audio/'); }

function IconForFile({ file, size = 34 }: { file: UploadedFile; size?: number }) {
  const ext = extOf(file.name);
  if (isVideo(file)) return <Film size={size} strokeWidth={1.5} color={T.emerald} />;
  if (isAudio(file)) return <Music size={size} strokeWidth={1.5} color={T.emerald} />;
  if (isImage(file)) return <ImageIcon size={size} strokeWidth={1.5} color={T.emerald} />;
  if (file.type === 'application/pdf' || ext === 'pdf') return <FileText size={size} strokeWidth={1.5} color="#f87171" />;
  if (['doc', 'docx', 'txt', 'rtf', 'md', 'pages'].includes(ext)) return <FileText size={size} strokeWidth={1.5} color="#60a5fa" />;
  if (['xls', 'xlsx', 'csv', 'numbers'].includes(ext)) return <FileSpreadsheet size={size} strokeWidth={1.5} color="#34d399" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive size={size} strokeWidth={1.5} color="#fbbf24" />;
  return <FileIcon size={size} strokeWidth={1.5} color={T.textMd} />;
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function UploadsPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<ActiveUpload[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<UploadedFile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UploadedFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  // ── Load existing files ───────────────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/uploads');
      if (!res.ok) throw new Error(`List failed: ${res.status}`);
      const data = await res.json();
      if (data.success) setFiles(data.files || []);
    } catch (err) {
      console.error('[uploads] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // ── Upload one file with progress (XHR for upload.onprogress) ─────────────
  const uploadOne = useCallback((file: File) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setUploads(prev => [...prev, { id, name: file.name, progress: 0 }]);

    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/montree/uploads');
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploads(prev => prev.map(u => (u.id === id ? { ...u, progress: pct } : u)));
        }
      };

      xhr.onload = () => {
        let ok = xhr.status >= 200 && xhr.status < 300;
        let newFile: UploadedFile | null = null;
        try {
          const data = JSON.parse(xhr.responseText);
          ok = ok && data.success;
          if (data.file) newFile = data.file;
        } catch { ok = false; }

        if (ok && newFile) {
          setFiles(prev => [newFile as UploadedFile, ...prev]);
          setUploads(prev => prev.filter(u => u.id !== id));
        } else {
          setUploads(prev => prev.map(u => (u.id === id ? { ...u, error: 'Failed' } : u)));
        }
        resolve();
      };

      xhr.onerror = () => {
        setUploads(prev => prev.map(u => (u.id === id ? { ...u, error: 'Failed' } : u)));
        resolve();
      };

      const fd = new FormData();
      fd.append('file', file, file.name);
      xhr.send(fd);
    });
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    // Upload sequentially so progress stays readable and we don't hammer the API.
    for (const f of arr) {
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(f);
    }
  }, [uploadOne]);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragDepth.current += 1;
    setDragActive(true);
  }, []);
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) { dragDepth.current = 0; setDragActive(false); }
  }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragDepth.current = 0;
    setDragActive(false);
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const doDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/montree/uploads?path=${encodeURIComponent(confirmDelete.path)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setFiles(prev => prev.filter(f => f.path !== confirmDelete.path));
      if (preview?.path === confirmDelete.path) setPreview(null);
      setConfirmDelete(null);
    } catch (err) {
      console.error('[uploads] delete error:', err);
      alert('Could not delete this file. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, preview]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', background: T.bg, color: '#fff', fontFamily: T.sans }}
    >
      {/* Fixed emerald glow */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: T.glow }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Sub-header */}
        <div style={{
          borderBottom: `1px solid ${T.border}`, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(8,20,12,0.90)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          <UploadCloud size={20} strokeWidth={1.75} color={T.emerald} />
          <div>
            <h1 style={{ margin: 0, fontFamily: T.serif, fontWeight: 500, fontSize: 17, color: T.textHi }}>Uploads</h1>
            <p style={{ margin: 0, fontSize: 12, color: T.textLo }}>
              {files.length} {files.length === 1 ? 'file' : 'files'} • shared with your school
            </p>
          </div>
        </div>

        <main style={{ flex: 1, padding: 16, maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          {/* Dropzone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '34px 20px', borderRadius: 18, cursor: 'pointer', textAlign: 'center',
              border: `2px dashed ${dragActive ? T.borderHi : T.border}`,
              background: dragActive ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.03)',
              transition: 'all 140ms ease', fontFamily: T.sans, color: '#fff',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(52,211,153,0.12)',
            }}>
              <UploadCloud size={28} strokeWidth={1.75} color={T.emerald} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.textHi }}>
              {dragActive ? 'Drop to upload' : 'Drag & drop files here'}
            </div>
            <div style={{ fontSize: 13, color: T.textMd }}>
              or <span style={{ color: T.emerald, fontWeight: 600 }}>click to browse</span> — videos, photos, PDFs, documents, anything
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
          />

          {/* Active uploads */}
          {uploads.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {uploads.map(u => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`,
                }}>
                  {u.error
                    ? <X size={18} color="#f87171" />
                    : <Loader2 size={18} color={T.emerald} className="mt-spin" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.textHi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                    {!u.error && (
                      <div style={{ marginTop: 5, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${u.progress}%`, background: T.emerald, transition: 'width 120ms ease' }} />
                      </div>
                    )}
                    {u.error && <div style={{ fontSize: 12, color: '#f87171', marginTop: 2 }}>Upload failed — try again</div>}
                  </div>
                  {!u.error && <span style={{ fontSize: 12, color: T.textMd, flexShrink: 0 }}>{u.progress}%</span>}
                </div>
              ))}
            </div>
          )}

          {/* File grid */}
          <div style={{ marginTop: 20 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
                <Loader2 size={30} color={T.emerald} className="mt-spin" />
              </div>
            ) : files.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: T.textMd }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>📂</div>
                <p style={{ margin: 0, fontSize: 14 }}>No files yet. Drop something above to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {files.map(file => {
                  const clickable = isImage(file) || isVideo(file) || isAudio(file);
                  return (
                    <div
                      key={file.path}
                      className="mt-file-card"
                      style={{
                        position: 'relative', borderRadius: 14, overflow: 'hidden',
                        border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)',
                        display: 'flex', flexDirection: 'column',
                      }}
                    >
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(file); }}
                        title="Delete"
                        className="btn btn-danger btn-soft btn-icon btn-sm mt-file-del"
                        style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}
                      >
                        <Trash2 size={15} strokeWidth={1.75} />
                      </button>

                      {/* Thumbnail / icon */}
                      <div
                        onClick={() => { if (clickable) setPreview(file); else window.open(file.url, '_blank'); }}
                        style={{
                          height: 110, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0,0,0,0.25)', position: 'relative',
                        }}
                      >
                        {isImage(file) && file.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={file.thumbUrl} alt={file.name} loading="lazy" decoding="async"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <>
                            <IconForFile file={file} />
                            {isVideo(file) && (
                              <span style={{
                                position: 'absolute', bottom: 6, right: 6, fontSize: 10, fontWeight: 600,
                                color: T.emerald, background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 6,
                              }}>VIDEO</span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Meta */}
                      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div title={file.name} style={{ fontSize: 12.5, fontWeight: 500, color: T.textHi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: 11, color: T.textLo, display: 'flex', gap: 6 }}>
                          <span>{formatSize(file.size)}</span>
                          {file.createdAt && <span>• {formatDate(file.createdAt)}</span>}
                        </div>
                        <a
                          href={file.url}
                          download={file.name}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11.5, color: T.emerald, textDecoration: 'none', fontWeight: 600,
                          }}
                        >
                          <Download size={13} strokeWidth={2} /> Download
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Full-screen drag hint overlay */}
      {dragActive && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none',
          border: `3px dashed ${T.borderHi}`, background: 'rgba(10,26,15,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.emerald }}>Drop files to upload</div>
        </div>
      )}

      {/* Preview modal (images / video / audio) */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 14, color: T.textHi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70vw' }}>{preview.name}</span>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a href={preview.url} download={preview.name} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(52,211,153,0.15)', border: `1px solid ${T.border}`, color: T.emerald, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}>
                  <Download size={15} /> Download
                </a>
                <button onClick={() => setPreview(null)} className="btn btn-secondary btn-icon btn-sm">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              {isImage(preview) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.name} style={{ maxWidth: '92vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 10 }} />
              )}
              {isVideo(preview) && (
                <video src={preview.url} controls autoPlay playsInline style={{ maxWidth: '92vw', maxHeight: '78vh', borderRadius: 10, background: '#000' }} />
              )}
              {isAudio(preview) && (
                <div style={{ padding: 30, background: 'rgba(255,255,255,0.05)', borderRadius: 14, width: 'min(90vw, 420px)' }}>
                  <audio src={preview.url} controls style={{ width: '100%' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0d1f14', border: `1px solid ${T.border}`, borderRadius: 18, maxWidth: 360, width: '100%', padding: 22 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 46, height: 46, background: 'rgba(239,68,68,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Trash2 size={22} color="#f87171" />
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: T.textHi }}>Delete this file?</h2>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: T.textMd, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{confirmDelete.name}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Cancel</button>
              <button onClick={doDelete} disabled={deleting} className="btn btn-danger btn-md" style={{ flex: 1 }}>
                {deleting ? <><Loader2 size={15} className="mt-spin" /> Deleting</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes mt-spin-kf { to { transform: rotate(360deg); } }
        .mt-spin { animation: mt-spin-kf 0.9s linear infinite; }
        .mt-file-del { opacity: 0; transition: opacity 120ms ease; }
        .mt-file-card:hover .mt-file-del { opacity: 1; }
        @media (hover: none) { .mt-file-del { opacity: 1; } }
      `}</style>
    </div>
  );
}
