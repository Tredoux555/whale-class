// DEPRECATED — SESSION 113 V2
//
// This page calls /api/videos, /api/videos/upload, and /api/videos/save-metadata
// — none of which exist. The canonical video-manager surface is
// /admin/video-manager (wired into TOOLS, real backing route at
// /api/admin/video-manager). Kept on disk so direct URLs don't 404 (hide-don't-
// delete posture). All server fetches are short-circuited.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function VideosPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ videos: 0, students: 0, works: 0, teachers: 0 });

  // Upload form state
  const [showUploadModal, setShowUploadModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploading, setUploading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'song-of-week' as 'song-of-week' | 'phonics' | 'weekly-phonics-sound' | 'stories' | 'montessori' | 'recipes',
    subcategory: '' as '' | 'practical-life' | 'maths' | 'sensorial' | 'english',
    week: '',
    videoFile: null as File | null,
  });

  useEffect(() => {
    fetchVideos();
    fetchStats();
  }, []);

  // 🚨 DEPRECATED — endpoints below do not exist. Short-circuit instead of 404.
  const fetchVideos = async () => {
    setVideos([]);
    setError(
      'This page is deprecated. Use /admin/video-manager to upload and manage homepage videos.'
    );
    setLoading(false);
  };

  const fetchStats = async () => {
    setStats({ videos: 0, students: 0, works: 0, teachers: 0 });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Deprecated. Use /admin/video-manager to upload homepage videos.');
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]"
      
    >
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🎥</div>
              <div>
                <h1 className="text-2xl font-bold">Video Management</h1>
                <p className="text-sm opacity-90">Upload and manage videos</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin"
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex justify-between">
            <span>{error}</span>
            <button onClick={fetchVideos} className="underline">Retry</button>
          </div>
        )}

        {/* Loading State - Skeleton */}
        {loading ? (
          <div className="space-y-6">
            {/* Skeleton for upload card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-8 animate-pulse">
                <div className="h-12 w-12 bg-white/30 rounded-lg mb-4"></div>
                <div className="h-8 bg-white/30 rounded-lg mb-2 w-3/4"></div>
                <div className="h-4 bg-white/30 rounded-lg mb-2 w-full"></div>
                <div className="h-4 bg-white/30 rounded-lg w-2/3"></div>
              </div>
            </div>
            
            {/* Skeleton for quick links */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="h-7 bg-slate-200 rounded-lg mb-4 w-1/4 animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-lg animate-pulse">
                    <div className="h-5 bg-slate-200 rounded mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 shadow-lg text-white hover:shadow-xl transition-all transform hover:scale-105 text-left"
          >
            <div className="text-5xl mb-4">📤</div>
            <h3 className="text-2xl font-bold mb-2">Upload Videos</h3>
            <p className="text-white/90 mb-4">Upload your own videos (songs, phonics, stories, recipes)</p>
            <p className="text-white/70 text-sm">Click to upload a new video</p>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/materials"
              className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="font-semibold text-green-900">Class Materials</div>
              <div className="text-sm text-green-700">Upload class materials</div>
            </Link>
            <Link
              href="/admin"
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-semibold text-gray-900">Back to Dashboard</div>
              <div className="text-sm text-gray-700">Return to main admin</div>
            </Link>
          </div>
        </div>
          </>
        )}

        {/* Footer Stats - Now with real data */}
        <div className="mt-8 pt-6 border-t">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.videos}</div>
              <div className="text-sm text-gray-500">Videos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">{stats.students}</div>
              <div className="text-sm text-gray-500">Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.works}</div>
              <div className="text-sm text-gray-500">Works</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.teachers}</div>
              <div className="text-sm text-gray-500">Teachers</div>
            </div>
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">📤 Upload Video</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadForm({
                      title: '',
                      category: 'song-of-week',
                      subcategory: '',
                      week: '',
                      videoFile: null,
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  disabled={uploading}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                {/* Video File */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video File *
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadForm({ ...uploadForm, videoFile: file });
                      }
                    }}
                    disabled={uploading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                  {uploadForm.videoFile && (
                    <p className="mt-1 text-sm text-gray-500">
                      Selected: {uploadForm.videoFile.name} ({(uploadForm.videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">Maximum file size: 100MB</p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    disabled={uploading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., The Wheels on the Bus"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as any })}
                    disabled={uploading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="song-of-week">Song of the Week</option>
                    <option value="phonics">Phonics</option>
                    <option value="weekly-phonics-sound">Weekly Phonics Sound</option>
                    <option value="stories">Stories</option>
                    <option value="montessori">Montessori</option>
                    <option value="recipes">Recipes</option>
                  </select>
                </div>

                {/* Subcategory (only for montessori) */}
                {uploadForm.category === 'montessori' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory
                    </label>
                    <select
                      value={uploadForm.subcategory}
                      onChange={(e) => setUploadForm({ ...uploadForm, subcategory: e.target.value as any })}
                      disabled={uploading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">None</option>
                      <option value="practical-life">Practical Life</option>
                      <option value="maths">Maths</option>
                      <option value="sensorial">Sensorial</option>
                      <option value="english">English</option>
                    </select>
                  </div>
                )}

                {/* Week (for song-of-week) */}
                {uploadForm.category === 'song-of-week' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Week (optional)
                    </label>
                    <input
                      type="text"
                      value={uploadForm.week}
                      onChange={(e) => setUploadForm({ ...uploadForm, week: e.target.value })}
                      disabled={uploading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., Week 1"
                    />
                  </div>
                )}

                {/* Upload Progress */}
                {uploading && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Uploading...</span>
                      <span className="text-sm font-bold text-purple-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadForm({
                        title: '',
                        category: 'song-of-week',
                        subcategory: '',
                        week: '',
                        videoFile: null,
                      });
                    }}
                    disabled={uploading}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadForm.videoFile || !uploadForm.title}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {uploading ? 'Uploading...' : 'Upload Video'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

