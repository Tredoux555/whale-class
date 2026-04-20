// app/whale-class/page.tsx
// Public parent-facing page hosting all Whale Class songs and videos.
// Each card has id="song-{slug}" so QR codes can deep-link directly to a specific song.
// No auth required — parents scan QR codes from newsletters and land here.

'use client';

import { useEffect, useState, useRef } from 'react';
import { getVideoProxyUrl } from '@/lib/montree/media/proxy-url';
import { slugify } from '@/lib/slugify';

interface Song {
  id: string;
  title: string;
  videoUrl: string;
  week?: string;
  category: string;
  uploadedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'song-of-week': '🎵 Song of the Week',
  'phonics': '🔤 Phonics',
  'weekly-phonics-sound': '🔠 Weekly Sound',
  'stories': '📖 Story',
  'montessori': '🌱 Montessori',
  'recipes': '🍳 Recipe',
};

const CATEGORY_COLORS: Record<string, string> = {
  'song-of-week': 'bg-purple-100 text-purple-700',
  'phonics': 'bg-blue-100 text-blue-700',
  'weekly-phonics-sound': 'bg-cyan-100 text-cyan-700',
  'stories': 'bg-amber-100 text-amber-700',
  'montessori': 'bg-green-100 text-green-700',
  'recipes': 'bg-orange-100 text-orange-700',
};

// slugify() moved to lib/slugify.ts (Health Check #9 — prevent drift)

export default function WhaleClassPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const scrolledRef = useRef(false);

  // Read the hash on mount — e.g. #song-animal-habitats → 'animal-habitats'
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#song-')) {
      setHighlightedSlug(hash.slice(6));
    }
  }, []);

  // Load all videos from the admin video manager API (publicly accessible)
  useEffect(() => {
    fetch('/api/admin/video-manager')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.videos)) {
          // On montree.xyz (behind Cloudflare): proxy through our CDN route for
          // edge caching + Range support. On teacherpotato.xyz (direct Railway):
          // use raw Supabase public URLs — the proxy 502s without Cloudflare.
          const isMontree = typeof window !== 'undefined' &&
            window.location.hostname.includes('montree.xyz');
          const mapped = data.videos.map((v: Song) => ({
            ...v,
            videoUrl: isMontree ? getVideoProxyUrl(v.videoUrl) : v.videoUrl,
          }));
          setSongs(mapped);
        } else {
          setError('Could not load songs right now.');
        }
      })
      .catch(() => setError('Could not load songs right now.'))
      .finally(() => setLoading(false));
  }, []);

  // After songs load, scroll to and highlight the QR-targeted card
  useEffect(() => {
    if (!loading && highlightedSlug && !scrolledRef.current && songs.length > 0) {
      scrolledRef.current = true;
      // Small delay to let the DOM settle after render
      setTimeout(() => {
        const el = document.getElementById(`song-${highlightedSlug}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    }
  }, [loading, highlightedSlug, songs]);

  // Split: highlighted card vs. everything else
  const highlightedSong = songs.find(s => slugify(s.title) === highlightedSlug) ?? null;
  const otherSongs = highlightedSong
    ? songs.filter(s => s.id !== highlightedSong.id)
    : songs;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐋</div>
          <p className="text-purple-600 font-medium">Loading Whale Class…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">😢</div>
          <p className="text-red-500 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-3xl">🐋</span>
          <div>
            <h1 className="text-xl font-bold text-purple-700 leading-tight">Whale Class</h1>
            <p className="text-xs text-gray-400">Songs &amp; Videos</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Highlighted card (from QR scan) ── */}
        {highlightedSong && (
          <div
            id={`song-${slugify(highlightedSong.title)}`}
            className="bg-white rounded-2xl shadow-xl border-2 border-purple-400 overflow-hidden scroll-mt-24 ring-4 ring-purple-200"
          >
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-3 flex items-center gap-3">
              <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                ✨ Now Playing
              </span>
              <span className="text-white font-semibold text-sm truncate">{highlightedSong.title}</span>
              {highlightedSong.week && (
                <span className="ml-auto text-white/70 text-xs shrink-0">Week {highlightedSong.week}</span>
              )}
            </div>
            <div className="aspect-video bg-black">
              <video
                src={highlightedSong.videoUrl}
                controls
                playsInline
                preload="metadata"
                crossOrigin="anonymous"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="px-5 py-3 bg-purple-50">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_COLORS[highlightedSong.category] ?? 'bg-gray-100 text-gray-600'}`}>
                {CATEGORY_LABELS[highlightedSong.category] ?? highlightedSong.category}
              </span>
            </div>
          </div>
        )}

        {/* ── All songs grid ── */}
        {otherSongs.length === 0 && !highlightedSong && (
          <div className="text-center text-gray-400 py-20">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-lg font-medium">No songs yet</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        )}

        {otherSongs.length > 0 && (
          <>
            {highlightedSong && (
              <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide text-sm">
                All Songs
              </h2>
            )}
            <div className="grid sm:grid-cols-2 gap-5">
              {otherSongs.map(song => {
                const slug = slugify(song.title);
                return (
                  <div
                    key={song.id}
                    id={`song-${slug}`}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-24 hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-video bg-black">
                      <video
                        src={song.videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="px-4 py-3 flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${CATEGORY_COLORS[song.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {CATEGORY_LABELS[song.category] ?? song.category}
                      </span>
                      <span className="text-sm font-medium text-gray-700 truncate">{song.title}</span>
                      {song.week && (
                        <span className="ml-auto text-xs text-gray-400 shrink-0">Wk {song.week}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-300 pt-4 pb-8">
          Whale Class · Montree
        </div>
      </div>
    </div>
  );
}
