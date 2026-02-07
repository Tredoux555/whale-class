import { useState, useCallback } from 'react';
import { SharedFile } from '../types';

export const useSharedFiles = (getSession: () => string | null) => {
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [fileSuccess, setFileSuccess] = useState('');

  const loadSharedFiles = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch('/api/story/admin/files/list', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSharedFiles(data.files || []);
      }
    } catch {
      console.error('Failed to load shared files');
    }
  }, [getSession]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileError('');
    }
  }, []);

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setFileDescription('');
    setFileError('');
  }, []);

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile) return;
    setUploadingFile(true);
    setFileError('');
    setFileSuccess('');

    try {
      const session = getSession();
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (fileDescription.trim()) {
        formData.append('description', fileDescription.trim());
      }

      const res = await fetch('/api/story/admin/files/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}` },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setFileSuccess(`Uploaded: ${selectedFile.name}`);
        setSelectedFile(null);
        setFileDescription('');
        await loadSharedFiles();
        setTimeout(() => setFileSuccess(''), 3000);
      } else {
        setFileError(data.error || 'Upload failed');
      }
    } catch {
      setFileError('Connection error');
    } finally {
      setUploadingFile(false);
    }
  }, [selectedFile, fileDescription, getSession, loadSharedFiles]);

  const handleFileDelete = useCallback(async (fileId: number, filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return;

    try {
      const session = getSession();
      const res = await fetch(`/api/story/admin/files/delete/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (res.ok) {
        await loadSharedFiles();
      } else {
        const data = await res.json();
        alert(data.error || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    }
  }, [getSession, loadSharedFiles]);

  return {
    sharedFiles,
    selectedFile,
    fileDescription,
    setFileDescription,
    uploadingFile,
    fileError,
    fileSuccess,
    loadSharedFiles,
    handleFileSelect,
    clearSelectedFile,
    handleFileUpload,
    handleFileDelete
  };
};
