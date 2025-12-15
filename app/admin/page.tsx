"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient, STORAGE_BUCKET } from '@/lib/supabase';
import { getProxyVideoUrl } from "@/lib/video-utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Video {
  id: string;
  title: string;
  category: "song-of-week" | "phonics" | "weekly-phonics-sound" | "stories" | "montessori" | "recipes";
  subcategory?: "practical-life" | "maths" | "sensorial" | "english"; // Only for montessori
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
  const [selectedCategory, setSelectedCategory] = useState<"all" | "song-of-week" | "phonics" | "weekly-phonics-sound" | "stories" | "montessori" | "recipes">("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<"practical-life" | "maths" | "sensorial" | "english" | "all">("all");
  const [formCategory, setFormCategory] = useState<"song-of-week" | "phonics" | "weekly-phonics-sound" | "stories" | "montessori" | "recipes">("song-of-week");
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
      // Cache-busting to ensure fresh data
      const response = await fetch(`/api/videos?t=${Date.now()}`, {
        cache: 'no-store',
      });
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
    const category = formData.get("category") as "song-of-week" | "phonics" | "weekly-phonics-sound" | "stories" | "montessori" | "recipes";
    const subcategory = category === "montessori" 
      ? (formData.get("subcategory") as "practical-life" | "maths" | "sensorial" | "english" | undefined)
      : undefined;
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
        // Use client-side Supabase Storage upload with server-generated path
        // This bypasses Vercel's 4.5MB payload limit
        console.log("Starting client-side Supabase Storage upload");

        // First, get upload path from server (small request, no payload limit)
        setUploadProgress(5);
        const pathResponse = await fetch("/api/videos/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: videoFile.name,
            contentType: videoFile.type || 'video/mp4',
          }),
        });

        if (!pathResponse.ok) {
          const errorText = await pathResponse.text();
          throw new Error(errorText || "Failed to get upload path");
        }

        const pathData = await pathResponse.json();
        if (!pathData.success || !pathData.path || !pathData.videoId) {
          throw new Error("Failed to get upload path from server");
        }

        videoId = pathData.videoId;
        const filePath = pathData.path;
        setUploadProgress(10);

        // Now upload directly from client to Supabase using service role key
        // We'll use a server endpoint that proxies the upload but streams it
        // Actually, better: use client upload with anon key but configure RLS policies
        // OR: Create a streaming upload endpoint
        
        // For now, let's try using the anon key with proper error handling
        // The user will need to configure storage policies in Supabase
        const supabase = createSupabaseClient();
        
        setUploadProgress(20);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, videoFile, {
            contentType: videoFile.type || 'video/mp4',
            upsert: false,
          });

        if (uploadError) {
          // If RLS error, provide helpful message
          if (uploadError.message.includes("row-level security") || uploadError.message.includes("policy")) {
            throw new Error(
              "Storage policy error. Please configure Supabase Storage policies:\n\n" +
              "1. Go to Supabase Dashboard → Storage → Policies\n" +
              "2. Create a policy for the 'videos' bucket:\n" +
              "   - Policy name: 'Allow public uploads'\n" +
              "   - Allowed operation: INSERT\n" +
              "   - Target roles: anon, authenticated\n" +
              "   - USING expression: true\n" +
              "   - WITH CHECK expression: true\n\n" +
              "Or contact support for help setting up storage policies."
            );
          }
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
            subcategory,
            videoUrl: videoUrl,
            week: week || undefined,
          }),
        });

        if (!metadataResponse.ok) {
          throw new Error("Failed to save video metadata");
        }

        // Optimistically add video to UI immediately
        const newVideo: Video = {
          id: videoId,
          title,
          category,
          subcategory,
          videoUrl,
          uploadedAt: new Date().toISOString(),
          week: week || undefined,
        };
        setVideos(prev => [newVideo, ...prev]);
      } else {
        // Use local filesystem on localhost
        const uploadFormData = new FormData();
        uploadFormData.append("title", title);
        uploadFormData.append("category", category);
        if (subcategory) uploadFormData.append("subcategory", subcategory);
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

        // Optimistically add video to UI immediately
        setVideos(prev => [data.video, ...prev]);
      }

      // Metadata is already saved for Vercel, or saved here for localhost
      setShowUpload(false);
      form.reset();
      setUploadProgress(0);
      // Silently refresh in background to ensure sync (UI already updated)
      fetchVideos();
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

    // Optimistically remove from UI immediately
    const videoToDelete = videos.find(v => v.id === id);
    setVideos(prev => prev.filter(v => v.id !== id));

    try {
      const response = await fetch(`/api/videos/delete?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Revert on error - add video back
        if (videoToDelete) {
          setVideos(prev => [...prev, videoToDelete]);
        }
        alert("Delete failed. Please try again.");
      }
      // Success - UI already updated, silently refresh to ensure sync
      fetchVideos();
    } catch (error) {
      // Revert on error - add video back
      if (videoToDelete) {
        setVideos(prev => [...prev, videoToDelete]);
      }
      alert("Delete failed. Please try again.");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const filteredVideos = selectedCategory === "all"
      ? videos
      : videos.filter(v => v.category === selectedCategory);

    const oldIndex = filteredVideos.findIndex((v) => v.id === active.id);
    const newIndex = filteredVideos.findIndex((v) => v.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder the filtered videos
    const reorderedFiltered = arrayMove(filteredVideos, oldIndex, newIndex);

    // If filtering by category, we need to update the full videos array
    let reorderedAll: Video[];
    if (selectedCategory === "all") {
      reorderedAll = reorderedFiltered;
    } else {
      // Keep videos from other categories in their original positions
      const otherCategoryVideos = videos.filter(v => v.category !== selectedCategory);
      reorderedAll = [...reorderedFiltered, ...otherCategoryVideos];
    }

    // Optimistically update UI
    setVideos(reorderedAll);

    // Save to server
    try {
      const response = await fetch("/api/videos/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoIds: reorderedAll.map(v => v.id),
        }),
      });

      if (!response.ok) {
        // Revert on error
        fetchVideos();
        alert("Failed to save new order. Please try again.");
      }
    } catch (error) {
      // Revert on error
      fetchVideos();
      alert("Failed to save new order. Please try again.");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="bg-[#4A90E2] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2C5F7C] transition-colors shadow-md"
          >
            {showUpload ? "Cancel Upload" : "+ Upload New Video"}
          </button>
<Link
            href="/admin/circle-planner"
            prefetch={false}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">🌈</span> Circle Time Planner
          </Link>
          <Link
            href="/admin/phonics-planner"
            prefetch={false}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">🔤</span> Phonics Planner
          </Link>
          <Link
            href="/admin/materials"
            prefetch={false}
            className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-teal-600 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">📚</span> Class Materials
          </Link>
          <Link
            href="/admin/card-generator"
            prefetch={false}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">🍎</span> Card Generator
          </Link>
          <Link
            href="/admin/montessori"
            prefetch={false}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">📊</span> Montessori Tracking
          </Link>
          <Link
            href="/admin/montessori-works"
            prefetch={false}
            className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">🎓</span> Montessori Works
          </Link>
          <Link
            href="/admin/english-curriculum"
            prefetch={false}
            className="bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">📚</span> English Curriculum
          </Link>
          <Link
            href="/admin/daughter-activity"
            prefetch={false}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">🌟</span> Daughter's Activity
          </Link>
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
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as "song-of-week" | "phonics" | "weekly-phonics-sound" | "stories" | "montessori" | "recipes")}
                      className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                    >
                      <option value="song-of-week">Song of the Week</option>
                      <option value="phonics">Phonics Song</option>
                      <option value="weekly-phonics-sound">Weekly Phonics Sound</option>
                      <option value="stories">Stories</option>
                      <option value="montessori">Montessori (Admin Only)</option>
                      <option value="recipes">Recipes (Admin Only)</option>
                    </select>
                  </div>

                  {formCategory === "montessori" && (
                    <div>
                      <label className="block text-sm font-semibold text-[#2C5F7C] mb-2">
                        Montessori Subcategory
                      </label>
                      <select
                        name="subcategory"
                        required
                        className="w-full px-4 py-2 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2]"
                      >
                        <option value="practical-life">Practical Life</option>
                        <option value="maths">Maths</option>
                        <option value="sensorial">Sensorial</option>
                        <option value="english">English</option>
                      </select>
                    </div>
                  )}

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

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSelectedSubcategory("all");
            }}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "all"
                ? "bg-[#4A90E2] text-white shadow-md"
                : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
            }`}
          >
            All Videos ({videos.length})
          </button>
          <button
            onClick={() => {
              setSelectedCategory("song-of-week");
              setSelectedSubcategory("all");
            }}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "song-of-week"
                ? "bg-[#4A90E2] text-white shadow-md"
                : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
            }`}
          >
            🎵 Song of Week ({videos.filter(v => v.category === "song-of-week").length})
          </button>
          <button
            onClick={() => {
              setSelectedCategory("phonics");
              setSelectedSubcategory("all");
            }}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "phonics"
                ? "bg-[#4A90E2] text-white shadow-md"
                : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
            }`}
          >
            📚 Phonics ({videos.filter(v => v.category === "phonics").length})
          </button>
          <button
            onClick={() => {
              setSelectedCategory("weekly-phonics-sound");
              setSelectedSubcategory("all");
            }}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "weekly-phonics-sound"
                ? "bg-[#4A90E2] text-white shadow-md"
                : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
            }`}
          >
            🔤 Weekly Phonics Sound ({videos.filter(v => v.category === "weekly-phonics-sound").length})
          </button>
          <button
            onClick={() => {
              setSelectedCategory("stories");
              setSelectedSubcategory("all");
            }}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "stories"
                ? "bg-[#4A90E2] text-white shadow-md"
                : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
            }`}
          >
            📖 Stories ({videos.filter(v => v.category === "stories").length})
          </button>
          <button
            onClick={() => {
              setSelectedCategory("montessori");
              setSelectedSubcategory("all");
            }}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "montessori"
                ? "bg-[#4A90E2] text-white shadow-md"
                : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
            }`}
          >
            🧩 Montessori ({videos.filter(v => v.category === "montessori").length})
          </button>
          <button
            onClick={() => {
              setSelectedCategory("recipes");
              setSelectedSubcategory("all");
            }}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "recipes"
                ? "bg-[#4A90E2] text-white shadow-md"
                : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
            }`}
          >
            🍳 Recipes ({videos.filter(v => v.category === "recipes").length})
          </button>
        </div>

        {/* Subcategory Tabs for Montessori */}
        {selectedCategory === "montessori" && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedSubcategory("all")}
              className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                selectedSubcategory === "all"
                  ? "bg-[#4A90E2] text-white shadow-md"
                  : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
              }`}
            >
              All Montessori ({videos.filter(v => v.category === "montessori").length})
            </button>
            <button
              onClick={() => setSelectedSubcategory("practical-life")}
              className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                selectedSubcategory === "practical-life"
                  ? "bg-[#4A90E2] text-white shadow-md"
                  : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
              }`}
            >
              Practical Life ({videos.filter(v => v.category === "montessori" && v.subcategory === "practical-life").length})
            </button>
            <button
              onClick={() => setSelectedSubcategory("maths")}
              className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                selectedSubcategory === "maths"
                  ? "bg-[#4A90E2] text-white shadow-md"
                  : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
              }`}
            >
              Maths ({videos.filter(v => v.category === "montessori" && v.subcategory === "maths").length})
            </button>
            <button
              onClick={() => setSelectedSubcategory("sensorial")}
              className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                selectedSubcategory === "sensorial"
                  ? "bg-[#4A90E2] text-white shadow-md"
                  : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
              }`}
            >
              Sensorial ({videos.filter(v => v.category === "montessori" && v.subcategory === "sensorial").length})
            </button>
            <button
              onClick={() => setSelectedSubcategory("english")}
              className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                selectedSubcategory === "english"
                  ? "bg-[#4A90E2] text-white shadow-md"
                  : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
              }`}
            >
              English ({videos.filter(v => v.category === "montessori" && v.subcategory === "english").length})
            </button>
          </div>
        )}

        {/* Videos List */}
        <div>
          <h2 className="text-2xl font-bold text-[#2C5F7C] mb-4">
            {selectedCategory === "all" 
              ? `All Videos (${videos.length})`
              : selectedCategory === "song-of-week"
              ? `Song of Week Videos (${videos.filter(v => v.category === "song-of-week").length})`
              : selectedCategory === "phonics"
              ? `Phonics Videos (${videos.filter(v => v.category === "phonics").length})`
              : selectedCategory === "weekly-phonics-sound"
              ? `Weekly Phonics Sound Videos (${videos.filter(v => v.category === "weekly-phonics-sound").length})`
              : selectedCategory === "stories"
              ? `Stories Videos (${videos.filter(v => v.category === "stories").length})`
              : selectedCategory === "montessori"
              ? selectedSubcategory === "all"
                ? `Montessori Videos (${videos.filter(v => v.category === "montessori").length})`
                : `Montessori - ${selectedSubcategory === "practical-life" ? "Practical Life" : selectedSubcategory === "maths" ? "Maths" : selectedSubcategory === "sensorial" ? "Sensorial" : "English"} (${videos.filter(v => v.category === "montessori" && v.subcategory === selectedSubcategory).length})`
              : selectedCategory === "recipes"
              ? `Recipes Videos (${videos.filter(v => v.category === "recipes").length})`
              : ""
            }
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">🐋</div>
              <p className="text-[#2C5F7C] text-lg">Loading...</p>
            </div>
          ) : (() => {
            // Filter by category and subcategory, maintain the stored order (matches main site)
            let filteredVideos: Video[];
            if (selectedCategory === "all") {
              filteredVideos = videos;
            } else if (selectedCategory === "montessori") {
              if (selectedSubcategory === "all") {
                filteredVideos = videos.filter(v => v.category === "montessori");
              } else {
                filteredVideos = videos.filter(v => v.category === "montessori" && v.subcategory === selectedSubcategory);
              }
            } else {
              filteredVideos = videos.filter(v => v.category === selectedCategory);
            }
            
            return filteredVideos.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-8 text-center">
                <div className="text-6xl mb-4">🌊</div>
                <p className="text-[#2C5F7C] text-lg font-semibold">No videos in this category!</p>
                <p className="text-[#2C5F7C]/70 mt-2">Upload a video to get started.</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredVideos.map(v => v.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredVideos.map((video) => (
                      <SortableVideoItem
                        key={video.id}
                        video={video}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            );
          })()}
        </div>
      </main>
    </div>
  );
}

// Sortable Video Item Component
function SortableVideoItem({ video, onDelete }: { video: Video; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-2xl shadow-md overflow-hidden relative"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 bg-[#4A90E2] text-white p-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-[#2C5F7C] transition-colors shadow-md"
        title="Drag to reorder"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="9" y1="5" x2="9" y2="19"></line>
          <line x1="15" y1="5" x2="15" y2="19"></line>
        </svg>
      </div>

      <div className="aspect-video bg-gradient-to-br from-[#4A90E2] to-[#2C5F7C]">
        <video
          src={getProxyVideoUrl(video.videoUrl)}
          controls
          playsInline
          webkit-playsinline="true"
          playsinline
          x-webkit-airplay="allow"
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
            {video.category === "song-of-week" 
              ? "🎵 Song of Week" 
              : video.category === "phonics"
              ? "📚 Phonics"
              : video.category === "weekly-phonics-sound"
              ? "🔤 Weekly Phonics Sound"
              : video.category === "stories"
              ? "📖 Stories"
              : video.category === "recipes"
              ? "🍳 Recipes"
              : "🧩 Montessori"}
          </span>
          {video.week && (
            <span className="px-2 py-1 bg-[#FFB84D] rounded-full text-white text-sm">
              Week {video.week}
            </span>
          )}
        </div>
        <button
          onClick={() => onDelete(video.id)}
          className="w-full bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

