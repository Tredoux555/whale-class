// app/admin/qr-generator/page.tsx
// QR code generator for newsletters, song deep-links, and ad-hoc admin use.
// Uses the `qrcode` npm package for local PNG generation (no external API, no CSP issues).
// JSZip is used for bulk bundles.

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/slugify';
import JSZip from 'jszip';
import QRCode from 'qrcode';

type Mode = 'single' | 'song' | 'bulk';

interface BulkRow {
  label: string;
  url: string;
}

interface VideoRow {
  id: string;
  title: string;
  category: string;
  videoUrl: string;
  uploadedAt: string;
  week?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'song-of-week': '🎵 Song of the Week',
  'phonics': '🔤 Phonics',
  'weekly-phonics-sound': '🔠 Weekly Phonics Sound',
  'stories': '📖 Story',
};

// Generate a PNG data URL locally — no network call.
async function generateQrDataUrl(data: string, size: number): Promise<string> {
  return await QRCode.toDataURL(data, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
}

// Generate a PNG blob locally — no network call, no fetch (avoids CSP connect-src block on data: URIs).
async function generateQrBlob(data: string, size: number): Promise<Blob> {
  const dataUrl = await generateQrDataUrl(data, size);
  // Decode base64 data URL directly — never touches the network.
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// slugify() moved to lib/slugify.ts (Health Check #9 — prevent drift)

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseBulkText(raw: string): BulkRow[] {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows: BulkRow[] = [];
  for (const line of lines) {
    // Accept "Label, URL" / "Label | URL" / "Label<TAB>URL" / plain URL
    const splitMatch = line.match(/^(.*?)[\t|,](.*)$/);
    if (splitMatch) {
      const label = splitMatch[1].trim();
      const url = splitMatch[2].trim();
      if (url) {
        rows.push({ label: label || url, url });
        continue;
      }
    }
    // Plain URL — use URL as label
    rows.push({ label: line, url: line });
  }
  return rows;
}

export default function QrGeneratorPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('single');
  const [size, setSize] = useState<number>(512);

  // Single URL
  const [singleUrl, setSingleUrl] = useState<string>('');

  // Song deep-link builder.
  //
  // ⚠ As of May 5, 2026, teacherpotato.xyz is a dead domain — DNS points at
  // a legacy parking server (15.197.225.128 / 3.33.251.168), every path
  // returns 405. Until teacherpotato.xyz is re-attached to Railway in the
  // dashboard's custom-domain settings, song QRs must point at montree.xyz,
  // which serves the /whale-class page correctly. To restore Whale Class
  // domain isolation: re-attach teacherpotato.xyz in Railway → Settings →
  // Domains, then change this default back. See middleware.ts comment.
  const [songBase, setSongBase] = useState<string>('https://montree.xyz/whale-class');
  const [songTitle, setSongTitle] = useState<string>('');
  const [songSlug, setSongSlug] = useState<string>('');
  const [songSlugTouched, setSongSlugTouched] = useState<boolean>(false);

  // Video picker — pulls from /api/admin/video-manager
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [videosLoading, setVideosLoading] = useState<boolean>(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [videoSearch, setVideoSearch] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Bulk
  const [bulkText, setBulkText] = useState<string>('');
  const [bulkBusy, setBulkBusy] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Preview — computed async so we hold the data URL in state
  const [previewSrc, setPreviewSrc] = useState<string>('');

  useEffect(() => {
    // Auth gate — check the same endpoint the video picker uses
    (async () => {
      try {
        const response = await fetch('/api/admin/video-manager');
        if (response.status === 401) router.push('/admin/login');
      } catch {
        router.push('/admin/login');
      }
    })();
  }, [router]);

  // Auto-slug from title unless user has manually edited the slug
  useEffect(() => {
    if (!songSlugTouched) {
      setSongSlug(slugify(songTitle));
    }
  }, [songTitle, songSlugTouched]);

  // Load videos from the admin video-manager the first time the Song tab is opened.
  // Re-fetches when `loadAttempt` increments (Retry button bumps it).
  const [loadAttempt, setLoadAttempt] = useState<number>(0);
  useEffect(() => {
    if (mode !== 'song') return;
    if (videos.length > 0) return;

    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    setVideosLoading(true);
    setVideosError(null);

    // 30-second timeout — Supabase Storage cold start can take 10–20s on Railway.
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30_000);

    (async () => {
      try {
        const res = await fetch('/api/admin/video-manager', {
          credentials: 'include',
          signal: controller.signal,
        });
        if (cancelled) return;
        if (res.status === 401) {
          // Auth gate elsewhere handles the redirect; just stop here.
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        if (data?.success && Array.isArray(data.videos)) {
          // Sort newest first
          const sorted = [...data.videos].sort((a: VideoRow, b: VideoRow) => {
            const da = new Date(a.uploadedAt || 0).getTime();
            const db = new Date(b.uploadedAt || 0).getTime();
            return db - da;
          });
          setVideos(sorted);
        } else {
          setVideosError('Server returned an empty video list.');
        }
      } catch (err) {
        if (cancelled) return;
        const msg = timedOut
          ? 'Timed out after 30 seconds. The video metadata file may be slow to load — hit Retry, or type the title manually below.'
          : (err as Error).message || 'Failed to load videos.';
        setVideosError(msg);
      } finally {
        clearTimeout(timer);
        if (!cancelled) setVideosLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
    // Intentionally NOT depending on `videosLoading` — it's set inside this effect
    // and re-running on its own state change caused spurious aborts.
  }, [mode, videos.length, loadAttempt]);

  // Filter videos by search text
  const filteredVideos = useMemo(() => {
    const q = videoSearch.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter(v => {
      const hay = `${v.title} ${v.category} ${v.week || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [videos, videoSearch]);

  function handlePickVideo(v: VideoRow) {
    setSelectedVideoId(v.id);
    setSongTitle(v.title);
    // Force slug to auto-regenerate from the new title
    setSongSlugTouched(false);
    setSongSlug(slugify(v.title));
  }

  const songUrl = useMemo(() => {
    const base = songBase.replace(/\/+$/, '');
    const slug = songSlug ? `#song-${songSlug}` : '';
    return base + slug;
  }, [songBase, songSlug]);

  const activeUrl = useMemo(() => {
    if (mode === 'single') return singleUrl.trim();
    if (mode === 'song') return songUrl;
    return '';
  }, [mode, singleUrl, songUrl]);

  // Regenerate preview whenever URL or size changes
  useEffect(() => {
    let cancelled = false;
    if (!activeUrl) {
      setPreviewSrc('');
      return;
    }
    generateQrDataUrl(activeUrl, size)
      .then(dataUrl => {
        if (!cancelled) setPreviewSrc(dataUrl);
      })
      .catch(err => {
        if (!cancelled) {
          console.error('QR preview failed:', err);
          setPreviewSrc('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeUrl, size]);

  async function handleSingleDownload() {
    if (!activeUrl) return;
    try {
      const blob = await generateQrBlob(activeUrl, size);
      let filename: string;
      if (mode === 'song') {
        filename = `qr-song-${songSlug || 'untitled'}.png`;
      } else {
        // Derive filename from URL path
        try {
          const u = new URL(activeUrl);
          const pathSlug = slugify(u.pathname.replace(/^\/+/, '').replace(/\/+$/, '') + (u.hash || ''));
          filename = `qr-${u.hostname}${pathSlug ? '-' + pathSlug : ''}.png`;
        } catch {
          filename = `qr-${slugify(activeUrl).slice(0, 40) || 'code'}.png`;
        }
      }
      downloadBlob(blob, filename);
    } catch (err) {
      alert(`Download failed: ${(err as Error).message}`);
    }
  }

  async function handleBulkDownload() {
    const rows = parseBulkText(bulkText);
    if (rows.length === 0) {
      setBulkError('Paste at least one URL (one per line, or "Label, URL" per line).');
      return;
    }

    setBulkError(null);
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: rows.length });

    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      const written: Array<{ label: string; url: string; filename: string }> = [];
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const blob = await generateQrBlob(row.url, size);
          const arr = await blob.arrayBuffer();

          // Make a safe, unique filename
          let name = slugify(row.label) || `qr-${i + 1}`;
          if (name.length > 60) name = name.slice(0, 60);
          let finalName = `${name}.png`;
          let counter = 2;
          while (usedNames.has(finalName)) {
            finalName = `${name}-${counter}.png`;
            counter++;
          }
          usedNames.add(finalName);

          zip.file(finalName, arr);
          written.push({ label: row.label, url: row.url, filename: finalName });
        } catch (err) {
          errors.push(`Row ${i + 1} (${row.label}): ${(err as Error).message}`);
        }
        setBulkProgress({ done: i + 1, total: rows.length });
      }

      // Manifest reflects what actually made it into the ZIP
      const manifestLines = ['label,url,filename'];
      written.forEach(w => {
        manifestLines.push(
          `"${w.label.replace(/"/g, '""')}","${w.url.replace(/"/g, '""')}","${w.filename}"`,
        );
      });
      zip.file('manifest.csv', manifestLines.join('\n'));

      if (errors.length > 0) {
        zip.file('_errors.txt', errors.join('\n') + '\n');
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const ts = new Date().toISOString().slice(0, 10);
      downloadBlob(zipBlob, `qr-bundle-${ts}.zip`);
    } catch (err) {
      setBulkError(`Bundle failed: ${(err as Error).message}`);
    } finally {
      setBulkBusy(false);
    }
  }

  const bulkRowCount = useMemo(() => parseBulkText(bulkText).length, [bulkText]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur bg-slate-900/70 border-b border-slate-700/60">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/admin"
            className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
          >
            ← Admin
          </Link>
          <div className="flex-1" />
          <div className="text-right">
            <div className="text-xl font-semibold flex items-center gap-2 justify-end">
              <span>📱</span>
              <span>QR Generator</span>
            </div>
            <div className="text-xs text-slate-400">Newsletters · Song deep-links · Bulk bundles</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Mode tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'single' as Mode, label: 'Single URL', icon: '🔗' },
            { id: 'song' as Mode, label: 'Whale Class Song', icon: '🎵' },
            { id: 'bulk' as Mode, label: 'Bulk / Newsletter', icon: '📦' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === tab.id
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Size selector — always visible */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
          <label className="text-sm text-slate-300">PNG size:</label>
          {[256, 512, 1024].map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`px-3 py-1 rounded text-sm ${
                size === s ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {s}px
            </button>
          ))}
          <span className="text-xs text-slate-500 ml-auto">
            512px fits well inside a newsletter card.
          </span>
        </div>

        {mode === 'single' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <span>🔗</span>
                <span>URL</span>
              </h2>
              <textarea
                value={singleUrl}
                onChange={e => setSingleUrl(e.target.value)}
                placeholder="https://montree.xyz/..."
                rows={4}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <div className="text-xs text-slate-400">
                Paste any URL. For deep links, include the <code className="bg-slate-900 px-1 rounded">#anchor</code>.
              </div>
              <button
                onClick={handleSingleDownload}
                disabled={!activeUrl}
                className="w-full py-2.5 rounded-md bg-violet-500 hover:bg-violet-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition"
              >
                Download PNG
              </button>
            </div>

            <QrPreview src={previewSrc} url={activeUrl} />
          </div>
        )}

        {mode === 'song' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <span>🎵</span>
                <span>Whale Class Song Deep-Link</span>
              </h2>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Base URL</label>
                <input
                  type="text"
                  value={songBase}
                  onChange={e => setSongBase(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
                <div className="text-xs text-slate-500 mt-1">
                  The page that hosts the song cards with anchor IDs.
                </div>
              </div>

              {/* Video picker — pulls from /api/admin/video-manager */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Pick a video{' '}
                  <span className="text-slate-600">(auto-fills title + slug)</span>
                </label>
                {videosError ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-xs text-red-300 flex items-start gap-3">
                    <div className="flex-1">
                      Couldn&apos;t load videos: {videosError} You can still type the title manually below.
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoadAttempt(n => n + 1)}
                      className="shrink-0 px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white text-xs font-medium transition"
                    >
                      Retry
                    </button>
                  </div>
                ) : videosLoading ? (
                  <div className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-400">
                    Loading videos…
                  </div>
                ) : videos.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-400">
                    No videos found in the database yet. Type the title manually below.
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={videoSearch}
                      onChange={e => setVideoSearch(e.target.value)}
                      placeholder={`Search ${videos.length} videos by title, category, or week…`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 mb-2"
                    />
                    <div className="max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-md divide-y divide-slate-800">
                      {filteredVideos.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-500">No matches.</div>
                      ) : (
                        filteredVideos.map(v => {
                          const isSelected = v.id === selectedVideoId;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handlePickVideo(v)}
                              className={`w-full text-left px-3 py-2 text-sm transition ${
                                isSelected
                                  ? 'bg-violet-500/20 text-white'
                                  : 'text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              <div className="font-medium truncate">{v.title}</div>
                              <div className="text-xs text-slate-400 flex flex-wrap gap-2 mt-0.5">
                                <span>
                                  {CATEGORY_LABELS[v.category] || v.category}
                                </span>
                                {v.week && (
                                  <span className="text-slate-500">· Week {v.week}</span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Song title{' '}
                  <span className="text-slate-600">(or type manually)</span>
                </label>
                <input
                  type="text"
                  value={songTitle}
                  onChange={e => {
                    setSongTitle(e.target.value);
                    // Typing overrides picker selection
                    setSelectedVideoId(null);
                  }}
                  placeholder="Animal Habitats"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Slug <span className="text-slate-600">(auto-filled from title)</span>
                </label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-2 rounded-l-md bg-slate-900 border border-r-0 border-slate-700 text-slate-500 text-sm">
                    #song-
                  </span>
                  <input
                    type="text"
                    value={songSlug}
                    onChange={e => {
                      setSongSlugTouched(true);
                      setSongSlug(slugify(e.target.value));
                    }}
                    placeholder="animal-habitats"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-r-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  {songSlugTouched && (
                    <button
                      onClick={() => {
                        setSongSlugTouched(false);
                        setSongSlug(slugify(songTitle));
                      }}
                      className="text-xs text-slate-400 hover:text-white px-2"
                      title="Reset to auto"
                    >
                      ↺
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-md p-3 text-xs font-mono text-slate-300 break-all">
                {songUrl}
              </div>

              <button
                onClick={handleSingleDownload}
                disabled={!songSlug}
                className="w-full py-2.5 rounded-md bg-violet-500 hover:bg-violet-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition"
              >
                Download {songTitle ? `"${songTitle}"` : 'song'} QR
              </button>
            </div>

            <QrPreview src={previewSrc} url={activeUrl} />
          </div>
        )}

        {mode === 'bulk' && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <span>📦</span>
              <span>Bulk / Weekly Newsletter Bundle</span>
            </h2>

            <div className="text-sm text-slate-300">
              Paste one entry per line. Formats accepted:
              <ul className="list-disc list-inside mt-2 text-xs text-slate-400 space-y-0.5">
                <li><code className="bg-slate-900 px-1 rounded">Animal Habitats, https://montree.xyz/whale-class#song-animal-habitats</code></li>
                <li><code className="bg-slate-900 px-1 rounded">Circle of Life | https://montree.xyz/whale-class#song-circle-of-life</code></li>
                <li><code className="bg-slate-900 px-1 rounded">https://montree.xyz/story</code> <span className="text-slate-600">(URL only — label taken from URL)</span></li>
              </ul>
            </div>

            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={`Animal Habitats, https://montree.xyz/whale-class#song-animal-habitats
Circle of Life, https://montree.xyz/whale-class#song-circle-of-life
Five Senses, https://montree.xyz/whale-class#song-five-senses`}
              rows={10}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-violet-500"
            />

            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-400">
                {bulkRowCount > 0 ? (
                  <span>
                    <span className="text-white font-semibold">{bulkRowCount}</span> URL
                    {bulkRowCount !== 1 ? 's' : ''} ready
                  </span>
                ) : (
                  <span className="text-slate-500">Paste URLs to begin</span>
                )}
              </div>
              <div className="flex-1" />
              <button
                onClick={handleBulkDownload}
                disabled={bulkBusy || bulkRowCount === 0}
                className="px-4 py-2.5 rounded-md bg-violet-500 hover:bg-violet-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition"
              >
                {bulkBusy
                  ? bulkProgress
                    ? `Generating ${bulkProgress.done}/${bulkProgress.total}…`
                    : 'Generating…'
                  : 'Download ZIP'}
              </button>
            </div>

            {bulkError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-sm text-red-300">
                {bulkError}
              </div>
            )}

            <div className="text-xs text-slate-500">
              The ZIP includes a <code className="bg-slate-900 px-1 rounded">manifest.csv</code> matching
              filenames to labels and URLs so you can drop them straight into PowerPoint or Word.
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="text-xs text-slate-500 pt-4 border-t border-slate-700/60">
          QR PNGs are generated locally in your browser via the{' '}
          <code className="bg-slate-900 px-1 rounded">qrcode</code> npm package — no external services,
          no rate limits, works offline.
        </div>
      </div>
    </div>
  );
}

function QrPreview({ src, url }: { src: string; url: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-5 flex flex-col items-center justify-center min-h-[320px]">
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`QR code for ${url}`}
            className="max-w-[280px] w-full h-auto bg-white rounded-md shadow-lg"
          />
          <div className="mt-3 text-xs text-slate-400 text-center break-all max-w-full">
            {url}
          </div>
        </>
      ) : (
        <div className="text-slate-500 text-sm text-center">
          Preview will appear here once a URL is entered.
        </div>
      )}
    </div>
  );
}
