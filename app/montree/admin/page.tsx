// /montree/admin/page.tsx
// Session 87: Principal Admin Dashboard - Manage classrooms + teacher codes
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Classroom {
  id: string;
  name: string;
  icon: string;
  color: string;
  teacher_name: string | null;
  teacher_id: string | null;
  login_code: string | null;
  student_count: number;
}

interface School {
  id: string;
  name: string;
  slug: string;
}

export default function AdminPage() {
  const [school, setSchool] = useState<School | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // For demo link
  const demoUrl = 'https://www.teacherpotato.xyz/montree/dashboard?demo=true';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/montree/admin/overview');
      const data = await res.json();
      setSchool(data.school);
      setClassrooms(data.classrooms || []);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyDemoLink = () => {
    navigator.clipboard.writeText(demoUrl);
    setCopiedCode('demo');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-slate-700 rounded animate-pulse mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-slate-800 rounded-xl p-6 animate-pulse">
                <div className="h-12 w-12 bg-slate-700 rounded-lg mb-4"></div>
                <div className="h-5 w-24 bg-slate-700 rounded mb-2"></div>
                <div className="h-4 w-32 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{school?.name || 'My School'}</h1>
            <p className="text-slate-400 text-sm">{classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/montree/onboarding"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            + New School
          </Link>
        </div>

        {/* Demo Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎬</span>
            <div>
              <h2 className="text-amber-200 font-bold">Demo Mode</h2>
              <p className="text-amber-300/70 text-sm">Share this to show how Montree works</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href="/montree/dashboard?demo=true"
              className="bg-amber-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-amber-600 transition-colors"
            >
              Try Demo
            </Link>
            <button 
              onClick={copyDemoLink}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                copiedCode === 'demo' 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              {copiedCode === 'demo' ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Classrooms Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Classrooms</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              + Add Classroom
            </button>
          </div>

          {classrooms.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <span className="text-5xl mb-4 block">🏫</span>
              <h3 className="text-white font-semibold mb-2">No classrooms yet</h3>
              <p className="text-slate-400 mb-6">Create your first classroom to get started</p>
              <Link
                href="/montree/onboarding"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
              >
                Set Up School
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.map(classroom => (
                <div 
                  key={classroom.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors"
                  style={{ borderLeftColor: classroom.color, borderLeftWidth: '4px' }}
                >
                  {/* Classroom Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{classroom.icon}</span>
                      <div>
                        <h3 className="font-semibold text-white">{classroom.name}</h3>
                        <p className="text-slate-400 text-sm">{classroom.student_count} students</p>
                      </div>
                    </div>
                    <Link
                      href={`/montree/admin/classrooms/${classroom.id}`}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      Edit
                    </Link>
                  </div>

                  {/* Teacher Info */}
                  {classroom.teacher_name ? (
                    <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm">Teacher</span>
                        <span className="text-white font-medium">{classroom.teacher_name}</span>
                      </div>
                      {classroom.login_code && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Login Code</span>
                          <div className="flex items-center gap-2">
                            <code className="text-emerald-400 font-mono text-sm">{classroom.login_code}</code>
                            <button
                              onClick={() => copyCode(classroom.login_code!)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                copiedCode === classroom.login_code
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              {copiedCode === classroom.login_code ? '✓' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3">
                      <p className="text-amber-300 text-sm">No teacher assigned</p>
                      <button className="text-amber-400 text-sm font-medium hover:underline mt-1">
                        + Assign Teacher
                      </button>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/montree/dashboard?classroom=${classroom.id}`}
                      className="flex-1 text-center py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
                    >
                      View Class
                    </Link>
                    <Link
                      href={`/montree/admin/classrooms/${classroom.id}/students`}
                      className="flex-1 text-center py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
                    >
                      Students
                    </Link>
                  </div>
                </div>
              ))}

              {/* Add Classroom Card */}
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl p-6 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center min-h-[200px]"
              >
                <span className="text-4xl mb-2 opacity-50">+</span>
                <span className="text-slate-400 font-medium">Add Classroom</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            href="/montree/admin/parent-codes"
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition-colors text-center"
          >
            <span className="text-2xl block mb-2">👨‍👩‍👧</span>
            <span className="text-white text-sm font-medium">Parent Codes</span>
          </Link>
          <Link 
            href="/montree/dashboard/reports"
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition-colors text-center"
          >
            <span className="text-2xl block mb-2">📊</span>
            <span className="text-white text-sm font-medium">Reports</span>
          </Link>
          <Link 
            href="/montree/dashboard/media"
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition-colors text-center"
          >
            <span className="text-2xl block mb-2">🖼️</span>
            <span className="text-white text-sm font-medium">Media</span>
          </Link>
          <Link 
            href="/montree/games"
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition-colors text-center"
          >
            <span className="text-2xl block mb-2">🎮</span>
            <span className="text-white text-sm font-medium">Games</span>
          </Link>
        </div>

        {/* Add Classroom Modal - placeholder for now */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">Add Classroom</h2>
              <p className="text-slate-400 mb-6">
                To add a new classroom with a teacher, use the onboarding flow.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600"
                >
                  Cancel
                </button>
                <Link
                  href="/montree/onboarding"
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 text-center"
                >
                  Go to Setup
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
