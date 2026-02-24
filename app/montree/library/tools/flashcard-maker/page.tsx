// @ts-nocheck
"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { escapeHtml } from '@/lib/sanitize';

interface FlashCard {
  id: number;
  image: string;
  label: string;
  timestamp: number;
}

const VideoFlashcardMaker = () => {
  const router = useRouter();
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [borderColor, setBorderColor] = useState('#06b6d4');
  const [fontFamily, setFontFamily] = useState('Comic Sans MS');
  const [generating, setGenerating] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');

  // Video state
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);
  const [autoExtracting, setAutoExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capture current video frame to base64
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, []);

  // Handle video file upload
  const handleVideoFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please upload a video file');
      return;
    }

    // Clean up previous video URL
    if (videoSrc) URL.revokeObjectURL(videoSrc);

    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoReady(false);
    setPreviewFrame(null);
    setScrubTime(0);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
  };

  // File input handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVideoFile(file);
    e.target.value = '';
  };

  // Drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleVideoFile(file);
  }, [videoSrc]);

  // Video loaded
  const handleVideoLoaded = () => {
    const video = videoRef.current;
    if (video) {
      setVideoDuration(video.duration);
      setVideoReady(true);
      video.currentTime = Math.min(2, video.duration * 0.05);
    }
  };

  // Scrubber seek
  const handleScrubberChange = (time: number) => {
    setScrubTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Capture preview on seek
  const handleSeeked = () => {
    const img = captureFrame();
    if (img) setPreviewFrame(img);
  };

  // Add frame from scrubber
  const addCurrentFrame = () => {
    if (!previewFrame) return;
    const newCard: FlashCard = {
      id: Date.now() + Math.random(),
      image: previewFrame,
      label: '',
      timestamp: scrubTime,
    };
    setCards(prev => [...prev, newCard].sort((a, b) => a.timestamp - b.timestamp));
  };

  // Auto-extract frames at regular intervals
  const autoExtractFrames = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !videoReady) return;

    setAutoExtracting(true);
    setExtractProgress(0);

    const duration = video.duration;
    // One frame every 3 seconds, max 40 frames
    const interval = Math.max(3, duration / 40);
    const frameCount = Math.floor(duration / interval);
    const extracted: FlashCard[] = [];

    for (let i = 0; i < frameCount; i++) {
      const time = i * interval + 0.5; // offset slightly to avoid black frames
      if (time >= duration) break;

      video.currentTime = time;

      // Wait for seek to complete
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
      });

      // Small delay for frame render
      await new Promise(r => setTimeout(r, 50));

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.88);
        extracted.push({
          id: Date.now() + Math.random(),
          image: imageData,
          label: '',
          timestamp: time,
        });
      }

      setExtractProgress(Math.round(((i + 1) / frameCount) * 100));
    }

    setCards(prev => {
      // Merge with existing, avoid duplicates within 1 second
      const existing = new Set(prev.map(c => Math.round(c.timestamp)));
      const newCards = extracted.filter(c => !existing.has(Math.round(c.timestamp)));
      return [...prev, ...newCards].sort((a, b) => a.timestamp - b.timestamp);
    });

    setAutoExtracting(false);
  };

  // Remove card
  const removeCard = (id: number) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  // Update label
  const updateLabel = (id: number, label: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, label } : c));
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate printable flashcards
  const generatePrintableSheet = async () => {
    if (cards.length === 0) return;
    setGenerating(true);

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to print');
        setGenerating(false);
        return;
      }

      const safeTitle = escapeHtml(videoTitle || 'Video Flashcards');

      let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${safeTitle} - Flashcards</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; }
  body { font-family: system-ui, sans-serif; background: white; }
  .page {
    width: 297mm; height: 210mm; padding: 5mm;
    page-break-after: always; page-break-inside: avoid;
  }
  .page:last-child { page-break-after: auto; }
  .card {
    background: ${borderColor}; border-radius: 10mm; padding: 8mm;
    width: 100%; height: 100%; display: flex; flex-direction: column;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .image-area {
    background: white; border-radius: 8mm; flex: 1;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; margin-bottom: 8mm;
  }
  .image-area img { width: 100%; height: 100%; object-fit: cover; }
  .label-area {
    background: white; border-radius: 8mm; height: 40mm;
    display: flex; align-items: center; justify-content: center;
    font-family: "${fontFamily}", cursive; font-size: 72pt; font-weight: bold;
  }
  .label-area.empty { height: 0; padding: 0; margin: 0; }
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  @media screen { body { padding: 20px; background: #f0f0f0; } .page { background: white; margin: 0 auto 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); } }
</style></head><body>`;

      for (const card of cards) {
        const hasLabel = card.label && card.label.trim().length > 0;
        html += `<div class="page"><div class="card"><div class="image-area"><img src="${card.image}" alt="${escapeHtml(card.label || 'frame')}"></div>`;
        if (hasLabel) {
          html += `<div class="label-area">${escapeHtml(card.label)}</div>`;
        }
        html += `</div></div>`;
      }

      html += `<script>window.onload = function() { setTimeout(() => window.print(), 500); };</script></body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Error generating flashcards.');
    }
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-cyan-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-cyan-600 hover:text-cyan-800">← Back</button>
            <h1 className="text-2xl font-bold text-gray-800">Video Flashcard Maker</h1>
          </div>
          {cards.length > 0 && (
            <button
              onClick={generatePrintableSheet}
              disabled={generating}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
            >
              {generating ? 'Generating...' : `Print ${cards.length} Cards`}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* Upload zone */}
        {!videoSrc && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              dragOver ? 'border-cyan-500 bg-cyan-50 scale-[1.01]' : 'border-gray-300 bg-white hover:border-cyan-300'
            }`}
          >
            <p className="text-5xl mb-4">🎬</p>
            <p className="font-bold text-gray-800 text-xl mb-2">Drop your video here</p>
            <p className="text-gray-500 mb-6">
              Upload any video file — scrub through it and pick the best frames for flashcards
            </p>
            <label className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg cursor-pointer font-medium text-base transition-colors inline-block">
              Choose Video
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
            <p className="text-xs text-gray-400 mt-4">MP4, MOV, WebM, AVI — any video format your browser supports</p>
          </div>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Scrubber */}
        {videoSrc && (
          <div className="bg-white rounded-2xl shadow-sm border border-cyan-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">🎞️ Select Frames</h2>
              <button
                onClick={() => {
                  if (videoSrc) URL.revokeObjectURL(videoSrc);
                  setVideoSrc(null);
                  setVideoReady(false);
                  setPreviewFrame(null);
                  setCards([]);
                }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remove Video
              </button>
            </div>

            {/* Hidden video element */}
            <video
              ref={videoRef}
              src={videoSrc}
              className="hidden"
              onLoadedMetadata={handleVideoLoaded}
              onSeeked={handleSeeked}
              preload="auto"
            />

            <div className="flex gap-5">
              {/* Preview area */}
              <div className="w-80 flex-shrink-0">
                <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                  {!videoReady && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin text-2xl mb-2">⏳</div>
                        <span className="text-gray-400 text-sm">Loading video...</span>
                      </div>
                    </div>
                  )}
                  {previewFrame && videoReady && (
                    <img src={previewFrame} alt="Preview" className="w-full h-full object-contain bg-black" />
                  )}
                  {!previewFrame && videoReady && (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Drag slider to preview
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Video Title</label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Name your flashcard set..."
                  />
                </div>

                {/* Timeline slider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time: <span className="text-cyan-600 font-bold">{formatTime(scrubTime)}</span>
                    <span className="text-gray-400 ml-2">/ {formatTime(videoDuration)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 100}
                    step="0.1"
                    value={scrubTime}
                    onChange={(e) => handleScrubberChange(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                    disabled={!videoReady}
                  />
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleScrubberChange(Math.max(0, scrubTime - 5))} className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm" disabled={!videoReady}>← 5s</button>
                  <button onClick={() => handleScrubberChange(Math.max(0, scrubTime - 1))} className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm" disabled={!videoReady}>← 1s</button>
                  <button onClick={() => handleScrubberChange(Math.min(videoDuration, scrubTime + 1))} className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm" disabled={!videoReady}>1s →</button>
                  <button onClick={() => handleScrubberChange(Math.min(videoDuration, scrubTime + 5))} className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm" disabled={!videoReady}>5s →</button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={addCurrentFrame}
                    disabled={!previewFrame || !videoReady}
                    className="flex-1 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    ➕ Add This Frame
                  </button>
                  <button
                    onClick={autoExtractFrames}
                    disabled={!videoReady || autoExtracting}
                    className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {autoExtracting ? `Extracting... ${extractProgress}%` : '⚡ Auto-Extract All'}
                  </button>
                </div>

                <p className="text-xs text-gray-400">
                  Auto-extract grabs a frame every 3 seconds. You can then remove the ones you don't want.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cards section */}
        {cards.length > 0 && (
          <>
            {/* Card style options */}
            <div className="bg-white rounded-xl shadow-sm border border-cyan-200 p-4 mb-6">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Border Color</label>
                  <div className="flex gap-2">
                    {['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#ef4444', '#eab308'].map(color => (
                      <button
                        key={color}
                        onClick={() => setBorderColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${borderColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Font</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5"
                  >
                    <option value="Comic Sans MS">Comic Sans</option>
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                </div>
                <div className="ml-auto text-sm text-gray-500">
                  {cards.length} flashcard{cards.length !== 1 ? 's' : ''} ready
                </div>
              </div>
            </div>

            {/* Preview grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
              {cards.map((card) => (
                <div key={card.id} className="relative group rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-sm bg-white">
                  {/* Timestamp badge */}
                  <div className="absolute top-1.5 left-1.5 z-10 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    {formatTime(card.timestamp)}
                  </div>
                  {/* Remove button */}
                  <button
                    onClick={() => removeCard(card.id)}
                    className="absolute top-1.5 right-1.5 z-10 bg-black/50 hover:bg-red-500 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                  {/* Image */}
                  <div className="aspect-video">
                    <img src={card.image} alt={card.label || 'frame'} className="w-full h-full object-cover" />
                  </div>
                  {/* Label input */}
                  <div className="p-2">
                    <input
                      type="text"
                      value={card.label}
                      onChange={(e) => updateLabel(card.id, e.target.value)}
                      placeholder="Add label..."
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Print button */}
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={generatePrintableSheet}
                disabled={generating}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {generating ? 'Generating...' : `Print ${cards.length} Flashcards`}
              </button>
              <button
                onClick={() => setCards([])}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-4 rounded-xl font-medium text-lg transition-all"
              >
                Clear All
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoFlashcardMaker;
