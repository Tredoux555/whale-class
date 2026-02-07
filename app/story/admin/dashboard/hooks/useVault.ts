import { useState, useCallback } from 'react';
import { VaultFile } from '../types';

export const useVault = (getSession: () => string | null) => {
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [uploadingVault, setUploadingVault] = useState(false);
  const [vaultError, setVaultError] = useState('');

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
        await loadVaultFiles();
      } else {
        setVaultError('Invalid password');
      }
    } catch {
      setVaultError('Error unlocking vault');
    }
  }, [getSession, vaultPassword, loadVaultFiles]);

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
      } else {
        setVaultError(data.error || 'Upload failed');
      }
    } catch {
      setVaultError('Upload failed');
    } finally {
      setUploadingVault(false);
    }
  }, [getSession, loadVaultFiles]);

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
        await loadVaultFiles();
      }
    } catch {
      setVaultError('Delete failed');
    }
  }, [getSession, loadVaultFiles]);

  return {
    vaultPassword,
    setVaultPassword,
    vaultUnlocked,
    setVaultUnlocked,
    vaultFiles,
    uploadingVault,
    vaultError,
    setVaultError,
    loadVaultFiles,
    handleVaultUnlock,
    handleVaultUpload,
    handleVaultDownload,
    handleVaultDelete
  };
};
