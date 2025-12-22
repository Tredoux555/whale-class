'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  User,
  TrendingUp,
  Calendar,
  BookOpen,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Child {
  id: string;
  name: string;
  date_of_birth?: string;
  age_group?: string;
  photo_url?: string;
}

interface AreaProgress {
  areaId: string;
  areaName: string;
  totalWorks: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percentage: number;
}

interface OverallProgress {
  totalWorks: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percentage: number;
  areaProgress: AreaProgress[];
}

interface RecentWork {
  workId: string;
  workName: string;
  status: string;
  updatedAt: string;
  areaId: string;
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const childId = resolvedParams.id;

  const [child, setChild] = useState<Child | null>(null);
  const [progress, setProgress] = useState<OverallProgress | null>(null);
  const [recentWorks, setRecentWorks] = useState<RecentWork[]>([]);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (childId) {
      fetchData();
    }
  }, [childId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all children for navigation
      const childrenRes = await fetch('/api/whale/children?active=true');
      const childrenData = await childrenRes.json();
      setAllChildren(childrenData.data || []);

      // Fetch current child
      const childRes = await fetch(`/api/whale/children/${childId}`);
      const childData = await childRes.json();
      setChild(childData.data || null);

      // Fetch progress summary
      const progRes = await fetch(`/api/montree/progress/${childId}`);
      if (progRes.ok) {
        const progData = await progRes.json();
        setProgress(progData);
      }

      // Fetch recent works
      try {
        const recentRes = await fetch(`/api/montree/progress/${childId}/recent`);
        if (recentRes.ok) {
          const recentData = await recentRes.json();
          setRecentWorks(recentData.works || []);
        }
      } catch {
        // Recent works endpoint might not exist
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    const totalMonths = years * 12 + months;
    return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
    };
  };

  const currentIndex = allChildren.findIndex(c => c.id === childId);
  const prevChild = currentIndex > 0 ? allChildren[currentIndex - 1] : null;
  const nextChild = currentIndex < allChildren.length - 1 ? allChildren[currentIndex + 1] : null;

  const getAreaIcon = (areaId: string) => {
    const icons: Record<string, string> = {
      practical_life: '🧹',
      sensorial: '👁️',
      mathematics: '🔢',
      language: '📚',
      cultural: '🌍',
    };
    return icons[areaId] || '📖';
  };

  const getAreaColor = (areaId: string) => {
    const colors: Record<string, string> = {
      practical_life: 'bg-green-100 border-green-300 text-green-700',
      sensorial: 'bg-orange-100 border-orange-300 text-orange-700',
      mathematics: 'bg-blue-100 border-blue-300 text-blue-700',
      language: 'bg-pink-100 border-pink-300 text-pink-700',
      cultural: 'bg-purple-100 border-purple-300 text-purple-700',
    };
    return colors[areaId] || 'bg-gray-100 border-gray-300 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📊</div>
          <p className="text-[#2C5F7C] text-lg">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#2C5F7C] text-lg mb-4">Student not found</p>
          <Link
            href="/admin/montree/students"
            className="bg-[#4A90E2] text-white px-6 py-3 rounded-lg"
          >
            Back to Students
          </Link>
        </div>
      </div>
    );
  }

  const age = calculateAge(child.date_of_birth);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0] pb-20 md:pb-8">
      {/* Header with Navigation */}
      <header className="bg-[#4A90E2] text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/admin/montree/students"
              className="flex items-center gap-2 text-white/80 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">All Students</span>
            </Link>

            <h1 className="text-xl font-bold">{child.name}</h1>

            {/* Student Navigation */}
            <div className="flex items-center gap-2">
              {prevChild ? (
                <Link
                  href={`/admin/montree/students/${prevChild.id}`}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
                  title={prevChild.name}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
              ) : (
                <div className="p-2 opacity-30">
                  <ChevronLeft className="w-5 h-5" />
                </div>
              )}
              <span className="text-sm opacity-75">
                {currentIndex + 1} / {allChildren.length}
              </span>
              {nextChild ? (
                <Link
                  href={`/admin/montree/students/${nextChild.id}`}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
                  title={nextChild.name}
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              ) : (
                <div className="p-2 opacity-30">
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4">
            {child.photo_url ? (
              <img
                src={child.photo_url}
                alt={child.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4A90E2] to-[#2C5F7C] flex items-center justify-center text-white text-2xl font-bold">
                {child.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#2C5F7C]">{child.name}</h2>
              {age && (
                <p className="text-gray-600">
                  {age.years} years, {age.months} months old
                </p>
              )}
              {child.age_group && (
                <span className="inline-block mt-1 px-3 py-1 bg-[#E8F4F8] text-[#2C5F7C] text-sm rounded-full">
                  {child.age_group}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        {progress && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-[#2C5F7C] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Overall Progress
            </h3>

            {/* Big Progress Circle */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#E8F4F8"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#4A90E2"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${progress.percentage * 3.52} 352`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-[#2C5F7C]">
                    {progress.percentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{progress.completed}</p>
                <p className="text-xs text-green-700">Completed</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{progress.inProgress}</p>
                <p className="text-xs text-amber-700">In Progress</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">{progress.notStarted}</p>
                <p className="text-xs text-gray-700">Not Started</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress by Area */}
        {progress?.areaProgress && progress.areaProgress.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-[#2C5F7C] mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Progress by Area
            </h3>
            <div className="space-y-4">
              {progress.areaProgress.map((area) => (
                <div key={area.areaId} className={`p-4 rounded-xl border-2 ${getAreaColor(area.areaId)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getAreaIcon(area.areaId)}</span>
                      <span className="font-semibold">{area.areaName}</span>
                    </div>
                    <span className="font-bold">{area.percentage}%</span>
                  </div>
                  <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-current opacity-50 rounded-full"
                      style={{ width: `${area.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2 opacity-75">
                    <span>✓ {area.completed} done</span>
                    <span>◐ {area.inProgress} working</span>
                    <span>○ {area.notStarted} to go</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentWorks.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-[#2C5F7C] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentWorks.slice(0, 5).map((work) => (
                <div
                  key={work.workId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getAreaIcon(work.areaId)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{work.workName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(work.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    work.status === 'completed' ? 'bg-green-100 text-green-700' :
                    work.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {work.status === 'completed' ? '✓ Done' :
                     work.status === 'in_progress' ? '◐ Working' : '○ New'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/admin/montessori/children/${childId}`}
            className="bg-white border-2 border-[#4A90E2] text-[#4A90E2] px-4 py-3 rounded-xl font-bold text-center hover:bg-[#E8F4F8] transition-colors"
          >
            View Full Dashboard
          </Link>
          <Link
            href={`/admin/montessori/reports?child=${childId}`}
            className="bg-[#4A90E2] text-white px-4 py-3 rounded-xl font-bold text-center hover:bg-[#3A80D2] transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Generate Report
          </Link>
        </div>
      </main>

      {/* Bottom Navigation (iPad) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-around md:hidden">
        {prevChild && (
          <Link
            href={`/admin/montree/students/${prevChild.id}`}
            className="flex-1 flex flex-col items-center py-2 text-gray-600"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-xs truncate max-w-[80px]">{prevChild.name}</span>
          </Link>
        )}
        <Link
          href="/admin/montree/students"
          className="flex-1 flex flex-col items-center py-2 text-[#4A90E2]"
        >
          <User className="w-6 h-6" />
          <span className="text-xs">All Students</span>
        </Link>
        {nextChild && (
          <Link
            href={`/admin/montree/students/${nextChild.id}`}
            className="flex-1 flex flex-col items-center py-2 text-gray-600"
          >
            <ChevronRight className="w-6 h-6" />
            <span className="text-xs truncate max-w-[80px]">{nextChild.name}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
