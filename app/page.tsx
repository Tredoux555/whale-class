"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "song-of-week" | "phonics">("all");

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch("/api/public/videos");
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = selectedCategory === "all" 
    ? videos 
    : videos.filter(v => v.category === selectedCategory);

  const songOfWeekVideos = videos.filter(v => v.category === "song-of-week");
  const phonicsVideos = videos.filter(v => v.category === "phonics");

  // Preload first video immediately for faster initial load
  useEffect(() => {
    if (filteredVideos.length > 0) {
      // Small delay to ensure DOM is ready after category change
      const timeoutId = setTimeout(() => {
        const firstVideo = document.querySelector('video[data-src]') as HTMLVideoElement;
        if (firstVideo) {
          const src = firstVideo.getAttribute('data-src');
          if (src) {
            firstVideo.src = src;
            firstVideo.removeAttribute('data-src');
            firstVideo.preload = 'auto';
            firstVideo.load();
          }
        }
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }
  }, [filteredVideos, selectedCategory]);

  // Lazy load videos when they become visible - re-initialize on category change
  useEffect(() => {
    if (videos.length === 0 || filteredVideos.length === 0) return;

    // Small delay to ensure DOM has updated after category change
    const timeoutId = setTimeout(() => {
      const videoElements = document.querySelectorAll('video[data-src]');
      
      if (videoElements.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video = entry.target as HTMLVideoElement;
            const src = video.getAttribute('data-src');
            
            if (!src) return; // Already loaded
            
            if (entry.isIntersecting) {
              // Set src immediately for faster loading
              video.src = src;
              video.removeAttribute('data-src');
              // Load metadata immediately for faster playback start
              video.load();
              observer.unobserve(video);
            } else if (entry.intersectionRatio > 0.1) {
              // Start loading when video is 10% visible (more aggressive)
              video.src = src;
              video.removeAttribute('data-src');
              video.load();
              observer.unobserve(video);
            }
          });
        },
        {
          rootMargin: '500px', // Start loading 500px before video enters viewport
          threshold: [0, 0.1, 0.5, 1.0], // Multiple thresholds for better detection
        }
      );

      videoElements.forEach((video) => {
        // Only observe videos that haven't been loaded yet
        if (video.hasAttribute('data-src')) {
          observer.observe(video);
        }
      });

      return () => {
        observer.disconnect();
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [videos, filteredVideos, selectedCategory]);

  const handleDownload = (video: Video) => {
    try {
      // Get filename from URL or use title
      const urlParts = video.videoUrl.split('/');
      const urlFilename = urlParts[urlParts.length - 1];
      const cleanTitle = video.title.replace(/[^a-z0-9\s-]/gi, '_').replace(/\s+/g, '_');
      const filename = urlFilename.includes('.') ? urlFilename : `${cleanTitle}.mp4`;
      
      // Use proxy URL for downloads (works better in China)
      const downloadUrl = getProxyVideoUrl(video.videoUrl);
      
      // Create download link directly (no fetch needed - avoids SSL issues)
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank'; // Open in new tab as fallback
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      window.open(getProxyVideoUrl(video.videoUrl), '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]">
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🐋</div>
              <div>
                <h1 className="text-2xl font-bold">Whale Class</h1>
                <p className="text-sm opacity-90">Learning Videos</p>
              </div>
            </div>
            <Link 
              href="/admin/login"
              className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-20">
        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "all"
                ? "bg-[#4A90E2] text-white shadow-md"
                : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
            }`}
          >
            All Videos ({videos.length})
          </button>
          <button
            onClick={() => setSelectedCategory("song-of-week")}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "song-of-week"
                ? "bg-[#4A90E2] text-white shadow-md"
                : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
            }`}
          >
            🎵 Song of Week ({songOfWeekVideos.length})
          </button>
          <button
            onClick={() => setSelectedCategory("phonics")}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "phonics"
                ? "bg-[#4A90E2] text-white shadow-md"
                : "bg-white text-[#2C5F7C] hover:bg-[#B8E0F0]"
            }`}
          >
            📚 Phonics Songs ({phonicsVideos.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-bounce">🐋</div>
            <p className="text-[#2C5F7C] text-lg">Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-md">
            <div className="text-6xl mb-4">🌊</div>
            <p className="text-[#2C5F7C] text-lg font-semibold">No videos yet!</p>
            <p className="text-[#2C5F7C]/70 mt-2">Check back soon for new content.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="aspect-video bg-gradient-to-br from-[#4A90E2] to-[#2C5F7C] relative">
                  <video
                    data-src={getProxyVideoUrl(video.videoUrl)}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                    preload="auto"
                    muted
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#2C5F7C] text-lg mb-1">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-[#2C5F7C]/70">
                        <span className="px-2 py-1 bg-[#B8E0F0] rounded-full">
                          {video.category === "song-of-week" ? "🎵 Song of Week" : "📚 Phonics"}
                        </span>
                        {video.week && (
                          <span className="px-2 py-1 bg-[#FFB84D] rounded-full text-white">
                            Week {video.week}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => handleDownload(video)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#4A90E2] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#2C5F7C] transition-colors text-sm"
                    >
                      <span>⬇️</span>
                      <span>Download Video</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* PWA Install Prompt */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#4A90E2] text-white p-4 shadow-lg z-50 hidden" id="install-prompt">
        <div className="container mx-auto flex items-center justify-between">
          <p className="text-sm">Install Whale Class app for easy access!</p>
          <button
            onClick={() => {
              const prompt = document.getElementById("install-prompt");
              if (prompt) prompt.classList.add("hidden");
            }}
            className="bg-white text-[#4A90E2] px-4 py-2 rounded-lg font-semibold text-sm"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
