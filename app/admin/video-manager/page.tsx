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
}

const CATEGORIES = ['song-of-week', 'phonics', 'weekly-phonics-sound', 'stories'];

export default function VideoManagerPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  async function uploadVideo() {
    if (!uploadFile || !uploadTitle) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('category', uploadCategory);
      if (uploadWeek) formData.append('week', uploadWeek);

      const res = await fetch('/api/admin/video-manager', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        setVideos(prev => [data.video, ...prev]);
        setShowUpload(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadWeek('');
        setUploadCategory('song-of-week');
      } else {
        alert('Failed to upload: ' + data.error);
      }
    } catch (err) {
      alert('Failed to upload video');
    }
    setUploading(false);
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

  // Group by category
  const songCount = videos.filter(v => v.category === 'song-of-week').length;
  const phonicsCount = videos.filter(v => v.category === 'phonics').length;
  const soundCount = videos.filter(v => v.category === 'weekly-phonics-sound').length;
  const storyCount = videos.filter(v => v.category === 'stories').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">🎬 Video Manager</h1>
            <p className="text-gray-400 mt-1">Manage homepage videos - edit titles, weeks, categories</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 transition-colors font-medium"
            >
              ➕ Upload Video
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
            <h3 className="font-bold text-red-400 mb-2">⚠️ {problemVideos.length} videos need attention</h3>
            <p className="text-red-200 text-sm mb-3">
              These videos have "recovered" or "untitled" in the name, or invalid week numbers.
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
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{videos.length}</div>
            <div className="text-gray-400 text-sm">Total Videos</div>
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
            <div className="text-3xl font-bold text-purple-400">{soundCount}</div>
            <div className="text-gray-400 text-sm">🔤 Sounds</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-400">{storyCount}</div>
            <div className="text-gray-400 text-sm">📖 Stories</div>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchVideos()}
              placeholder="Search by title..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchVideos}
            className="px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500"
          >
            🔍 Search
          </button>
          <button
            onClick={() => { setSearch(''); fetchVideos(); }}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            Clear
          </button>
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4">
              <h3 className="text-xl font-bold mb-4">📤 Upload Video</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Video File</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:text-white hover:file:bg-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title *</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Week 17 Song - Baby Shark"
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
                        <option key={cat} value={cat}>
                          {cat === 'song-of-week' ? '🎵 Song of Week' :
                           cat === 'phonics' ? '📚 Phonics' :
                           cat === 'weekly-phonics-sound' ? '🔤 Weekly Sound' : '📖 Stories'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Video Preview */}
                {uploadFile && (
                  <div className="rounded-lg overflow-hidden bg-black">
                    <video 
                      src={URL.createObjectURL(uploadFile)} 
                      controls 
                      className="w-full max-h-48"
                    />
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
                  {uploading ? '⏳ Uploading...' : '📤 Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingVideo && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4">
              <h3 className="text-xl font-bold mb-4">✏️ Edit Video</h3>
              
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
                        <option key={cat} value={cat}>
                          {cat === 'song-of-week' ? '🎵 Song of Week' :
                           cat === 'phonics' ? '📚 Phonics' :
                           cat === 'weekly-phonics-sound' ? '🔤 Weekly Sound' : '📖 Stories'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Video Preview */}
                <div className="rounded-lg overflow-hidden bg-black">
                  <video 
                    src={editingVideo.videoUrl} 
                    controls 
                    className="w-full max-h-48"
                  />
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

        {/* Videos Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="animate-spin inline-block w-8 h-8 border-2 border-gray-600 border-t-cyan-500 rounded-full mb-4"></div>
            <p>Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">📭</p>
            <p>No videos found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map(video => {
              const weekNum = parseWeekNumber(video.week);
              const isProblem = video.title.toLowerCase().includes('recovered') ||
                               video.title.toLowerCase().includes('untitled') ||
                               (weekNum !== null && (weekNum < 1 || weekNum > 36));
              
              return (
                <div 
                  key={video.id} 
                  className={`bg-gray-800 rounded-xl overflow-hidden ${isProblem ? 'ring-2 ring-red-500' : ''}`}
                >
                  {/* Video Preview */}
                  <div className="aspect-video bg-black relative">
                    <video 
                      src={video.videoUrl} 
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                    {isProblem && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded">
                        Needs Fix
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white truncate mb-2">{video.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                      <span className="px-2 py-0.5 bg-gray-700 rounded">
                        {video.category === 'song-of-week' ? '🎵 Song' :
                         video.category === 'phonics' ? '📚 Phonics' :
                         video.category === 'weekly-phonics-sound' ? '🔤 Sound' : '📖 Story'}
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
