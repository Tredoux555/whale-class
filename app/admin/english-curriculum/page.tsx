// app/admin/english-curriculum/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from '@/lib/supabase';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

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

const SKILL_LEVELS = [
  { level: 1, title: "Level 1: Early Vocabulary", subtitle: "(Ages 2-3)", color: "from-blue-400 to-blue-600" },
  { level: 2, title: "Level 2: Simple Sentences", subtitle: "(Ages 3-4)", color: "from-green-400 to-green-600" },
  { level: 3, title: "Level 3: Conversations", subtitle: "(Ages 4-6)", color: "from-purple-400 to-purple-600" },
  { level: 4, title: "Level 4: Literacy Foundations", subtitle: "(Ages 4-6)", color: "from-orange-400 to-orange-600" },
];

export default function EnglishCurriculumPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchActivities();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredActivities(activities);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredActivities(
        activities.filter(
          (activity) =>
            activity.name.toLowerCase().includes(query) ||
            activity.instructions.toLowerCase().includes(query) ||
            activity.learning_goals.some((goal) => goal.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, activities]);

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

  const fetchActivities = async () => {
    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('area', 'english')
        .order('skill_level', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
      setFilteredActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      alert("Failed to load English curriculum. Please check your Supabase connection.");
    } finally {
      setLoading(false);
    }
  };

  const toggleActivity = (activityId: string) => {
    setExpandedActivity(expandedActivity === activityId ? null : activityId);
  };

  const getActivitiesByLevel = (level: number) => {
    return filteredActivities.filter((activity) => activity.skill_level === level);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]">
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">📚</div>
              <div>
                <h1 className="text-2xl font-bold">English Curriculum</h1>
                <p className="text-sm opacity-90">Teaching Resources & Lesson Plans</p>
              </div>
            </div>
            <Link
              href="/admin"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search lessons by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2] bg-white"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-bounce">📚</div>
            <p className="text-[#2C5F7C] text-lg">Loading curriculum...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-[#2C5F7C] text-lg font-semibold">No English activities found!</p>
            <p className="text-[#2C5F7C]/70 mt-2">
              Make sure you've run the english_curriculum_seed.sql file in Supabase.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {SKILL_LEVELS.map((level) => {
                const count = getActivitiesByLevel(level.level).length;
                return (
                  <div
                    key={level.level}
                    className={`bg-gradient-to-r ${level.color} text-white rounded-xl p-4 shadow-md`}
                  >
                    <div className="text-3xl font-bold">{count}</div>
                    <div className="text-sm opacity-90">
                      Level {level.level} Lessons
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Curriculum by Level */}
            <div className="space-y-6">
              {SKILL_LEVELS.map((level) => {
                const levelActivities = getActivitiesByLevel(level.level);
                
                if (levelActivities.length === 0) return null;

                return (
                  <div key={level.level} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Level Header */}
                    <div className={`bg-gradient-to-r ${level.color} text-white p-6`}>
                      <h2 className="text-2xl font-bold">{level.title}</h2>
                      <p className="text-sm opacity-90 mt-1">{level.subtitle}</p>
                      <div className="mt-2 text-sm">
                        {levelActivities.length} lesson{levelActivities.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Activities List */}
                    <div className="divide-y divide-gray-200">
                      {levelActivities.map((activity) => {
                        const isExpanded = expandedActivity === activity.id;

                        return (
                          <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                            {/* Activity Header */}
                            <button
                              onClick={() => toggleActivity(activity.id)}
                              className="w-full flex items-start justify-between gap-4 text-left"
                            >
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-[#2C5F7C] mb-1">
                                  {activity.name}
                                </h3>
                                <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    👶 Ages {activity.age_min}-{activity.age_max}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    ⏱️ {activity.duration_minutes} min
                                  </span>
                                  <span className="flex items-center gap-1">
                                    📊 Level {activity.skill_level}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="w-6 h-6 text-[#4A90E2]" />
                                ) : (
                                  <ChevronDown className="w-6 h-6 text-[#4A90E2]" />
                                )}
                              </div>
                            </button>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="mt-4 space-y-4 pl-4 border-l-4 border-[#4A90E2]">
                                {/* Instructions */}
                                <div>
                                  <h4 className="font-semibold text-[#2C5F7C] mb-2 flex items-center gap-2">
                                    📝 Step-by-Step Instructions
                                  </h4>
                                  <div className="bg-gray-50 rounded-lg p-4">
                                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                                      {activity.instructions}
                                    </pre>
                                  </div>
                                </div>

                                {/* Materials */}
                                {activity.materials.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-[#2C5F7C] mb-2 flex items-center gap-2">
                                      🎨 Materials Needed
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                                      {activity.materials.map((material, idx) => (
                                        <li key={idx}>{material}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Learning Goals */}
                                {activity.learning_goals.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-[#2C5F7C] mb-2 flex items-center gap-2">
                                      🎯 Learning Goals
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                                      {activity.learning_goals.map((goal, idx) => (
                                        <li key={idx}>{goal}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Action Button */}
                                <div className="pt-2">
                                  <button
                                    onClick={() => toggleActivity(activity.id)}
                                    className="text-[#4A90E2] hover:text-[#2C5F7C] font-semibold text-sm"
                                  >
                                    Collapse
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* No Results */}
            {searchQuery && filteredActivities.length === 0 && (
              <div className="bg-white rounded-2xl shadow-md p-8 text-center mt-6">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-[#2C5F7C] text-lg font-semibold">No lessons found</p>
                <p className="text-[#2C5F7C]/70 mt-2">
                  Try a different search term
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
