'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  date_of_birth?: string;
  photo_url?: string;
  progress: {
    presented: number;
    practicing: number;
    mastered: number;
    total: number;
  };
  mediaCount?: number;
  lastActivity?: string;
}

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-blue-500 to-indigo-500',
  'from-cyan-500 to-teal-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
  'from-red-500 to-pink-500',
];

export default function ClassroomPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/classroom/children');
      const data = await res.json();
      setChildren(data.children || []);
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChildren = children.filter(child =>
    child.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAvatarGradient = (index: number) => AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];

  const getProgressPercent = (child: Child) => {
    const total = 268; // Total curriculum works
    return Math.round(((child.progress?.mastered || 0) / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl animate-bounce">🐋</span>
          </div>
          <p className="text-gray-600 font-medium">Loading classroom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl">🐋</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Whale Classroom</h1>
                <p className="text-blue-200 text-sm">{children.length} children</p>
              </div>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
            >
              ← Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search children..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none shadow-sm"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Children Grid */}
      <main className="max-w-6xl mx-auto px-4 pb-8">
        {filteredChildren.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👶</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No children found' : 'No children yet'}
            </h2>
            <p className="text-gray-600">
              {searchQuery ? `No results for "${searchQuery}"` : 'Add children to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredChildren.map((child, index) => (
              <Link
                key={child.id}
                href={`/classroom/${child.id}`}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all group"
              >
                {/* Avatar Header */}
                <div className={`bg-gradient-to-br ${getAvatarGradient(index)} p-4`}>
                  <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full mx-auto flex items-center justify-center shadow-lg">
                    {child.photo_url ? (
                      <img
                        src={child.photo_url}
                        alt={child.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {child.name.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-bold text-gray-900 text-center truncate">{child.name}</h3>
                  
                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{getProgressPercent(child)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div 
                          className="bg-green-500 transition-all" 
                          style={{ width: `${((child.progress?.mastered || 0) / 268) * 100}%` }}
                        />
                        <div 
                          className="bg-blue-500 transition-all" 
                          style={{ width: `${((child.progress?.practicing || 0) / 268) * 100}%` }}
                        />
                        <div 
                          className="bg-yellow-500 transition-all" 
                          style={{ width: `${((child.progress?.presented || 0) / 268) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex justify-center gap-2 mt-2 text-xs">
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      {child.progress?.presented || 0}
                    </span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {child.progress?.practicing || 0}
                    </span>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {child.progress?.mastered || 0}
                    </span>
                  </div>

                  {/* Media indicator */}
                  {child.mediaCount && child.mediaCount > 0 && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-500">
                      <span>📷</span>
                      <span>{child.mediaCount} photos</span>
                    </div>
                  )}
                </div>

                {/* Hover indicator */}
                <div className="px-3 pb-3">
                  <div className="text-center text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Tap to view →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
