'use client';

// /home/dashboard/curriculum/page.tsx — Session 155
// Read-only 68-work curriculum browser with home tips, costs, priorities

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getHomeSession } from '@/lib/home/auth';
import { toast } from 'sonner';

interface CurriculumWork {
  id: string;
  work_name: string;
  area: string;
  sequence: number;
  description: string;
  home_tip: string;
  buy_or_make: string;
  estimated_cost: string;
  home_age_start: string;
  home_priority: string;
}

interface AreaGroup {
  meta: { name: string; icon: string; color: string };
  works: CurriculumWork[];
}

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  essential: { label: '🟢 Essential', color: 'text-emerald-600 bg-emerald-50' },
  recommended: { label: '🔵 Recommended', color: 'text-blue-600 bg-blue-50' },
  enrichment: { label: '🟣 Enrichment', color: 'text-purple-600 bg-purple-50' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export default function CurriculumBrowserPage() {
  const router = useRouter();
  const [byArea, setByArea] = useState<Record<string, AreaGroup>>({});
  const [loading, setLoading] = useState(true);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set(['practical_life']));
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  useEffect(() => {
    const session = getHomeSession();
    if (!session) {
      router.push('/home/login');
      return;
    }

    fetch(`/api/home/curriculum?family_id=${session.family.id}`)
      .then((r) => r.json())
      .then((data) => {
        setByArea(data.byArea || {});
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load curriculum');
        setLoading(false);
      });
  }, [router]);

  const toggleArea = (area: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">📚</div>
      </div>
    );
  }

  const totalWorks = Object.values(byArea).reduce((sum, g) => sum + g.works.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Home Curriculum</h1>
          <p className="text-gray-500">{totalWorks} curated Montessori activities for home</p>
        </div>

        {/* Area Sections */}
        <div className="space-y-4">
          {AREA_ORDER.map((areaKey) => {
            const group = byArea[areaKey];
            if (!group) return null;
            const isExpanded = expandedAreas.has(areaKey);

            return (
              <div key={areaKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Area Header */}
                <button
                  onClick={() => toggleArea(areaKey)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{group.meta.icon}</span>
                    <span className="font-bold text-gray-800">{group.meta.name}</span>
                    <span className="text-gray-400 text-sm">({group.works.length})</span>
                  </div>
                  <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                </button>

                {/* Works */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100 border-t">
                    {group.works.map((work) => {
                      const priority = PRIORITY_BADGES[work.home_priority] || PRIORITY_BADGES.recommended;
                      const isWorkExpanded = expandedWork === work.work_name;

                      return (
                        <div key={work.work_name}>
                          <button
                            onClick={() => setExpandedWork(isWorkExpanded ? null : work.work_name)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-gray-800 text-sm">
                                  {work.work_name}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${priority.color}`}>
                                    {priority.label}
                                  </span>
                                  {work.home_age_start && (
                                    <span className="text-xs text-gray-400">
                                      Age {work.home_age_start}+
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-gray-300 text-sm">{isWorkExpanded ? '−' : '+'}</span>
                            </div>
                          </button>

                          {isWorkExpanded && (
                            <div className="px-4 pb-4 space-y-2">
                              {work.description && (
                                <p className="text-sm text-gray-600">{work.description}</p>
                              )}
                              {work.home_tip && (
                                <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-800">
                                  <span className="font-medium">💡 Home Tip:</span> {work.home_tip}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                {work.buy_or_make && (
                                  <span>
                                    {work.buy_or_make === 'buy' ? '🛒 Buy' : '✂️ Make at home'}
                                  </span>
                                )}
                                {work.estimated_cost && (
                                  <span>💰 {work.estimated_cost}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
