'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Teacher {
  id: string;
  name: string;
  student_count: number;
}

export default function PrincipalTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      const res = await fetch('/api/teacher/list');
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (e) {
      console.error('Failed to load teachers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email || !name) return;
    setSaving(true);
    try {
      // For now, just create a teacher entry
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      if (res.ok) {
        setShowInviteModal(false);
        setEmail('');
        setName('');
        loadTeachers();
      } else {
        alert('Failed to add teacher. Try again.');
      }
    } catch (e) {
      console.error(e);
      alert('Error adding teacher');
    } finally {
      setSaving(false);
    }
  };

  const totalStudents = teachers.reduce((sum, t) => sum + t.student_count, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl animate-bounce">👩‍🏫</span>
          </div>
          <p className="text-gray-600 font-medium">Loading teachers...</p>
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
              <Link href="/principal" className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800">👩‍🏫 Teacher Management</h1>
                <p className="text-sm text-gray-500">Manage your teaching staff</p>
              </div>
            </div>
            <button 
              onClick={() => setShowInviteModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Teacher
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
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
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {teachers.length > 0 ? Math.round(totalStudents / teachers.length) : 0}
                </div>
                <div className="text-sm text-gray-500">Avg per Teacher</div>
              </div>
            </div>
          </div>
        </div>

        {/* Teachers List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">All Teachers</h2>
          </div>
          
          {teachers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">👩‍🏫</div>
              <p className="text-gray-500 mb-4">No teachers yet. Add your first teacher!</p>
              <button 
                onClick={() => setShowInviteModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
              >
                + Add Teacher
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{teacher.name}</div>
                        <div className="text-sm text-gray-500">{teacher.student_count} students assigned</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/teacher-students`}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                      >
                        Assign Students
                      </Link>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        teacher.student_count > 0 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {teacher.student_count > 0 ? 'Active' : 'No Students'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors font-medium"
            >
              <span>➕</span>
              <span>Add Teacher</span>
            </button>
            <Link
              href="/admin/teacher-students"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
            >
              <span>🔗</span>
              <span>Assign Students</span>
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <span>⚙️</span>
              <span>User Management</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Add Teacher Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Teacher</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                  placeholder="Teacher Name" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                  placeholder="teacher@school.com (optional)" 
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Teachers can log in at /teacher with any name and password &quot;123&quot;.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowInviteModal(false)} 
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleInvite} 
                disabled={!name || saving} 
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                {saving ? 'Adding...' : 'Add Teacher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
