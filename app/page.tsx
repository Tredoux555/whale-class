"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { getProxyVideoUrl } from "@/lib/video-utils";
import { setupMediaSessionForVideo } from "@/lib/video-playback-utils";

interface Video {
  id: string;
  title: string;
  category: "song-of-week" | "phonics" | "weekly-phonics-sound" | "stories";
  videoUrl: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  week?: string;
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "song-of-week" | "phonics" | "weekly-phonics-sound" | "stories">("all");
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [repeatModes, setRepeatModes] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const visibilityStartTime = useRef<number | null>(null);
  const periodicRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/videos?t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        visibilityStartTime.current = Date.now();
        if (refreshTimeout) clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          if (document.visibilityState === 'visible') fetchVideos();
        }, 5000);
        if (periodicRefreshInterval.current) clearInterval(periodicRefreshInterval.current);
        periodicRefreshInterval.current = setInterval(() => {
          if (document.visibilityState === 'visible') fetchVideos();
        }, 30000);
      } else {
        visibilityStartTime.current = null;
        if (refreshTimeout) { clearTimeout(refreshTimeout); refreshTimeout = null; }
        if (periodicRefreshInterval.current) { clearInterval(periodicRefreshInterval.current); periodicRefreshInterval.current = null; }
      }
    };

    if (document.visibilityState === 'visible') {
      visibilityStartTime.current = Date.now();
      refreshTimeout = setTimeout(() => {
        if (document.visibilityState === 'visible') fetchVideos();
      }, 5000);
      periodicRefreshInterval.current = setInterval(() => {
        if (document.visibilityState === 'visible') fetchVideos();
      }, 30000);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (periodicRefreshInterval.current) clearInterval(periodicRefreshInterval.current);
    };
  }, [fetchVideos]);

  const filteredVideos = useMemo(() => {
    return selectedCategory === "all" ? videos : videos.filter(v => v.category === selectedCategory);
  }, [videos, selectedCategory]);

  const songOfWeekVideos = videos.filter(v => v.category === "song-of-week");
  const phonicsVideos = videos.filter(v => v.category === "phonics");
  const weeklyPhonicsSoundVideos = videos.filter(v => v.category === "weekly-phonics-sound");
  const storiesVideos = videos.filter(v => v.category === "stories");

  useEffect(() => {
    if (!currentlyPlayingId || filteredVideos.length === 0) return;
    const currentIndex = filteredVideos.findIndex(v => v.id === currentlyPlayingId);
    if (currentIndex === -1) return;
    const currentVideo = videoRefs.current[currentlyPlayingId];
    if (!currentVideo) return;

    const handleEnded = () => {
      if (repeatModes[currentlyPlayingId]) {
        currentVideo.currentTime = 0;
        currentVideo.play().catch(console.error);
        return;
      }
      const nextIndex = (currentIndex + 1) % filteredVideos.length;
      const nextVideo = filteredVideos[nextIndex];
      const nextVideoElement = videoRefs.current[nextVideo.id];
      if (nextVideoElement) {
        currentVideo.pause();
        setCurrentlyPlayingId(nextVideo.id);
        nextVideoElement.currentTime = 0;
        nextVideoElement.play().catch(console.error);
      }
    };

    currentVideo.addEventListener('ended', handleEnded);
    return () => currentVideo.removeEventListener('ended', handleEnded);
  }, [currentlyPlayingId, filteredVideos, repeatModes]);

  useEffect(() => {
    if (filteredVideos.length === 0) return;
    const timeoutId = setTimeout(() => {
      const videoElements = document.querySelectorAll('video[data-src]');
      if (videoElements.length === 0) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const video = entry.target as HTMLVideoElement;
              const src = video.getAttribute('data-src');
              if (src) {
                video.src = src;
                video.removeAttribute('data-src');
                video.preload = 'metadata';
                observer.unobserve(video);
              }
            }
          });
        },
        { rootMargin: '200px', threshold: 0.1 }
      );
      videoElements.forEach((video) => observer.observe(video));
      return () => videoElements.forEach((video) => observer.unobserve(video));
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [filteredVideos]);

  const handleVideoPlay = (videoId: string) => {
    setCurrentlyPlayingId(videoId);
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (id !== videoId && video) video.pause();
    });
    const currentVideo = videoRefs.current[videoId];
    const videoData = videos.find(v => v.id === videoId);
    if (currentVideo && videoData) {
      setupMediaSessionForVideo(currentVideo, videoData.title, 'Whale Class');
    }
  };

  const toggleRepeat = (videoId: string) => {
    setRepeatModes(prev => ({ ...prev, [videoId]: !prev[videoId] }));
  };

  const handleDownload = (video: Video) => {
    try {
      const urlParts = video.videoUrl.split('/');
      const urlFilename = urlParts[urlParts.length - 1];
      const cleanTitle = video.title.replace(/[^a-z0-9\s-]/gi, '_').replace(/\s+/g, '_');
      const filename = urlFilename.includes('.') ? urlFilename : `${cleanTitle}.mp4`;
      const downloadUrl = getProxyVideoUrl(video.videoUrl);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);
    } catch (error) {
      console.error('Download error:', error);
      window.open(getProxyVideoUrl(video.videoUrl), '_blank');
    }
  };

  const categories = [
    { id: "all", label: "All Videos", count: videos.length, icon: "📺" },
    { id: "song-of-week", label: "Song of Week", count: songOfWeekVideos.length, icon: "🎵" },
    { id: "phonics", label: "Phonics Songs", count: phonicsVideos.length, icon: "📚" },
    { id: "weekly-phonics-sound", label: "Weekly Sound", count: weeklyPhonicsSoundVideos.length, icon: "🔤" },
    { id: "stories", label: "Stories", count: storiesVideos.length, icon: "📖" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header - Clean & Modern */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-3xl">🐋</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Whale Class</h1>
                <p className="text-sm text-blue-100">Learning Videos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link 
                href="/games"
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all backdrop-blur-sm"
              >
                <span>🎮</span>
                <span className="hidden sm:inline">Games</span>
              </Link>
              <Link 
                href="/teacher"
                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-colors"
              >
                <span>👩‍🏫</span>
                <span className="hidden sm:inline">Teachers</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-20">
        {/* Category Pills - Scrollable on mobile */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedCategory === cat.id ? "bg-white/20" : "bg-gray-100"
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <span className="text-4xl animate-bounce">🐋</span>
            </div>
            <p className="text-gray-600 font-medium">Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🌊</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No videos yet!</h2>
            <p className="text-gray-500">Check back soon for new content.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100 group"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-500 to-indigo-600 relative">
                  <video
                    ref={(el) => { if (el) videoRefs.current[video.id] = el; }}
                    data-src={getProxyVideoUrl(video.videoUrl)}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                    preload="none"
                    loop={repeatModes[video.id] || false}
                    onPlay={() => handleVideoPlay(video.id)}
                  />
                  {/* Repeat Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleRepeat(video.id); }}
                    className={`absolute top-3 right-3 z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                      repeatModes[video.id]
                        ? "bg-blue-600 text-white"
                        : "bg-white/90 text-gray-700 hover:bg-white"
                    }`}
                    title={repeatModes[video.id] ? "Disable repeat" : "Enable repeat"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 1l4 4-4 4" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <path d="M7 23l-4-4 4-4" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                      {video.category === "song-of-week" ? "🎵 Song" : video.category === "phonics" ? "📚 Phonics" : video.category === "weekly-phonics-sound" ? "🔤 Sound" : "📖 Story"}
                    </span>
                    {video.week && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                        Week {video.week}
                      </span>
                    )}
                    {repeatModes[video.id] && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        🔁 Repeat
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownload(video)}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium transition-colors"
                  >
                    <span>⬇️</span>
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
