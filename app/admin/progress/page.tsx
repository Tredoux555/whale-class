'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProgressDashboard() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [view, setView] = useState<'overview' | 'montree' | 'curriculum'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/whale/children');
        const data = await res.json();
        const childrenList = data.data || data.children || [];
        setChildren(childrenList);
        if (childrenList[0]) {
          setSelectedChild(childrenList[0].id);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">📊 Progress Tracking</h1>
            </div>
            
            {/* Child Selector */}
            {children.length > 0 && (
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="border rounded-lg px-4 py-2"
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* View Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { key: 'overview', label: '📋 Overview' },
              { key: 'montree', label: '🌳 Montree View' },
              { key: 'curriculum', label: '📚 Curriculum' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key as any)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  view === tab.key
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === 'overview' && selectedChild && (
          <OverviewTab childId={selectedChild} />
        )}
        {view === 'montree' && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-gray-500 mb-4">
              Embed the Montree progress component here from /admin/montree-progress
            </p>
            <Link 
              href={`/admin/montree-progress?child=${selectedChild}`}
              className="text-emerald-600 hover:underline"
            >
              Open full Montree view →
            </Link>
          </div>
        )}
        {view === 'curriculum' && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-gray-500 mb-4">
              Show curriculum progress from /admin/curriculum-progress
            </p>
            {selectedChild && (
              <Link 
                href={`/admin/curriculum-progress?childId=${selectedChild}`}
                className="text-blue-600 hover:underline"
              >
                View detailed curriculum progress →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function OverviewTab({ childId }: { childId: string }) {
  // Fetch and display child progress overview
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-3xl font-bold text-green-600">24</div>
          <div className="text-gray-500">Completed Works</div>
        </div>
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🔄</div>
          <div className="text-3xl font-bold text-yellow-600">5</div>
          <div className="text-gray-500">In Progress</div>
        </div>
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">📈</div>
          <div className="text-3xl font-bold text-blue-600">12%</div>
          <div className="text-gray-500">Overall Progress</div>
        </div>
      </div>

      {/* Area Progress */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-4">Progress by Area</h3>
        <div className="space-y-3">
          {[
            { name: 'Practical Life', color: 'bg-green-500', progress: 25 },
            { name: 'Sensorial', color: 'bg-orange-500', progress: 18 },
            { name: 'Mathematics', color: 'bg-blue-500', progress: 8 },
            { name: 'Language', color: 'bg-pink-500', progress: 12 },
            { name: 'Cultural', color: 'bg-purple-500', progress: 5 },
          ].map((area) => (
            <div key={area.name}>
              <div className="flex justify-between text-sm mb-1">
                <span>{area.name}</span>
                <span>{area.progress}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${area.color} rounded-full`}
                  style={{ width: `${area.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
