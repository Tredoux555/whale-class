import { useState, useCallback, useRef } from 'react';
import { VaultFile } from '../types';
import { isImageFile, isVideoFile } from '../utils';
// Session 153 — files larger than this go through the server-proxied CHUNKED
// (resumable) upload: the browser streams the file to our server in pieces
// under Railway's body cap, and the server relays each piece to Supabase via
// a service-key resumable upload. Handles any size, from any device. Files at
// or below the threshold keep the legacy encrypted through-server upload so
// the common small-photo case stays AES-encrypted at rest.
const DIRECT_UPLOAD_THRESHOLD = 20 * 1024 * 1024; // 20MB
const MAX_VAULT_BYTES = 1024 * 1024 * 1024; // 1GB (matches the bucket limit)
// 8MB chunks — comfortably under any reverse-proxy body cap AND light on
// mobile-Safari memory (a 500MB video reads as ~60 small slices, each GC'd
// after upload, instead of holding 24MB ArrayBuffers). Each chunk is still
// ≥ Supabase's 5MB resumable part minimum.
const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024; // 8MB

export const useVault = (getSession: () => string | null) => {
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [uploadingVault, setUploadingVault] = useState(false);
  // Per-batch upload progress so the UI can show "Uploading 3 of 7…"
  // during multi-file uploads. Both stay 0/0 when idle.
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  // Session 153 — byte-level progress for the active large (chunked) upload so
  // the UI can show a real "142MB / 535MB (27%)" bar. Null when no big upload
  // is in flight.
  const [byteProgress, setByteProgress] = useState<{ name: string; sent: number; total: number } | null>(null);
  const [vaultError, setVaultError] = useState('');
  const [viewingImage, setViewingImage] = useState<{ url: string; filename: string; isVideo?: boolean } | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  // 🚨 Session 113 V2 Story audit F-2.1 — vault token state. Captured from
  // the unlock response and sent on every subsequent vault fetch via the
  // x-vault-token header. Lives in a ref (NOT localStorage / sessionStorage)
  // so it's wiped on lock / refresh / tab close. The token itself is a 1h-TTL
  // JWT — even if it leaked it'd auto-expire.
  const vaultTokenRef = useRef<string | null>(null);
  // Album state
  const [albumIndex, setAlbumIndex] = useState(0);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState<Record<number, boolean>>({});
  const [failedThumbnails, setFailedThumbnails] = useState<Record<number, boolean>>({});
  const thumbnailsRef = useRef<Record<number, string>>({});
  const requestedRef = useRef<Set<number>>(new Set()); // track which IDs we've already requested
  const abortRef = useRef<AbortController | null>(null); // cancel batch loading on lock

  // Build the standard vault-call headers. Admin session + vault token.
  // Returns null if either is missing — callers should bail in that case
  // (typically by re-locking the UI, since the server will 401 anyway).
  const vaultHeaders = useCallback((extra: Record<string, string> = {}): Record<string, string> | null => {
    const session = getSession();
    const vaultToken = vaultTokenRef.current;
    if (!session || !vaultToken) return null;
    return {
      Authorization: `Bearer ${session}`,
      'x-vault-token': vaultToken,
      ...extra,
    };
  }, [getSession]);

  const loadVaultFiles = useCallback(async () => {
    const headers = vaultHeaders();
    if (!headers) return;
    try {
      const res = await fetch('/api/story/admin/vault/list', { headers });
      if (res.ok) {
        const data = await res.json();
        setVaultFiles(data.files || []);
      } else if (res.status === 401) {
        // Vault token expired or invalid — bounce to locked state so the
        // operator can re-enter the password.
        vaultTokenRef.current = null;
        setVaultUnlocked(false);
      }
    } catch {
      console.error('Failed to load vault files');
    }
  }, [vaultHeaders]);

  // Revoke all cached object URLs
  const revokeAllThumbnails = useCallback(() => {
    Object.values(thumbnailsRef.current).forEach(url => {
      try { window.URL.revokeObjectURL(url); } catch { /* ignore */ }
    });
    thumbnailsRef.current = {};
    requestedRef.current = new Set();
    setThumbnails({});
    setLoadingThumbnails({});
    setFailedThumbnails({});
  }, []);

  // Load a single thumbnail
  const loadThumbnail = useCallback(async (fileId: number, signal?: AbortSignal) => {
    if (thumbnailsRef.current[fileId] || requestedRef.current.has(fileId)) return;
    requestedRef.current.add(fileId);
    setLoadingThumbnails(prev => ({ ...prev, [fileId]: true }));
    try {
      const headers = vaultHeaders();
      if (!headers) {
        setLoadingThumbnails(prev => ({ ...prev, [fileId]: false }));
        return;
      }
      const res = await fetch(`/api/story/admin/vault/download/${fileId}`, {
        headers,
        signal,
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        thumbnailsRef.current[fileId] = url;
        setThumbnails(prev => ({ ...prev, [fileId]: url }));
      } else {
        setFailedThumbnails(prev => ({ ...prev, [fileId]: true }));
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Thumbnail load error:', err);
        setFailedThumbnails(prev => ({ ...prev, [fileId]: true }));
      }
    } finally {
      setLoadingThumbnails(prev => ({ ...prev, [fileId]: false }));
    }
  }, [vaultHeaders]);

  // Load all image thumbnails progressively (cancellable)
  const loadAllThumbnails = useCallback(async (files: VaultFile[]) => {
    // Cancel any in-flight batch
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const imageFiles = files.filter(f => isImageFile(f.filename));
    for (let i = 0; i < imageFiles.length; i += 3) {
      if (controller.signal.aborted) break;
      const batch = imageFiles.slice(i, i + 3);
      await Promise.all(batch.map(f => loadThumbnail(f.id, controller.signal)));
    }
  }, [loadThumbnail]);

  const handleVaultUnlock = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch('/api/story/admin/vault/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({ password: vaultPassword })
      });
      const data = await res.json();
      if (res.ok) {
        // 🚨 Session 113 V2 Story audit F-2.1 — capture the vault token from
        // the unlock response. Every subsequent vault call sends this as
        // x-vault-token. Lives only in memory (ref) — wiped on lock, refresh,
        // or tab close.
        vaultTokenRef.current = data.vaultToken || null;
        if (!vaultTokenRef.current) {
          setVaultError('Unlock succeeded but no vault token returned. Try again.');
          return;
        }
        setVaultUnlocked(true);
        setVaultPassword('');
        const headers = vaultHeaders();
        if (headers) {
          const listRes = await fetch('/api/story/admin/vault/list', { headers });
          if (listRes.ok) {
            const listData = await listRes.json();
            const files = listData.files || [];
            setVaultFiles(files);
            // Start loading thumbnails in background
            loadAllThumbnails(files);
          }
        }
      } else {
        setVaultError('Invalid password');
      }
    } catch {
      setVaultError('Error unlocking vault');
    }
  }, [getSession, vaultPassword, loadAllThumbnails, vaultHeaders]);

  const handleVaultLock = useCallback(() => {
    // Cancel any in-flight thumbnail loads
    if (abortRef.current) abortRef.current.abort();
    // Revoke all object URLs to free memory
    revokeAllThumbnails();
    // 🚨 Session 113 V2 Story audit F-2.1 — wipe the vault token on lock.
    // Even though it's a 1h-TTL JWT, locking should immediately invalidate
    // access from the client side so a re-unlock is required.
    vaultTokenRef.current = null;
    setVaultUnlocked(false);
    setVaultPassword('');
    setViewingImage(null);
    setByteProgress(null);
  }, [revokeAllThumbnails]);

  // 🚨 Session 131 — multi-file upload. Accepts an array (or a single
  // File for back-compat) and processes sequentially. Sequential not
  // parallel because (a) the encryption step is CPU-heavy on the server
  // and parallel would queue requests anyway, and (b) sequential gives
  // us a reliable "X of N" progress signal. Per-file errors are
  // collected but don't abort the batch — a failed HEIC won't stop the
  // next JPEG from uploading.
  const handleVaultUpload = useCallback(async (files: File | File[]) => {
    const list = Array.isArray(files) ? files : [files];
    if (list.length === 0) return;

    setUploadingVault(true);
    setVaultError('');
    setUploadProgress({ done: 0, total: list.length });

    // 🚨 Session 113 V2 Story audit F-2.1 — vault token mandatory.
    const headers = vaultHeaders();
    if (!headers) {
      setVaultError('Vault locked — please re-enter password');
      setUploadingVault(false);
      setUploadProgress({ done: 0, total: 0 });
      return;
    }

    const errors: string[] = [];
    const newImageFileIds: number[] = [];

    const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        if (file.size > MAX_VAULT_BYTES) {
          const mb = (file.size / 1024 / 1024).toFixed(0);
          errors.push(`${file.name}: too large (${mb}MB) — limit 1GB`);
          continue;
        }

        console.log(
          `[Vault Upload] starting ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, type=${file.type})`
        );

        // 🚨 Session 153 — large files (e.g. a 6-min iPhone video) can't fit
        // through the encrypted server route (Railway ~32MB body cap), a single
        // direct PUT hits Supabase's standard-upload ceiling, and Supabase
        // refuses public-key resumable uploads. So we stream the file to our
        // server in <30MB chunks and the server relays each chunk to a
        // service-key resumable upload. Stored unencrypted in the private
        // bucket (see chunked/init/route.ts for the rationale).
        if (file.size > DIRECT_UPLOAD_THRESHOLD) {
          const initRes = await fetch('/api/story/admin/vault/chunked/init', {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type || 'application/octet-stream',
              fileSize: file.size,
            }),
          });
          const init = await initRes.json().catch(() => ({}));
          if (!initRes.ok || !init.tusUrl || !init.path) {
            errors.push(`${file.name}: ${init.error || `could not start upload (HTTP ${initRes.status})`}`);
            continue;
          }

          let offset = 0;
          let failed = false;
          setByteProgress({ name: file.name, sent: 0, total: file.size });
          while (offset < file.size) {
            const end = Math.min(offset + UPLOAD_CHUNK_BYTES, file.size);
            const buf = await file.slice(offset, end).arrayBuffer();
            let ok = false;
            for (let attempt = 0; attempt < 4 && !ok; attempt++) {
              try {
                const cRes = await fetch('/api/story/admin/vault/chunked/chunk', {
                  method: 'POST',
                  headers: {
                    ...headers,
                    'Content-Type': 'application/offset+octet-stream',
                    'x-tus-url': init.tusUrl,
                    'x-upload-offset': String(offset),
                  },
                  body: buf,
                });
                if (cRes.ok) {
                  const j = await cRes.json().catch(() => ({}));
                  offset = typeof j.offset === 'number' && j.offset > offset ? j.offset : end;
                  ok = true;
                } else {
                  if (cRes.status === 401) {
                    errors.push(`${file.name}: vault locked mid-upload — re-unlock and retry`);
                    failed = true;
                    break;
                  }
                  await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
                }
              } catch {
                await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
              }
            }
            if (failed) break;
            if (!ok) {
              errors.push(`${file.name}: upload stalled at ${(offset / 1048576).toFixed(0)}MB — check your connection and retry`);
              failed = true;
              break;
            }
            setByteProgress({ name: file.name, sent: offset, total: file.size });
          }
          if (failed) { setByteProgress(null); continue; }

          const finRes = await fetch('/api/story/admin/vault/finalize', {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
              path: init.path,
              filename: file.name,
              fileSize: file.size,
              contentType: file.type || 'application/octet-stream',
            }),
          });
          const fin = await finRes.json().catch(() => ({}));
          setByteProgress(null);
          if (finRes.ok && fin.file) {
            console.log(`[Vault Upload] SAVED (chunked) ${file.name} → row ${fin.file.id}`);
          } else {
            errors.push(`${file.name}: ${fin.error || `finalize failed (HTTP ${finRes.status})`}`);
          }
          continue;
        }

        // Small files — keep the encrypted through-server path.
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/story/admin/vault/upload', {
          method: 'POST',
          headers,
          body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.file) {
          console.log(`[Vault Upload] SAVED ${file.name} → row ${data.file.id}`);
          if (isImageFile(data.file.filename || file.name)) {
            newImageFileIds.push(data.file.id);
          }
        } else {
          const msg =
            data.error ||
            `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`;
          console.warn(`[Vault Upload] FAILED ${file.name}: ${msg}`);
          errors.push(`${file.name}: ${msg}`);
        }
      } catch (err) {
        const m = err instanceof Error ? err.message : 'unknown';
        console.warn(`[Vault Upload] threw on ${file.name}:`, m);
        errors.push(`${file.name}: ${m}`);
      } finally {
        setUploadProgress({ done: i + 1, total: list.length });
      }
    }

    // One list refresh at the end of the batch (avoids N round-trips).
    await loadVaultFiles();
    // Best-effort thumbnail load for new images.
    for (const fileId of newImageFileIds) {
      await loadThumbnail(fileId);
    }

    if (errors.length > 0) {
      const head = errors.slice(0, 3).join(' · ');
      const tail = errors.length > 3 ? ` (+${errors.length - 3} more)` : '';
      setVaultError(`${errors.length} of ${list.length} failed: ${head}${tail}`);
    }

    setByteProgress(null);
    setUploadingVault(false);
    setUploadProgress({ done: 0, total: 0 });
  }, [vaultHeaders, loadVaultFiles, loadThumbnail]);

  const handleVaultDownload = useCallback(async (fileId: number, filename: string) => {
    try {
      const headers = vaultHeaders();
      if (!headers) {
        alert('Vault locked — please re-enter password');
        return;
      }

      // 🚨 Session 153 — unencrypted direct (large-media) uploads are served
      // via a short-lived signed url straight from Supabase (served INLINE so
      // it plays/displays). NEVER stream a 400MB video through the decrypt-
      // proxy route (Node heap + Railway cap).
      //
      // 📱 MOBILE FIX (Session 153): calling window.open() AFTER an `await`
      // is blocked by mobile browsers (iOS Safari especially) — the user-tap
      // activation is gone by the time the fetch resolves, so the media never
      // opened on phones. Open the tab SYNCHRONOUSLY here (inside the tap),
      // then point it at the signed url once we have it. If the browser still
      // blocked the tab (win === null), fall back to a same-tab navigation,
      // which always works.
      const target = vaultFiles.find(f => f.id === fileId);
      if (target && target.encrypted === false) {
        const win = window.open('', '_blank');
        try {
          const sigRes = await fetch(`/api/story/admin/vault/signed-download/${fileId}`, { headers });
          const sig = await sigRes.json().catch(() => ({}));
          if (sigRes.ok && sig.url) {
            if (win) win.location.href = sig.url;
            else window.location.href = sig.url;
          } else {
            if (win) win.close();
            alert(sig.error || 'Could not open media');
          }
        } catch (e) {
          if (win) win.close();
          console.error('Signed media open error:', e);
          alert('Could not open media');
        }
        return;
      }

      const res = await fetch(`/api/story/admin/vault/download/${fileId}`, {
        headers,
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Download failed');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed');
    }
  }, [vaultHeaders, vaultFiles]);

  const handleVaultDelete = useCallback(async (fileId: number) => {
    if (!confirm('Delete this file?')) return;
    const headers = vaultHeaders();
    if (!headers) {
      setVaultError('Vault locked — please re-enter password');
      return;
    }
    try {
      const res = await fetch(`/api/story/admin/vault/delete/${fileId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        // Clean up thumbnail URL
        if (thumbnailsRef.current[fileId]) {
          window.URL.revokeObjectURL(thumbnailsRef.current[fileId]);
          delete thumbnailsRef.current[fileId];
          requestedRef.current.delete(fileId);
          setThumbnails(prev => {
            const next = { ...prev };
            delete next[fileId];
            return next;
          });
        }
        // Close viewer if viewing deleted photo
        if (viewingImage) {
          const currentMediaFiles = vaultFiles.filter(f => isImageFile(f.filename) || isVideoFile(f.filename));
          const currentFile = currentMediaFiles[albumIndex];
          if (currentFile?.id === fileId) {
            setViewingImage(null);
          }
        }
        await loadVaultFiles();
      }
    } catch {
      setVaultError('Delete failed');
    }
  }, [vaultHeaders, loadVaultFiles, viewingImage, vaultFiles, albumIndex]);

  // Resolve a viewable URL for a media file. PLAIN (unencrypted) videos get a
  // short-lived signed url that plays inline + is seekable; images and
  // encrypted videos are fetched via the decrypt-proxy and cached as a blob.
  const loadMedia = useCallback(
    async (
      file: VaultFile,
      headers: Record<string, string>
    ): Promise<{ url: string; isVideo: boolean } | null> => {
      const isVid = isVideoFile(file.filename);
      if (isVid && file.encrypted === false) {
        const r = await fetch(`/api/story/admin/vault/signed-download/${file.id}`, { headers });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.url) return { url: j.url as string, isVideo: true };
        return null;
      }
      if (thumbnailsRef.current[file.id]) return { url: thumbnailsRef.current[file.id], isVideo: isVid };
      const r = await fetch(`/api/story/admin/vault/download/${file.id}`, { headers });
      if (!r.ok) return null;
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      thumbnailsRef.current[file.id] = url;
      setThumbnails(prev => ({ ...prev, [file.id]: url }));
      return { url, isVideo: isVid };
    },
    []
  );

  const handleVaultView = useCallback(async (fileId: number, filename: string) => {
    const mediaFiles = vaultFiles.filter(f => isImageFile(f.filename) || isVideoFile(f.filename));
    const idx = mediaFiles.findIndex(f => f.id === fileId);
    setAlbumIndex(idx >= 0 ? idx : 0);
    const file = mediaFiles[idx] || vaultFiles.find(f => f.id === fileId);
    if (!file) return;

    // Fast path — cached image blob. Videos always re-resolve so signed urls
    // stay fresh (and we never cache a 500MB blob).
    if (!isVideoFile(file.filename) && thumbnailsRef.current[fileId]) {
      setViewingImage({ url: thumbnailsRef.current[fileId], filename, isVideo: false });
      return;
    }

    setLoadingView(true);
    try {
      const headers = vaultHeaders();
      if (!headers) {
        setVaultError('Vault locked — please re-enter password');
        setLoadingView(false);
        return;
      }
      const media = await loadMedia(file, headers);
      if (media) setViewingImage({ url: media.url, filename, isVideo: media.isVideo });
      else setVaultError('Failed to load media');
    } catch (err) {
      console.error('View error:', err);
      setVaultError('Failed to load media');
    } finally {
      setLoadingView(false);
    }
  }, [vaultHeaders, vaultFiles, loadMedia]);

  // Album navigation
  const navigateAlbum = useCallback(async (direction: 'prev' | 'next') => {
    const mediaFiles = vaultFiles.filter(f => isImageFile(f.filename) || isVideoFile(f.filename));
    if (mediaFiles.length <= 1) return;

    const newIndex = direction === 'next'
      ? (albumIndex + 1) % mediaFiles.length
      : (albumIndex - 1 + mediaFiles.length) % mediaFiles.length;

    const targetFile = mediaFiles[newIndex];
    setAlbumIndex(newIndex);

    // Cached image blob — instant. Videos always re-resolve.
    if (!isVideoFile(targetFile.filename) && thumbnailsRef.current[targetFile.id]) {
      setViewingImage({ url: thumbnailsRef.current[targetFile.id], filename: targetFile.filename, isVideo: false });
      return;
    }

    setLoadingView(true);
    try {
      const headers = vaultHeaders();
      if (!headers) {
        setVaultError('Vault locked — please re-enter password');
        setLoadingView(false);
        return;
      }
      const media = await loadMedia(targetFile, headers);
      if (media) setViewingImage({ url: media.url, filename: targetFile.filename, isVideo: media.isVideo });
      else setVaultError('Failed to load media');
    } catch (err) {
      console.error('Album nav error:', err);
      setVaultError('Failed to load media');
    } finally {
      setLoadingView(false);
    }
  }, [vaultHeaders, vaultFiles, albumIndex, loadMedia]);

  // 🚨 Session 154 streaming fix — re-resolve the CURRENTLY-VIEWED video when
  // the <video> element errors (most commonly a signed url that expired after
  // a long pause). Unencrypted videos get a brand-new signed url; encrypted
  // videos drop the cached blob (it may be stale/revoked) and re-fetch via the
  // decrypt-proxy. The viewer guards against refresh loops (one retry per url).
  const refreshViewingMedia = useCallback(async () => {
    const mediaFiles = vaultFiles.filter(f => isImageFile(f.filename) || isVideoFile(f.filename));
    const file = mediaFiles[albumIndex];
    if (!file || !isVideoFile(file.filename)) return;
    const headers = vaultHeaders();
    if (!headers) {
      setVaultError('Vault locked — please re-enter password');
      return;
    }
    if (thumbnailsRef.current[file.id]) {
      try { window.URL.revokeObjectURL(thumbnailsRef.current[file.id]); } catch { /* ignore */ }
      delete thumbnailsRef.current[file.id];
    }
    try {
      const media = await loadMedia(file, headers);
      if (media) setViewingImage({ url: media.url, filename: file.filename, isVideo: media.isVideo });
      else setVaultError('Failed to reload video');
    } catch (err) {
      console.error('Video refresh error:', err);
      setVaultError('Failed to reload video');
    }
  }, [vaultFiles, albumIndex, vaultHeaders, loadMedia]);

  const handleCloseViewer = useCallback(() => {
    setViewingImage(null);
  }, []);

  return {
    vaultPassword,
    setVaultPassword,
    vaultUnlocked,
    setVaultUnlocked,
    vaultFiles,
    uploadingVault,
    uploadProgress,
    byteProgress,
    vaultError,
    setVaultError,
    viewingImage,
    loadingView,
    loadVaultFiles,
    handleVaultUnlock,
    handleVaultUpload,
    handleVaultDownload,
    handleVaultDelete,
    handleVaultView,
    handleCloseViewer,
    handleVaultLock,
    refreshViewingMedia,
    // Album extras
    albumIndex,
    thumbnails,
    loadingThumbnails,
    failedThumbnails,
    navigateAlbum,
    loadThumbnail,
    // 🚨 Session 113 V2 Story audit F-2.1 — expose the vault token so
    // other hooks (useMessages -> saveMessageToVault) can include it on
    // their own vault calls. Read-only — returns null when locked.
    getVaultToken: () => vaultTokenRef.current,
  };
};
