'use client';

import { useEffect, useRef, useState } from 'react';
import { VaultFile } from '../types';
import { formatTime, getVaultFileIcon, isImageFile, isVideoFile } from '../utils';
import { VaultImageViewer } from '@/components/story/admin/VaultImageViewer';

interface VaultTabProps {
  vaultUnlocked: boolean;
  vaultPassword: string;
  onVaultPasswordChange: (password: string) => void;
  onVaultUnlock: () => void;
  onVaultLock: () => void;
  vaultError: string;
  vaultFiles: VaultFile[];
  uploadingVault: boolean;
  /* Session 131 — `onVaultUpload` now accepts a FileList OR a File[].
     Components that fire it pass `e.target.files` (FileList) from the
     hidden <input multiple> and the drag-and-drop handler passes
     `e.dataTransfer.files` (also FileList). */
  onVaultUpload: (files: File[]) => void;
  uploadProgress: { done: number; total: number };
  // Session 153 — byte-level progress for the active large (chunked) upload.
  byteProgress: { name: string; sent: number; total: number } | null;
  onVaultDownload: (fileId: number, filename: string) => void;
  onVaultDelete: (fileId: number) => void;
  viewingImage: { url: string; filename: string; isVideo?: boolean } | null;
  loadingView: boolean;
  onVaultView: (fileId: number, filename: string) => void;
  onCloseViewer: () => void;
  // Album props
  albumIndex: number;
  thumbnails: Record<number, string>;
  loadingThumbnails: Record<number, boolean>;
  failedThumbnails: Record<number, boolean>;
  onNavigateAlbum: (direction: 'prev' | 'next') => void;
  onLoadThumbnail: (fileId: number) => void;
  // Session 154 — re-resolve a fresh playback url when the <video> errors
  // (expired signed url / stale blob). Wired to VaultImageViewer.onVideoError.
  onRefreshViewingMedia: () => void;
}

export function VaultTab({
  vaultUnlocked,
  vaultPassword,
  onVaultPasswordChange,
  onVaultUnlock,
  onVaultLock,
  vaultError,
  vaultFiles,
  uploadingVault,
  onVaultUpload,
  uploadProgress,
  byteProgress,
  onVaultDownload,
  onVaultDelete,
  viewingImage,
  loadingView,
  onVaultView,
  onCloseViewer,
  albumIndex,
  thumbnails,
  loadingThumbnails,
  failedThumbnails,
  onNavigateAlbum,
  onLoadThumbnail,
  onRefreshViewingMedia,
}: VaultTabProps) {
  const imageFiles = vaultFiles.filter(f => isImageFile(f.filename));
  // Photos AND videos share one gallery now — videos render as a ▶ tile and
  // open in the same full-screen viewer (which plays them inline).
  const mediaFiles = vaultFiles.filter(f => isImageFile(f.filename) || isVideoFile(f.filename));
  const otherFiles = vaultFiles.filter(f => !isImageFile(f.filename) && !isVideoFile(f.filename));

  // Trigger thumbnail loading for any new images (e.g. after upload)
  useEffect(() => {
    if (!vaultUnlocked) return;
    imageFiles.forEach(f => {
      if (!thumbnails[f.id] && !loadingThumbnails[f.id] && !failedThumbnails[f.id]) {
        onLoadThumbnail(f.id);
      }
    });
  }, [vaultUnlocked, vaultFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {viewingImage && (
        <VaultImageViewer
          imageUrl={viewingImage.url}
          filename={viewingImage.filename}
          onClose={onCloseViewer}
          onPrev={() => onNavigateAlbum('prev')}
          onNext={() => onNavigateAlbum('next')}
          albumIndex={albumIndex}
          albumTotal={mediaFiles.length}
          loading={loadingView}
          isVideo={viewingImage.isVideo}
          onVideoError={onRefreshViewingMedia}
        />
      )}
    <div className="space-y-4">
      {!vaultUnlocked ? (
        <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white/90 mb-4">🔒 Media Vault</h2>
          <p className="text-white/60 mb-4">This vault is password protected. Enter your password to access stored photos and videos.</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={vaultPassword}
              onChange={(e) => onVaultPasswordChange(e.target.value)}
              placeholder="Enter vault password..."
              className="flex-1 px-4 py-2 bg-black/30 border border-[rgba(52,211,153,0.25)] rounded-lg text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyPress={(e) => e.key === 'Enter' && onVaultUnlock()}
            />
            <button
              onClick={onVaultUnlock}
              className="px-6 py-2 bg-emerald-500 text-[#0a1a0f] rounded-lg hover:bg-emerald-600 transition-colors font-medium"
            >
              Unlock
            </button>
          </div>
          {vaultError && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm">
              ✗ {vaultError}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white/90">🔓 Vault Unlocked</h2>
              <button
                onClick={onVaultLock}
                className="px-3 py-1 text-sm bg-white/10 text-white/70 border border-white/10 rounded hover:bg-white/15 transition-colors"
              >
                Lock
              </button>
            </div>

            <VaultUploadZone
              uploadingVault={uploadingVault}
              uploadProgress={uploadProgress}
              onVaultUpload={onVaultUpload}
            />
            {byteProgress ? (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-emerald-300 truncate pr-2">
                    ⟳ Uploading {byteProgress.name}
                  </p>
                  <p className="text-sm tabular-nums text-emerald-300 whitespace-nowrap">
                    {(byteProgress.sent / 1048576).toFixed(0)} / {(byteProgress.total / 1048576).toFixed(0)} MB
                    {' '}({Math.floor((byteProgress.sent / Math.max(1, byteProgress.total)) * 100)}%)
                  </p>
                </div>
                <div className="h-2.5 w-full bg-emerald-500/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.min(100, (byteProgress.sent / Math.max(1, byteProgress.total)) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-white/40 mt-1">Large video — uploading in chunks. Keep this tab open.</p>
              </div>
            ) : uploadingVault && uploadProgress.total > 0 ? (
              <p className="text-sm text-emerald-300 mt-2">
                ⟳ Uploading {uploadProgress.done + 1} of {uploadProgress.total}…
              </p>
            ) : null}
            {vaultError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm">
                ✗ {vaultError}
              </div>
            )}
          </div>

          {vaultFiles.length === 0 ? (
            <div className="bg-black/20 border border-white/10 rounded-lg p-8 text-center text-white/50">
              <div className="text-4xl mb-2">📁</div>
              <p>Vault is empty. Upload photos or videos to get started.</p>
            </div>
          ) : (
            <>
              {/* Photo + Video Gallery */}
              {mediaFiles.length > 0 && (
                <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-4 backdrop-blur-md">
                  <h3 className="text-sm font-bold text-white/90 mb-3">
                    Photos &amp; Videos ({mediaFiles.length})
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {mediaFiles.map((file) => {
                      const isVid = isVideoFile(file.filename);
                      const thumbUrl = thumbnails[file.id];
                      const isLoading = loadingThumbnails[file.id];

                      return (
                        <div
                          key={file.id}
                          className="relative group aspect-square rounded-lg overflow-hidden bg-black/30 cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all"
                          onClick={() => onVaultView(file.id, file.filename)}
                        >
                          {isVid ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/60 relative">
                              <span className="text-3xl text-white/90">▶</span>
                              <span className="absolute top-1 right-1 text-[8px] bg-black/60 text-white px-1 py-0.5 rounded tracking-wide">VIDEO</span>
                            </div>
                          ) : thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={file.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
                              ) : failedThumbnails[file.id] ? (
                                <span className="text-xl text-white/40">✕</span>
                              ) : (
                                <span className="text-2xl">🖼️</span>
                              )}
                            </div>
                          )}

                          {/* Hover overlay with date + actions */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                            <p className="text-white text-[10px] truncate mb-1">{file.filename}</p>
                            <p className="text-white/60 text-[9px]">{formatTime(file.uploaded_at)}</p>
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); onVaultDownload(file.id, file.filename); }}
                                className="px-1.5 py-0.5 text-[9px] bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
                              >
                                ⬇
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onVaultDelete(file.id); }}
                                className="px-1.5 py-0.5 text-[9px] bg-red-500/40 text-white rounded hover:bg-red-500/60 transition-colors"
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Other (non-media) files list */}
              {otherFiles.length > 0 && (
                <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
                  <h3 className="text-sm font-bold text-white/90 mb-4">Other Files ({otherFiles.length})</h3>
                  <div className="space-y-2">
                    {otherFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-black/20 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-lg">{getVaultFileIcon(file.filename)}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white/90">{file.filename}</p>
                            <p className="text-xs text-white/50">{formatTime(file.uploaded_at)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onVaultDownload(file.id, file.filename)}
                            className="px-3 py-1 text-xs bg-[rgba(52,211,153,0.12)] text-emerald-300 border border-[rgba(52,211,153,0.25)] rounded hover:bg-[rgba(52,211,153,0.20)] transition-colors"
                          >
                            ⬇ Download
                          </button>
                          <button
                            onClick={() => onVaultDelete(file.id)}
                            className="px-3 py-1 text-xs bg-red-500/15 text-red-300 border border-red-500/30 rounded hover:bg-red-500/25 transition-colors"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VaultUploadZone — Session 131
   ─────────────────────────────────────────────────────────────────
   Three entry points for getting media into the vault:

     1. Big drag-and-drop card (desktop primary path; also accepts
        clicks → opens file picker)
     2. "📷 Take photo" button (mobile primary path; uses
        `capture="environment"` to open the rear camera directly)
     3. "🎥 Record video" button (mobile; captures video)

   Multi-file is supported across all three: pick 20 photos from the
   camera roll → they upload sequentially with a "X of N" indicator.

   The component is intentionally inline inside VaultTab.tsx (not its
   own file) because it has no other consumer. If a second consumer
   surfaces, extract.
   ─────────────────────────────────────────────────────────────── */
interface VaultUploadZoneProps {
  uploadingVault: boolean;
  uploadProgress: { done: number; total: number };
  onVaultUpload: (files: File[]) => void;
}

function VaultUploadZone({ uploadingVault, uploadProgress, onVaultUpload }: VaultUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  // dragenter fires on every child element of the drop-zone, then
  // dragleave fires when crossing OUT of a child even though the
  // mouse is still inside the parent. Counting enter/leave events
  // (via a ref — we never need to re-render off the counter, only
  // off the derived bool) gives a flicker-free "is the mouse over
  // the zone" signal.
  const dragCounterRef = useRef(0);

  const handleFileList = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onVaultUpload(Array.from(list));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current <= 0) setDragActive(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    dragCounterRef.current = 0;
    if (uploadingVault) return;
    const files = e.dataTransfer?.files;
    handleFileList(files);
  };

  const zoneBaseClass =
    'relative w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer';
  const zoneIdleClass = 'border-[rgba(52,211,153,0.25)] bg-black/20 hover:border-emerald-400 hover:bg-[rgba(52,211,153,0.08)]';
  const zoneActiveClass = 'border-emerald-500 bg-[rgba(52,211,153,0.12)] ring-4 ring-emerald-500/20';
  const zoneDisabledClass = 'opacity-60 cursor-wait';

  const zoneClass = [
    zoneBaseClass,
    dragActive ? zoneActiveClass : zoneIdleClass,
    uploadingVault ? zoneDisabledClass : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      {/* Hidden input — drives the drop-zone click + the "Choose files" button. */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        disabled={uploadingVault}
        onChange={(e) => {
          handleFileList(e.target.files);
          // Reset so picking the SAME file twice in a row still fires.
          e.target.value = '';
        }}
      />
      {/* Mobile camera — photo. `capture="environment"` asks the OS to
          open the rear camera directly instead of the file picker.
          On desktop this attr is ignored — it just behaves like a
          normal photo picker. */}
      <input
        ref={cameraPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={uploadingVault}
        onChange={(e) => {
          handleFileList(e.target.files);
          e.target.value = '';
        }}
      />
      {/* Mobile camera — video. */}
      <input
        ref={cameraVideoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        disabled={uploadingVault}
        onChange={(e) => {
          handleFileList(e.target.files);
          e.target.value = '';
        }}
      />

      {/* The drop-zone card */}
      <div
        className={zoneClass}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !uploadingVault && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !uploadingVault) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload photos or videos"
        aria-disabled={uploadingVault}
      >
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="text-5xl select-none">
            {uploadingVault
              ? '⟳'
              : dragActive
                ? '📥'
                : '📤'}
          </div>
          <div>
            <p className="text-base font-semibold text-white/90">
              {uploadingVault
                ? `Uploading ${uploadProgress.done + 1} of ${uploadProgress.total}…`
                : dragActive
                  ? 'Drop to upload'
                  : 'Drag files here or tap to choose'}
            </p>
            <p className="mt-1 text-xs text-white/50">
              Photos and videos · multiple at once · up to 1GB each
            </p>
          </div>
        </div>
      </div>

      {/* Mobile-friendly camera buttons. Always visible (no UA sniff)
          — on desktop they fall back to opening a normal file picker. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={uploadingVault}
          onClick={() => cameraPhotoInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white/80 bg-white/5 border border-white/15 rounded-lg hover:bg-white/10 active:bg-white/15 disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          📷 Take photo
        </button>
        <button
          type="button"
          disabled={uploadingVault}
          onClick={() => cameraVideoInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white/80 bg-white/5 border border-white/15 rounded-lg hover:bg-white/10 active:bg-white/15 disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          🎥 Record video
        </button>
      </div>

      {/* Progress bar — only during multi-file uploads. */}
      {uploadingVault && uploadProgress.total > 1 && (
        <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
