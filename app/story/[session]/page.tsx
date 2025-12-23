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
  
  // Track last seen message to detect new ones
  const [lastMessageTime, setLastMessageTime] = useState<string | null>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  // Media state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
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

  // Check for new messages periodically (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadStory(true); // Silent refresh
    }, 10000);
    
    return () => clearInterval(interval);
  }, [loadStory]);

  useEffect(() => {
    const session = getSession();
    if (!session || session !== params.session) {
      router.push('/story');
      return;
    }

    loadStory();
    loadMedia();
    
    // Auto-logout on window close
    const handleUnload = () => {
      sessionStorage.removeItem('story_session');
      fetch('/api/story/auth', { method: 'DELETE' }).catch(() => {});
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [params.session, router, loadStory, loadMedia, getSession]);

  // Handle letter clicks
  const handleLetterClick = async (letter: string, charIndex: number, paragraphIndex: number) => {
    if (!story) return;

    // First paragraph: 't' and 'c' interactions
    if (paragraphIndex === 0) {
      const firstParagraph = story.paragraphs[0] || '';
      const firstTIndex = firstParagraph.toLowerCase().indexOf('t');
      const firstCIndex = firstParagraph.toLowerCase().indexOf('c');

      if (letter.toLowerCase() === 't' && charIndex === firstTIndex) {
        // Refresh story to get latest message before showing
        await loadStory(true);
        setIsDecoded(!isDecoded);
        setIsEditing(false);
        setShowMediaSection(false);
        setHasNewMessage(false); // Clear new message indicator
      } else if (letter.toLowerCase() === 'c' && charIndex === firstCIndex) {
        setIsEditing(true);
        setIsDecoded(false);
        setShowMediaSection(false);
        setMessageInput('');
        setTimeout(() => {
          paragraph3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
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
      }
    }
  };

  // Save text message
  const saveMessage = async () => {
    if (!messageInput.trim()) return;
    
    setIsSaving(true);
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

      if (res.ok) {
        setIsEditing(false);
        setMessageInput('');
        await loadStory();
      }
    } catch {
      // Handle silently
    } finally {
      setIsSaving(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    setUploadError('');

    try {
      const session = getSession();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/story/upload-media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}` },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        await loadMedia();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploadingMedia(false);
    }
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

  // Render paragraph with interactive letters
  const renderParagraph = (text: string, index: number) => {
    if (!story) return null;

    const isFirstParagraph = index === 0;
    const isLastParagraph = index === story.paragraphs.length - 1;
    const isThirdParagraph = index === 2;

    // First paragraph - make first 't' and 'c' clickable
    if (isFirstParagraph) {
      let tFound = false;
      let cFound = false;
      
      return (
        <p className="mb-6 leading-relaxed text-lg">
          {text.split('').map((char, i) => {
            const lowerChar = char.toLowerCase();
            const isFirstT = lowerChar === 't' && !tFound;
            const isFirstC = lowerChar === 'c' && !cFound;
            
            if (isFirstT) tFound = true;
            if (isFirstC) cFound = true;
            
            const isClickable = isFirstT || isFirstC;
            
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
                onClick={() => setIsEditing(false)}
                className="ml-2 text-sm bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
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
                <p className="mt-2 text-sm text-indigo-600 animate-pulse">Uploading...</p>
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
                  {mediaItems.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No classroom photos or songs shared yet today.
                    </p>
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
