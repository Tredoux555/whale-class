import { useState, useCallback, useRef } from 'react';
import { VaultFile } from '../types';
import { isImageFile } from '../utils';
import { createSupabaseClient } from '@/lib/supabase-client';

// Session 153 — files larger than this are uploaded DIRECTLY from the browser
// to Supabase (bypassing the Railway ~32MB body cap on the through-server
// encrypted path). Files at or below it keep the legacy encrypted upload so
// the common small-photo case stays AES-encrypted at rest.
const DIRECT_UPLOAD_THRESHOLD = 20 * 1024 * 1024; // 20MB
const MAX_VAULT_BYTES = 1024 * 1024 * 1024; // 1GB (matches the bucket limit)

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
  const [vaultError, setVaultError] = useState('');
  const [viewingImage, setViewingImage] = useState<{ url: string; filename: string } | null>(null);
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
        // through the encrypted server route (Railway ~32MB body cap). Push
        // them DIRECTLY browser→Supabase via a one-time signed upload url,
        // then record the metadata row. These are stored unencrypted in the
        // private bucket (see signed-upload/route.ts for the rationale).
        if (file.size > DIRECT_UPLOAD_THRESHOLD) {
          const suRes = await fetch('/api/story/admin/vault/signed-upload', {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type || 'application/octet-stream',
              fileSize: file.size,
            }),
          });
          const su = await suRes.json().catch(() => ({}));
          if (!suRes.ok || !su.path || !su.token) {
            errors.push(`${file.name}: ${su.error || `could not start upload (HTTP ${suRes.status})`}`);
            continue;
          }

          const sb = createSupabaseClient();
          const { error: upErr } = await sb.storage
            .from('vault-secure')
            .uploadToSignedUrl(su.path, su.token, file, {
              contentType: file.type || undefined,
            });
          if (upErr) {
            errors.push(`${file.name}: direct upload failed — ${upErr.message || 'unknown error'}`);
            continue;
          }

          const finRes = await fetch('/api/story/admin/vault/finalize', {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
              path: su.path,
              filename: file.name,
              fileSize: file.size,
              contentType: file.type || 'application/octet-stream',
            }),
          });
          const fin = await finRes.json().catch(() => ({}));
          if (finRes.ok && fin.file) {
            console.log(`[Vault Upload] SAVED (direct) ${file.name} → row ${fin.file.id}`);
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
      // via a short-lived signed url straight from Supabase. NEVER stream a
      // 400MB video through the decrypt-proxy route (Node heap + Railway cap).
      const target = vaultFiles.find(f => f.id === fileId);
      if (target && target.encrypted === false) {
        const sigRes = await fetch(`/api/story/admin/vault/signed-download/${fileId}`, { headers });
        const sig = await sigRes.json().catch(() => ({}));
        if (sigRes.ok && sig.url) {
          window.open(sig.url, '_blank', 'noopener,noreferrer');
        } else {
          alert(sig.error || 'Download failed');
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
          const currentImageFiles = vaultFiles.filter(f => isImageFile(f.filename));
          const currentFile = currentImageFiles[albumIndex];
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

  const handleVaultView = useCallback(async (fileId: number, filename: string) => {
    // If we already have the thumbnail, use it directly
    if (thumbnailsRef.current[fileId]) {
      setViewingImage({ url: thumbnailsRef.current[fileId], filename });
      // Find album index
      const imageFiles = vaultFiles.filter(f => isImageFile(f.filename));
      const idx = imageFiles.findIndex(f => f.id === fileId);
      setAlbumIndex(idx >= 0 ? idx : 0);
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
      const res = await fetch(`/api/story/admin/vault/download/${fileId}`, {
        headers,
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        thumbnailsRef.current[fileId] = url;
        setThumbnails(prev => ({ ...prev, [fileId]: url }));
        setViewingImage({ url, filename });
        const imageFiles = vaultFiles.filter(f => isImageFile(f.filename));
        const idx = imageFiles.findIndex(f => f.id === fileId);
        setAlbumIndex(idx >= 0 ? idx : 0);
      } else {
        setVaultError('Failed to load image');
      }
    } catch (err) {
      console.error('View error:', err);
      setVaultError('Failed to load image');
    } finally {
      setLoadingView(false);
    }
  }, [vaultHeaders, vaultFiles]);

  // Album navigation
  const navigateAlbum = useCallback(async (direction: 'prev' | 'next') => {
    const imageFiles = vaultFiles.filter(f => isImageFile(f.filename));
    if (imageFiles.length <= 1) return;

    const newIndex = direction === 'next'
      ? (albumIndex + 1) % imageFiles.length
      : (albumIndex - 1 + imageFiles.length) % imageFiles.length;

    const targetFile = imageFiles[newIndex];
    setAlbumIndex(newIndex);

    if (thumbnailsRef.current[targetFile.id]) {
      setViewingImage({ url: thumbnailsRef.current[targetFile.id], filename: targetFile.filename });
    } else {
      // Load on demand
      setLoadingView(true);
      try {
        const headers = vaultHeaders();
        if (!headers) {
          setVaultError('Vault locked — please re-enter password');
          setLoadingView(false);
          return;
        }
        const res = await fetch(`/api/story/admin/vault/download/${targetFile.id}`, {
          headers,
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          thumbnailsRef.current[targetFile.id] = url;
          setThumbnails(prev => ({ ...prev, [targetFile.id]: url }));
          setViewingImage({ url, filename: targetFile.filename });
        } else {
          setVaultError('Failed to load image');
        }
      } catch (err) {
        console.error('Album nav error:', err);
        setVaultError('Failed to load image');
      } finally {
        setLoadingView(false);
      }
    }
  }, [vaultHeaders, vaultFiles, albumIndex]);

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
