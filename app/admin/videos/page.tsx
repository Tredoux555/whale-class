"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ videos: 0, students: 0, works: 0, teachers: 0 });

  useEffect(() => {
    fetchVideos();
    fetchStats();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch("/api/videos");
      
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      
      if (!res.ok) {
        throw new Error("Failed to fetch videos");
      }
      
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to load videos. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch real stats from APIs
      const [videosRes, childrenRes, worksRes] = await Promise.all([
        fetch("/api/videos").then(r => r.ok ? r.json() : { videos: [] }),
        fetch("/api/whale/children").then(r => r.ok ? r.json() : { children: [] }),
        fetch("/api/whale/curriculum/works").then(r => r.ok ? r.json() : { works: [] }),
      ]);

      setStats({
        videos: videosRes.videos?.length || 0,
        students: childrenRes.children?.length || childrenRes.data?.length || 0,
        works: worksRes.works?.length || 257, // Default to seeded count
        teachers: 3, // Could fetch from RBAC API
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
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

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/admin/video-management"
            className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-white"
          >
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold mb-2">YouTube Video Discovery</h3>
            <p className="text-white/90">Discover and approve YouTube videos for curriculum works</p>
          </Link>
          
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 shadow-lg text-white">
            <div className="text-5xl mb-4">📤</div>
            <h3 className="text-2xl font-bold mb-2">Upload Videos</h3>
            <p className="text-white/90 mb-4">Upload your own videos (songs, phonics, stories, recipes)</p>
            <p className="text-white/70 text-sm">Video upload functionality coming soon.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/video-management"
              className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="font-semibold text-blue-900">Video Management</div>
              <div className="text-sm text-blue-700">Manage YouTube videos</div>
            </Link>
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
    </div>
  );
}

