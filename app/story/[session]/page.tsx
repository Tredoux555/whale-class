'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Story {
  title: string;
  paragraphs: string[];
  hiddenMessage: string | null;
  messageAuthor: string | null;
}

interface MediaItem {
  id: number;
  type: 'image' | 'video' | 'audio';
  url: string;
  filename: string | null;
  author: string;
  created_at: string;
}

interface SharedFile {
  id: number;
  original_filename: string;
  file_size: number;
  mime_type: string;
  description: string | null;
  uploaded_by: string;
  created_at: string;
  public_url: string;
}

interface RecentMessage {
  id: number;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  mediaFilename: string | null;
  author: string;
  createdAt: string;
}

export default function StoryViewer() {
  const params = useParams();
  const router = useRouter();
  
  // Core state
  const [story, setStory] = useState<Story | null>(null);
  const [username, setUsername] = useState('');
  
  // Interaction state
  const [isDecoded, setIsDecoded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // Track last seen message to detect new ones
  const [lastMessageTime, setLastMessageTime] = useState<string | null>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  // Media state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Recent messages state
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [showRecentMessages, setShowRecentMessages] = useState(false);
  
  // Refs
  const paragraph3Ref = useRef<HTMLParagraphElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getSession = useCallback(() => {
    return sessionStorage.getItem('story_session');
  }, []);

  const loadStory = useCallback(async (silent = false) => {
    const session = getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/story/current', {
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (!res.ok) {
        sessionStorage.removeItem('story_session');
        router.push('/story');
        return;
      }

      const data = await res.json();
      setStory(data.story);
      setUsername(data.username);
      
      // Check if there's a new message
      if (data.story.hiddenMessage && data.story.updatedAt) {
        if (lastMessageTime && data.story.updatedAt !== lastMessageTime) {
          setHasNewMessage(true);
        }
        setLastMessageTime(data.story.updatedAt);
      }
    } catch {
      if (!silent) router.push('/story');
    }
  }, [router, getSession, lastMessageTime]);

  const loadMedia = useCallback(async () => {
    const session = getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/story/current-media', {
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.media || []);
      }
    } catch {
      // Non-critical, ignore
    }
  }, [getSession]);

  const loadSharedFiles = useCallback(async () => {
    const session = getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/story/shared-files', {
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSharedFiles(data.files || []);
      }
    } catch {
      // Non-critical, ignore
    }
  }, [getSession]);

  const loadRecentMessages = useCallback(async () => {
    const session = getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/story/recent-messages?limit=5', {
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (res.ok) {
        const data = await res.json();
        setRecentMessages(data.messages || []);
      }
    } catch {
      // Non-critical, ignore
    }
  }, [getSession]);

  // Check for new messages periodically (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadStory(true); // Silent refresh
    }, 10000);
    
    return () => clearInterval(interval);
  }, [loadStory]);

  // Send heartbeat every 30 seconds to track activity
  useEffect(() => {
    const sendHeartbeat = async () => {
      const session = getSession();
      if (!session) return;
      try {
        await fetch('/api/story/heartbeat', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session}` }
        });
      } catch {
        // Ignore heartbeat errors
      }
    };

    // Send initial heartbeat
    sendHeartbeat();
    
    // Then every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [getSession]);

  useEffect(() => {
    const session = getSession();
    if (!session || session !== params.session) {
      router.push('/story');
      return;
    }

    loadStory();
    loadMedia();
    loadSharedFiles();
    loadRecentMessages();
    
    // Auto-logout on window close
    const handleUnload = () => {
      sessionStorage.removeItem('story_session');
      fetch('/api/story/auth', { method: 'DELETE' }).catch(() => {});
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [params.session, router, loadStory, loadMedia, loadSharedFiles, loadRecentMessages, getSession]);

  // Handle letter clicks
  const handleLetterClick = async (letter: string, charIndex: number, paragraphIndex: number) => {
    if (!story) return;

    // First paragraph: 't', 'c', and 'm' interactions
    if (paragraphIndex === 0) {
      const firstParagraph = story.paragraphs[0] || '';
      const firstTIndex = firstParagraph.toLowerCase().indexOf('t');
      const firstCIndex = firstParagraph.toLowerCase().indexOf('c');
      const firstMIndex = firstParagraph.toLowerCase().indexOf('m');

      if (letter.toLowerCase() === 't' && charIndex === firstTIndex) {
        // Refresh story to get latest message before showing
        await loadStory(true);
        setIsDecoded(!isDecoded);
        setIsEditing(false);
        setShowMediaSection(false);
        setShowRecentMessages(false);
        setHasNewMessage(false); // Clear new message indicator
      } else if (letter.toLowerCase() === 'c' && charIndex === firstCIndex) {
        setIsEditing(true);
        setIsDecoded(false);
        setShowMediaSection(false);
        setShowRecentMessages(false);
        setMessageInput('');
        setTimeout(() => {
          paragraph3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else if (letter.toLowerCase() === 'm' && charIndex === firstMIndex) {
        // Toggle recent messages
        await loadRecentMessages();
        setShowRecentMessages(!showRecentMessages);
        setIsDecoded(false);
        setIsEditing(false);
        setShowMediaSection(false);
      }
    }

    // Last paragraph, last letter: media toggle
    const lastParagraphIndex = story.paragraphs.length - 1;
    if (paragraphIndex === lastParagraphIndex) {
      const lastParagraph = story.paragraphs[lastParagraphIndex] || '';
      const lastCharIndex = lastParagraph.length - 1;
      
      if (charIndex === lastCharIndex) {
        setShowMediaSection(!showMediaSection);
        setIsDecoded(false);
        setIsEditing(false);
        setShowRecentMessages(false);
      }
    }
  };

  // Save text message
  const saveMessage = async () => {
    if (!messageInput.trim()) return;
    
    setIsSaving(true);
    setSaveError('');
    try {
      const session = getSession();
      const res = await fetch('/api/story/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({ message: messageInput.trim(), author: username })
      });

      const data = await res.json();

      if (res.ok) {
        setIsEditing(false);
        setMessageInput('');
        setSaveError('');
        await loadStory();
      } else {
        // Show error to user
        setSaveError(data.error || 'Error, message not sent. Please contact Administrator.');
      }
    } catch {
      setSaveError('Error, message not sent. Please contact Administrator.');
    } finally {
      setIsSaving(false);
    }
  };

  // Compress image before upload (mobile photos can be 8-15MB)
  const compressImage = async (file: File): Promise<File> => {
    // Only compress images, skip video/audio
    if (!file.type.startsWith('image/')) return file;
    // Skip small images (under 2MB)
    if (file.size < 2 * 1024 * 1024) return file;
    // Skip GIFs (animation would be lost)
    if (file.type === 'image/gif') return file;

    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 2048;
      let width = bitmap.width;
      let height = bitmap.height;

      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;

      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
      const ext = file.name.split('.').pop()?.toLowerCase();
      const newName = ext && ['heic', 'heif'].includes(ext)
        ? file.name.replace(/\.[^.]+$/, '.jpg')
        : file.name;

      return new File([blob], newName, { type: 'image/jpeg' });
    } catch {
      // If compression fails, send original
      return file;
    }
  };

  // Handle file upload (with pre-validation, retry, and detailed errors)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Pre-upload validation — catch size issues before wasting bandwidth
    const isVideo = file.type.startsWith('video/') || /\.(mov|mp4|webm|avi|mkv|m4v|3gp)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name);
    const maxSize = isVideo ? 100 * 1024 * 1024 : isAudio ? 50 * 1024 * 1024 : 50 * 1024 * 1024;
    const maxLabel = isVideo ? '100MB' : '50MB';

    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError(`File is too large (${sizeMB}MB). Maximum size is ${maxLabel}. Try a shorter video or lower quality.`);
      return;
    }

    setIsUploadingMedia(true);
    setUploadError('');

    // Retry wrapper for transient network failures
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const session = getSession();

        // Compress images for faster mobile upload
        const uploadFile = await compressImage(file);

        const formData = new FormData();
        formData.append('file', uploadFile);

        // 3-min timeout — mobile video uploads on slow networks need time
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180_000);

        const res = await fetch('/api/story/upload-media', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session}` },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Safe JSON parse — server may return HTML on 502/504 timeout
        let data: { error?: string };
        try {
          data = await res.json();
        } catch {
          data = { error: `Server error (${res.status})` };
        }

        if (res.ok) {
          await loadMedia();
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setIsUploadingMedia(false);
          return; // Success — exit retry loop
        } else {
          // Server returned an error — don't retry (it's a validation or server error)
          setUploadError(data.error || 'Upload failed');
          setIsUploadingMedia(false);
          return;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setUploadError('Upload timed out — please try a smaller file or use WiFi.');
          setIsUploadingMedia(false);
          return; // Timeout — don't retry
        }

        // Transient network error — retry if attempts remain
        if (attempt < MAX_RETRIES) {
          console.warn(`[Upload] Attempt ${attempt + 1} failed, retrying...`, err);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // 1s, 2s backoff
          continue;
        }

        // All retries exhausted — show detailed error
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Upload] All attempts failed:', errMsg);
        setUploadError(`Upload failed: ${errMsg}. Check your connection and try again.`);
      }
    }
    setIsUploadingMedia(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveMessage();
    }
  };

  // Get display name for audio files
  const getAudioDisplayName = (item: MediaItem) => {
    if (item.filename) {
      return item.filename.replace(/\.[^/.]+$/, '').replace(/-|_/g, ' ');
    }
    return 'Shared Song';
  };

  // Get icon for file type
  const getFileIcon = (mimeType: string, filename: string) => {
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || filename.match(/\.docx?$/i)) return '📘';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || filename.match(/\.xlsx?$/i)) return '📗';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation') || filename.match(/\.pptx?$/i)) return '📙';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('text') || filename.match(/\.txt$/i)) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📎';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render paragraph with interactive letters
  const renderParagraph = (text: string, index: number) => {
    if (!story) return null;

    const isFirstParagraph = index === 0;
    const isLastParagraph = index === story.paragraphs.length - 1;
    const isThirdParagraph = index === 2;

    // First paragraph - make first 't', 'c', and 'm' clickable
    if (isFirstParagraph) {
      let tFound = false;
      let cFound = false;
      let mFound = false;
      
      return (
        <p className="mb-6 leading-relaxed text-lg">
          {text.split('').map((char, i) => {
            const lowerChar = char.toLowerCase();
            const isFirstT = lowerChar === 't' && !tFound;
            const isFirstC = lowerChar === 'c' && !cFound;
            const isFirstM = lowerChar === 'm' && !mFound;
            
            if (isFirstT) tFound = true;
            if (isFirstC) cFound = true;
            if (isFirstM) mFound = true;
            
            const isClickable = isFirstT || isFirstC || isFirstM;
            
            return (
              <span
                key={i}
                onClick={() => isClickable && handleLetterClick(char, i, index)}
                className={isClickable ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''}
              >
                {char}
              </span>
            );
          })}
          {hasNewMessage && (
            <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" title="New note available"></span>
          )}
        </p>
      );
    }

    // Third paragraph - show hidden message or editor
    if (isThirdParagraph) {
      const displayText = isDecoded && story.hiddenMessage
        ? text + ' ' + story.hiddenMessage
        : text;

      return (
        <p ref={paragraph3Ref} className="mb-6 leading-relaxed text-lg">
          {displayText}
          {isEditing && (
            <span className="inline-block ml-2 align-middle">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-b-2 border-gray-400 outline-none px-2 py-1 bg-transparent animate-pulse min-w-[200px]"
                autoFocus
                placeholder="Type note..."
                disabled={isSaving}
              />
              <button
                onClick={saveMessage}
                disabled={isSaving || !messageInput.trim()}
                className="ml-3 text-sm bg-indigo-500 text-white px-4 py-1 rounded hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? '⏳' : '💾'} Save
              </button>
              <button
                onClick={() => { setIsEditing(false); setSaveError(''); }}
                className="ml-2 text-sm bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              {saveError && (
                <span className="block mt-2 text-sm text-red-600 font-medium">
                  ⚠️ {saveError}
                </span>
              )}
            </span>
          )}
        </p>
      );
    }

    // Last paragraph - make last letter clickable
    if (isLastParagraph) {
      const lastIndex = text.length - 1;
      
      return (
        <p className="mb-6 leading-relaxed text-lg">
          {text.split('').map((char, i) => {
            const isLastChar = i === lastIndex;
            
            return (
              <span
                key={i}
                onClick={() => isLastChar && handleLetterClick(char, i, index)}
                className={isLastChar ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''}
              >
                {char}
              </span>
            );
          })}
        </p>
      );
    }

    // Regular paragraph
    return (
      <p className="mb-6 leading-relaxed text-lg">
        {text}
      </p>
    );
  };

  // Loading state
  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-lg text-gray-600">Loading classroom activities...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-12">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 font-serif">
          {story.title}
        </h1>
        
        <div className="prose prose-lg max-w-none">
          {story.paragraphs.map((paragraph, index) => (
            <div key={index}>
              {renderParagraph(paragraph, index)}
            </div>
          ))}
        </div>

        {/* Recent Messages Section */}
        {showRecentMessages && recentMessages.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <span>💬</span> Recent Notes from Teacher
            </h3>
            <div className="space-y-3">
              {recentMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {msg.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {msg.type === 'text' && msg.content && (
                        <p className="text-gray-800">{msg.content}</p>
                      )}
                      {msg.type === 'image' && msg.mediaUrl && (
                        <img src={msg.mediaUrl} alt="Shared" className="max-w-full h-auto rounded-lg max-h-48" />
                      )}
                      {msg.type === 'video' && msg.mediaUrl && (
                        <video src={msg.mediaUrl} controls className="max-w-full h-auto rounded-lg max-h-48" />
                      )}
                      {msg.type === 'audio' && msg.mediaUrl && (
                        <audio src={msg.mediaUrl} controls className="w-full" />
                      )}
                      {msg.content && msg.type !== 'text' && (
                        <p className="text-gray-600 text-sm mt-2">{msg.content}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {msg.author} • {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Media Section */}
        {showMediaSection && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            {/* Upload Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                Share classroom photos and songs 🎵
              </h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={handleFileUpload}
                disabled={isUploadingMedia}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100
                  disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-400">
                Supports: Images, Videos, and Audio (expires in 24 hours)
              </p>
              {isUploadingMedia && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-indigo-600">Uploading — please keep this page open...</p>
                </div>
              )}
              {uploadError && (
                <p className="mt-2 text-sm text-red-500">{uploadError}</p>
              )}
            </div>

            {/* Separate media by type */}
            {(() => {
              const images = mediaItems.filter(m => m.type === 'image');
              const videos = mediaItems.filter(m => m.type === 'video');
              const songs = mediaItems.filter(m => m.type === 'audio');

              return (
                <>
                  {/* Songs Section */}
                  {songs.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                        <span>🎵</span> Classroom Songs
                      </h3>
                      <div className="space-y-3">
                        {songs.map((item) => (
                          <div 
                            key={item.id} 
                            className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-lg">
                                🎵
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">
                                  {getAudioDisplayName(item)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Shared by {item.author} • {new Date(item.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <audio
                              src={item.url}
                              controls
                              className="w-full h-10"
                              preload="metadata"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photos Section */}
                  {images.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                        <span>📷</span> Classroom Photos
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {images.map((item) => (
                          <div key={item.id} className="rounded-lg overflow-hidden bg-gray-50">
                            <img
                              src={item.url}
                              alt={item.filename || 'Classroom photo'}
                              className="w-full h-48 object-cover"
                            />
                            <div className="p-2 text-sm text-gray-500">
                              <span className="font-medium">{item.author}</span>
                              <span className="mx-2">•</span>
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos Section */}
                  {videos.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                        <span>🎬</span> Classroom Videos
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {videos.map((item) => (
                          <div key={item.id} className="rounded-lg overflow-hidden bg-gray-50">
                            <video
                              src={item.url}
                              controls
                              className="w-full h-48 object-cover"
                            />
                            <div className="p-2 text-sm text-gray-500">
                              <span className="font-medium">{item.author}</span>
                              <span className="mx-2">•</span>
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {mediaItems.length === 0 && sharedFiles.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No classroom photos, songs, or documents shared yet.
                    </p>
                  )}

                  {/* Documents Section */}
                  {sharedFiles.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                        <span>📁</span> Classroom Documents
                      </h3>
                      <div className="space-y-2">
                        {sharedFiles.map((file) => (
                          <a
                            key={file.id}
                            href={file.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
                          >
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white text-2xl flex-shrink-0">
                              {getFileIcon(file.mime_type, file.original_filename)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">
                                {file.original_filename}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.file_size)} • Shared by {file.uploaded_by}
                                {file.description && <span className="ml-2 text-blue-600">— {file.description}</span>}
                              </p>
                            </div>
                            <div className="text-blue-600 text-sm font-medium flex-shrink-0">
                              Download ⬇
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
