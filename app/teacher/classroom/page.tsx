'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  age_group: string;
  photo_url: string | null;
  age: number;
  progress: {
    presented: number;
    practicing: number;
    mastered: number;
    total: number;
  };
}

export default function TeacherClassroomPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/teacher/classroom');
      const data = await res.json();
      setChildren(data.children || []);
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChildren = children.filter(child =>
    child.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgressPercentage = (child: Child) => {
    // Assuming ~268 total works
    const totalWorks = 268;
    return Math.round((child.progress.mastered / totalWorks) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classroom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 My Classroom</h1>
          <p className="text-gray-600">{children.length} students</p>
        </div>
        <Link
          href="/teacher/progress"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          📊 Track Progress
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search students..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Children Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredChildren.map((child) => (
          <div
            key={child.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Child Header */}
            <div className="p-4 flex items-center gap-3">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                {child.photo_url ? (
                  <img
                    src={child.photo_url}
                    alt={child.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  child.name.charAt(0)
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{child.name}</h3>
                <p className="text-sm text-gray-500">
                  Age {child.age.toFixed(1)} • {child.age_group}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-4 pb-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{getProgressPercentage(child)}% mastered</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(child.progress.mastered / 268) * 100}%` }}
                  />
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${(child.progress.practicing / 268) * 100}%` }}
                  />
                  <div
                    className="bg-yellow-500 transition-all"
                    style={{ width: `${(child.progress.presented / 268) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between text-xs">
                <div className="text-center">
                  <div className="font-semibold text-yellow-600">{child.progress.presented}</div>
                  <div className="text-gray-500">Presented</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{child.progress.practicing}</div>
                  <div className="text-gray-500">Practicing</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{child.progress.mastered}</div>
                  <div className="text-gray-500">Mastered</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <Link
                href={`/teacher/progress?child=${child.id}`}
                className="flex-1 text-center text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 rounded-lg transition-colors"
              >
                📊 Progress
              </Link>
              <Link
                href={`/admin/child-progress/${child.id}`}
                className="flex-1 text-center text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 py-2 rounded-lg transition-colors"
              >
                📋 Full Report
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredChildren.length === 0 && (
        <div className="text-center py-12">
          {searchTerm ? (
            <p className="text-gray-500">No students matching &quot;{searchTerm}&quot;</p>
          ) : (
            <>
              <p className="text-gray-500">No students in your classroom yet.</p>
              <p className="text-sm text-gray-400 mt-1">Contact your administrator to add students.</p>
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3">Progress Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-600">Presented - Work has been introduced</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-600">Practicing - Child is working on it</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-600">Mastered - Child has mastered this work</span>
          </div>
        </div>
      </div>
    </div>
  );
}
