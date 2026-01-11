'use client';

import { useState, useRef, useEffect } from 'react';
import { FlashcardPreview } from './FlashcardPreview';
import { FlashcardPDF } from './FlashcardPDF';

interface ExtractedFrame {
  timestamp: number;
  imageData: string;
  lyric?: string;
}

interface ProcessingStatus {
  stage: 'idle' | 'downloading' | 'extracting' | 'detecting' | 'generating' | 'complete' | 'error';
  progress: number;
  message: string;
}

interface UploadedVideo {
  id: string;
  original_filename: string;
  public_url: string;
  week_number: number;
  file_type: string;
}

export function FlashcardMaker() {
  const [videoSource, setVideoSource] = useState<'youtube' | 'uploaded'>('uploaded');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<UploadedVideo | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [sensitivity, setSensitivity] = useState(15);
  const [minInterval, setMinInterval] = useState(1.5);
  const [targetFrames, setTargetFrames] = useState(20);
  const [includeLyrics, setIncludeLyrics] = useState(true);
  const [songTitle, setSongTitle] = useState('');
  
  // Video scrubber state
  const [showScrubber, setShowScrubber] = useState(false);
  const [videoPath, setVideoPath] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [scrubberTime, setScrubberTime] = useState(0);
  const [scrubberPreview, setScrubberPreview] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load uploaded videos on mount
  useEffect(() => {
    loadUploadedVideos();
  }, []);

  const loadUploadedVideos = async () => {
    setLoadingVideos(true);
    try {
      // Fetch videos from multiple weeks (1-36)
      const allVideos: UploadedVideo[] = [];
      const year = new Date().getFullYear();
      
      // Fetch from a few recent weeks
      for (let week = 1; week <= 36; week++) {
        try {
          const res = await fetch(`/api/lesson-documents/list?weekNumber=${week}&year=${year}`);
          if (res.ok) {
            const data = await res.json();
            if (data.documents) {
              const videos = data.documents.filter((d: any) => 
                d.file_type?.startsWith('video/')
              );
              allVideos.push(...videos.map((v: any) => ({ ...v, week_number: week })));
            }
          }
        } catch (e) {
          // Skip failed weeks
        }
      }
      
      setUploadedVideos(allVideos);
    } catch (err) {
      console.error('Failed to load videos:', err);
    }
    setLoadingVideos(false);
  };

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

  // Fetch frame preview at specific timestamp
  const fetchPreviewFrame = async (timestamp: number) => {
    if (!videoPath) return;
    
    setIsLoadingPreview(true);
    try {
      const res = await fetch('/api/admin/flashcard-maker/preview-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: videoPath, timestamp })
      });
      
      if (res.ok) {
        const { imageData } = await res.json();
        setScrubberPreview(imageData);
      }
    } catch (e) {
      console.error('Preview fetch error:', e);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Debounced preview fetch
  const handleScrubberChange = (time: number) => {
    setScrubberTime(time);
    
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    previewTimeoutRef.current = setTimeout(() => {
      fetchPreviewFrame(time);
    }, 300);
  };

  // Add frame from scrubber
  const addFrameFromScrubber = async () => {
    if (!scrubberPreview) return;
    
    const newFrame: ExtractedFrame = {
      timestamp: scrubberTime,
      imageData: scrubberPreview,
      lyric: ''
    };
    
    // Insert in correct position based on timestamp
    setFrames(prev => {
      const newFrames = [...prev, newFrame];
      return newFrames.sort((a, b) => a.timestamp - b.timestamp);
    });
  };

  const processVideo = async () => {
    if (videoSource === 'youtube') {
      await processYouTubeVideo();
    } else {
      await processUploadedVideo();
    }
  };

  const processUploadedVideo = async () => {
    if (!selectedVideo) {
      setStatus({ stage: 'error', progress: 0, message: 'Please select a video' });
      return;
    }

    try {
      setStatus({ stage: 'downloading', progress: 20, message: 'Preparing video...' });
      
      // Download the video from Supabase URL to server
      const downloadRes = await fetch('/api/admin/flashcard-maker/download-uploaded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoUrl: selectedVideo.public_url,
          filename: selectedVideo.original_filename
        })
      });
      
      if (!downloadRes.ok) {
        const error = await downloadRes.json();
        throw new Error(error.message || 'Failed to prepare video');
      }
      
      const { filePath, duration } = await downloadRes.json();
      setSongTitle(selectedVideo.original_filename.replace(/\.[^/.]+$/, ''));
      setVideoPath(filePath);
      setVideoDuration(duration || 180);

      setStatus({ stage: 'detecting', progress: 50, message: 'Extracting frames...' });
      
      const extractRes = await fetch('/api/admin/flashcard-maker/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePath, 
          sensitivity: sensitivity / 100,
          minInterval,
          targetFrames,
          subtitles: null // No subtitles for uploaded videos
        })
      });
      
      if (!extractRes.ok) {
        const error = await extractRes.json();
        throw new Error(error.message || 'Failed to extract frames');
      }
      
      const { frames: extractedFrames, debug } = await extractRes.json();
      console.log('Extraction debug:', debug);
      setFrames(extractedFrames);

      setStatus({ 
        stage: 'complete', 
        progress: 100, 
        message: `Extracted ${extractedFrames.length} frames! Use the scrubber below to add more.` 
      });

    } catch (error) {
      setStatus({ 
        stage: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'An error occurred' 
      });
    }
  };

  const processYouTubeVideo = async () => {
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setStatus({ stage: 'error', progress: 0, message: 'Invalid YouTube URL' });
      return;
    }

    try {
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
      
      const { filePath, title, subtitles, duration } = await downloadRes.json();
      setSongTitle(title || 'Untitled Song');
      setVideoPath(filePath);
      setVideoDuration(duration || 180);

      setStatus({ stage: 'detecting', progress: 40, message: 'Extracting frames...' });
      
      const extractRes = await fetch('/api/admin/flashcard-maker/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePath, 
          sensitivity: sensitivity / 100,
          minInterval,
          targetFrames,
          subtitles: includeLyrics ? subtitles : null
        })
      });
      
      if (!extractRes.ok) {
        const error = await extractRes.json();
        throw new Error(error.message || 'Failed to extract frames');
      }
      
      const { frames: extractedFrames, debug } = await extractRes.json();
      console.log('Extraction debug:', debug);
      setFrames(extractedFrames);

      setStatus({ 
        stage: 'complete', 
        progress: 100, 
        message: `Extracted ${extractedFrames.length} frames! Use the scrubber below to add more.` 
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isProcessing = ['downloading', 'extracting', 'detecting', 'generating'].includes(status.stage);
  const canProcess = videoSource === 'youtube' ? !!youtubeUrl : !!selectedVideo;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">📹 Video Source</h2>
        
        {/* Source Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setVideoSource('uploaded')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              videoSource === 'uploaded'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🐋 Whale Videos
          </button>
          <button
            onClick={() => setVideoSource('youtube')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              videoSource === 'youtube'
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ▶️ YouTube URL
          </button>
        </div>
        
        <div className="space-y-4">
          {videoSource === 'uploaded' ? (
            /* Uploaded Videos Selector */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select from Uploaded Videos
              </label>
              {loadingVideos ? (
                <div className="text-center py-8 text-gray-500">Loading videos...</div>
              ) : uploadedVideos.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <p className="text-gray-500 mb-2">No videos uploaded yet</p>
                  <p className="text-sm text-gray-400">Upload videos in the Lesson Documents section first</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2">
                  {uploadedVideos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => setSelectedVideo(video)}
                      disabled={isProcessing}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedVideo?.id === video.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎬</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">
                            {video.original_filename}
                          </p>
                          <p className="text-xs text-gray-500">Week {video.week_number}</p>
                        </div>
                        {selectedVideo?.id === video.id && (
                          <span className="text-green-500">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* YouTube URL Input */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL
              </label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                disabled={isProcessing}
              />
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ YouTube downloads may fail due to YouTube restrictions. Consider uploading videos to Whale instead.
              </p>
            </div>
          )}

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Frames: <span className="text-blue-600 font-bold">{targetFrames}</span>
              </label>
              <input
                type="range"
                min="10"
                max="40"
                value={targetFrames}
                onChange={(e) => setTargetFrames(Number(e.target.value))}
                className="w-full accent-blue-500"
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">10-40 flashcards</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sensitivity: {sensitivity}%
              </label>
              <input
                type="range"
                min="5"
                max="40"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-full accent-blue-500"
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">Lower = more scene detection</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Interval: {minInterval}s
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={minInterval}
                onChange={(e) => setMinInterval(Number(e.target.value))}
                className="w-full accent-blue-500"
                disabled={isProcessing}
              />
            </div>

            {videoSource === 'youtube' && (
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLyrics}
                    onChange={(e) => setIncludeLyrics(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                    disabled={isProcessing}
                  />
                  <span className="text-sm font-medium text-gray-700">Include lyrics</span>
                </label>
              </div>
            )}
          </div>

          <button
            onClick={processVideo}
            disabled={!canProcess || isProcessing}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {isProcessing ? '⏳ Processing...' : `🎬 Generate ~${targetFrames} Flashcards`}
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
              {status.stage === 'error' ? '❌' : status.stage === 'complete' ? '✅' : '⏳'}
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

      {/* Video Scrubber - Manual Frame Selection */}
      {videoPath && status.stage === 'complete' && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">🎞️ Add More Frames Manually</h2>
            <button
              onClick={() => setShowScrubber(!showScrubber)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showScrubber ? 'Hide Scrubber' : 'Show Scrubber'}
            </button>
          </div>
          
          {showScrubber && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {/* Preview */}
                <div className="w-64 h-36 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                  {isLoadingPreview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <span className="text-gray-400">Loading...</span>
                    </div>
                  )}
                  {scrubberPreview && !isLoadingPreview && (
                    <img 
                      src={scrubberPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  )}
                  {!scrubberPreview && !isLoadingPreview && (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Drag slider to preview
                    </div>
                  )}
                </div>
                
                {/* Controls */}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time: <span className="text-blue-600 font-bold">{formatTime(scrubberTime)}</span>
                      <span className="text-gray-400 ml-2">/ {formatTime(videoDuration)}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={videoDuration}
                      step="0.1"
                      value={scrubberTime}
                      onChange={(e) => handleScrubberChange(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleScrubberChange(Math.max(0, scrubberTime - 1))}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      ← 1s
                    </button>
                    <button
                      onClick={() => handleScrubberChange(Math.max(0, scrubberTime - 0.1))}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      ← 0.1s
                    </button>
                    <button
                      onClick={() => handleScrubberChange(Math.min(videoDuration, scrubberTime + 0.1))}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      0.1s →
                    </button>
                    <button
                      onClick={() => handleScrubberChange(Math.min(videoDuration, scrubberTime + 1))}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      1s →
                    </button>
                  </div>
                  
                  <button
                    onClick={addFrameFromScrubber}
                    disabled={!scrubberPreview}
                    className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    ➕ Add This Frame
                  </button>
                </div>
              </div>
              
              <p className="text-xs text-gray-500">
                Tip: Use the slider or buttons to navigate through the video and add specific frames you want.
              </p>
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
