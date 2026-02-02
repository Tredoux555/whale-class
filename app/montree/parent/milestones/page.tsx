'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';

interface Milestone {
  id: string;
  type: string;
  title: string;
  area: string;
  area_label: string;
  date: string;
  icon: string;
}

interface TimelineGroup {
  month: string;
  label: string;
  items: Milestone[];
}

const AREA_COLORS: Record<string, string> = {
  practical_life: 'bg-green-100 text-green-700',
  sensorial: 'bg-orange-100 text-orange-700',
  mathematics: 'bg-blue-100 text-blue-700',
  language: 'bg-pink-100 text-pink-700',
  cultural: 'bg-purple-100 text-purple-700'
};

const AREA_ICONS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  language: '📚',
  cultural: '🌍'
};

function ParentMilestonesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get('child');

  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineGroup[]>([]);
  const [totalMilestones, setTotalMilestones] = useState(0);
  const [childName, setChildName] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('montree_parent_session');
    if (!sessionStr) {
      router.push('/montree/parent/login');
      return;
    }

    // Get child info from session or param
    if (childIdParam) {
      loadMilestones(childIdParam);
    } else {
      const selectedChildStr = localStorage.getItem('montree_selected_child');
      if (selectedChildStr) {
        const child = JSON.parse(selectedChildStr);
        setChildName(child.name);
        loadMilestones(child.id);
      } else {
        toast.error('No child selected');
        router.push('/montree/parent/dashboard');
      }
    }
  }, [router, childIdParam]);

  const loadMilestones = async (childId: string) => {
    try {
      const res = await fetch(`/api/montree/parent/milestones?child_id=${childId}`);
      const data = await res.json();

      if (data.success) {
        setTimeline(data.timeline || []);
        setTotalMilestones(data.total_milestones || 0);
      }
    } catch (err) {
      console.error('Failed to load milestones:', err);
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⭐</div>
          <p className="text-gray-600">Loading milestones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/montree/parent/dashboard')}
            className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800">Milestones</h1>
            <p className="text-sm text-gray-500">{childName ? `${childName}'s achievements` : 'Learning journey'}</p>
          </div>
          <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium">
            ⭐ {totalMilestones}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {timeline.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-5xl mb-4">🌱</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Growing Every Day</h2>
            <p className="text-gray-500">
              Milestones will appear here as {childName || 'your child'} masters new skills
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {timeline.map(group => (
              <div key={group.month} className="bg-white rounded-2xl p-4 shadow-sm">
                {/* Month Header */}
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    📅
                  </span>
                  {group.label}
                </h2>

                {/* Milestones List */}
                <div className="space-y-3">
                  {group.items.map(milestone => (
                    <div
                      key={milestone.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-lg">
                        {milestone.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{milestone.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${AREA_COLORS[milestone.area] || 'bg-gray-100 text-gray-700'}`}>
                            {AREA_ICONS[milestone.area] || '📖'} {milestone.area_label}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(milestone.date)}</span>
                        </div>
                      </div>

                      {/* Decoration */}
                      <span className="text-emerald-500">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function ParentMilestonesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⭐</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ParentMilestonesContent />
    </Suspense>
  );
}
