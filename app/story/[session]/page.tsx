'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Story {
  title: string;
  paragraphs: string[];
  hiddenMessage: string | null;
  messageAuthor: string | null;
}

interface MediaItem {
  id: number;
  message_type: 'image' | 'video';
  media_url: string;
  media_filename: string;
  author: string;
  created_at: string;
}

export default function StoryViewer() {
  const params = useParams();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [isDecoded, setIsDecoded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [lastLetterTapped, setLastLetterTapped] = useState(false);
  const [showMediaItems, setShowMediaItems] = useState(false);
  const paragraph3Ref = useRef<HTMLParagraphElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if session exists
    const session = sessionStorage.getItem('story_session');
    if (!session || session !== params.session) {
      router.push('/story');
      return;
    }

    loadStory();
    
    // Auto-logout on window close/unload
    const handleUnload = () => {
      sessionStorage.removeItem('story_session');
      fetch('/api/story/auth', { method: 'DELETE' });
    };
    
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [params.session, router]);

  const loadStory = async () => {
    try {
      const res = await fetch('/api/story/current', {
        headers: { 'Authorization': `Bearer ${params.session}` }
      });

      if (!res.ok) {
        sessionStorage.removeItem('story_session');
        router.push('/story');
        return;
      }

      const data = await res.json();
      setStory(data.story);
      setUsername(data.username);
      
      // Load media
      loadMedia();
    } catch (err) {
      console.error('Error loading story:', err);
      router.push('/story');
    }
  };

  const loadMedia = async () => {
    try {
      const res = await fetch('/api/story/current-media', {
        headers: { 'Authorization': `Bearer ${params.session}` }
      });

      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.media);
      }
    } catch (err) {
      console.error('Error loading media:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    setUploadError('');

    try {
      // Detect file type first to determine size limit
      const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|avi|mkv)$/i);
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i);
      
      // Validate file before upload - different limits for images vs videos
      const fileSizeMB = file.size / 1024 / 1024;
      const maxSizeMB = isVideo ? 100 : 50; // Videos: 100MB, Images: 50MB
      
      if (fileSizeMB > maxSizeMB) {
        setUploadError(`File too large: ${fileSizeMB.toFixed(2)}MB. Maximum size is ${maxSizeMB}MB for ${isVideo ? 'videos' : 'images'}.`);
        setIsUploadingMedia(false);
        return;
      }

      if (!isImage && !isVideo) {
        setUploadError('Unsupported file type. Please select an image or video file.');
        setIsUploadingMedia(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('author', username);
      
      // Auto-detect type (prioritize video detection)
      const messageType = isVideo ? 'video' : 'image';
      formData.append('type', messageType);

      const res = await fetch('/api/story/upload-media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${params.session}` },
        body: formData
      });

      const responseData = await res.json();

      if (res.ok) {
        // Reload media
        await loadMedia();
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Clear any previous errors
        setUploadError('');
        // Hide upload section after successful upload
        setShowUploadSection(false);
      } else {
        // Show detailed error message
        const errorMsg = responseData.error || 'Failed to upload file';
        const details = responseData.details ? ` (${responseData.details})` : '';
        const hint = responseData.hint ? `\n\n${responseData.hint}` : '';
        setUploadError(`${errorMsg}${details}${hint}`);
        console.error('Upload error response:', responseData);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(`Network error: ${errorMsg}. Please check your connection and try again.`);
      console.error('Upload error:', err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleLetterClick = (letter: string, charIndex: number, paragraphIndex: number) => {
    if (paragraphIndex !== 0) return; // Only first paragraph interactive
    
    const firstParagraph = story?.paragraphs[0] || '';
    const firstTIndex = firstParagraph.toLowerCase().indexOf('t');
    const firstCIndex = firstParagraph.toLowerCase().indexOf('c');

    if (letter.toLowerCase() === 't' && charIndex === firstTIndex) {
      // Clicking 't' ONLY toggles the decoded message
      // It should NEVER show media items - media is controlled by last letter only
      setIsDecoded(!isDecoded);
      setIsEditing(false); // Close editor if open
      // Do NOT modify showMediaItems here at all - keep it completely separate
    } else if (letter.toLowerCase() === 'c' && charIndex === firstCIndex) {
      setIsEditing(true);
      setIsDecoded(false); // Close decoder if open
      setMessageInput('');
      setTimeout(() => {
        paragraph3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleLastLetterClick = () => {
    if (!lastLetterTapped) {
      // First tap: show upload section only, keep media hidden
      setLastLetterTapped(true);
      setShowUploadSection(true);
      setShowMediaItems(false); // Explicitly keep media hidden on first tap
    } else {
      // Second tap onwards: toggle media items visibility only
      setShowMediaItems(prev => !prev);
    }
  };

  const saveMessage = async () => {
    if (!messageInput.trim()) return;
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/story/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${params.session}`
        },
        body: JSON.stringify({ message: messageInput.trim(), author: username })
      });

      if (res.ok) {
        setIsEditing(false);
        setMessageInput('');
        await loadStory(); // Refresh to show saved state
      }
    } catch (err) {
      console.error('Error saving message:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveMessage();
    }
  };

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-lg text-gray-600">Loading story...</div>
      </div>
    );
  }

  const renderParagraph = (text: string, index: number) => {
    // First paragraph - make first 't' and 'c' clickable
    if (index === 0) {
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
                style={isClickable ? { textDecoration: 'none' } : {}}
              >
                {char}
              </span>
            );
          })}
        </p>
      );
    }

    // Third paragraph (index 2) - show hidden message or editor
    if (index === 2) {
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
                placeholder="Type message..."
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

    // Last paragraph - make last letter clickable to show upload section
    const isLastParagraph = index === story.paragraphs.length - 1;
    if (isLastParagraph && text.length > 0) {
      const lastCharIndex = text.length - 1;
      const lastChar = text[lastCharIndex];
      
      return (
        <p key={index} className="mb-6 leading-relaxed text-lg">
          {text.split('').map((char, i) => {
            const isLastLetter = i === lastCharIndex;
            return (
              <span
                key={i}
                onClick={() => isLastLetter && handleLastLetterClick()}
                className={isLastLetter ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''}
              >
                {char}
              </span>
            );
          })}
        </p>
      );
    }

    // All other paragraphs - regular text
    return (
      <p key={index} className="mb-6 leading-relaxed text-lg">
        {text}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Story Content */}
        <div className="bg-white rounded-lg shadow-xl p-12">
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
        </div>

        {/* Media Upload Section - Only show when last letter is tapped */}
        {showUploadSection && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              📷 Share Photos & Videos
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Share a picture or video! It will automatically disappear after 7 days.
            </p>
            
            <div className="mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.heic,.heif"
                onChange={handleFileUpload}
                disabled={isUploadingMedia}
                className="block w-full text-sm text-gray-600
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-orange-50 file:text-orange-700
                  hover:file:bg-orange-100
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-2">
                Supported: JPEG, PNG, GIF, WebP, HEIC (iOS), MP4, WebM, MOV, AVI, MKV. Max size: Images 50MB, Videos 100MB
              </p>
              {isUploadingMedia && (
                <div className="mt-2">
                  <p className="text-sm text-blue-600">Uploading... Please wait</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '50%' }}></div>
                  </div>
                </div>
              )}
              {uploadError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-semibold">Upload Failed</p>
                  <p className="text-xs text-red-600 mt-1 whitespace-pre-line">{uploadError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Display Current Media - Only show when showMediaItems is true */}
        {showMediaItems && mediaItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h3 className="text-xl font-bold mb-4 text-gray-800">📸 Shared Photos & Videos:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mediaItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                  {item.message_type === 'image' ? (
                    <img 
                      src={item.media_url} 
                      alt={item.media_filename}
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                  ) : (
                    <video 
                      src={item.media_url} 
                      controls
                      className="w-full h-48 rounded-lg mb-2"
                    />
                  )}
                  <div className="text-xs text-gray-600">
                    <div className="font-semibold">{item.author}</div>
                    <div>{new Date(item.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



