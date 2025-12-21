'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Story {
  title: string;
  paragraphs: string[];
  hiddenMessage: string | null;
  messageAuthor: string | null;
  adminMessage: string | null;
}

interface MediaItem {
  id: number;
  author: string;
  type: 'image' | 'video';
  url: string;
  filename: string;
  mimeType: string;
  thumbnailUrl: string | null;
  createdAt: string;
  isFromAdmin: boolean;
}

export default function StoryViewer() {
  const params = useParams();
  const router = useRouter();
  const session = params.session as string;
  
  // Story state
  const [story, setStory] = useState<Story | null>(null);
  const [username, setUsername] = useState('');
  
  // Interaction state
  const [isDecoded, setIsDecoded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Media state
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  
  // Refs
  const paragraph3Ref = useRef<HTMLParagraphElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastParagraphRef = useRef<HTMLParagraphElement>(null);

  // Heartbeat to keep session alive
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/story/current', {
        headers: { 'Authorization': `Bearer ${session}` }
      }).catch(() => {});
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [session]);

  // Initial load
  useEffect(() => {
    const storedSession = sessionStorage.getItem('story_session');
    if (!storedSession || storedSession !== session) {
      router.push('/story');
      return;
    }

    loadStory();
    loadMedia();
    
    // Auto-logout on window close
    const handleUnload = () => {
      sessionStorage.removeItem('story_session');
      sessionStorage.removeItem('story_username');
      navigator.sendBeacon('/api/story/auth', JSON.stringify({ action: 'logout' }));
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [session, router]);

  const loadStory = async () => {
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
    } catch (err) {
      console.error('Error loading story:', err);
      router.push('/story');
    }
  };

  const loadMedia = async () => {
    try {
      const res = await fetch('/api/story/current-media', {
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.media || []);
      }
    } catch (err) {
      console.error('Error loading media:', err);
    }
  };

  // Handle letter clicks
  const handleLetterClick = (letter: string, charIndex: number, paragraphIndex: number, isLastLetter: boolean) => {
    // First paragraph: 't' toggles decode, 'c' opens editor
    if (paragraphIndex === 0) {
      const firstParagraph = story?.paragraphs[0] || '';
      const firstTIndex = firstParagraph.toLowerCase().indexOf('t');
      const firstCIndex = firstParagraph.toLowerCase().indexOf('c');

      if (letter.toLowerCase() === 't' && charIndex === firstTIndex) {
        setIsDecoded(!isDecoded);
        setIsEditing(false);
        setShowMediaSection(false);
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
    
    // Last paragraph, last letter: toggle media section
    if (paragraphIndex === (story?.paragraphs.length || 0) - 1 && isLastLetter) {
      setShowMediaSection(!showMediaSection);
      setIsDecoded(false);
      setIsEditing(false);
      if (!showMediaSection) {
        setTimeout(() => {
          lastParagraphRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  };

  // Save text message
  const saveMessage = async () => {
    if (!messageInput.trim()) return;
    
    setIsSaving(true);
    try {
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
    } catch (err) {
      console.error('Error saving message:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setIsUploadingMedia(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('author', username);

    try {
      const res = await fetch('/api/story/upload-media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}` },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        await loadMedia();
        setUploadProgress(100);
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch (err) {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete media
  const deleteMedia = async (mediaId: number) => {
    if (!confirm('Delete this media?')) return;

    try {
      const res = await fetch(`/api/story/upload-media?id=${mediaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (res.ok) {
        await loadMedia();
        setSelectedMedia(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Render paragraph with interactive letters
  const renderParagraph = (text: string, index: number) => {
    const isFirstParagraph = index === 0;
    const isLastParagraph = index === (story?.paragraphs.length || 0) - 1;
    const isThirdParagraph = index === 2;

    // Track which special letters have been found
    let tFound = false;
    let cFound = false;

    return (
      <p 
        ref={isThirdParagraph ? paragraph3Ref : (isLastParagraph ? lastParagraphRef : null)}
        className="mb-6 leading-relaxed text-lg text-gray-700"
      >
        {text.split('').map((char, i) => {
          const lowerChar = char.toLowerCase();
          const isLastChar = i === text.length - 1;
          
          // First paragraph interactions
          let isClickable = false;
          if (isFirstParagraph) {
            const isFirstT = lowerChar === 't' && !tFound;
            const isFirstC = lowerChar === 'c' && !cFound;
            if (isFirstT) tFound = true;
            if (isFirstC) cFound = true;
            isClickable = isFirstT || isFirstC;
          }
          
          // Last paragraph, last letter
          if (isLastParagraph && isLastChar) {
            isClickable = true;
          }

          return (
            <span
              key={i}
              onClick={() => isClickable && handleLetterClick(char, i, index, isLastChar)}
              className={isClickable ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''}
            >
              {char}
            </span>
          );
        })}
        
        {/* Third paragraph: show hidden message or editor */}
        {isThirdParagraph && (
          <>
            {isDecoded && (story?.hiddenMessage || story?.adminMessage) && (
              <span className="ml-2 text-indigo-600 font-medium animate-fade-in">
                {story?.adminMessage || story?.hiddenMessage}
                {story?.messageAuthor && !story?.adminMessage && (
                  <span className="text-gray-400 text-sm ml-2">— {story.messageAuthor}</span>
                )}
              </span>
            )}
            {isEditing && (
              <span className="inline-flex items-center gap-2 ml-2 align-middle">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && saveMessage()}
                  className="border-b-2 border-indigo-400 outline-none px-2 py-1 bg-transparent min-w-[200px] focus:border-indigo-600"
                  autoFocus
                  placeholder="Type your message..."
                  disabled={isSaving}
                />
                <button
                  onClick={saveMessage}
                  disabled={isSaving || !messageInput.trim()}
                  className="text-sm bg-indigo-500 text-white px-4 py-1 rounded-lg hover:bg-indigo-600 disabled:bg-gray-400 transition-colors"
                >
                  {isSaving ? '⏳' : '💾'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-sm bg-gray-200 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ✕
                </button>
              </span>
            )}
          </>
        )}
      </p>
    );
  };

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="flex items-center gap-3 text-lg text-gray-600">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading story...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Story Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-gray-800 font-serif">
            {story.title}
          </h1>
          <div className="prose prose-lg max-w-none">
            {story.paragraphs.map((paragraph, index) => (
              <div key={index}>
                {renderParagraph(paragraph, index)}
              </div>
            ))}
          </div>
        </div>

        {/* Media Section */}
        {showMediaSection && (
          <div className="mt-6 bg-white rounded-2xl shadow-xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">📸 Shared Moments</h2>
              <button
                onClick={() => setShowMediaSection(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Upload Area */}
            <div className="mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="media-upload"
              />
              <label
                htmlFor="media-upload"
                className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                  ${isUploadingMedia ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'}`}
              >
                {isUploadingMedia ? (
                  <div className="space-y-2">
                    <div className="animate-spin text-3xl">⏳</div>
                    <p className="text-indigo-600">Uploading...</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-4xl block mb-2">📷</span>
                    <p className="text-gray-600">Tap to upload photo or video</p>
                    <p className="text-gray-400 text-sm mt-1">Max: 10MB images, 50MB videos</p>
                  </>
                )}
              </label>
              {uploadError && (
                <p className="text-red-500 text-sm mt-2 text-center">{uploadError}</p>
              )}
            </div>

            {/* Media Gallery */}
            {mediaItems.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
                    onClick={() => setSelectedMedia(item)}
                  >
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-xs truncate">{item.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">
                No photos or videos yet. Be the first to share!
              </p>
            )}
          </div>
        )}

        {/* Media Lightbox */}
        {selectedMedia && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMedia(null)}
          >
            <div 
              className="max-w-4xl max-h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
              >
                ✕
              </button>
              
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.url}
                  alt=""
                  className="max-w-full max-h-[80vh] rounded-lg"
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] rounded-lg"
                />
              )}
              
              <div className="mt-4 flex items-center justify-between text-white">
                <div>
                  <p className="font-medium">{selectedMedia.author}</p>
                  <p className="text-sm text-gray-400">
                    {new Date(selectedMedia.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedMedia.author === username && (
                  <button
                    onClick={() => deleteMedia(selectedMedia.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
