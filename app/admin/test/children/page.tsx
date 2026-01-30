// app/admin/test/children/page.tsx
// Children list with their latest assessment scores

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChildWithScore {
  id: string;
  name: string;
  latest_assessment: {
    id: string;
    completed_at: string;
    overall_percentage: number;
    overall_level: string;
    total_score: number;
    total_possible: number;
  } | null;
  assessment_count: number;
}

export default function ChildrenListPage() {
  const [children, setChildren] = useState<ChildWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'recent'>('name');

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const res = await fetch('/api/assessment/children');
      const data = await res.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error('Error loading children:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string | null) => {
    switch (level) {
      case 'proficient': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'developing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'emerging': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getLevelEmoji = (level: string | null) => {
    switch (level) {
      case 'proficient': return '🌟';
      case 'developing': return '📈';
      case 'emerging': return '🌱';
      default: return '—';
    }
  };

  const sortedChildren = [...children]
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          const scoreA = a.latest_assessment?.overall_percentage ?? -1;
          const scoreB = b.latest_assessment?.overall_percentage ?? -1;
          return scoreB - scoreA;
        case 'recent':
          const dateA = a.latest_assessment?.completed_at ?? '';
          const dateB = b.latest_assessment?.completed_at ?? '';
          return dateB.localeCompare(dateA);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const testedCount = children.filter(c => c.assessment_count > 0).length;
  const avgScore = children
    .filter(c => c.latest_assessment)
    .reduce((sum, c) => sum + (c.latest_assessment?.overall_percentage || 0), 0) 
    / (testedCount || 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-4xl animate-pulse">🌳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link 
            href="/admin/test"
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Children Scores</h1>
            <p className="text-gray-400 text-sm">
              {testedCount}/{children.length} tested • Avg: {Math.round(avgScore)}%
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            {([
              { key: 'name', label: '🔤 Name' },
              { key: 'score', label: '📊 Score' },
              { key: 'recent', label: '🕐 Recent' }
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  sortBy === key 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Children Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedChildren.map((child) => (
            <Link
              key={child.id}
              href={`/admin/test/children/${child.id}`}
              className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold group-hover:text-blue-400 transition-colors">
                  {child.name}
                </h3>
                {child.latest_assessment ? (
                  <span className={`px-2 py-1 rounded-full text-sm border ${getLevelColor(child.latest_assessment.overall_level)}`}>
                    {getLevelEmoji(child.latest_assessment.overall_level)} {child.latest_assessment.overall_percentage}%
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">Not tested</span>
                )}
              </div>

              {child.latest_assessment ? (
                <div className="space-y-2">
                  {/* Score bar */}
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        child.latest_assessment.overall_level === 'proficient' ? 'bg-green-500' :
                        child.latest_assessment.overall_level === 'developing' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${child.latest_assessment.overall_percentage}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>
                      {child.latest_assessment.total_score}/{child.latest_assessment.total_possible} correct
                    </span>
                    <span>
                      {child.assessment_count} test{child.assessment_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500">
                    Last tested: {new Date(child.latest_assessment.completed_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <div className="text-2xl mb-1">📝</div>
                  <p className="text-sm">No assessment yet</p>
                </div>
              )}
            </Link>
          ))}
        </div>

        {sortedChildren.length === 0 && (
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center text-gray-400">
            <div className="text-4xl mb-2">👶</div>
            <p>No children found</p>
          </div>
        )}
      </main>
    </div>
  );
}
