'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ThemeSong {
  id: string;
  week_number: number;
  year: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  public_url: string;
  title: string | null;
  uploaded_by: string;
  created_at: string;
}

interface ThemeSongPlayerProps {
  weekNumber: number;
  defaultTitle: string;  // From curriculum data
  defaultActions?: string;  // Song actions from curriculum
  themeColor: string;  // Theme color for styling
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ThemeSongPlayer({ 
  weekNumber, 
  defaultTitle, 
  defaultActions,
  themeColor 
}: ThemeSongPlayerProps) {
  const [song, setSong] = useState<ThemeSong | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const year = new Date().getFullYear();

  // Fetch song on mount
  useEffect(() => {
    fetchSong();
  }, [weekNumber]);

  async function fetchSong() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/circle-songs?weekNumber=${weekNumber}&year=${year}`);
      const data = await res.json();
      if (data.success) {
        setSong(data.song);
      }
    } catch (err) {
      console.error('Failed to fetch song:', err);
    } finally {
      setLoading(false);
    }
  }

  async function uploadSong(file: File) {
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('weekNumber', weekNumber.toString());
    formData.append('year', year.toString());
    formData.append('title', defaultTitle);
    formData.append('uploadedBy', localStorage.getItem('teacherName') || 'Teacher');

    try {
      // Simulate progress (actual progress would need XHR)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch('/api/circle-songs', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (data.success) {
        setSong(data.song);
        setShowUpload(false);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function deleteSong() {
    if (!confirm('Remove this song? You can upload a new one anytime.')) return;

    try {
      const res = await fetch(`/api/circle-songs?weekNumber=${weekNumber}&year=${year}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSong(null);
        setIsPlaying(false);
      } else {
        setError(data.error || 'Delete failed');
      }
    } catch (err) {
      setError('Delete failed');
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadSong(file);
    }
    e.target.value = '';
  }

  function togglePlay() {
    const media = song?.file_type.startsWith('video/') ? videoRef.current : audioRef.current;
    if (media) {
      if (isPlaying) {
        media.pause();
      } else {
        media.play();
      }
      setIsPlaying(!isPlaying);
    }
  }

  const isVideo = song?.file_type.startsWith('video/');
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(defaultTitle + ' kids song')}`;

  return (
    <div 
      className="rounded-xl overflow-hidden shadow-lg mb-4"
      style={{ backgroundColor: themeColor }}
    >
      {/* Header */}
      <div className="p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🎵</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">Theme Song</h3>
              <p className="text-white/80 text-sm">{defaultTitle}</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {!song && !loading && (
              <button
                onClick={() => setShowUpload(true)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                📤 Upload
              </button>
            )}
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1"
            >
              ▶️ YouTube
            </a>
          </div>
        </div>
        
        {/* Song actions hint */}
        {defaultActions && (
          <p className="mt-2 text-white/70 text-sm italic">
            💃 Actions: {defaultActions}
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white/10 p-4 text-center text-white/70">
          Loading...
        </div>
      )}

      {/* Uploaded Song Player */}
      {song && !loading && (
        <div className="bg-white p-4">
          {/* Video Player */}
          {isVideo && (
            <div className="rounded-lg overflow-hidden bg-black mb-3">
              <video
                ref={videoRef}
                src={song.public_url}
                className="w-full max-h-64"
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )}

          {/* Audio Player */}
          {!isVideo && (
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-lg transition-transform hover:scale-105"
                style={{ backgroundColor: themeColor }}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <div className="flex-1">
                <div className="font-medium text-gray-800">
                  {song.title || defaultTitle}
                </div>
                <div className="text-sm text-gray-500">
                  {song.original_filename} • {formatFileSize(song.file_size)}
                </div>
              </div>
              <audio
                ref={audioRef}
                src={song.public_url}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )}

          {/* Song Info & Delete */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Uploaded by {song.uploaded_by}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                🔄 Replace
              </button>
              <button
                onClick={deleteSong}
                className="text-gray-400 hover:text-red-500"
              >
                🗑️ Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {showUpload && (
        <div className="bg-white p-4 border-t">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="audio/*,video/*"
            onChange={handleFileSelect}
          />
          
          {uploading ? (
            <div className="text-center py-4">
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, backgroundColor: themeColor }}
                />
              </div>
              <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-3xl mb-2">🎵</div>
              <p className="font-medium text-gray-700">Upload Theme Song</p>
              <p className="text-sm text-gray-500 mt-1">
                MP3, MP4, M4A, WAV, or video file (max 100MB)
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Click or drag & drop
              </p>
            </div>
          )}

          {/* Cancel button */}
          {!uploading && (
            <button
              onClick={() => setShowUpload(false)}
              className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 p-3 text-red-600 text-sm">
          ❌ {error}
        </div>
      )}

      {/* No song uploaded - show prompt */}
      {!song && !loading && !showUpload && (
        <div className="bg-white/10 p-3 text-center">
          <p className="text-white/70 text-sm">
            No song uploaded yet • Use YouTube or upload your own
          </p>
        </div>
      )}
    </div>
  );
}
