// app/admin/handbook/page.tsx
// Digital Handbook v2 - Deep audit improvements
// Features: Dynamic counts, sensitive periods, gateway works, philosophy intros

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AreaData {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  philosophy: string;
  count: number;
}

const AREA_CONFIG: Record<string, { name: string; icon: string; gradient: string; philosophy: string }> = {
  practical_life: { 
    name: 'Practical Life', 
    icon: '🧹', 
    gradient: 'from-amber-500 to-yellow-500',
    philosophy: 'Foundation for all learning. Builds concentration, coordination, independence, and order through real-world activities.'
  },
  sensorial: { 
    name: 'Sensorial', 
    icon: '👁️', 
    gradient: 'from-pink-500 to-rose-500',
    philosophy: 'Refines the senses and prepares the mathematical mind. Each material isolates one quality for discrimination.'
  },
  language: { 
    name: 'Language', 
    icon: '📖', 
    gradient: 'from-blue-500 to-cyan-500',
    philosophy: 'Follows the natural progression: oral language → sound awareness → writing → reading. Writing comes before reading.'
  },
  mathematics: { 
    name: 'Mathematics', 
    icon: '🔢', 
    gradient: 'from-green-500 to-emerald-500',
    philosophy: 'Concrete to abstract. Children handle quantities before symbols, building deep mathematical understanding.'
  },
  cultural: { 
    name: 'Cultural', 
    icon: '🌍', 
    gradient: 'from-purple-500 to-violet-500',
    philosophy: 'The whole before the parts. Geography, botany, zoology, history - giving children a cosmic perspective.'
  },
  art_music: { 
    name: 'Art & Music', 
    icon: '🎨', 
    gradient: 'from-red-500 to-orange-500',
    philosophy: 'Creative expression and appreciation. Develops aesthetic sense and self-expression.'
  },
};

const SENSITIVE_PERIODS = [
  { id: 'order', name: 'Order', ages: '1-3', color: 'bg-amber-500' },
  { id: 'movement', name: 'Movement', ages: '0-4.5', color: 'bg-blue-500' },
  { id: 'small_objects', name: 'Small Objects', ages: '1-4', color: 'bg-pink-500' },
  { id: 'refinement_of_senses', name: 'Refinement of Senses', ages: '2-5', color: 'bg-purple-500' },
  { id: 'language', name: 'Language', ages: '0-6', color: 'bg-cyan-500' },
  { id: 'social', name: 'Social', ages: '2.5-5', color: 'bg-green-500' },
  { id: 'mathematics', name: 'Mathematics', ages: '4-5.5', color: 'bg-emerald-500' },
  { id: 'writing', name: 'Writing', ages: '3.5-4.5', color: 'bg-indigo-500' },
  { id: 'reading', name: 'Reading', ages: '4.5-5.5', color: 'bg-violet-500' },
  { id: 'music', name: 'Music', ages: '2-6', color: 'bg-rose-500' },
  { id: 'spatial', name: 'Spatial', ages: '4-6', color: 'bg-orange-500' },
];

export default function HandbookPage() {
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [totalWorks, setTotalWorks] = useState(0);
  const [gatewayCount, setGatewayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/brain/works')
      .then(res => res.json())
      .then(data => {
        const works = data.data || [];

        // Count works by area
        const areaCounts: Record<string, number> = {};
        let gateways = 0;

        interface Work {
          curriculum_area?: string;
          is_gateway?: boolean;
        }
        works.forEach((work: Work) => {
          const area = work.curriculum_area || 'other';
          areaCounts[area] = (areaCounts[area] || 0) + 1;
          if (work.is_gateway) gateways++;
        });

        // Build area data with real counts
        const areaData: AreaData[] = Object.entries(AREA_CONFIG).map(([id, config]) => ({
          id,
          ...config,
          count: areaCounts[id] || 0,
        })).filter(a => a.count > 0);

        setAreas(areaData);
        setTotalWorks(works.length);
        setGatewayCount(gateways);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading handbook...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
            ← Admin
          </Link>
          <span className="text-slate-500 text-sm">Digital Reference</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-4xl">📚</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Montessori Handbook</h1>
          <p className="text-slate-400 mb-4">Complete curriculum reference for ages 2-6</p>
          
          {/* Quick Stats Row */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-slate-400"><strong className="text-white">{totalWorks}</strong> Works</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              <span className="text-slate-400"><strong className="text-white">{gatewayCount}</strong> Gateway Works</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span className="text-slate-400"><strong className="text-white">11</strong> Sensitive Periods</span>
            </div>
          </div>
        </div>

        {/* Montessori Philosophy Quote */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6 mb-8 text-center">
          <p className="text-slate-400 italic text-lg leading-relaxed">
            "The hand is the instrument of the mind."
          </p>
          <p className="text-slate-500 text-sm mt-2">— Maria Montessori</p>
        </div>

        {/* Curriculum Areas */}
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Curriculum Areas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {areas.map(area => (
            <Link 
              key={area.id}
              href={`/admin/handbook/${area.id}`}
              className="group bg-slate-800/50 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 hover:bg-slate-800 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${area.gradient} rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg flex-shrink-0`}>
                  {area.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-white text-lg">{area.name}</h3>
                    <span className="text-slate-400 text-sm font-medium">{area.count} works →</span>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">{area.philosophy}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Sensitive Periods Reference */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            11 Sensitive Periods (Ages 0-6)
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Windows of intense learning when children are most receptive to specific skills
          </p>
          <div className="flex flex-wrap gap-2">
            {SENSITIVE_PERIODS.map(period => (
              <div 
                key={period.id}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg flex items-center gap-2"
              >
                <span className={`w-2 h-2 ${period.color} rounded-full`}></span>
                <span className="text-white text-sm font-medium">{period.name}</span>
                <span className="text-slate-500 text-xs">({period.ages})</span>
              </div>
            ))}
          </div>
        </div>

        {/* The Three Master Threads */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            The Three Master Threads
          </h2>
          <p className="text-slate-400 text-sm mb-5">
            Everything in Montessori connects. These three progressions show how areas build on each other:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Thread 1 */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✍️</span>
                <h3 className="font-semibold text-white">Movement → Writing</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  <span className="text-slate-400">Practical Life (fine motor)</span>
                </div>
                <div className="text-slate-600 pl-3">↓</div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  <span className="text-slate-400">Metal Insets + Sandpaper Letters</span>
                </div>
                <div className="text-slate-600 pl-3">↓</div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  <span className="text-slate-400">Pencil Writing</span>
                </div>
              </div>
            </div>

            {/* Thread 2 */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔢</span>
                <h3 className="font-semibold text-white">Sensorial → Math</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-pink-500 rounded-full"></span>
                  <span className="text-slate-400">Pink Tower, Brown Stair, Red Rods</span>
                </div>
                <div className="text-slate-600 pl-3">↓</div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  <span className="text-slate-400">Number Rods + Golden Beads</span>
                </div>
                <div className="text-slate-600 pl-3">↓</div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  <span className="text-slate-400">Abstract Operations</span>
                </div>
              </div>
            </div>

            {/* Thread 3 */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📖</span>
                <h3 className="font-semibold text-white">Oral → Reading</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                  <span className="text-slate-400">Sound Games (I Spy)</span>
                </div>
                <div className="text-slate-600 pl-3">↓</div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  <span className="text-slate-400">Moveable Alphabet (Writing)</span>
                </div>
                <div className="text-slate-600 pl-3">↓</div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full"></span>
                  <span className="text-slate-400">Pink → Blue → Green Reading</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-slate-600 text-sm">
          <p>Whale Montessori Handbook • 213 Works • Ages 2-6</p>
        </div>
      </main>
    </div>
  );
}
