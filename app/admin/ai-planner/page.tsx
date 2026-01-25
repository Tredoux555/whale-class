// app/admin/ai-planner/page.tsx
// AI Lesson Planning page

'use client';

import React, { useState, useEffect } from 'react';
import { useAIStatus } from '@/lib/hooks/useAIStatus';
import DailyPlanGenerator from '@/components/ai/DailyPlanGenerator';
import WeeklyPlanGenerator from '@/components/ai/WeeklyPlanGenerator';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
}

export default function AILessonPlannerPage() {
  const { isEnabled, loading: statusLoading } = useAIStatus();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChildren() {
      try {
        const res = await fetch('/api/whale/children');
        const data = await res.json();
        const childrenList = data.children || data.data || [];
        setChildren(childrenList);
        if (childrenList.length > 0) {
          setSelectedChildId(childrenList[0].id);
        }
      } catch (err) {
        console.error('Error fetching children:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchChildren();
  }, []);

  const selectedChild = children.find(c => c.id === selectedChildId);

  if (statusLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">AI Features Disabled</h2>
          <p className="text-gray-600 mb-4">
            To use AI lesson planning, add your Anthropic API key to your environment variables.
          </p>
          <code className="block bg-gray-100 p-3 rounded text-sm text-left">
            ANTHROPIC_API_KEY=sk-ant-api03-...
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ✨ AI Lesson Planner
              </h1>
              <p className="text-sm text-gray-500">
                Powered by Claude AI
              </p>
            </div>

            {/* Child Selector */}
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'daily'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📅 Daily Plan
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'weekly'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📆 Weekly Plan
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {selectedChild && activeTab === 'daily' && (
          <DailyPlanGenerator
            childId={selectedChild.id}
            childName={selectedChild.name}
          />
        )}

        {selectedChild && activeTab === 'weekly' && (
          <WeeklyPlanGenerator
            childId={selectedChild.id}
            childName={selectedChild.name}
          />
        )}

        {!selectedChild && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">👶</div>
            <p>No children found. Add a child to start planning.</p>
          </div>
        )}
      </main>
    </div>
  );
}

