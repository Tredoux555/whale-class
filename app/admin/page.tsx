"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Video {
  id: string;
  title: string;
  category: "song-of-week" | "phonics";
  videoUrl: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  week?: string;
}

export default function AdminDashboard() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchVideos();
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

  const fetchVideos = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowUpload(false);
        fetchVideos();
        e.currentTarget.reset();
        // Show success message
        alert("Video uploaded successfully! 🎉");
      } else {
        const errorMessage = data.error || "Upload failed. Please try again.";
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please check the console for details.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;

    try {
      const response = await fetch(`/api/videos/delete?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchVideos();
      } else {
        alert("Delete failed. Please try again.");
      }
    } catch (error) {
      alert("Delete failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]">
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🐋</div>
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm opacity-90">Whale Class</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                View Site
              </Link>
              <button
                onClick={handleLogout}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Upload Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="bg-[#4A90E2] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2C5F7C] transition-colors shadow-md"
          >
            {showUpload ? "Cancel Upload" : "+ Upload New Video"}
          </button>
        </div>

        {/* Upload Form */}
        {showUpload && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-[#2C5F7C] mb-4">Upload Video</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                  Title
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                  placeholder="Video title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                  Category
                </label>
                <select
                  name="category"
                  required
                  className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                >
                  <option value="song-of-week">Song of the Week</option>
                  <option value="phonics">Phonics Song</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                  Week (optional, for Song of the Week)
                </label>
                <input
                  name="week"
                  type="text"
                  className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                  placeholder="e.g., Week 1, Week 2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                  Video File
                </label>
                <input
                  name="video"
                  type="file"
                  accept="video/*"
                  required
                  className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-[#4A90E2] text-white py-3 rounded-lg font-semibold hover:bg-[#2C5F7C] transition-colors disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Video"}
              </button>
            </form>
          </div>
        )}

        {/* Videos List */}
        <div>
          <h2 className="text-2xl font-bold text-[#2C5F7C] mb-4">
            Videos ({videos.length})
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">🐋</div>
              <p className="text-[#2C5F7C] text-lg">Loading...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center">
              <div className="text-6xl mb-4">🌊</div>
              <p className="text-[#2C5F7C] text-lg font-semibold">No videos yet!</p>
              <p className="text-[#2C5F7C]/70 mt-2">Upload your first video to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden"
                >
                  <div className="aspect-video bg-gradient-to-br from-[#4A90E2] to-[#2C5F7C]">
                    <video
                      src={video.videoUrl}
                      controls
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-[#2C5F7C] text-lg mb-2">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-[#B8E0F0] rounded-full text-sm">
                        {video.category === "song-of-week" ? "🎵 Song of Week" : "📚 Phonics"}
                      </span>
                      {video.week && (
                        <span className="px-2 py-1 bg-[#FFB84D] rounded-full text-white text-sm">
                          Week {video.week}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="w-full bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

