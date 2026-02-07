// app/admin/test/sessions/[id]/page.tsx
// Session detail with skill breakdown visualization

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Clock, Calendar, User } from 'lucide-react';

interface ItemData {
  correct: boolean;
  item?: string;
  targetLetter?: string;
}

interface SkillResult {
  id: string;
  skill_code: string;
  skill_name: string;
  skill_order: number;
  correct_count: number;
  total_count: number;
  percentage: number;
  level: string;
  items_data: ItemData[];
  duration_seconds: number;
}

interface SessionDetail {
  id: string;
  child_id: string;
  child_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  total_score: number;
  total_possible: number;
  overall_percentage: number | null;
  overall_level: string | null;
  assessment_results: SkillResult[];
}

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;
  
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/assessment/sessions/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
      }
    } catch (err) {
      console.error('Error loading session:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'proficient': return 'bg-green-500';
      case 'developing': return 'bg-yellow-500';
      case 'emerging': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'proficient': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'developing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'emerging': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getSkillEmoji = (code: string) => {
    const emojis: Record<string, string> = {
      letter_recognition: '🔤',
      letter_sounds: '🔊',
      beginning_sounds: '🎯',
      ending_sounds: '🔚',
      middle_sounds: '🎵',
      blending: '🧩',
      segmenting: '✂️'
    };
    return emojis[code] || '📝';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-4xl animate-pulse">🌳</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4">😕</div>
          <p>Session not found</p>
          <Link href="/admin/test/sessions" className="text-blue-400 mt-2 inline-block">
            ← Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  const sortedResults = [...(session.assessment_results || [])].sort(
    (a, b) => a.skill_order - b.skill_order
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link 
            href="/admin/test/sessions"
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{session.child_name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(session.started_at).toLocaleDateString()}
              </span>
              {session.duration_seconds && (
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatDuration(session.duration_seconds)}
                </span>
              )}
            </div>
          </div>
          {session.overall_level && (
            <span className={`px-4 py-2 rounded-full text-lg font-bold border ${getLevelBg(session.overall_level)}`}>
              {session.overall_percentage}%
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
            <p className="text-3xl font-bold">{session.total_score}</p>
            <p className="text-gray-400 text-sm">Correct</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
            <p className="text-3xl font-bold">{session.total_possible}</p>
            <p className="text-gray-400 text-sm">Total Items</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
            <p className="text-3xl font-bold capitalize">{session.overall_level || 'N/A'}</p>
            <p className="text-gray-400 text-sm">Level</p>
          </div>
        </div>

        {/* Skill Breakdown */}
        <h2 className="text-xl font-bold mb-4">Skill Breakdown</h2>
        <div className="space-y-4">
          {sortedResults.map((result) => (
            <div 
              key={result.id}
              className="bg-gray-800 rounded-xl p-4 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getSkillEmoji(result.skill_code)}</span>
                  <div>
                    <h3 className="font-bold">{result.skill_name}</h3>
                    <p className="text-sm text-gray-400">
                      {result.correct_count}/{result.total_count} correct
                      {result.duration_seconds && ` • ${formatDuration(result.duration_seconds)}`}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getLevelBg(result.level)}`}>
                  {Math.round(result.percentage)}%
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getLevelColor(result.level)} transition-all`}
                  style={{ width: `${result.percentage}%` }}
                />
              </div>

              {/* Item details (expandable later) */}
              {result.items_data && result.items_data.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.items_data.map((item: ItemData, i: number) => (
                    <span 
                      key={i}
                      className={`text-xs px-2 py-1 rounded ${
                        item.correct 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {item.correct ? '✓' : '✗'} {item.item || item.targetLetter || `#${i+1}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {sortedResults.length === 0 && (
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center text-gray-400">
              <div className="text-4xl mb-2">⏳</div>
              <p>Test in progress - no results yet</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Link
            href={`/admin/test/children/${session.child_id}`}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            View Child History
          </Link>
        </div>
      </main>
    </div>
  );
}
