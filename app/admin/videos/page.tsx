"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VideosPage() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) {
        router.push("/admin/login");
      }
    } catch (error) {
      router.push("/admin/login");
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
            <p className="text-white/70 text-sm">Note: Video upload functionality is available in the old admin dashboard. This will be merged here soon.</p>
            <Link
              href="/admin?old=true"
              className="mt-4 inline-block bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Go to Old Dashboard →
            </Link>
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
      </main>
    </div>
  );
}

