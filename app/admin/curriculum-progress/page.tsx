'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Clock, TrendingUp, Award } from 'lucide-react';
import { WorkVideoDisplay } from '@/components/WorkVideoDisplay';
import type { CurriculumWork } from '@/lib/youtube/types';

interface ProgressData {
  child_name: string;
  current_stage: string;
  stage_name: string;
  works_completed: number;
  current_work: {
    id: string;
    sequence_order: number;
    work_name: string;
    area: string;
    stage: string;
    description: string;
  } | null;
  stage_progress: {
    total_works: number;
    completed_works: number;
    percent_complete: number;
    remaining_works: number;
  };
  recent_activities: Array<{
    work_name: string;
    completion_date: string;
    times_practiced: number;
  }>;
}

const AREA_EMOJIS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '🎨',
  mathematics: '🔢',
  language: '📖',
  cultural: '🌍',
};

export default function CurriculumProgressPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [childId, setChildId] = useState<string | null>(null);

  useEffect(() => {
    // Find daughter's child ID (same logic as daughter-activity page)
    const findDaughterChild = async () => {
      try {
        const response = await fetch("/api/whale/children?active=true");
        if (response.ok) {
          const data = await response.json();
          const children = data.data || [];

          // Find child with age_group '2-3'
          const daughter = children.find((c: Record<string, unknown>) => {
            const parts = String(c.age_group).split('-');
            const minAge = parseFloat(parts[0]);
            const maxAge = parseFloat(parts[1] || parts[0]);
            return minAge >= 2.0 && maxAge <= 3.0;
          });

          if (daughter) {
            setChildId(daughter.id);
            loadProgress(daughter.id);
          } else if (children.length > 0) {
            setChildId(children[0].id);
            loadProgress(children[0].id);
          }
        }
      } catch (error) {
        console.error("Error finding child:", error);
      }
    };

    findDaughterChild();
  }, []);

  const loadProgress = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/whale/curriculum/progress?childId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setProgress(data.data);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">🌈</div>
          <p className="text-2xl text-purple-600 font-bold">Loading progress...</p>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-8 text-center">
          <p className="text-xl text-gray-600">No progress data found. Please ensure curriculum is seeded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white shadow-2xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📊</div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  Curriculum Progress
                </h1>
                <p className="text-sm opacity-90">{progress.child_name}'s Learning Journey</p>
              </div>
            </div>
            <Link
              href="/admin/daughter-activity"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors text-sm font-medium backdrop-blur-sm"
            >
              View Activities
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Current Stage Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{progress.stage_name}</h2>
            <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full">
              <Award className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-800">
                {progress.works_completed} works completed
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">
                {progress.stage_progress.completed_works} of {progress.stage_progress.total_works} works
              </span>
              <span className="text-gray-600 font-bold">
                {progress.stage_progress.percent_complete.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${progress.stage_progress.percent_complete}%` }}
              >
                {progress.stage_progress.percent_complete > 10 && (
                  <span className="text-white text-xs font-bold">✓</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Current Work Card */}
        {progress.current_work && (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6">
            <div className={`bg-gradient-to-r ${
              progress.current_work.area === 'practical_life' ? 'from-blue-400 to-blue-600' :
              progress.current_work.area === 'sensorial' ? 'from-purple-400 to-purple-600' :
              progress.current_work.area === 'mathematics' ? 'from-green-400 to-green-600' :
              progress.current_work.area === 'language' ? 'from-orange-400 to-orange-600' :
              'from-yellow-400 to-yellow-600'
            } text-white p-6`}>
              <div className="flex items-center gap-4">
                <div className="text-6xl">
                  {AREA_EMOJIS[progress.current_work.area] || '🎯'}
                </div>
                <div>
                  <p className="text-sm opacity-90 mb-1">Current Work</p>
                  <h3 className="text-2xl font-bold">{progress.current_work.work_name}</h3>
                  <p className="text-sm opacity-90 mt-1">
                    Work #{progress.current_work.sequence_order} of 74
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-lg mb-6">{progress.current_work.description}</p>
              {/* Video Display */}
              <WorkVideoDisplay 
                work={{
                  id: progress.current_work.id,
                  work_name: progress.current_work.work_name,
                  description: progress.current_work.description,
                  area: progress.current_work.area,
                } as CurriculumWork}
              />
            </div>
          </div>
        )}

        {/* Recent Completions */}
        {progress.recent_activities.length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Recent Completions
            </h3>
            <div className="space-y-4">
              {progress.recent_activities.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{activity.work_name}</p>
                    <p className="text-sm text-gray-600">
                      Completed {new Date(activity.completion_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {activity.times_practiced}x practiced
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

