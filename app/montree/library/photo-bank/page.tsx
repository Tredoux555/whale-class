// /montree/library/photo-bank/page.tsx
// Montree Picture Library — tabbed creation hub.
//
// The page owns ONE selection (a Map keyed by photo id). The Library tab
// browses and selects; the tool tabs (Three-Part Cards, Sentence Match,
// Flashcards, Picture Bingo) receive that selection live via props/postMessage
// instead of the old one-shot sessionStorage pipe.
//
// 🚨 Tool tab panels stay MOUNTED once visited and are hidden with CSS. Never
// switch them to conditional rendering — unmounting throws away the teacher's
// work-in-progress (cropped cards, bulk labels, bingo grid) on every tab flip.
//
// The standalone /montree/library/tools/* routes and the static
// /tools/*.html pages still work exactly as before: they keep their own
// sessionStorage `photoBankExport` intake, fed by the "Export to…" menu.
'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PhotoBankPicker from '@/components/montree/PhotoBankPicker';
import type { PhotoBankPhoto } from '@/components/montree/PhotoBankPicker';
import LanguageToggle from '@/components/montree/LanguageToggle';
import CardGenerator from '@/components/card-generator/CardGenerator';
import VocabularyFlashcards from '@/components/vocabulary-flashcards/VocabularyFlashcards';
import { useI18n } from '@/lib/montree/i18n';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { downloadPhotos } from '@/lib/montree/media/download-photos';

interface SelectedPhoto {
  id: string;
  label: string;
  /**
   * URL the downstream consumer tool should fetch. Holds the Cloudflare-cached
   * proxy URL (not the raw Supabase URL) so card-generator, vocabulary-flashcards,
   * phonics-fast, picture-bingo, my-first-dictionary, and sorting-mat all read
   * cached responses. Existing consumers continue reading `public_url` — they
   * just get a faster URL inside it now.
   */
  public_url: string;
  filename: string;
}

/**
 * Tools that stay OUTSIDE the hub and still take the selection through the
 * one-shot sessionStorage pipe.
 * - phonics-fast is a nav hub with its own internal tabs; it ignores photo
 *   selections entirely (banner only), so it is deliberately not a tab here.
 * - dictionary is a standalone static page.
 */
const EXPORT_TARGETS = [
  { key: 'phonics-fast', label: '📚 Phonics Fast', href: '/montree/library/tools/phonics-fast' },
  { key: 'dictionary', label: '📖 Dictionary', href: '/tools/my-first-dictionary.html' },
] as const;

type TabKey = 'library' | 'three-part-cards' | 'sentence-match' | 'flashcards' | 'picture-bingo';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'library', label: '🖼️ Library' },
  { key: 'three-part-cards', label: '🃏 Three-Part Cards' },
  { key: 'sentence-match', label: '📖 Sentence Match' },
  { key: 'flashcards', label: '📸 Flashcards' },
  { key: 'picture-bingo', label: '🎲 Picture Bingo' },
];

const BINGO_SRC = '/tools/picture-bingo-generator.html';

export default function PhotoBankPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [uploadMode, setUploadMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadResults, setUploadResults] = useState<Array<{ success: boolean; filename: string; error?: string }>>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Selection state — shared by every tab. Lives here so switching tabs never
  // loses it.
  const [selectedPhotos, setSelectedPhotos] = useState<Map<string, SelectedPhoto>>(new Map());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const selectedIds = React.useMemo(() => new Set(selectedPhotos.keys()), [selectedPhotos]);
  // Array form handed to the embedded tools as `importPhotos`. Each tool
  // dedupes by photo id, so re-sending the whole selection is safe.
  const selectedPhotoList = useMemo(() => Array.from(selectedPhotos.values()), [selectedPhotos]);

  const [activeTab, setActiveTab] = useState<TabKey>('library');
  // Tabs are mounted lazily on first visit, then kept mounted forever and
  // hidden with CSS so work-in-progress inside a tool survives tab flips.
  const [mountedTabs, setMountedTabs] = useState<Set<TabKey>>(() => new Set<TabKey>(['library']));

  const selectTab = useCallback((key: TabKey) => {
    setActiveTab(key);
    setMountedTabs(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
    setShowExportMenu(false);
  }, []);

  // Sort is forwarded to PhotoBankPicker via the `sort` prop and lands at
  // /api/montree/photo-bank as ?sort=…
  const [sort, setSort] = useState<'label' | 'recent'>('label');
  // Download-to-device state. `downloadStatus` drives the button label so the
  // user gets "3/12" feedback on big batches instead of a frozen button.
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');

  /**
   * Pre-selection handed over from another page (the SATPIN page's
   * "Create materials with these pictures →" buttons). Deliberately a
   * DIFFERENT sessionStorage key from `photoBankExport` — the tools all
   * consume-and-delete that one on mount, so reusing it would race them.
   */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('photoBankPreselect');
      if (!raw) return;
      sessionStorage.removeItem('photoBankPreselect');
      const { photos } = JSON.parse(raw) as { photos: SelectedPhoto[] };
      if (!photos || photos.length === 0) return;
      setSelectedPhotos(prev => {
        const next = new Map(prev);
        photos.forEach(p => { if (p && p.id) next.set(p.id, p); });
        return next;
      });
    } catch (err) {
      console.error('Failed to read photoBankPreselect:', err);
    }
  }, []);

  const handleRawSelect = useCallback((photo: PhotoBankPhoto) => {
    setSelectedPhotos(prev => {
      const next = new Map(prev);
      if (next.has(photo.id)) {
        next.delete(photo.id);
      } else {
        // Pass the Cloudflare-cached proxy URL downstream so consumer tools
        // (card-generator, vocabulary-flashcards, phonics-fast, picture-bingo,
        // my-first-dictionary, sorting-mat) fetch through the edge cache.
        // Falls back to the raw public_url for any legacy row missing a
        // storage_path.
        const proxyUrl = photo.storage_path
          ? getProxyUrl(photo.storage_path, 'photo-bank')
          : photo.public_url;
        next.set(photo.id, {
          id: photo.id,
          label: photo.label,
          public_url: proxyUrl,
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
    // For static HTML pages, use window.location; for Next.js pages, use router
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

  // ---- Picture Bingo iframe bridge -------------------------------------
  // The real bingo UI is the static vanilla-JS page. It can't read React
  // state, so the hub posts the selection across. The static page dedupes by
  // photo id, so re-sending the full selection on every change is safe.
  const bingoFrameRef = useRef<HTMLIFrameElement>(null);
  const bingoReadyRef = useRef(false);

  const sendSelectionToBingo = useCallback(() => {
    const frame = bingoFrameRef.current;
    if (!frame || !frame.contentWindow || selectedPhotoList.length === 0) return;
    try {
      frame.contentWindow.postMessage(
        { type: 'montree:photo-bank-selection', photos: selectedPhotoList },
        window.location.origin
      );
    } catch (err) {
      console.error('Failed to post selection to Picture Bingo:', err);
    }
  }, [selectedPhotoList]);

  // The iframe announces itself once its own DOMContentLoaded has run.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'montree:bingo-ready') return;
      bingoReadyRef.current = true;
      sendSelectionToBingo();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sendSelectionToBingo]);

  // Push on tab activation and on every selection change while the tab is open.
  useEffect(() => {
    if (activeTab !== 'picture-bingo' || !bingoReadyRef.current) return;
    sendSelectionToBingo();
  }, [activeTab, sendSelectionToBingo]);

  // Save the currently-selected pictures to the user's device.
  // One picture downloads as a plain image; several are zipped in the browser
  // so the whole batch arrives as a single file — handy for dropping into
  // Midjourney or any other tool that wants local reference images.
  const handleDownloadSelected = useCallback(async () => {
    const photos = Array.from(selectedPhotos.values());
    if (photos.length === 0 || downloading) return;
    setDownloading(true);
    setShowExportMenu(false);
    setDownloadStatus(photos.length > 1 ? `0/${photos.length}` : '');
    try {
      const result = await downloadPhotos(photos, {
        zipName: 'montree-pictures',
        onProgress: ({ done, total, phase }) => {
          setDownloadStatus(
            phase === 'zipping' ? t('photoBank.zipping') : (total > 1 ? `${done}/${total}` : '')
          );
        },
      });
      if (result.saved === 0) {
        if (typeof window !== 'undefined') window.alert(t('photoBank.downloadFailed'));
      } else if (result.failed.length > 0 && typeof window !== 'undefined') {
        window.alert(
          t('photoBank.downloadPartial', {
            saved: String(result.saved),
            failed: String(result.failed.length),
          })
        );
      }
    } catch (err) {
      console.error('Picture download error:', err);
      if (typeof window !== 'undefined') window.alert(t('photoBank.downloadFailed'));
    } finally {
      setDownloading(false);
      setDownloadStatus('');
    }
  }, [selectedPhotos, downloading, t]);

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
    // JPEG-only — match the API's restriction. Filter out non-JPEG drops at the UI layer too.
    const files = Array.from(e.dataTransfer.files).filter(f => {
      const mime = (f.type || '').toLowerCase();
      const ext = f.name.includes('.') ? f.name.split('.').pop()?.toLowerCase() || '' : '';
      const mimeOk = !mime || mime === 'image/jpeg' || mime === 'image/jpg';
      const extOk = !ext || ext === 'jpg' || ext === 'jpeg';
      return mimeOk && extOk && (mime || ext);
    });
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

  /** Tool panels are hidden, not unmounted — see the file header note. */
  const panelStyle = (key: TabKey): React.CSSProperties => ({
    display: activeTab === key ? 'block' : 'none',
  });

  /** White card the light-themed tools sit in, against the dark page. */
  const toolCardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255,255,255,0.95)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  };

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
          className="btn btn-ghost btn-sm"
        >
          {t('photoBank.backToLibrary')}
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
          onClick={() => setUploadMode(!uploadMode)}
          className={`btn btn-md ${uploadMode ? 'btn-danger btn-soft' : 'btn-primary'}`}
        >
          {uploadMode ? t('photoBank.closeUpload') : t('photoBank.uploadPictures')}
        </button>
        </div>
      </nav>

      {/* Header */}
      <div className="relative z-10 px-6 pb-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-white/50 text-xs tracking-wide uppercase">{t('photoBank.badge')}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          <span className="text-white/90">{t('photoBank.title1')} </span>
          <span style={{ background: 'linear-gradient(135deg, #93c5fd, #60a5fa, #bfdbfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('photoBank.title2')}
          </span>
        </h1>
        <p className="text-white/40 text-base max-w-md mx-auto">
          {t('photoBank.subtitle')}
        </p>
      </div>

      {/* Tab bar — pick pictures in Library, then build with them in any tool.
          Labels are hardcoded English to match the export-menu labels already
          hardcoded in this file. */}
      <div className="relative z-10 px-6 pb-6">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => selectTab(tab.key)}
                className={`btn btn-md ${active ? 'btn-primary' : 'btn-secondary'}`}
              >
                {tab.label}
                {tab.key !== 'library' && selectedPhotos.size > 0 && (
                  <span style={{ opacity: 0.6, marginLeft: '6px', fontWeight: 500 }}>
                    {selectedPhotos.size}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {activeTab !== 'library' && (
          <p className="text-white/30 text-xs text-center mt-3">
            {selectedPhotos.size > 0
              ? `${selectedPhotos.size} picture${selectedPhotos.size === 1 ? '' : 's'} from the Library loaded into this tool. Go back to Library to add more.`
              : 'No pictures selected yet — open the Library tab and pick some.'}
          </p>
        )}
      </div>

      {/* ================= LIBRARY TAB ================= */}
      <div style={panelStyle('library')}>

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
                <p className="text-white/70 text-lg font-semibold">{t('photoBank.uploading')}</p>
                {uploadProgress && <p className="text-emerald-400/60 text-sm mt-1">{uploadProgress}</p>}
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📤</div>
                <p className="text-white/70 text-lg font-semibold mb-1">
                  {t('photoBank.dropHere')}
                </p>
                <p className="text-white/30 text-sm">
                  {t('photoBank.uploadFormats')}
                </p>
                <p className="text-emerald-400/50 text-xs mt-3">
                  {t('photoBank.autoCategorized')}
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,.jpg,.jpeg"
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
          <div className="rounded-2xl p-6" style={toolCardStyle}>
            {/* Sort toggle — sits above the picker. Keeps the picker
                component generic; the photo-bank page is the only consumer
                that wants this row visible. */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: '#888', alignSelf: 'center', marginRight: '4px' }}>
                {t('photoBank.sortBy')}
              </span>
              {(['label', 'recent'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSort(mode)}
                  className={`btn btn-sm btn-pill ${sort === mode ? 'btn-primary' : 'btn-secondary on-light'}`}
                >
                  {mode === 'label' ? t('photoBank.sortName') : t('photoBank.sortRecent')}
                </button>
              ))}
            </div>
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
              showCategories={true}
              sort={sort}
              maxHeight={600}
            />
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="relative z-10 px-6 py-8 text-center">
        <p className="text-white/20 text-xs tracking-wider uppercase">
          {t('photoBank.footer')}
        </p>
      </div>

      </div>
      {/* =============== END LIBRARY TAB =============== */}

      {/* ================= TOOL TABS =================
          Each panel mounts on first visit and then stays mounted — hidden
          with display:none — so the teacher's in-progress work survives. */}

      {mountedTabs.has('three-part-cards') && (
        <div style={panelStyle('three-part-cards')} className="relative z-10 px-6 pb-16">
          <div className="max-w-5xl mx-auto rounded-2xl p-6" style={toolCardStyle}>
            <CardGenerator
              embedded
              layoutMode="square"
              importPhotos={selectedPhotoList}
              headerConfig={{ showBackButton: false }}
            />
          </div>
        </div>
      )}

      {mountedTabs.has('sentence-match') && (
        <div style={panelStyle('sentence-match')} className="relative z-10 px-6 pb-16">
          <div className="max-w-5xl mx-auto rounded-2xl p-6" style={toolCardStyle}>
            <CardGenerator
              embedded
              layoutMode="strip"
              importPhotos={selectedPhotoList}
              headerConfig={{ showBackButton: false }}
              textConfig={{
                bulkTabLabel: '📝 Bulk Sentences',
                bulkInstructions: 'Enter one sentence per line. Sentences will be applied to cards in order.',
                bulkPlaceholder: 'The cat sits on the mat.\nI see a big red dog.\nA bird flies in the sky.\n...',
                bulkButtonLabel: 'Apply Sentences to Cards',
                emptyStateText: 'Pick pictures in the Library tab to get started!',
                infoSectionTitle: 'ℹ️ About Sentence Match Cards',
                infoSectionLead: 'Sentence match cards work the same way as Montessori three-part cards — only the label is a full sentence instead of a single word:',
                infoSectionItems: [
                  { strong: 'Control Card:', body: 'Picture + sentence together (used for self-checking)' },
                  { strong: 'Picture Card:', body: 'Image only (for matching)' },
                  { strong: 'Sentence Card:', body: 'Sentence only (for reading practice)' },
                ],
                infoSectionFooter: 'Children match picture cards and sentence cards, then use the control cards to verify their work. This self-correcting format builds reading fluency, comprehension, and confidence with longer text.',
              }}
            />
          </div>
        </div>
      )}

      {mountedTabs.has('flashcards') && (
        <div style={panelStyle('flashcards')} className="relative z-10 px-6 pb-16">
          <div className="max-w-5xl mx-auto rounded-2xl p-6" style={toolCardStyle}>
            <VocabularyFlashcards embedded importPhotos={selectedPhotoList} />
          </div>
        </div>
      )}

      {mountedTabs.has('picture-bingo') && (
        <div style={panelStyle('picture-bingo')} className="relative z-10 px-6 pb-16">
          <div className="max-w-5xl mx-auto rounded-2xl p-4" style={toolCardStyle}>
            {/* The bingo generator is a standalone vanilla-JS page. It's
                embedded here and fed the live selection over postMessage; the
                button below is the escape hatch to the full-window version. */}
            <div className="flex items-center justify-between gap-3 px-2 pb-3">
              <span style={{ fontSize: '12px', color: '#666' }}>
                Picture Bingo runs inside this page. Your Library selection is sent across automatically.
              </span>
              <button
                onClick={() => handleExport(BINGO_SRC)}
                className="btn btn-secondary btn-sm on-light"
              >
                Open full screen ↗
              </button>
            </div>
            <iframe
              ref={bingoFrameRef}
              src={BINGO_SRC}
              title="Picture Bingo Generator"
              onLoad={sendSelectionToBingo}
              style={{
                width: '100%',
                height: '80vh',
                minHeight: '600px',
                border: 'none',
                borderRadius: '12px',
                background: '#fff',
              }}
            />
          </div>
        </div>
      )}
      {/* =============== END TOOL TABS =============== */}

      {/* Floating selection bar — Library tab only. On the tool tabs the
          selection is already in the tool, and a fixed bar would sit on top
          of the generator's own controls. */}
      {activeTab === 'library' && selectedPhotos.size > 0 && (
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
                {t('photoBank.selected', { count: String(selectedPhotos.size) })}
              </span>
              <button
                onClick={handleClearSelection}
                className="btn btn-ghost btn-sm"
              >
                {t('photoBank.clear')}
              </button>
            </div>

            {/* Download to device — saves the selection as image files.
                One picture comes down as-is; several are zipped client-side. */}
            <button
              onClick={handleDownloadSelected}
              disabled={downloading}
              className="btn btn-secondary btn-md"
              style={{ marginLeft: 'auto', marginRight: '8px' }}
              title={t('photoBank.downloadTitle')}
            >
              {downloading
                ? `${t('photoBank.downloading')}${downloadStatus ? ` ${downloadStatus}` : ''}…`
                : `⬇ ${t('photoBank.download', { count: String(selectedPhotos.size) })}`}
            </button>

            {/* Export-to button + dropdown — the tools that stay external.
                Three-Part Cards, Sentence Match, Flashcards and Picture Bingo
                are tabs above; they read the selection directly. */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="btn btn-primary btn-md"
              >
                {t('photoBank.exportTo')} ▾
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
