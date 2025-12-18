'use client';

import { useState, useCallback } from 'react';
import { FlashcardPreview } from './FlashcardPreview';
import { FlashcardPDF } from './FlashcardPDF';

interface ExtractedFrame {
  timestamp: number;
  imageData: string; // base64
  lyric?: string;
}

interface ProcessingStatus {
  stage: 'idle' | 'downloading' | 'extracting' | 'detecting' | 'generating' | 'complete' | 'error';
  progress: number;
  message: string;
}

export function FlashcardMaker() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [sensitivity, setSensitivity] = useState(30); // Scene change threshold (0-100)
  const [minInterval, setMinInterval] = useState(2); // Minimum seconds between captures
  const [includeLyrics, setIncludeLyrics] = useState(true);
  const [songTitle, setSongTitle] = useState('');

  // Debug: Log state changes
  if (typeof window !== 'undefined') {
    console.log('FlashcardMaker render - youtubeUrl:', youtubeUrl, 'isProcessing:', ['downloading', 'extracting', 'detecting', 'generating'].includes(status.stage));
  }

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const processVideo = async () => {
    if (!youtubeUrl || youtubeUrl.trim() === '') {
      setStatus({ stage: 'error', progress: 0, message: 'Please enter a YouTube URL' });
      return;
    }
    
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setStatus({ stage: 'error', progress: 0, message: 'Invalid YouTube URL' });
      return;
    }

    try {
      // Stage 1: Download video
      setStatus({ stage: 'downloading', progress: 10, message: 'Downloading video from YouTube...' });
      
      const downloadRes = await fetch('/api/admin/flashcard-maker/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      
      if (!downloadRes.ok) {
        const error = await downloadRes.json();
        throw new Error(error.message || 'Failed to download video');
      }
      
      const { filePath, title, subtitles } = await downloadRes.json();
      setSongTitle(title || 'Untitled Song');

      // Stage 2: Extract frames with scene detection
      setStatus({ stage: 'detecting', progress: 40, message: 'Detecting scene changes...' });
      
      const extractRes = await fetch('/api/admin/flashcard-maker/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePath, 
          sensitivity: sensitivity / 100,
          minInterval,
          subtitles: includeLyrics ? subtitles : null
        })
      });
      
      if (!extractRes.ok) {
        const error = await extractRes.json();
        throw new Error(error.message || 'Failed to extract frames');
      }
      
      const { frames: extractedFrames } = await extractRes.json();
      setFrames(extractedFrames);

      // Stage 3: Complete
      setStatus({ 
        stage: 'complete', 
        progress: 100, 
        message: `Extracted ${extractedFrames.length} flashcard frames!` 
      });

    } catch (error) {
      setStatus({ 
        stage: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'An error occurred' 
      });
    }
  };

  const removeFrame = (index: number) => {
    setFrames(prev => prev.filter((_, i) => i !== index));
  };

  const updateLyric = (index: number, lyric: string) => {
    setFrames(prev => prev.map((frame, i) => 
      i === index ? { ...frame, lyric } : frame
    ));
  };

  const reorderFrames = (fromIndex: number, toIndex: number) => {
    setFrames(prev => {
      const newFrames = [...prev];
      const [removed] = newFrames.splice(fromIndex, 1);
      newFrames.splice(toIndex, 0, removed);
      return newFrames;
    });
  };

  const isProcessing = ['downloading', 'extracting', 'detecting', 'generating'].includes(status.stage);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">📹 Video Source</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube URL
            </label>
            <input
              type="text"
              key="youtube-url-input"
              value={youtubeUrl}
              onChange={(e) => {
                const newValue = e.target.value;
                console.log('Input onChange:', newValue);
                setYoutubeUrl(newValue);
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              disabled={isProcessing}
              autoComplete="off"
            />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scene Sensitivity: {sensitivity}%
              </label>
              <input
                type="range"
                min="10"
                max="70"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-full accent-blue-500"
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Lower = more frames, Higher = fewer frames
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Interval: {minInterval}s
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={minInterval}
                onChange={(e) => setMinInterval(Number(e.target.value))}
                className="w-full accent-blue-500"
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum seconds between captures
              </p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLyrics}
                  onChange={(e) => setIncludeLyrics(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                  disabled={isProcessing}
                />
                <span className="text-sm font-medium text-gray-700">
                  Include lyrics (if available)
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={processVideo}
            disabled={!youtubeUrl || youtubeUrl.trim() === '' || isProcessing}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {isProcessing ? '⏳ Processing...' : '🎬 Generate Flashcards'}
          </button>
        </div>
      </div>

      {/* Progress Section */}
      {status.stage !== 'idle' && (
        <div className={`rounded-2xl p-6 ${
          status.stage === 'error' 
            ? 'bg-red-50 border border-red-200' 
            : status.stage === 'complete'
            ? 'bg-green-50 border border-green-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">
              {status.stage === 'error' ? '❌' : 
               status.stage === 'complete' ? '✅' : '⏳'}
            </span>
            <span className={`font-medium ${
              status.stage === 'error' ? 'text-red-700' : 
              status.stage === 'complete' ? 'text-green-700' : 'text-blue-700'
            }`}>
              {status.message}
            </span>
          </div>
          
          {isProcessing && (
            <div className="w-full bg-white rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Preview Section */}
      {frames.length > 0 && (
        <>
          <FlashcardPreview 
            frames={frames}
            songTitle={songTitle}
            onRemove={removeFrame}
            onUpdateLyric={updateLyric}
            onReorder={reorderFrames}
          />
          
          <FlashcardPDF 
            frames={frames}
            songTitle={songTitle}
          />
        </>
      )}
    </div>
  );
}

