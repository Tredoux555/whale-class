// /montree/library/photo-bank/page.tsx
// Montree Picture Bank — Full page for browsing, searching, uploading, and managing pictures
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PhotoBankPicker from '@/components/montree/PhotoBankPicker';
import type { PhotoBankPhoto } from '@/components/montree/PhotoBankPicker';
import LanguageToggle from '@/components/montree/LanguageToggle';

interface SelectedPhoto {
  id: string;
  label: string;
  public_url: string;
  filename: string;
}

const EXPORT_TARGETS = [
  { key: 'card-generator', label: '🃏 Three-Part Cards', href: '/montree/library/tools/card-generator' },
  { key: 'vocabulary-flashcards', label: '📸 Vocabulary Flashcards', href: '/montree/library/tools/vocabulary-flashcards' },
  { key: 'picture-bingo', label: '🖼️ Picture Bingo', href: '/tools/picture-bingo-generator.html' },
  { key: 'phonics-fast', label: '📚 Phonics Fast', href: '/montree/library/tools/phonics-fast' },
] as const;

export default function PhotoBankPage() {
  const router = useRouter();
  const [uploadMode, setUploadMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadResults, setUploadResults] = useState<Array<{ success: boolean; filename: string; error?: string }>>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Selection state for Export-to feature
  const [selectedPhotos, setSelectedPhotos] = useState<Map<string, SelectedPhoto>>(new Map());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const selectedIds = React.useMemo(() => new Set(selectedPhotos.keys()), [selectedPhotos]);

  const handleRawSelect = useCallback((photo: PhotoBankPhoto) => {
    setSelectedPhotos(prev => {
      const next = new Map(prev);
      if (next.has(photo.id)) {
        next.delete(photo.id);
      } else {
        next.set(photo.id, {
          id: photo.id,
          label: photo.label,
          public_url: photo.public_url,
          filename: photo.filename,
        });
      }
      return next;
    });
  }, []);

  const handleExport = useCallback((href: string) => {
    const photos = Array.from(selectedPhotos.values());
    if (photos.length === 0) return;
    try {
      sessionStorage.setItem('photoBankExport', JSON.stringify({ photos }));
    } catch (err) {
      console.error('Failed to save export data to sessionStorage:', err);
      return;
    }
    setShowExportMenu(false);
    // For static HTML pages (picture bingo), use window.location; for Next.js pages, use router
    if (href.startsWith('/tools/')) {
      window.location.href = href;
    } else {
      router.push(href);
    }
  }, [selectedPhotos, router]);

  const handleClearSelection = useCallback(() => {
    setSelectedPhotos(new Map());
    setShowExportMenu(false);
  }, []);

  // CRITICAL: Prevent browser from opening dropped files as new tabs
  // This must be on the window level to catch ALL drag events on the page
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);
    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  // Handle file upload — chunks large batches to avoid body size limits
  const CHUNK_SIZE = 25; // Upload 25 files at a time (server processes in parallel)
  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;

    setUploading(true);
    setUploadMode(true);
    setUploadResults([]);

    const allResults: Array<{ success: boolean; filename: string; error?: string }> = [];

    // Split files into chunks to avoid request timeout / body size limits
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const chunk = files.slice(i, i + CHUNK_SIZE);
      setUploadProgress(`Uploading ${Math.min(i + CHUNK_SIZE, files.length)} of ${files.length}...`);

      const formData = new FormData();
      chunk.forEach((file) => formData.append('files', file));
      formData.append('uploaded_by', 'public');

      try {
        const res = await fetch('/api/montree/photo-bank', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.results) {
          allResults.push(...data.results);
        } else {
          // Entire chunk failed
          chunk.forEach(f => allResults.push({ success: false, filename: f.name, error: data.error || 'Upload failed' }));
        }
      } catch (err) {
        console.error('Upload chunk error:', err);
        chunk.forEach(f => allResults.push({ success: false, filename: f.name, error: 'Network error' }));
      }

      // Update results progressively so user sees progress
      setUploadResults([...allResults]);
    }

    setUploading(false);
    setUploadProgress('');

    // Refresh the page to show new photos
    if (allResults.some(r => r.success)) {
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
    if (e.target) e.target.value = '';
  };

  // Page-level drop handler — works even when upload mode is off
  const handlePageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      uploadFiles(files);
    }
  }, []);

  const handlePageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handlePageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0A2725 0%, #0D3330 40%, #122C2A 70%, #0F1F1E 100%)' }}
      onDrop={handlePageDrop}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
    >

      {/* Ambient glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #60a5fa, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)' }} />

      {/* Nav */}
      <nav className="relative z-10 px-6 py-5 flex items-center justify-between">
        <Link
          href="/montree/library"
          className="text-white/40 text-sm hover:text-white/70 transition-colors"
        >
          ← Back to Library
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
          onClick={() => setUploadMode(!uploadMode)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            backgroundColor: uploadMode ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
            color: uploadMode ? '#fca5a5' : '#6ee7b7',
            border: `1px solid ${uploadMode ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          }}
        >
          {uploadMode ? '✕ Close Upload' : '📤 Upload Pictures'}
        </button>
        </div>
      </nav>

      {/* Header */}
      <div className="relative z-10 px-6 pb-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-white/50 text-xs tracking-wide uppercase">Montree Picture Bank</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          <span className="text-white/90">Picture </span>
          <span style={{ background: 'linear-gradient(135deg, #93c5fd, #60a5fa, #bfdbfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Library
          </span>
        </h1>
        <p className="text-white/40 text-base max-w-md mx-auto">
          Search, browse, and contribute English teaching pictures. Use them directly in any content creation tool.
        </p>
      </div>

      {/* Upload Zone (when active) */}
      {uploadMode && (
        <div className="relative z-10 px-6 mb-6">
          <div
            onDrop={handlePageDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className="max-w-2xl mx-auto rounded-2xl p-8 text-center cursor-pointer transition-all"
            style={{
              border: `3px dashed ${dragOver ? '#10b981' : 'rgba(255,255,255,0.15)'}`,
              backgroundColor: dragOver ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
            }}
          >
            {uploading ? (
              <div>
                <div className="text-3xl mb-3">⏳</div>
                <p className="text-white/70 text-lg font-semibold">Uploading pictures...</p>
                {uploadProgress && <p className="text-emerald-400/60 text-sm mt-1">{uploadProgress}</p>}
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📤</div>
                <p className="text-white/70 text-lg font-semibold mb-1">
                  Drop pictures here or click to upload
                </p>
                <p className="text-white/30 text-sm">
                  Supports PNG, JPG, WebP, GIF, AVIF — Max 10MB each
                </p>
                <p className="text-emerald-400/50 text-xs mt-3">
                  Pictures are automatically categorized by filename
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          {/* Upload results */}
          {uploadResults.length > 0 && (
            <div className="max-w-2xl mx-auto mt-4 space-y-2">
              {uploadResults.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: r.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: r.success ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  <span>{r.success ? '✅' : '❌'}</span>
                  <span className="flex-1">{r.filename}</span>
                  {r.error && <span className="text-xs opacity-70">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Picture Bank Browser */}
      <div className="relative z-10 px-6 pb-12">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <PhotoBankPicker
              onSelectPhoto={(dataUrl, label) => {
                // Fallback: download if no raw select mode
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `${label.replace(/\s+/g, '_')}.png`;
                link.click();
              }}
              onRawSelect={handleRawSelect}
              selectedIds={selectedIds}
              maxHeight={600}
              showCategories={true}
              searchPlaceholder="Search pictures... (e.g. &quot;cat&quot;, &quot;apple&quot;, &quot;short a&quot;)"
            />
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="relative z-10 px-6 py-8 text-center">
        <p className="text-white/20 text-xs tracking-wider uppercase">
          Contribute pictures to help teachers worldwide
        </p>
      </div>

      {/* Floating Export-to bar — shown when photos are selected */}
      {selectedPhotos.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'linear-gradient(135deg, #0D3330 0%, #134e4a 100%)',
            borderTop: '1px solid rgba(16,185,129,0.3)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
            padding: '12px 16px',
          }}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            {/* Selection count + clear */}
            <div className="flex items-center gap-3 shrink-0">
              <span style={{
                backgroundColor: 'rgba(16,185,129,0.25)',
                color: '#6ee7b7',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: '600',
              }}>
                {selectedPhotos.size} selected
              </span>
              <button
                onClick={handleClearSelection}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Clear
              </button>
            </div>

            {/* Export-to button + dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: '1px solid rgba(16,185,129,0.4)',
                  backgroundColor: 'rgba(16,185,129,0.2)',
                  color: '#6ee7b7',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Export to... ▾
              </button>

              {showExportMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '8px',
                    backgroundColor: '#1a3a38',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '12px',
                    padding: '6px',
                    minWidth: '220px',
                    boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  {EXPORT_TARGETS.map((target) => (
                    <button
                      key={target.key}
                      onClick={() => handleExport(target.href)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#d1fae5',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.1s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.15)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
