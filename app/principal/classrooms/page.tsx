'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  name: string;
  student_count: number;
  children?: Child[];
}

export default function PrincipalClassroomsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/teacher/list');
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = teachers.reduce((sum, t) => sum + t.student_count, 0);
  const activeClassrooms = teachers.filter(t => t.student_count > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl animate-bounce">📚</span>
          </div>
          <p className="text-gray-600 font-medium">Loading classrooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/principal" className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800">📚 Classroom Overview</h1>
                <p className="text-sm text-gray-500">View all classrooms and student progress</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{activeClassrooms}</div>
                <div className="text-sm text-gray-500">Active Classrooms</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👶</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{totalStudents}</div>
                <div className="text-sm text-gray-500">Total Students</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👩‍🏫</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{teachers.length}</div>
                <div className="text-sm text-gray-500">Teachers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Classrooms Grid */}
        <h2 className="text-lg font-bold text-gray-800 mb-4">🏫 Classrooms by Teacher</h2>
        
        {teachers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-500 mb-4">No classrooms yet.</p>
            <Link href="/admin/teacher-students" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
              Assign Students to Teachers
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teachers.map((teacher) => (
              <div 
                key={teacher.id} 
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    {teacher.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{teacher.name}&apos;s Class</h3>
                    <p className="text-sm text-gray-500">{teacher.student_count} students</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    teacher.student_count > 0 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {teacher.student_count > 0 ? 'Active' : 'Empty'}
                  </span>
                </div>
                
                {/* Progress indicator */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Class capacity</span>
                    <span>{teacher.student_count}/25</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all"
                      style={{ width: `${Math.min((teacher.student_count / 25) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/teacher/classroom"
                    className="flex-1 text-center py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
                  >
                    View Progress
                  </Link>
                  <Link
                    href="/admin/teacher-students"
                    className="flex-1 text-center py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                  >
                    Manage Students
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/teacher-students"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
            >
              <span>🔗</span>
              <span>Assign Students</span>
            </Link>
            <Link
              href="/teacher/classroom"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium"
            >
              <span>📊</span>
              <span>View All Progress</span>
            </Link>
            <Link
              href="/principal/teachers"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors font-medium"
            >
              <span>👩‍🏫</span>
              <span>Manage Teachers</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
