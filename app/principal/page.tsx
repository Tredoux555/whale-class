'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Teacher {
  id: string;
  name: string;
  student_count: number;
}

interface Stats {
  teachers: number;
  classrooms: number;
  students: number;
}

const DASHBOARD_ITEMS = [
  {
    href: '/principal/teachers',
    icon: '👩‍🏫',
    title: 'Teacher Management',
    description: 'Add teachers, view student counts, manage staff',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50',
  },
  {
    href: '/principal/classrooms',
    icon: '📚',
    title: 'Classrooms',
    description: 'View all classrooms and student distribution',
    gradient: 'from-blue-500 to-indigo-500',
    bgGradient: 'from-blue-50 to-indigo-50',
  },
  {
    href: '/admin/teacher-students',
    icon: '🔗',
    title: 'Student Assignments',
    description: 'Assign students to teachers and manage class rosters',
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50',
  },
  {
    href: '/teacher/curriculum',
    icon: '📋',
    title: 'Curriculum',
    description: 'Full Montessori curriculum with 342 works',
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-50 to-amber-50',
  },
  {
    href: '/teacher/classroom',
    icon: '📊',
    title: 'Student Progress',
    description: 'View progress tracking across all students',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50',
  },
  {
    href: '/games',
    icon: '🎮',
    title: 'Learning Games',
    description: '14 interactive games for students',
    gradient: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-50 to-rose-50',
  },
  {
    href: '/teacher/tools',
    icon: '🛠️',
    title: 'Teacher Tools',
    description: 'Material generators and flashcard makers',
    gradient: 'from-cyan-500 to-blue-500',
    bgGradient: 'from-cyan-50 to-blue-50',
  },
  {
    href: '/admin',
    icon: '⚙️',
    title: 'Admin Panel',
    description: 'Advanced settings and configurations',
    gradient: 'from-gray-500 to-slate-500',
    bgGradient: 'from-gray-50 to-slate-50',
  },
];

export default function PrincipalDashboard() {
  const [stats, setStats] = useState<Stats>({ teachers: 0, classrooms: 0, students: 0 });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load teachers
      const teacherRes = await fetch('/api/teacher/list');
      const teacherData = await teacherRes.json();
      const teacherList = teacherData.teachers || [];
      setTeachers(teacherList);

      // Load children count
      const childRes = await fetch('/api/children');
      const childData = await childRes.json();
      const studentCount = childData.children?.length || 0;

      setStats({
        teachers: teacherList.length,
        classrooms: teacherList.filter((t: Teacher) => t.student_count > 0).length,
        students: studentCount,
      });
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl animate-bounce">🏫</span>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <span className="text-2xl">🏫</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">{greeting},</p>
                <h1 className="text-xl font-bold text-gray-800">Principal</h1>
              </div>
            </div>
            <Link
              href="/admin/montree"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <span>🌳 Montree</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 text-white shadow-xl shadow-indigo-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Principal Dashboard</h2>
              <p className="text-indigo-100">School overview and management</p>
            </div>
            <div className="hidden sm:block text-6xl opacity-50">🏫</div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👩‍🏫</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.teachers}</div>
                <div className="text-sm text-gray-500">Teachers</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.classrooms}</div>
                <div className="text-sm text-gray-500">Active Classes</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👶</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.students}</div>
                <div className="text-sm text-gray-500">Students</div>
              </div>
            </div>
          </div>
        </div>

        {/* Teachers Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">👩‍🏫 Teachers</h3>
            <Link
              href="/admin/users"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              + Add Teacher
            </Link>
          </div>
          {teachers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">👩‍🏫</div>
              <p>No teachers yet. Add your first teacher!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl hover:from-indigo-50 hover:to-purple-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                    {teacher.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{teacher.name}</div>
                    <div className="text-sm text-gray-500">{teacher.student_count} students</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <h3 className="text-lg font-bold text-gray-800 mb-4">🚀 Quick Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DASHBOARD_ITEMS.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`bg-gradient-to-br ${item.bgGradient} rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:-translate-y-1`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                    <span className="text-3xl">{item.icon}</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/principal/teachers"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium"
            >
              <span>👩‍🏫</span>
              <span>Manage Teachers</span>
            </Link>
            <Link
              href="/admin/teacher-students"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
            >
              <span>🔗</span>
              <span>Assign Students</span>
            </Link>
            <Link
              href="/teacher/classroom"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
            >
              <span>📊</span>
              <span>View Progress</span>
            </Link>
            <Link
              href="/parent/demo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
            >
              <span>👨‍👩‍👧</span>
              <span>Parent Portal</span>
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors font-medium"
            >
              <span>🎮</span>
              <span>Games</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <span>⚙️</span>
              <span>Admin Panel</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
