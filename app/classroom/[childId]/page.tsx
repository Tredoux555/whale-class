'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ThisWeekTab from '@/components/classroom/ThisWeekTab';
import ProgressTab from '@/components/classroom/ProgressTab';
import PortfolioTab from '@/components/classroom/PortfolioTab';

interface Child {
  id: string;
  name: string;
  date_of_birth?: string;
  age_group?: string;
  photo_url?: string;
  age?: number;
  progress: {
    presented: number;
    practicing: number;
    mastered: number;
    total: number;
  };
  mediaCount: number;
}

const TABS = [
  { id: 'week', label: 'This Week', icon: '📋' },
  { id: 'progress', label: 'Progress', icon: '📊' },
  { id: 'portfolio', label: 'Portfolio', icon: '📷' },
];

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-blue-500 to-indigo-500',
  'from-cyan-500 to-teal-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
];

export default function ChildProfilePage() {
  const params = useParams();
  const childId = params.childId as string;
  
  const [child, setChild] = useState<Child | null>(null);
  const [activeTab, setActiveTab] = useState('week');
  const [loading, setLoading] = useState(true);
  
  // For media refresh after capture
  const [mediaRefreshKey, setMediaRefreshKey] = useState(0);

  useEffect(() => {
    if (childId) {
      fetchChild();
    }
  }, [childId]);

  const fetchChild = async () => {
    try {
      const res = await fetch(`/api/classroom/child/${childId}`);
      const data = await res.json();
      setChild(data.child);
    } catch (error) {
      console.error('Failed to fetch child:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUploaded = () => {
    // Refresh portfolio tab and media count
    setMediaRefreshKey(prev => prev + 1);
    if (child) {
      setChild({ ...child, mediaCount: child.mediaCount + 1 });
    }
  };

  const getGradient = () => {
    if (!child) return AVATAR_GRADIENTS[0];
    const index = child.name.charCodeAt(0) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl animate-bounce">👶</span>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Child not found</h2>
          <Link href="/classroom" className="text-blue-600 hover:underline">
            ← Back to classroom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className={`bg-gradient-to-r ${getGradient()} text-white sticky top-0 z-50`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/classroom"
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            
            <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
              {child.photo_url ? (
                <img src={child.photo_url} alt={child.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold">{child.name.charAt(0)}</span>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-xl font-bold">{child.name}</h1>
              <div className="flex items-center gap-3 text-white/80 text-sm">
                {child.age && <span>Age {child.age.toFixed(1)}</span>}
                {child.mediaCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span>📷</span> {child.mediaCount}
                  </span>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
              <span className="text-xs">🟡 {child.progress.presented}</span>
              <span className="text-xs">🔵 {child.progress.practicing}</span>
              <span className="text-xs">🟢 {child.progress.mastered}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b shadow-sm sticky top-[88px] z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'week' && (
          <ThisWeekTab 
            childId={childId} 
            childName={child.name}
            onMediaUploaded={handleMediaUploaded}
          />
        )}
        {activeTab === 'progress' && (
          <ProgressTab 
            childId={childId} 
            childName={child.name}
          />
        )}
        {activeTab === 'portfolio' && (
          <PortfolioTab 
            key={mediaRefreshKey}
            childId={childId} 
            childName={child.name}
          />
        )}
      </main>
    </div>
  );
}
