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
  const thumbnailsRef = useRef<Record<number, string>>({});

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

  // Load a single thumbnail
  const loadThumbnail = useCallback(async (fileId: number) => {
    if (thumbnailsRef.current[fileId]) return; // already loaded
    setLoadingThumbnails(prev => ({ ...prev, [fileId]: true }));
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
      }
    } catch (err) {
      console.error('Thumbnail load error:', err);
    } finally {
      setLoadingThumbnails(prev => ({ ...prev, [fileId]: false }));
    }
  }, [getSession]);

  // Load all image thumbnails progressively
  const loadAllThumbnails = useCallback(async (files: VaultFile[]) => {
    const imageFiles = files.filter(f => isImageFile(f.filename));
    // Load in batches of 3
    for (let i = 0; i < imageFiles.length; i += 3) {
      const batch = imageFiles.slice(i, i + 3);
      await Promise.all(batch.map(f => loadThumbnail(f.id)));
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
        // Reload thumbnails for new file
        if (data.file && isImageFile(data.file.filename || file.name)) {
          loadThumbnail(data.file.id);
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
          setThumbnails(prev => {
            const next = { ...prev };
            delete next[fileId];
            return next;
          });
        }
        await loadVaultFiles();
      }
    } catch {
      setVaultError('Delete failed');
    }
  }, [getSession, loadVaultFiles]);

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
        // Find album index
        const imageFiles = vaultFiles.filter(f => isImageFile(f.filename));
        const idx = imageFiles.findIndex(f => f.id === fileId);
        setAlbumIndex(idx >= 0 ? idx : 0);
      } else {
        alert('Failed to load image');
      }
    } catch (err) {
      console.error('View error:', err);
      alert('Failed to load image');
    } finally {
      setLoadingView(false);
    }
  }, [getSession, vaultFiles]);

  // Album navigation
  const navigateAlbum = useCallback(async (direction: 'prev' | 'next') => {
    const imageFiles = vaultFiles.filter(f => isImageFile(f.filename));
    if (imageFiles.length === 0) return;

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
        }
      } catch (err) {
        console.error('Album nav error:', err);
      } finally {
        setLoadingView(false);
      }
    }
  }, [getSession, vaultFiles, albumIndex]);

  const handleCloseViewer = useCallback(() => {
    // Don't revoke — we keep thumbnails cached
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
    // Album extras
    albumIndex,
    thumbnails,
    loadingThumbnails,
    navigateAlbum,
    loadThumbnail,
  };
};
