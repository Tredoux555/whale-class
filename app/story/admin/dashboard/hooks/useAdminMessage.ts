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

  const sendAdminMessage = useCallback(async () => {
    if (!adminMessage.trim() && !selectedImage && !selectedAudio && !selectedVideo) return;

    setSendingMessage(true);
    setMessageSent(false);
    setMessageError('');

    try {
      const session = getSession();

      if (selectedVideo) {
        // Pre-upload size check
        if (selectedVideo.size > 300 * 1024 * 1024) {
          const sizeMB = (selectedVideo.size / (1024 * 1024)).toFixed(1);
          setMessageError(`Video is too large (${sizeMB}MB). Maximum is 300MB. Try a shorter video or lower quality.`);
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
        const res = await fetch('/api/story/admin/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session}`
          },
          body: JSON.stringify({ message: adminMessage.trim() })
        });
        const data = await safeJson(res);
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
    }
  }, [adminMessage, selectedImage, selectedAudio, selectedVideo, getSession, onMessageSent]);

  const clearAllMedia = useCallback(() => {
    setAdminMessage('');
    setMessageError('');
    clearImage();
    clearAudio();
    clearVideo();
  }, [clearImage, clearAudio, clearVideo]);

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
    sendAdminMessage,
    clearAllMedia
  };
};
