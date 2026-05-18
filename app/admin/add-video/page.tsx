// DEPRECATED — SESSION 113 V2
//
// This page calls /api/admin/curriculum-works and /api/admin/add-video — both
// of which do not exist. The canonical video-add surface for Whale Class is
// /admin/video-manager (which IS wired into TOOLS and has a real backing
// route). Kept on disk so direct URLs don't 404 (hide-don't-delete posture).
// Fetches are short-circuited to clean empty state.
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Work {
  id: string;
  work_name: string;
  area: string;
  stage: string;
  has_video: boolean;
}

export default function AddVideoPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'missing'>('missing');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadWorks();
  }, []);

  // 🚨 DEPRECATED — endpoints below do not exist. Short-circuit instead of 404.
  async function loadWorks() {
    setWorks([]);
    setLoading(false);
    setMessage({
      type: 'error',
      text: 'This page is deprecated. Use /admin/video-manager to add or manage homepage videos.',
    });
  }

  function extractYoutubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  // 🚨 DEPRECATED — /api/admin/add-video does not exist. Use /admin/video-manager.
  async function saveVideo() {
    setMessage({
      type: 'error',
      text: 'Deprecated. Use /admin/video-manager to add homepage videos.',
    });
  }

  const filteredWorks = works.filter(w => {
    const matchesFilter = filter === 'all' || !w.has_video;
    const matchesSearch = !searchTerm || 
      w.work_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.area.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const areaColors: Record<string, string> = {
    practical_life: 'bg-amber-100 text-amber-800',
    sensorial: 'bg-pink-100 text-pink-800',
    math: 'bg-blue-100 text-blue-800',
    language: 'bg-green-100 text-green-800',
    culture: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="min-h-screen bg-gray-50" >
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🎬 Add Videos to Works</h1>
              <p className="text-sm text-gray-600 mt-1">Paste YouTube URLs for demo videos</p>
            </div>
            <Link href="/admin" className="px-4 py-2 border rounded-lg hover:bg-gray-50">← Back</Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {selectedWork && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="font-bold text-lg mb-4">Adding video for: {selectedWork.work_name}</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 border rounded-xl"
              />
              {youtubeUrl && extractYoutubeId(youtubeUrl) && (
                <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                  <iframe src={`https://www.youtube.com/embed/${extractYoutubeId(youtubeUrl)}`} className="w-full h-full" allowFullScreen />
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={saveVideo} disabled={saving || !youtubeUrl} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : '✅ Save Video'}
                </button>
                <button onClick={() => { setSelectedWork(null); setYoutubeUrl(''); }} className="px-6 py-3 border rounded-xl">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-4">
          <button onClick={() => setFilter('missing')} className={`px-4 py-2 rounded-lg ${filter === 'missing' ? 'bg-red-600 text-white' : 'bg-white'}`}>Missing Videos</button>
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white'}`}>All Works</button>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="flex-1 px-4 py-2 border rounded-lg" />
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden divide-y">
            {filteredWorks.map(work => (
              <div key={work.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div>
                  <div className="font-medium">{work.work_name}</div>
                  <span className={`px-2 py-0.5 rounded text-xs ${areaColors[work.area] || 'bg-gray-100'}`}>{work.area}</span>
                </div>
                {work.has_video ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">✅ Has Video</span>
                ) : (
                  <button onClick={() => setSelectedWork(work)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">+ Add Video</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
