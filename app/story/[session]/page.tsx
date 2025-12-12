'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Story {
  title: string;
  paragraphs: string[];
  hiddenMessage: string | null;
  messageAuthor: string | null;
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
  const paragraph3Ref = useRef<HTMLParagraphElement>(null);

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
    } catch (err) {
      console.error('Error loading story:', err);
      router.push('/story');
    }
  };

  const handleLetterClick = (letter: string, charIndex: number, paragraphIndex: number) => {
    if (paragraphIndex !== 0) return; // Only first paragraph interactive
    
    const firstParagraph = story?.paragraphs[0] || '';
    const firstTIndex = firstParagraph.toLowerCase().indexOf('t');
    const firstCIndex = firstParagraph.toLowerCase().indexOf('c');

    if (letter.toLowerCase() === 't' && charIndex === firstTIndex) {
      setIsDecoded(!isDecoded);
      setIsEditing(false); // Close editor if open
    } else if (letter.toLowerCase() === 'c' && charIndex === firstCIndex) {
      setIsEditing(true);
      setIsDecoded(false); // Close decoder if open
      setMessageInput('');
      setTimeout(() => {
        paragraph3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
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

    // All other paragraphs - regular text
    return (
      <p key={index} className="mb-6 leading-relaxed text-lg">
        {text}
      </p>
    );
  };

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
      </div>
    </div>
  );
}



