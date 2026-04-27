'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Video {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  week?: string;
  category: string;
  uploadedAt: string;
  mediaType?: 'video' | 'audio';
}

const CATEGORIES = ['song-of-week', 'phonics', 'weekly-phonics-sound', 'stories'];

function categoryLabel(cat: string) {
  return cat === 'song-of-week' ? '🎵 Song of Week' :
         cat === 'phonics' ? '📚 Phonics' :
         cat === 'weekly-phonics-sound' ? '🔤 Weekly Sound' : '📖 Stories';
}

function categoryBadge(cat: string) {
  return cat === 'song-of-week' ? '🎵 Song' :
         cat === 'phonics' ? '📚 Phonics' :
         cat === 'weekly-phonics-sound' ? '🔤 Sound' : '📖 Story';
}

export default function VideoManagerPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'audio'>('all');
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editWeek, setEditWeek] = useState('');
  const [editCategory, setEditCategory] = useState('song-of-week');

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('song-of-week');
  const [uploadWeek, setUploadWeek] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Derived: is the selected upload file audio?
  const uploadIsAudio = uploadFile ? uploadFile.type.startsWith('audio/') : false;

  useEffect(() => {
    fetchVideos();
  }, []);

  async function fetchVideos() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/video-manager?${params}`);
      const data = await res.json();
      if (data.success) {
        setVideos(data.videos);
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    }
    setLoading(false);
  }

  async function deleteVideo(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/video-manager?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setVideos(prev => prev.filter(v => v.id !== id));
      } else {
        alert('Failed to delete: ' + data.error);
      }
    } catch (err) {
      alert('Failed to delete video');
    }
  }

  async function updateVideo() {
    if (!editingVideo) return;

    try {
      const res = await fetch('/api/admin/video-manager', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingVideo.id,
          title: editTitle,
          week: editWeek || undefined,
          category: editCategory
        })
      });
      const data = await res.json();
      if (data.success) {
        setVideos(prev => prev.map(v =>
          v.id === editingVideo.id
            ? { ...v, title: editTitle, week: editWeek, category: editCategory }
            : v
        ));
        setEditingVideo(null);
      } else {
        alert('Failed to update: ' + data.error);
      }
    } catch (err) {
      alert('Failed to update video');
    }
  }

  function startEdit(video: Video) {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditWeek(video.week || '');
    setEditCategory(video.category);
  }

  // XHR upload with progress + retry — more reliable than fetch for large files
  function xhrUpload(url: string, file: File, attempt: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      // 10 minute timeout for large files on slow connections
      xhr.timeout = 600_000;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed (HTTP ${xhr.status}): ${xhr.responseText?.slice(0, 200) || 'unknown'}`));
        }
      };

      xhr.onerror = () => reject(new Error(`Network error on attempt ${attempt}`));
      xhr.ontimeout = () => reject(new Error(`Upload timed out on attempt ${attempt}`));
      xhr.send(file);
    });
  }

  async function uploadVideo() {
    if (!uploadFile || !uploadTitle) return;

    const isAudio = uploadFile.type.startsWith('audio/');

    setUploading(true);
    setUploadProgress(0);
    try {
      // Step 1: Get signed upload URL from server (small JSON request — no large file)
      const res = await fetch('/api/admin/video-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle,
          category: uploadCategory,
          week: uploadWeek || undefined,
          fileName: uploadFile.name,
          contentType: uploadFile.type,
          mediaType: isAudio ? 'audio' : 'video',
        })
      });
      const data = await res.json();

      if (!data.success || !data.signedUrl) {
        alert('Failed to prepare upload: ' + (data.error || 'unknown error'));
        setUploading(false);
        return;
      }

      // Step 2: Upload file directly to Supabase with retry (browser → Supabase, bypasses server)
      const MAX_RETRIES = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          setUploadProgress(0);
          await xhrUpload(data.signedUrl, uploadFile, attempt);
          lastError = null;
          break; // success
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(`[Upload] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);
          if (attempt < MAX_RETRIES) {
            const delay = attempt * 2000;
            setUploadProgress(-1); // signal "retrying"
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }

      if (lastError) {
        alert('Failed to upload after ' + MAX_RETRIES + ' attempts: ' + lastError.message);
        setUploading(false);
        return;
      }

      // Success — metadata already saved by server in step 1
      setVideos(prev => [data.video, ...prev]);
      setShowUpload(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadWeek('');
      setUploadCategory('song-of-week');
    } catch (err) {
      alert('Failed to upload: ' + (err instanceof Error ? err.message : 'unknown'));
    }
    setUploading(false);
    setUploadProgress(0);
  }

  // Parse week number from string like "Week 16" or "16"
  function parseWeekNumber(week: string | undefined): number | null {
    if (!week) return null;
    const match = week.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  // Find problem videos
  const problemVideos = videos.filter(v => {
    const weekNum = parseWeekNumber(v.week);
    return v.title.toLowerCase().includes('recovered') ||
           v.title.toLowerCase().includes('untitled') ||
           (weekNum !== null && (weekNum < 1 || weekNum > 36));
  });

  // Counts
  const videoItems = videos.filter(v => !v.mediaType || v.mediaType === 'video');
  const audioItems = videos.filter(v => v.mediaType === 'audio');
  const songCount = videos.filter(v => v.category === 'song-of-week').length;
  const phonicsCount = videos.filter(v => v.category === 'phonics').length;
  const soundCount = videos.filter(v => v.category === 'weekly-phonics-sound').length;
  const storyCount = videos.filter(v => v.category === 'stories').length;

  // Filtered list for grid
  const filteredVideos = videos.filter(v => {
    if (mediaFilter === 'video') return !v.mediaType || v.mediaType === 'video';
    if (mediaFilter === 'audio') return v.mediaType === 'audio';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">🎬 Media Manager</h1>
            <p className="text-gray-400 mt-1">Manage videos and audio songs — edit titles, weeks, categories</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 transition-colors font-medium"
            >
              ➕ Upload
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>

        {/* Problem Videos Alert */}
        {problemVideos.length > 0 && (
          <div className="bg-red-900/50 border border-red-600 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-red-400 mb-2">⚠️ {problemVideos.length} items need attention</h3>
            <p className="text-red-200 text-sm mb-3">
              These have "recovered" or "untitled" in the name, or invalid week numbers.
            </p>
            <div className="flex flex-wrap gap-2">
              {problemVideos.slice(0, 10).map(video => (
                <button
                  key={video.id}
                  onClick={() => startEdit(video)}
                  className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded-lg text-sm"
                >
                  {video.title.slice(0, 25)}{video.title.length > 25 ? '...' : ''}
                </button>
              ))}
              {problemVideos.length > 10 && (
                <span className="px-3 py-1 text-red-400 text-sm">
                  +{problemVideos.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{videos.length}</div>
            <div className="text-gray-400 text-sm">Total</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-indigo-400">{videoItems.length}</div>
            <div className="text-gray-400 text-sm">🎬 Videos</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-cyan-400">{audioItems.length}</div>
            <div className="text-gray-400 text-sm">🎵 Audio</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{songCount}</div>
            <div className="text-gray-400 text-sm">🎵 Songs</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{phonicsCount}</div>
            <div className="text-gray-400 text-sm">📚 Phonics</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-400">{storyCount}</div>
            <div className="text-gray-400 text-sm">📖 Stories</div>
          </div>
        </div>

        {/* Search + Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Media type tabs */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 self-start">
            {(['all', 'video', 'audio'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMediaFilter(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mediaFilter === tab
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'all' ? `All (${videos.length})` :
                 tab === 'video' ? `🎬 Videos (${videoItems.length})` :
                 `🎵 Audio (${audioItems.length})`}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchVideos()}
              placeholder="Search by title..."
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={fetchVideos}
              className="px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500"
            >
              🔍
            </button>
            <button
              onClick={() => { setSearch(''); fetchVideos(); }}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4">
              <h3 className="text-xl font-bold mb-4">
                {uploadIsAudio ? '🎵 Upload Audio' : '📤 Upload Video'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">File (video or audio)</label>
                  <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:text-white hover:file:bg-cyan-500"
                  />
                  {uploadFile && (
                    <p className="text-xs text-gray-400 mt-1">
                      {uploadIsAudio ? '🎵 Audio file detected' : '🎬 Video file detected'} — {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title *</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder={uploadIsAudio ? 'e.g. Week 17 Song - Wheels on the Bus' : 'e.g. Week 17 Song - Baby Shark'}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Week (optional)</label>
                    <input
                      type="text"
                      value={uploadWeek}
                      onChange={(e) => setUploadWeek(e.target.value)}
                      placeholder="17"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{categoryLabel(cat)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Upload progress bar */}
                {uploading && uploadProgress > 0 && (
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                {uploading && uploadProgress === -1 && (
                  <div className="text-amber-400 text-sm text-center animate-pulse">
                    Connection dropped — retrying automatically...
                  </div>
                )}

                {/* Preview */}
                {uploadFile && !uploading && (
                  <div className="rounded-lg overflow-hidden bg-black">
                    {uploadIsAudio ? (
                      <div className="p-4 flex flex-col items-center gap-3 bg-gradient-to-br from-cyan-900/40 to-purple-900/40">
                        <div className="text-5xl">🎵</div>
                        <p className="text-sm text-gray-300 text-center truncate w-full text-center">{uploadFile.name}</p>
                        <audio
                          src={URL.createObjectURL(uploadFile)}
                          controls
                          className="w-full"
                        />
                      </div>
                    ) : (
                      <video
                        src={URL.createObjectURL(uploadFile)}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-48"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setUploadFile(null);
                    setUploadTitle('');
                    setUploadWeek('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadVideo}
                  disabled={!uploadFile || !uploadTitle || uploading}
                  className="flex-1 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading
                    ? uploadProgress === -1
                      ? '🔄 Retrying...'
                      : uploadProgress > 0
                        ? `⏳ ${uploadProgress}%`
                        : '⏳ Preparing...'
                    : `📤 Upload ${uploadIsAudio ? 'Audio' : 'Video'}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingVideo && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4">
              <h3 className="text-xl font-bold mb-4">
                {editingVideo.mediaType === 'audio' ? '✏️ Edit Audio' : '✏️ Edit Video'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Week (e.g. "17" or "Week 17")</label>
                    <input
                      type="text"
                      value={editWeek}
                      onChange={(e) => setEditWeek(e.target.value)}
                      placeholder="17"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{categoryLabel(cat)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-lg overflow-hidden bg-black">
                  {editingVideo.mediaType === 'audio' ? (
                    <div className="p-4 flex flex-col items-center gap-3 bg-gradient-to-br from-cyan-900/40 to-purple-900/40">
                      <div className="text-5xl">🎵</div>
                      <audio src={editingVideo.videoUrl} controls className="w-full" />
                    </div>
                  ) : (
                    <video
                      src={editingVideo.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-48"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingVideo(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteVideo(editingVideo.id, editingVideo.title)}
                  className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-500"
                >
                  🗑️ Delete
                </button>
                <button
                  onClick={updateVideo}
                  className="flex-1 px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Media Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="animate-spin inline-block w-8 h-8 border-2 border-gray-600 border-t-cyan-500 rounded-full mb-4"></div>
            <p>Loading...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">{mediaFilter === 'audio' ? '🎵' : '📭'}</p>
            <p>{mediaFilter === 'audio' ? 'No audio files yet — upload some songs!' : 'No items found'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map(video => {
              const weekNum = parseWeekNumber(video.week);
              const isProblem = video.title.toLowerCase().includes('recovered') ||
                               video.title.toLowerCase().includes('untitled') ||
                               (weekNum !== null && (weekNum < 1 || weekNum > 36));
              const isAudio = video.mediaType === 'audio';

              return (
                <div
                  key={video.id}
                  className={`bg-gray-800 rounded-xl overflow-hidden ${isProblem ? 'ring-2 ring-red-500' : ''}`}
                >
                  {/* Preview area */}
                  {isAudio ? (
                    /* Audio card: music banner + player */
                    <div className="bg-gradient-to-br from-cyan-900/60 to-purple-900/60 p-5 flex flex-col items-center gap-3">
                      <div className="text-5xl select-none">🎵</div>
                      <audio
                        src={video.videoUrl}
                        controls
                        preload="metadata"
                        className="w-full"
                      />
                      {isProblem && (
                        <div className="px-2 py-1 bg-red-600 text-white text-xs rounded self-end">
                          Needs Fix
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Video card */
                    <div className="aspect-video bg-black relative">
                      <video
                        src={video.videoUrl}
                        className="w-full h-full object-contain bg-black"
                        playsInline
                        preload="metadata"
                        onError={(e) => {
                          const vid = e.currentTarget;
                          if (!vid.dataset.retried) {
                            vid.dataset.retried = '1';
                            const sep = vid.src.includes('?') ? '&' : '?';
                            vid.src = vid.src + sep + '_r=' + Date.now();
                          }
                        }}
                      />
                      {isProblem && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded">
                          Needs Fix
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white truncate mb-2">{video.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-3 flex-wrap">
                      {isAudio && (
                        <span className="px-2 py-0.5 bg-cyan-900 text-cyan-300 rounded text-xs font-medium">
                          🎵 Audio
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-700 rounded">
                        {categoryBadge(video.category)}
                      </span>
                      {video.week && (
                        <span className={`px-2 py-0.5 rounded ${
                          weekNum && weekNum >= 1 && weekNum <= 36
                            ? 'bg-cyan-900 text-cyan-300'
                            : 'bg-red-900 text-red-300'
                        }`}>
                          {video.week.toString().toLowerCase().startsWith('week') ? video.week : `Week ${video.week}`}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(video)}
                        className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteVideo(video.id, video.title)}
                        className="px-3 py-2 bg-red-900 hover:bg-red-800 rounded-lg text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
