// =====================================================
// ADMIN: Video Management Dashboard
// =====================================================
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Video {
  id: string;
  work_id: string;
  youtube_video_id: string;
  title: string;
  channel_name: string;
  relevance_score: number;
  is_approved: boolean;
  is_active: boolean;
  curriculum_roadmap: {
    work_name: string;
    area: string;
  };
}

export default function VideoManagementPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadVideos();
  }, [filter]);

  async function loadVideos() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/videos?status=${filter}`);
      const data = await response.json();
      
      if (data.success) {
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function approveVideo(videoId: string) {
    try {
      const response = await fetch('/api/admin/videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, isApproved: true }),
      });

      if (response.ok) {
        loadVideos();
      }
    } catch (error) {
      console.error('Error approving video:', error);
    }
  }

  async function rejectVideo(videoId: string) {
    try {
      const response = await fetch('/api/admin/videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, isApproved: false, isActive: false }),
      });

      if (response.ok) {
        loadVideos();
      }
    } catch (error) {
      console.error('Error rejecting video:', error);
    }
  }

  async function runDiscovery() {
    if (!confirm('Start video discovery? This may take 2-3 minutes.')) {
      return;
    }

    setSearching(true);
    try {
      const response = await fetch('/api/youtube/discover-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAll: false }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          alert('Admin access required. Please log in as admin.');
          return;
        }
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        alert(`Discovery complete! Found ${data.videosFound} videos out of ${data.totalWorks} works.`);
        loadVideos();
      } else {
        alert(`Discovery failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Discovery failed: ${errorMessage}`);
      console.error('Discovery error:', error);
    } finally {
      setSearching(false);
    }
  }

  function getScoreColor(score: number) {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-blue-600 bg-blue-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  }

  const stats = {
    total: videos.length,
    approved: videos.filter(v => v.is_approved).length,
    pending: videos.filter(v => !v.is_approved && v.is_active).length,
  };

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Video Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage YouTube videos for curriculum works
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={runDiscovery}
                disabled={searching}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {searching ? 'Discovering...' : '🔍 Discover Videos'}
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back to Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Total Videos</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Approved</div>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Pending Approval</div>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'approved'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Approved ({stats.approved})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Pending ({stats.pending})
          </button>
        </div>

        {/* Video List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No videos found. Run discovery to find videos.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Work
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Video
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {video.curriculum_roadmap?.work_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {video.curriculum_roadmap?.area || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{video.title}</div>
                      <div className="text-xs text-gray-500">{video.channel_name}</div>
                      <a
                        href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Watch on YouTube →
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(video.relevance_score)}`}>
                        {video.relevance_score}/100
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {video.is_approved ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          ✅ Approved
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      {!video.is_approved && (
                        <>
                          <button
                            onClick={() => approveVideo(video.id)}
                            className="text-green-600 hover:text-green-900 font-medium mr-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectVideo(video.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {video.is_approved && (
                        <button
                          onClick={() => rejectVideo(video.id)}
                          className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

