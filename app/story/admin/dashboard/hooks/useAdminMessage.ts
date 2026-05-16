import { useState, useCallback } from 'react';

// Safe JSON parse — server may return HTML on 502/504 timeout
async function safeJson(res: Response): Promise<{ error?: string; [k: string]: unknown }> {
  try {
    return await res.json();
  } catch {
    return { error: `Server error (${res.status})` };
  }
}

// 5-minute timeout for video uploads on mobile (matches server maxDuration)
const UPLOAD_TIMEOUT_MS = 300_000;

export const useAdminMessage = (getSession: () => string | null, onMessageSent: () => Promise<void>) => {
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState('');

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
  }, []);

  const handleAudioSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAudio(file);
      setSelectedImage(null);
      setImagePreview(null);
    }
  }, []);

  const clearAudio = useCallback(() => {
    setSelectedAudio(null);
  }, []);

  const handleVideoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedVideo(file);
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedAudio(null);
    }
  }, []);

  const clearVideo = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  const handleDocumentSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDocument(file);
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedAudio(null);
      setSelectedVideo(null);
    }
  }, []);

  const clearDocument = useCallback(() => {
    setSelectedDocument(null);
  }, []);

  const sendAdminMessage = useCallback(async () => {
    if (!adminMessage.trim() && !selectedImage && !selectedAudio && !selectedVideo && !selectedDocument) return;

    if (adminMessage.length > 50000) {
      setMessageError('Message too long (max 50,000 characters)');
      return;
    }

    setSendingMessage(true);
    setMessageSent(false);
    setMessageError('');

    try {
      const session = getSession();

      if (selectedDocument) {
        if (selectedDocument.size > 50 * 1024 * 1024) {
          const sizeMB = (selectedDocument.size / (1024 * 1024)).toFixed(1);
          setMessageError(`Document is too large (${sizeMB}MB). Maximum is 50MB.`);
          setSendingMessage(false);
          return;
        }

        setUploadingDocument(true);
        const formData = new FormData();
        formData.append('file', selectedDocument);
        formData.append('caption', adminMessage.trim());

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

        const res = await fetch('/api/story/admin/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session}` },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await safeJson(res);
        setUploadingDocument(false);

        if (res.ok) {
          setAdminMessage('');
          setSelectedDocument(null);
          setMessageSent(true);
          await onMessageSent();
          setTimeout(() => setMessageSent(false), 3000);
        } else {
          setMessageError(data.error || 'Failed to send document');
        }
      } else if (selectedVideo) {
        // Pre-upload size check
        if (selectedVideo.size > 500 * 1024 * 1024) {
          const sizeMB = (selectedVideo.size / (1024 * 1024)).toFixed(1);
          setMessageError(`Video is too large (${sizeMB}MB). Maximum is 500MB. Try trimming the video or recording at lower quality (720p instead of 4K).`);
          setSendingMessage(false);
          return;
        }

        setUploadingVideo(true);
        const formData = new FormData();
        formData.append('file', selectedVideo);
        formData.append('caption', adminMessage.trim());

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

        const res = await fetch('/api/story/admin/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session}` },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await safeJson(res);
        setUploadingVideo(false);

        if (res.ok) {
          setAdminMessage('');
          setSelectedVideo(null);
          setMessageSent(true);
          await onMessageSent();
          setTimeout(() => setMessageSent(false), 3000);
        } else {
          setMessageError(data.error || 'Failed to send video');
        }
      } else if (selectedAudio) {
        setUploadingAudio(true);
        const formData = new FormData();
        formData.append('file', selectedAudio);
        formData.append('caption', adminMessage.trim());

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

        const res = await fetch('/api/story/admin/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session}` },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await safeJson(res);
        setUploadingAudio(false);

        if (res.ok) {
          setAdminMessage('');
          setSelectedAudio(null);
          setMessageSent(true);
          await onMessageSent();
          setTimeout(() => setMessageSent(false), 3000);
        } else {
          setMessageError(data.error || 'Failed to send audio');
        }
      } else if (selectedImage) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append('caption', adminMessage.trim());

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

        const res = await fetch('/api/story/admin/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session}` },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await safeJson(res);
        setUploadingImage(false);

        if (res.ok) {
          setAdminMessage('');
          setSelectedImage(null);
          setImagePreview(null);
          setMessageSent(true);
          await onMessageSent();
          setTimeout(() => setMessageSent(false), 3000);
        } else {
          setMessageError(data.error || 'Failed to send image');
        }
      } else {
        // Text-only send. Server may 409 with requires_overwrite_confirm:true
        // when there's already a hidden_message for the current week
        // (Session 113 V2 Story F-4.1 / architectural rule #127). When that
        // happens we show the existing message + ask the admin to confirm
        // overwrite, then re-POST with acknowledge_overwrite:true.
        const sendOnce = async (acknowledge: boolean): Promise<Response> => {
          return fetch('/api/story/admin/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session}`,
            },
            body: JSON.stringify(
              acknowledge
                ? { message: adminMessage.trim(), acknowledge_overwrite: true }
                : { message: adminMessage.trim() }
            ),
          });
        };

        let res = await sendOnce(false);
        let data = await safeJson(res);

        if (res.status === 409 && (data as { requires_overwrite_confirm?: boolean }).requires_overwrite_confirm) {
          const existing = (data as {
            existing?: { message?: string; author?: string | null; updated_at?: string | null };
          }).existing || {};
          const preview = (existing.message || '').trim();
          const author = existing.author ? ` (from ${existing.author})` : '';
          const when = existing.updated_at
            ? ` on ${new Date(existing.updated_at).toLocaleString()}`
            : '';
          const truncated = preview.length > 400 ? preview.slice(0, 400) + '…' : preview;
          const ok = typeof window !== 'undefined'
            ? window.confirm(
                `There's already a message for this week${author}${when}:\n\n` +
                `"${truncated}"\n\n` +
                `Sending will OVERWRITE it. Continue?`
              )
            : false;

          if (!ok) {
            setMessageError('Send cancelled — existing message kept.');
            return;
          }

          res = await sendOnce(true);
          data = await safeJson(res);
        }

        if (res.ok) {
          setAdminMessage('');
          setMessageSent(true);
          await onMessageSent();
          setTimeout(() => setMessageSent(false), 3000);
        } else {
          setMessageError(data.error || 'Failed to send');
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessageError('Upload timed out — try a smaller file or use WiFi.');
      } else {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Admin Send] Upload failed:', errMsg);
        setMessageError(`Upload failed: ${errMsg}. Check your connection and try again.`);
      }
    } finally {
      setSendingMessage(false);
      setUploadingImage(false);
      setUploadingAudio(false);
      setUploadingVideo(false);
      setUploadingDocument(false);
    }
  }, [adminMessage, selectedImage, selectedAudio, selectedVideo, selectedDocument, getSession, onMessageSent]);

  const clearAllMedia = useCallback(() => {
    setAdminMessage('');
    setMessageError('');
    clearImage();
    clearAudio();
    clearVideo();
    clearDocument();
  }, [clearImage, clearAudio, clearVideo, clearDocument]);

  return {
    adminMessage,
    setAdminMessage,
    sendingMessage,
    messageSent,
    messageError,
    selectedImage,
    imagePreview,
    uploadingImage,
    selectedAudio,
    uploadingAudio,
    selectedVideo,
    uploadingVideo,
    handleImageSelect,
    clearImage,
    handleAudioSelect,
    clearAudio,
    handleVideoSelect,
    clearVideo,
    selectedDocument,
    uploadingDocument,
    handleDocumentSelect,
    clearDocument,
    sendAdminMessage,
    clearAllMedia
  };
};
