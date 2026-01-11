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
  created_at: string;
  category?: string;
}

export function FlashcardMaker() {
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<UploadedVideo | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [sensitivity, setSensitivity] = useState(15);
  const [minInterval, setMinInterval] = useState(1.5);
  const [targetFrames, setTargetFrames] = useState(20);
  const [songTitle, setSongTitle] = useState('');
  
  // Video scrubber state - client-side
  const [showScrubber, setShowScrubber] = useState(true);
  const [videoPath, setVideoPath] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [scrubberTime, setScrubberTime] = useState(0);
  const [scrubberPreview, setScrubberPreview] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  
  // Refs for client-side video scrubbing
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load uploaded videos on mount
  useEffect(() => {
    loadUploadedVideos();
  }, []);

  const loadUploadedVideos = async () => {
    setLoadingVideos(true);
    try {
      const res = await fetch('/api/admin/flashcard-maker/videos');
      const data = await res.json();
      console.log('[FlashcardMaker] Videos API response:', data);
      if (data.success) {
        setUploadedVideos(data.videos || []);
      } else {
        console.error('[FlashcardMaker] API error:', data.error);
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
    }
    setLoadingVideos(false);
  };

  // Capture frame from video element using canvas
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // Handle video time update for scrubber
  const handleVideoTimeUpdate = () => {
    const imageData = captureFrame();
    if (imageData) {
      setScrubberPreview(imageData);
    }
  };

  // Handle scrubber slider change
  const handleScrubberChange = (time: number) => {
    setScrubberTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Handle video loaded
  const handleVideoLoaded = () => {
    const video = videoRef.current;
    if (video) {
      setVideoDuration(video.duration);
      setVideoReady(true);
      // Seek to 5 seconds initially
      video.currentTime = Math.min(5, video.duration * 0.1);
    }
  };

  // Add frame from scrubber
  const addFrameFromScrubber = () => {
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
          subtitles: null
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

  return (
    <div className="space-y-6">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Video Selection */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">🎬 Select a Video</h2>
        
        {loadingVideos ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full mb-2"></div>
            <p>Loading videos...</p>
          </div>
        ) : uploadedVideos.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <p className="text-gray-500 mb-2">No videos uploaded yet</p>
            <p className="text-sm text-gray-400">Upload videos in the Lesson Documents section first</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {uploadedVideos.map((video) => (
              <button
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                disabled={isProcessing}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  selectedVideo?.id === video.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🎬</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate text-lg">
                      {video.original_filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {video.category && <span className="capitalize">{video.category} • </span>}Week {video.week_number}
                    </p>
                  </div>
                  {selectedVideo?.id === video.id && (
                    <span className="text-green-500 text-2xl">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Settings - Hidden since we use manual scrubber now */}
        {false && (
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
        </div>
        )}

        {/* Generate button - Hidden since we use manual scrubber now */}
        {false && (
        <button
          onClick={processVideo}
          disabled={!selectedVideo || isProcessing}
          className="w-full mt-4 py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          {isProcessing ? '⏳ Processing...' : `🎬 Generate ~${targetFrames} Flashcards`}
        </button>
        )}
      </div>

      {/* Progress Section - Hidden since we use manual scrubber now */}
      {false && status.stage !== 'idle' && (
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

      {/* Video Scrubber - Client-side with HTML5 Video */}
      {selectedVideo && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">🎞️ Select Frames from Video</h2>
            <button
              onClick={() => setShowScrubber(!showScrubber)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showScrubber ? 'Hide Scrubber' : 'Show Scrubber'}
            </button>
          </div>
          
          {showScrubber && (
            <div className="space-y-4">
              {/* Hidden video element for scrubbing */}
              <video
                ref={videoRef}
                src={selectedVideo.public_url}
                className="hidden"
                crossOrigin="anonymous"
                onLoadedMetadata={handleVideoLoaded}
                onSeeked={handleVideoTimeUpdate}
                onTimeUpdate={handleVideoTimeUpdate}
                preload="auto"
              />
              
              <div className="flex gap-4">
                {/* Preview from canvas capture */}
                <div className="w-64 h-36 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                  {!videoReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <span className="text-gray-400">Loading video...</span>
                    </div>
                  )}
                  {scrubberPreview && videoReady && (
                    <img 
                      src={scrubberPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  )}
                  {!scrubberPreview && videoReady && (
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
                      max={videoDuration || 100}
                      step="0.1"
                      value={scrubberTime}
                      onChange={(e) => handleScrubberChange(Number(e.target.value))}
                      className="w-full accent-blue-500"
                      disabled={!videoReady}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleScrubberChange(Math.max(0, scrubberTime - 1))}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                      disabled={!videoReady}
                    >
                      ← 1s
                    </button>
                    <button
                      onClick={() => handleScrubberChange(Math.max(0, scrubberTime - 0.1))}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                      disabled={!videoReady}
                    >
                      ← 0.1s
                    </button>
                    <button
                      onClick={() => handleScrubberChange(Math.min(videoDuration, scrubberTime + 0.1))}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                      disabled={!videoReady}
                    >
                      0.1s →
                    </button>
                    <button
                      onClick={() => handleScrubberChange(Math.min(videoDuration, scrubberTime + 1))}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                      disabled={!videoReady}
                    >
                      1s →
                    </button>
                  </div>
                  
                  <button
                    onClick={addFrameFromScrubber}
                    disabled={!scrubberPreview || !videoReady}
                    className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    ➕ Add This Frame
                  </button>
                </div>
              </div>
              
              <p className="text-xs text-gray-500">
                💡 Instant preview! Drag the slider to navigate through the video.
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
