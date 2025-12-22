'use client';

import { useEffect, useState, useRef } from 'react';
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

    const storedUsername = sessionStorage.getItem('story_username');
    if (storedUsername) {
      setUsername(storedUsername);
    }

    loadStory();
    loadMedia();

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
      if (data.username) {
        setUsername(data.username);
        sessionStorage.setItem('story_username', data.username);
      }
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
    if (!confirm('Remove this memory?')) return;

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

          let isClickable = false;
          if (isFirstParagraph) {
            const isFirstT = lowerChar === 't' && !tFound;
            const isFirstC = lowerChar === 'c' && !cFound;
            if (isFirstT) tFound = true;
            if (isFirstC) cFound = true;
            isClickable = isFirstT || isFirstC;
          }

          if (isLastParagraph && isLastChar) {
            isClickable = true;
          }

          return (
            <span
              key={i}
              onClick={() => isClickable && handleLetterClick(char, i, index, isLastChar)}
              className={isClickable ? 'cursor-pointer hover:text-amber-700 transition-colors' : ''}
            >
              {char}
            </span>
          );
        })}

        {/* Third paragraph: show note or editor - styled to blend in naturally */}
        {isThirdParagraph && (
          <>
            {isDecoded && (story?.hiddenMessage || story?.adminMessage) && (
              <span className="ml-1 text-gray-600 italic">
                {story?.adminMessage || story?.hiddenMessage}
              </span>
            )}
            {isEditing && (
              <span className="inline-flex items-center gap-2 ml-2 align-middle">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && saveMessage()}
                  className="border-b border-gray-300 outline-none px-2 py-1 bg-transparent min-w-[200px] focus:border-gray-500 text-gray-600"
                  autoFocus
                  placeholder="Add a note..."
                  disabled={isSaving}
                />
                <button
                  onClick={saveMessage}
                  disabled={isSaving || !messageInput.trim()}
                  className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded hover:bg-amber-200 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                >
                  {isSaving ? '...' : '✓'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="flex items-center gap-3 text-lg text-gray-500">
          <span className="animate-pulse">📖</span>
          Opening story...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Story Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-amber-100">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-gray-800 font-serif">
            {story.title}
          </h1>
          <div className="prose prose-lg max-w-none font-serif">
            {story.paragraphs.map((paragraph, index) => (
              <div key={index}>
                {renderParagraph(paragraph, index)}
              </div>
            ))}
          </div>

          {/* Subtle footer decoration */}
          <div className="mt-8 text-center text-amber-300 text-2xl">
            ✦ ✦ ✦
          </div>
        </div>

        {/* Media Section - styled as "Story Memories" */}
        {showMediaSection && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg p-6 border border-amber-100 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-gray-700">Story Memories</h2>
              <button
                onClick={() => setShowMediaSection(false)}
                className="text-gray-300 hover:text-gray-500 transition-colors"
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
                className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${isUploadingMedia ? 'border-amber-200 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'}`}
              >
                {isUploadingMedia ? (
                  <div className="space-y-2">
                    <div className="text-2xl animate-pulse">📷</div>
                    <p className="text-gray-500">Saving memory...</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-xs mx-auto">
                      <div
                        className="bg-amber-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-3xl block mb-2">📷</span>
                    <p className="text-gray-500">Add a memory</p>
                    <p className="text-gray-300 text-sm mt-1">Photos & videos</p>
                  </>
                )}
              </label>
              {uploadError && (
                <p className="text-red-400 text-sm mt-2 text-center">{uploadError}</p>
              )}
            </div>

            {/* Media Gallery */}
            {mediaItems.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer group shadow-sm hover:shadow-md transition-shadow"
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
                        <span className="text-3xl">🎬</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-300 py-6 font-serif italic">
                No memories yet
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
                className="absolute -top-10 right-0 text-white/70 text-2xl hover:text-white"
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

              <div className="mt-4 flex items-center justify-between text-white/70">
                <p className="text-sm">
                  {new Date(selectedMedia.createdAt).toLocaleDateString()}
                </p>
                {selectedMedia.author === username && (
                  <button
                    onClick={() => deleteMedia(selectedMedia.id)}
                    className="text-red-300 hover:text-red-200 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
