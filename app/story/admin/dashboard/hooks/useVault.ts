import { useState, useCallback, useRef } from 'react';
import { VaultFile } from '../types';
import { isImageFile } from '../utils';

export const useVault = (getSession: () => string | null) => {
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [uploadingVault, setUploadingVault] = useState(false);
  const [vaultError, setVaultError] = useState('');
  const [viewingImage, setViewingImage] = useState<{ url: string; filename: string } | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  // Album state
  const [albumIndex, setAlbumIndex] = useState(0);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState<Record<number, boolean>>({});
  const [failedThumbnails, setFailedThumbnails] = useState<Record<number, boolean>>({});
  const thumbnailsRef = useRef<Record<number, string>>({});
  const requestedRef = useRef<Set<number>>(new Set()); // track which IDs we've already requested
  const abortRef = useRef<AbortController | null>(null); // cancel batch loading on lock

  const loadVaultFiles = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch('/api/story/admin/vault/list', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVaultFiles(data.files || []);
      }
    } catch {
      console.error('Failed to load vault files');
    }
  }, [getSession]);

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
      const session = getSession();
      const res = await fetch(`/api/story/admin/vault/download/${fileId}`, {
        headers: { 'Authorization': `Bearer ${session}` },
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
  }, [getSession]);

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
      await res.json();
      if (res.ok) {
        setVaultUnlocked(true);
        setVaultPassword('');
        const listRes = await fetch('/api/story/admin/vault/list', {
          headers: { 'Authorization': `Bearer ${session}` }
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          const files = listData.files || [];
          setVaultFiles(files);
          // Start loading thumbnails in background
          loadAllThumbnails(files);
        }
      } else {
        setVaultError('Invalid password');
      }
    } catch {
      setVaultError('Error unlocking vault');
    }
  }, [getSession, vaultPassword, loadAllThumbnails]);

  const handleVaultLock = useCallback(() => {
    // Cancel any in-flight thumbnail loads
    if (abortRef.current) abortRef.current.abort();
    // Revoke all object URLs to free memory
    revokeAllThumbnails();
    setVaultUnlocked(false);
    setVaultPassword('');
    setViewingImage(null);
  }, [revokeAllThumbnails]);

  const handleVaultUpload = useCallback(async (file: File) => {
    setUploadingVault(true);
    setVaultError('');

    try {
      const session = getSession();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/story/admin/vault/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        await loadVaultFiles();
        // Load thumbnail for new file
        if (data.file && isImageFile(data.file.filename || file.name)) {
          await loadThumbnail(data.file.id);
        }
      } else {
        setVaultError(data.error || 'Upload failed');
      }
    } catch {
      setVaultError('Upload failed');
    } finally {
      setUploadingVault(false);
    }
  }, [getSession, loadVaultFiles, loadThumbnail]);

  const handleVaultDownload = useCallback(async (fileId: number, filename: string) => {
    try {
      const session = getSession();
      const res = await fetch(`/api/story/admin/vault/download/${fileId}`, {
        headers: { 'Authorization': `Bearer ${session}` }
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
  }, [getSession]);

  const handleVaultDelete = useCallback(async (fileId: number) => {
    if (!confirm('Delete this file?')) return;
    const session = getSession();
    try {
      const res = await fetch(`/api/story/admin/vault/delete/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session}` }
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
  }, [getSession, loadVaultFiles, viewingImage, vaultFiles, albumIndex]);

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
      const session = getSession();
      const res = await fetch(`/api/story/admin/vault/download/${fileId}`, {
        headers: { 'Authorization': `Bearer ${session}` }
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
  }, [getSession, vaultFiles]);

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
        const session = getSession();
        const res = await fetch(`/api/story/admin/vault/download/${targetFile.id}`, {
          headers: { 'Authorization': `Bearer ${session}` }
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
  }, [getSession, vaultFiles, albumIndex]);

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
  };
};
