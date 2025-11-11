"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient, STORAGE_BUCKET } from '@/lib/supabase';
import { getProxyVideoUrl } from "@/lib/video-utils";

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isVercel, setIsVercel] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchVideos();
    // Detect if we're on Vercel (including custom domains)
    // If not localhost, assume it's deployed on Vercel
    const hostname = window.location.hostname;
    setIsVercel(
      hostname !== 'localhost' && 
      hostname !== '127.0.0.1' &&
      !hostname.startsWith('192.168.') &&
      !hostname.startsWith('10.')
    );
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

    // Store form reference for reset
    const form = e.currentTarget;

    const formData = new FormData(form);
    const title = formData.get("title") as string;
    const category = formData.get("category") as "song-of-week" | "phonics";
    const week = formData.get("week") as string | null;
    const videoFile = formData.get("video") as File | null;

    if (!title || !category || !videoFile) {
      alert("Please fill in all required fields");
      setUploading(false);
      return;
    }

    try {
      let videoUrl: string;
      let videoId: string;

      if (isVercel) {
        // Use Supabase Storage upload
        videoId = crypto.randomUUID();
        const cleanFilename = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `videos/${videoId}-${cleanFilename}`;

        console.log("Starting Supabase Storage upload:", filePath);

        const supabase = createSupabaseClient();
        
        // Upload to Supabase Storage with progress tracking
        // Note: Supabase doesn't have built-in progress, so we'll simulate it
        setUploadProgress(10);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, videoFile, {
            contentType: videoFile.type || 'video/mp4',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        setUploadProgress(90);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          throw new Error("Failed to get public URL for uploaded video");
        }

        videoUrl = urlData.publicUrl;
        console.log("Video uploaded successfully:", videoUrl);
        setUploadProgress(100);

        // Save video metadata
        const metadataResponse = await fetch("/api/videos/save-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: videoId,
            title,
            category,
            videoUrl: videoUrl,
            week: week || undefined,
          }),
        });

        if (!metadataResponse.ok) {
          throw new Error("Failed to save video metadata");
        }
      } else {
        // Use local filesystem on localhost
        const uploadFormData = new FormData();
        uploadFormData.append("title", title);
        uploadFormData.append("category", category);
        if (week) uploadFormData.append("week", week);
        uploadFormData.append("video", videoFile);

        const response = await fetch("/api/videos", {
          method: "POST",
          body: uploadFormData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || `Upload failed with status ${response.status}` };
          }
          alert(errorData.error || "Upload failed. Please try again.");
          return;
        }

        const data = await response.json();
        if (!data.success) {
          alert(data.error || "Upload failed. Please try again.");
          return;
        }

        videoUrl = data.video.videoUrl;
        videoId = data.video.id;
      }

      // Metadata is already saved for Vercel, or saved here for localhost
      setShowUpload(false);
      form.reset();
      setUploadProgress(0);
      alert("Video uploaded successfully! 🎉");
      await fetchVideos();
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setUploadProgress(0);
      
      // Handle timeout
      if (errorMessage.includes("timeout") || errorMessage.includes("aborted")) {
        alert(
          "⚠️ Upload Timeout\n\n" +
          "The upload is taking too long. Please try again with a smaller file or check your connection."
        );
      } else if (errorMessage.includes("Supabase") || errorMessage.includes("bucket") || errorMessage.includes("storage")) {
        alert(
          "⚠️ Supabase Storage Not Configured\n\n" +
          "Supabase Storage needs to be set up:\n\n" +
          "1. Go to Supabase dashboard → Your project → Storage\n" +
          "2. Create a bucket named 'videos' (if not already created)\n" +
          "3. Make sure the bucket is PUBLIC\n" +
          "4. Go to Settings → API and get your keys\n" +
          "5. Add environment variables to Vercel:\n" +
          "   - NEXT_PUBLIC_SUPABASE_URL\n" +
          "   - NEXT_PUBLIC_SUPABASE_ANON_KEY\n" +
          "   - SUPABASE_SERVICE_ROLE_KEY\n" +
          "6. Redeploy your project\n\n" +
          "See SUPABASE-SETUP.md for detailed instructions."
        );
      } else if (errorMessage.includes("413") || errorMessage.includes("Payload") || errorMessage.includes("too large")) {
        alert(
          "⚠️ File Too Large\n\n" +
          "The file exceeds the size limit. Please:\n" +
          "1. Check your Supabase bucket file size limit\n" +
          "2. Try a smaller video file\n" +
          "3. Compress the video"
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

            {/* Upload Form */}
            {showUpload && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-bold text-[#2C5F7C] mb-4">Upload Video</h2>
                {isVercel && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>📦 Using Supabase Storage</strong><br />
                      Videos are uploaded directly to cloud storage, bypassing size limits.
                    </p>
                  </div>
                )}
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
                    <p className="text-xs text-[#2C5F7C]/70 mt-1">
                      Maximum file size: 100MB
                      {isVercel && " (uploaded to cloud storage)"}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full bg-[#4A90E2] text-white py-3 rounded-lg font-semibold hover:bg-[#2C5F7C] transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span>Uploading{uploadProgress > 0 ? ` ${uploadProgress}%` : '...'}</span>
                      </span>
                    ) : (
                      "Upload Video"
                    )}
                  </button>
                  {uploading && uploadProgress > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-[#4A90E2] h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
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
                      src={getProxyVideoUrl(video.videoUrl)}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
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

