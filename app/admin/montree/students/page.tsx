'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowLeft, User, TrendingUp, BookOpen } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  date_of_birth?: string;
  age_group?: string;
  photo_url?: string;
  created_at: string;
}

interface ChildWithProgress extends Child {
  totalWorks: number;
  completed: number;
  inProgress: number;
  percentage: number;
}

export default function AllStudentsPage() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  useEffect(() => {
    fetchChildrenWithProgress();
  }, []);

  const fetchChildrenWithProgress = async () => {
    try {
      setLoading(true);

      // Fetch all children
      const childRes = await fetch('/api/whale/children?active=true');
      const childData = await childRes.json();
      const childrenList = childData.data || [];

      // Fetch progress for each child
      const childrenWithProgress = await Promise.all(
        childrenList.map(async (child: Child) => {
          try {
            const progRes = await fetch(`/api/montree/progress/${child.id}`);
            if (progRes.ok) {
              const progData = await progRes.json();
              return {
                ...child,
                totalWorks: progData.totalWorks || 0,
                completed: progData.completed || 0,
                inProgress: progData.inProgress || 0,
                percentage: progData.percentage || 0,
              };
            }
          } catch {
            // Progress fetch failed, use defaults
          }
          return {
            ...child,
            totalWorks: 0,
            completed: 0,
            inProgress: 0,
            percentage: 0,
          };
        })
      );

      setChildren(childrenWithProgress);
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-amber-500';
    return 'bg-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">👶</div>
          <p className="text-[#2C5F7C] text-lg">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]">
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">All Students</h1>
                <p className="text-sm opacity-90">{children.length} students enrolled</p>
              </div>
            </div>
            <Link
              href="/admin/montree"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Montree
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {children.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-[#2C5F7C] text-lg mb-4">No students found</p>
            <Link
              href="/admin/montessori/children"
              className="bg-[#4A90E2] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#3A80D2] transition-colors"
            >
              Add Students
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {children.map((child) => {
              const age = calculateAge(child.date_of_birth);

              return (
                <Link
                  key={child.id}
                  href={`/admin/montree/students/${child.id}`}
                  className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105 ${
                    selectedChild === child.id ? 'ring-4 ring-[#4A90E2]' : ''
                  }`}
                  onClick={(e) => {
                    // For iPad touch feedback
                    setSelectedChild(child.id);
                  }}
                >
                  {/* Photo or Avatar */}
                  <div className="aspect-square relative bg-gradient-to-br from-[#4A90E2] to-[#2C5F7C] flex items-center justify-center">
                    {child.photo_url ? (
                      <img
                        src={child.photo_url}
                        alt={child.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-white text-4xl font-bold">
                        {getInitials(child.name)}
                      </div>
                    )}

                    {/* Progress Badge */}
                    <div className="absolute bottom-2 right-2 bg-white rounded-full px-2 py-1 text-xs font-bold shadow">
                      {child.percentage}%
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-bold text-[#2C5F7C] truncate text-center">
                      {child.name}
                    </h3>
                    {age && (
                      <p className="text-xs text-gray-500 text-center">
                        Age {age}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(child.percentage)} transition-all`}
                        style={{ width: `${child.percentage}%` }}
                      />
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-2 flex justify-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="text-green-500">✓</span>
                        {child.completed}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-amber-500">◐</span>
                        {child.inProgress}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Quick Actions Footer (iPad-friendly) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden">
          <div className="flex justify-around">
            <Link
              href="/admin/montessori/children"
              className="flex flex-col items-center text-gray-600"
            >
              <User className="w-6 h-6" />
              <span className="text-xs mt-1">Manage</span>
            </Link>
            <Link
              href="/admin/montessori/reports"
              className="flex flex-col items-center text-gray-600"
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-xs mt-1">Reports</span>
            </Link>
            <Link
              href="/admin/montree"
              className="flex flex-col items-center text-gray-600"
            >
              <BookOpen className="w-6 h-6" />
              <span className="text-xs mt-1">Curriculum</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
