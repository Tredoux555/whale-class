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
        // Don't set Content-Type header - browser will set it with boundary for FormData
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `Upload failed with status ${response.status}` };
        }
        
        if (errorData.requiresCloudStorage) {
          alert(
            "⚠️ Vercel Upload Limitation\n\n" +
            "Video uploads on Vercel require cloud storage (AWS S3, Cloudinary, etc.).\n\n" +
            "Workaround:\n" +
            "1. Upload videos on your local server (localhost:3000)\n" +
            "2. Push videos to GitHub\n" +
            "3. Vercel will auto-deploy with the videos\n\n" +
            "Or set up cloud storage for direct uploads."
          );
        } else {
          alert(errorData.error || "Upload failed. Please try again.");
        }
        return;
      }

      const data = await response.json();

      if (data.success) {
        setShowUpload(false);
        e.currentTarget.reset();
        // Show success message
        alert("Video uploaded successfully! 🎉");
        // Refresh videos list
        await fetchVideos();
      } else {
        alert(data.error || "Upload failed. Please try again.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("SSL") || errorMessage.includes("secure connection")) {
        alert(
          "⚠️ SSL Error\n\n" +
          "There's an SSL connection issue. Please:\n" +
          "1. Check your internet connection\n" +
          "2. Try uploading again\n" +
          "3. If on Vercel, upload videos locally and push to git"
        );
      } else {
        alert(`Upload failed: ${errorMessage}\n\nPlease check the console for details.`);
      }
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

        {/* Upload Instructions */}
        {showUpload && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📤</div>
              <h2 className="text-2xl font-bold text-[#2C5F7C] mb-4">Upload Videos</h2>
              <p className="text-[#2C5F7C]/70 mb-6 text-lg">
                To add videos to your Whale Class platform:
              </p>
              <div className="bg-gradient-to-br from-[#B8E0F0] to-[#E8F4F8] rounded-lg p-6 text-left max-w-2xl mx-auto mb-6">
                <p className="font-semibold text-[#2C5F7C] mb-4 text-lg">📝 Step-by-Step Instructions:</p>
                <ol className="list-decimal list-inside space-y-3 text-[#2C5F7C] mb-4">
                  <li className="pb-2">
                    <strong>Run your local server:</strong>
                    <code className="block bg-white px-3 py-1.5 rounded mt-1 text-sm font-mono">npm run dev</code>
                  </li>
                  <li className="pb-2">
                    <strong>Open admin panel locally:</strong>
                    <code className="block bg-white px-3 py-1.5 rounded mt-1 text-sm font-mono">http://localhost:3000/admin</code>
                  </li>
                  <li className="pb-2">
                    <strong>Upload videos there</strong> (works perfectly on localhost)
                  </li>
                  <li className="pb-2">
                    <strong>Push to GitHub:</strong>
                    <code className="block bg-white px-3 py-1.5 rounded mt-1 text-sm font-mono">git push origin main</code>
                  </li>
                  <li className="pb-2">
                    <strong>Vercel auto-deploys</strong> with your videos! 🎉
                  </li>
                </ol>
                <div className="bg-white rounded-lg p-4 mt-4">
                  <p className="text-sm text-[#2C5F7C]/80">
                    <span className="font-semibold">💡 Why this workflow?</span><br />
                    Vercel's serverless functions have a read-only filesystem, so direct uploads aren't possible. This workflow ensures your videos are safely stored in git and deployed automatically.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUpload(false)}
                className="bg-[#4A90E2] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#2C5F7C] transition-colors shadow-md"
              >
                Got it! 👍
              </button>
            </div>
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

