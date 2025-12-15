// =====================================================
// WHALE PLATFORM - TEACHER DASHBOARD
// =====================================================
// Location: app/teacher/dashboard/page.tsx
// Purpose: Main dashboard for teacher users
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useUserPermissions } from '@/components/PermissionGate';
import type { FeatureKey } from '@/lib/permissions/roles';

interface TeacherStudent {
  student_id: string;
  student_name: string;
  activities_count: number;
  progress_percentage: number;
}

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const { permissions, isLoading: permissionsLoading } = useUserPermissions();
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/teacher-login');
        return;
      }

      setUser(user);
      
      // Load teacher's students (you'll need to implement this based on your data structure)
      // This is a placeholder
      setStudents([
        {
          student_id: '1',
          student_name: 'Sample Student 1',
          activities_count: 5,
          progress_percentage: 60,
        },
        {
          student_id: '2',
          student_name: 'Sample Student 2',
          activities_count: 3,
          progress_percentage: 40,
        },
      ]);

      setLoading(false);
    }

    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/teacher-login');
  };

  const getFeatureRoute = (featureKey: FeatureKey): string => {
    const routes: Record<FeatureKey, string> = {
      three_part_card_generator: '/tools/three-part-cards',
      curriculum_viewer: '/curriculum',
      progress_dashboard: '/teacher/progress',
      activity_management: '/teacher/activities',
      report_generation: '/teacher/reports',
      resource_library: '/resources',
      lesson_planner: '/teacher/lessons',
      student_management: '/teacher/students',
    };
    return routes[featureKey] || '/';
  };

  const getFeatureIcon = (featureKey: FeatureKey): string => {
    const icons: Record<FeatureKey, string> = {
      three_part_card_generator: '🎴',
      curriculum_viewer: '📚',
      progress_dashboard: '📊',
      activity_management: '✏️',
      report_generation: '📄',
      resource_library: '📁',
      lesson_planner: '📅',
      student_management: '👥',
    };
    return icons[featureKey] || '📌';
  };

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Available Features */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Features</h2>
          
          {permissions && permissions.features && permissions.features.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissions.features.map((feature: any) => (
                <div
                  key={feature.feature_key}
                  onClick={() => router.push(getFeatureRoute(feature.feature_key))}
                  className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{getFeatureIcon(feature.feature_key)}</span>
                    <div className="flex gap-1">
                      {feature.permissions.view && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">View</span>
                      )}
                      {feature.permissions.create && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Create</span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.feature_name}</h3>
                  <p className="text-sm text-gray-600">{feature.description || 'Click to access this feature'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                No features are currently enabled for your account. Please contact an administrator.
              </p>
            </div>
          )}
        </section>

        {/* My Students */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My Students</h2>
          
          {students.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activities
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.student_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.student_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.activities_count}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${student.progress_percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">{student.progress_percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => router.push(`/teacher/students/${student.student_id}`)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <p className="mt-2 text-gray-600">No students assigned yet</p>
              <p className="text-sm text-gray-500">Contact an administrator to assign students to your account</p>
            </div>
          )}
        </section>

        {/* Quick Stats */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">{students.length}</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Features</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {permissions?.features?.length || 0}
                  </p>
                </div>
                <div className="text-4xl">⚡</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Progress</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {students.length > 0
                      ? Math.round(
                          students.reduce((sum, s) => sum + s.progress_percentage, 0) / students.length
                        )
                      : 0}%
                  </p>
                </div>
                <div className="text-4xl">📈</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

