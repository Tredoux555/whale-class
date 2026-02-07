// app/admin/daughter-activity/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, RefreshCw, Sparkles, Heart } from 'lucide-react';

interface Activity {
  id: string;
  name: string;
  area: string;
  age_min: number;
  age_max: number;
  skill_level: number;
  duration_minutes: number;
  materials: string[];
  instructions: string;
  learning_goals: string[];
}

interface DailyAssignment {
  id: string;
  assigned_date: string;
  completed: boolean;
  completed_at: string | null;
  activity: Activity;
}

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  english: 'English',
  cultural: 'Cultural Studies',
};

const AREA_EMOJIS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '🎨',
  mathematics: '🔢',
  language: '📖',
  english: '💬',
  cultural: '🌍',
};

// This should be configured to your daughter's child ID
// For now, we'll fetch the youngest child or use a specific ID
const DAUGHTER_AGE = 2.5;

export default function DaughterActivityPage() {
  const [daughterChildId, setDaughterChildId] = useState<string | null>(null);
  const [todayActivity, setTodayActivity] = useState<DailyAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    findDaughterChild();
  }, []);

  useEffect(() => {
    if (daughterChildId) {
      loadTodayActivity();
    }
  }, [daughterChildId]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) {
        router.push("/admin/login");
      }
    } catch (error) {
      router.push("/admin/login");
    }
  };

  const findDaughterChild = async () => {
    try {
      // Fetch all children and find one close to DAUGHTER_AGE
      const response = await fetch("/api/whale/children?active=true");
      if (response.ok) {
        const data = await response.json();
        const children = data.data || [];

        // Find child closest to DAUGHTER_AGE (2.5)
        // age_group is stored as '2-3', '3-4', etc.
        const daughter = children.find((c: any) => {
          const parts = c.age_group.split('-');
          const minAge = parseFloat(parts[0]);
          const maxAge = parseFloat(parts[1] || parts[0]);
          return minAge >= 2.0 && maxAge <= 3.0;
        });

        if (daughter) {
          setDaughterChildId(daughter.id);
        } else if (children.length > 0) {
          // Fallback to first child
          setDaughterChildId(children[0].id);
        }
      }
    } catch (error) {
      console.error("Error finding daughter's profile:", error);
    }
  };

  const loadTodayActivity = async () => {
    if (!daughterChildId) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/whale/daily-activity?childId=${daughterChildId}`);
      if (response.ok) {
        const data = await response.json();
        setTodayActivity(data.data);
      }
    } catch (error) {
      console.error("Error loading activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateActivity = async () => {
    if (!daughterChildId) {
      alert("Please set up a child profile first");
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch('/api/whale/daily-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: daughterChildId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate activity' }));
        throw new Error(errorData.error || 'Failed to generate activity');
      }

      const data = await response.json();
      setTodayActivity(data.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Error: ${message}`);
    } finally {
      setGenerating(false);
    }
  };

  const markComplete = async () => {
    if (!todayActivity) return;

    try {
      // Get curriculum work ID if available
      const curriculumWorkId = (todayActivity as any).curriculum_work?.id;
      
      const response = await fetch('/api/whale/daily-activity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignmentId: todayActivity.id, 
          completed: true,
          curriculumWorkId: curriculumWorkId || null
        }),
      });

      if (!response.ok) throw new Error('Failed to mark complete');

      // Auto-generate next activity
      await generateActivity();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Error: ${message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">🌈</div>
          <p className="text-2xl text-purple-600 font-bold">Loading...</p>
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
              <div className="text-5xl">🌟</div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  Today's Fun Activity
                  <Heart className="w-6 h-6 text-pink-200" />
                </h1>
                <p className="text-sm opacity-90">Learning through play!</p>
              </div>
            </div>
            <Link
              href="/admin"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors text-sm font-medium backdrop-blur-sm"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {!todayActivity ? (
          /* No Activity State */
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="text-9xl mb-6 animate-pulse">🎈</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Ready for a fun activity?
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Let's find something exciting to do today!
            </p>
            <button
              onClick={generateActivity}
              disabled={generating}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white px-10 py-5 rounded-2xl text-xl font-bold hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  Finding an activity...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Get Today's Activity!
                </>
              )}
            </button>
          </div>
        ) : (
          /* Activity Display */
          <div className="space-y-6">
            {/* Activity Card */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Area Banner */}
              <div className={`bg-gradient-to-r ${
                todayActivity.activity.area === 'practical_life' ? 'from-blue-400 to-blue-600' :
                todayActivity.activity.area === 'sensorial' ? 'from-purple-400 to-purple-600' :
                todayActivity.activity.area === 'mathematics' ? 'from-green-400 to-green-600' :
                todayActivity.activity.area === 'language' ? 'from-orange-400 to-orange-600' :
                todayActivity.activity.area === 'english' ? 'from-pink-400 to-pink-600' :
                'from-yellow-400 to-yellow-600'
              } text-white p-6 text-center`}>
                <div className="text-6xl mb-2">
                  {AREA_EMOJIS[todayActivity.activity.area] || '🎯'}
                </div>
                <p className="text-sm font-medium opacity-90">
                  {AREA_LABELS[todayActivity.activity.area]}
                </p>
              </div>

              {/* Activity Content */}
              <div className="p-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                  {todayActivity.activity.name}
                </h2>

                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-purple-800">
                      {todayActivity.activity.duration_minutes} minutes
                    </span>
                  </div>
                  {todayActivity.completed && (
                    <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Completed!</span>
                    </div>
                  )}
                </div>

                {/* Materials Needed */}
                {todayActivity.activity.materials.length > 0 && (
                  <div className="mb-6 bg-blue-50 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-blue-900 mb-3 flex items-center gap-2">
                      🎨 What You Need:
                    </h3>
                    <ul className="space-y-2">
                      {todayActivity.activity.materials.map((material, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-blue-500 text-xl">•</span>
                          <span className="text-blue-900 text-lg">{material}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Instructions */}
                <div className="mb-6 bg-purple-50 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-purple-900 mb-3 flex items-center gap-2">
                    📝 How to Do It:
                  </h3>
                  <div className="text-purple-900 text-lg leading-relaxed whitespace-pre-wrap">
                    {todayActivity.activity.instructions}
                  </div>
                </div>

                {/* Learning Goals */}
                {todayActivity.activity.learning_goals.length > 0 && (
                  <div className="mb-6 bg-green-50 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-green-900 mb-3 flex items-center gap-2">
                      🎯 What We're Learning:
                    </h3>
                    <ul className="space-y-2">
                      {todayActivity.activity.learning_goals.map((goal, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-green-500 text-xl">✓</span>
                          <span className="text-green-900 text-lg">{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  {!todayActivity.completed ? (
                    <>
                      <button
                        onClick={markComplete}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-2xl text-xl font-bold hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
                      >
                        <CheckCircle className="w-6 h-6" />
                        We Did It! 🎉
                      </button>
                      <button
                        onClick={generateActivity}
                        disabled={generating}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-2xl text-xl font-bold hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-6 h-6 ${generating ? 'animate-spin' : ''}`} />
                        Try Something Else
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={generateActivity}
                      disabled={generating}
                      className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white px-8 py-4 rounded-2xl text-xl font-bold hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          Finding next activity...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" />
                          What's Next? 🌟
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Fun Encouragement Card */}
            <div className="bg-gradient-to-r from-yellow-200 to-orange-200 rounded-3xl shadow-xl p-6 text-center">
              <p className="text-2xl font-bold text-orange-800">
                You're doing amazing! Keep up the great work! 🌟✨
              </p>
            </div>
          </div>
        )}

        {/* Setup Notice if no child found */}
        {!daughterChildId && !loading && (
          <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 text-center">
            <p className="text-yellow-800 font-medium mb-4">
              ⚠️ No child profile found for your daughter
            </p>
            <p className="text-yellow-700 mb-4">
              Please add a child profile with age 2-3 in Montessori Tracking first.
            </p>
            <Link
              href="/admin/montessori/children"
              className="inline-block bg-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-600 transition-colors"
            >
              Add Child Profile
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
