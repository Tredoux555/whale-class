// app/admin/montessori/activities/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// Removed createSupabaseClient - using API route instead
import { Search, Filter, ChevronDown, ChevronUp, BookOpen, User } from 'lucide-react';

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
  prerequisites: string[] | null;
}

interface Child {
  id: string;
  name: string;
  age_group: string;
  photo_url: string | null;
}

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language Arts',
  english: 'English',
  cultural: 'Cultural Studies',
};

const AREA_COLORS: Record<string, string> = {
  practical_life: 'from-blue-400 to-blue-600',
  sensorial: 'from-purple-400 to-purple-600',
  mathematics: 'from-green-400 to-green-600',
  language: 'from-orange-400 to-orange-600',
  english: 'from-pink-400 to-pink-600',
  cultural: 'from-yellow-400 to-yellow-600',
};

export default function ActivitiesLibraryPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchActivities();
    fetchChildren();
  }, []);

  useEffect(() => {
    filterActivities();
  }, [searchQuery, selectedArea, selectedSkillLevel, ageFilter, activities]);

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
      const response = await fetch('/api/whale/activities');
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      const result = await response.json();
      setActivities(result.data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      alert("Failed to load activities. Please check your Supabase connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async () => {
    try {
      const response = await fetch("/api/whale/children?active=true");
      if (response.ok) {
        const data = await response.json();
        setChildren(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (activity) =>
          activity.name.toLowerCase().includes(query) ||
          activity.instructions.toLowerCase().includes(query) ||
          activity.learning_goals.some((goal) => goal.toLowerCase().includes(query))
      );
    }

    // Area filter
    if (selectedArea !== "all") {
      filtered = filtered.filter((activity) => activity.area === selectedArea);
    }

    // Skill level filter
    if (selectedSkillLevel !== "all") {
      filtered = filtered.filter(
        (activity) => activity.skill_level === parseInt(selectedSkillLevel)
      );
    }

    // Age filter
    if (ageFilter !== "all") {
      const age = parseFloat(ageFilter);
      filtered = filtered.filter(
        (activity) => activity.age_min <= age && activity.age_max >= age
      );
    }

    setFilteredActivities(filtered);
  };

  const toggleActivity = (activityId: string) => {
    setExpandedActivity(expandedActivity === activityId ? null : activityId);
  };

  const openAssignModal = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowAssignModal(true);
    setSelectedChild("");
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedActivity(null);
    setSelectedChild("");
  };

  const handleAssignActivity = async () => {
    if (!selectedChild || !selectedActivity) {
      alert("Please select a child");
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if child already has an activity for today
      const checkRes = await fetch(`/api/whale/daily-activity?childId=${selectedChild}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.data && !checkData.data.completed) {
          if (!confirm("This child already has an activity for today. Replace it?")) {
            return;
          }
        }
      }

      // Assign the activity using API route
      const assignResponse = await fetch('/api/whale/daily-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          childId: selectedChild,
          activityId: selectedActivity.id // Pass specific activity ID
        }),
      });

      if (!assignResponse.ok) {
        const errorData = await assignResponse.json().catch(() => ({ error: 'Failed to assign activity' }));
        throw new Error(errorData.error || 'Failed to assign activity');
      }

      alert("Activity assigned successfully!");
      closeAssignModal();
    } catch (error: any) {
      console.error("Error assigning activity:", error);
      alert(`Failed to assign activity: ${error.message}`);
    }
  };

  const areas = [...new Set(activities.map(a => a.area))];
  const skillLevels = [...new Set(activities.map(a => a.skill_level))].sort();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]">
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">📚</div>
              <div>
                <h1 className="text-2xl font-bold">Activities Library</h1>
                <p className="text-sm opacity-90">Browse & Assign Activities</p>
              </div>
            </div>
            <Link
              href="/admin/montessori"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Back to Montessori
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Area Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Curriculum Area
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Areas ({activities.length})</option>
                {areas.map(area => (
                  <option key={area} value={area}>
                    {AREA_LABELS[area]} ({activities.filter(a => a.area === area).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Skill Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skill Level
              </label>
              <select
                value={selectedSkillLevel}
                onChange={(e) => setSelectedSkillLevel(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Levels</option>
                {skillLevels.map(level => (
                  <option key={level} value={level}>
                    Level {level}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age Range
              </label>
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Ages</option>
                <option value="2">Age 2</option>
                <option value="2.5">Age 2.5</option>
                <option value="3">Age 3</option>
                <option value="3.5">Age 3.5</option>
                <option value="4">Age 4</option>
                <option value="4.5">Age 4.5</option>
                <option value="5">Age 5</option>
                <option value="5.5">Age 5.5</option>
                <option value="6">Age 6</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || selectedArea !== "all" || selectedSkillLevel !== "all" || ageFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedArea("all");
                setSelectedSkillLevel("all");
                setAgeFilter("all");
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredActivities.length}</span> of{" "}
            <span className="font-semibold text-gray-900">{activities.length}</span> activities
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-bounce">📚</div>
            <p className="text-[#2C5F7C] text-lg">Loading activities...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-[#2C5F7C] text-lg font-semibold">No activities found</p>
            <p className="text-[#2C5F7C]/70 mt-2">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          /* Activities List */
          <div className="space-y-3">
            {filteredActivities.map((activity) => {
              const isExpanded = expandedActivity === activity.id;
              const areaColor = AREA_COLORS[activity.area] || 'from-gray-400 to-gray-600';

              return (
                <div
                  key={activity.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Activity Header */}
                  <div className="p-4">
                    <button
                      onClick={() => toggleActivity(activity.id)}
                      className="w-full flex items-start justify-between gap-4 text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 bg-gradient-to-r ${areaColor} text-white rounded-full text-xs font-semibold`}>
                            {AREA_LABELS[activity.area]}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            Level {activity.skill_level}
                          </span>
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            Ages {activity.age_min}-{activity.age_max}
                          </span>
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                            {activity.duration_minutes} min
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {activity.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignModal(activity);
                          }}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <User className="w-4 h-4" />
                          Assign
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 space-y-4 pl-4 border-l-4 border-blue-500">
                        {/* Instructions */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Instructions
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
                            <h4 className="font-semibold text-gray-900 mb-2">Materials Needed</h4>
                            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                              {activity.materials.map((material, idx) => (
                                <li key={idx}>{material}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Learning Goals */}
                        {activity.learning_goals.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Learning Goals</h4>
                            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                              {activity.learning_goals.map((goal, idx) => (
                                <li key={idx}>{goal}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Assign Modal */}
      {showAssignModal && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Assign Activity to Child
            </h3>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-900">{selectedActivity.name}</p>
              <p className="text-sm text-blue-700 mt-1">
                {AREA_LABELS[selectedActivity.area]} • Level {selectedActivity.skill_level}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Child
              </label>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">Choose a child...</option>
                {children.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.name} (Age {child.age_group})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeAssignModal}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignActivity}
                disabled={!selectedChild}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
