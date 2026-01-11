'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProgressSummary {
  total_works: number;
  mastered: number;
  practicing: number;
  presented: number;
  overall_percent: number;
}

interface Child {
  id: string;
  name: string;
  birth_date: string;
  date_of_birth: string;
  color: string;
  progress_summary?: ProgressSummary;
}

interface Family {
  id: string;
  name: string;
  email: string;
  children: Child[];
}

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-blue-500 to-indigo-500',
  'from-cyan-500 to-teal-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
];

export default function FamilyDashboardUnified({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = use(params);
  const router = useRouter();
  const [family, setFamily] = useState<Family | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkChild, setShowLinkChild] = useState(false);
  const [availableChildren, setAvailableChildren] = useState<Child[]>([]);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadFamily();
  }, [familyId]);

  const loadFamily = async () => {
    try {
      const famRes = await fetch(`/api/unified/families?id=${familyId}`);
      const famData = await famRes.json();
      if (famData.families?.[0]) setFamily(famData.families[0]);

      const childRes = await fetch(`/api/unified/children?family_id=${familyId}&include_progress=true`);
      const childData = await childRes.json();
      setChildren(childData.children || []);
    } catch (err) {
      console.error('Error loading family:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableChildren = async () => {
    try {
      const res = await fetch('/api/unified/children?unlinked=true');
      const data = await res.json();
      setAvailableChildren(data.children || []);
    } catch (err) {
      console.error('Error loading available children:', err);
    }
  };

  const linkChild = async (childId: string) => {
    setLinking(true);
    try {
      await fetch('/api/unified/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, family_id: familyId })
      });
      setShowLinkChild(false);
      loadFamily();
    } catch (err) {
      console.error('Error linking child:', err);
    } finally {
      setLinking(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('montree_family_id');
    router.push('/parent/home');
  };

  const getAge = (birthDate: string) => {
    if (!birthDate) return 'Age unknown';
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    if (years < 1) return `${months + (years * 12)} months`;
    return `${years} years old`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getAvatarGradient = (index: number) => AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl animate-bounce">🌳</span>
          </div>
          <p className="text-gray-600 font-medium">Loading your family...</p>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg max-w-md">
          <span className="text-5xl mb-4 block">😕</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Family not found</h2>
          <p className="text-gray-600 mb-6">We couldn&apos;t find your family account.</p>
          <button
            onClick={() => router.push('/parent/home')}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const totalMastered = children.reduce((sum, c) => sum + (c.progress_summary?.mastered || 0), 0);
  const totalPracticing = children.reduce((sum, c) => sum + (c.progress_summary?.practicing || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 pb-8">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl">🌳</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Montree Home</h1>
                <p className="text-green-100 text-sm">{family.name}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Greeting Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {family.name.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-600 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          
          {children.length > 0 && (
            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
              <div>
                <div className="text-2xl font-bold text-green-600">{totalMastered}</div>
                <div className="text-xs text-gray-500">Works Mastered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalPracticing}</div>
                <div className="text-xs text-gray-500">Practicing</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link
            href={`/parent/home/${familyId}/materials`}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-center group border border-gray-100"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-xl">🛒</span>
            </div>
            <h4 className="font-medium text-gray-900 text-sm">Materials</h4>
          </Link>
          <Link
            href={`/parent/home/${familyId}/planner`}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-center group border border-gray-100"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-xl">📅</span>
            </div>
            <h4 className="font-medium text-gray-900 text-sm">Planner</h4>
          </Link>
          <Link
            href="/games"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-center group border border-gray-100"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-xl">🎮</span>
            </div>
            <h4 className="font-medium text-gray-900 text-sm">Games</h4>
          </Link>
        </div>

        {/* Children Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Your Children</h3>
            <button
              onClick={() => { loadAvailableChildren(); setShowLinkChild(true); }}
              className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Link Child
            </button>
          </div>

          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">👶</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">No children linked yet</h4>
              <p className="text-gray-600 text-sm mb-6 max-w-sm mx-auto">
                Ask your child&apos;s teacher to link their profile to your family account
              </p>
              <button
                onClick={() => { loadAvailableChildren(); setShowLinkChild(true); }}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                Link a Child
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {children.map((child, index) => (
                <button
                  key={child.id}
                  onClick={() => router.push(`/parent/home/${familyId}/${child.id}`)}
                  className="w-full bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all text-left border border-gray-100 overflow-hidden group"
                >
                  {/* Child Header */}
                  <div className={`bg-gradient-to-r ${getAvatarGradient(index)} p-4`}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {child.name.charAt(0)}
                      </div>
                      <div className="flex-1 text-white">
                        <h4 className="font-bold text-lg">{child.name}</h4>
                        <p className="text-white/80 text-sm">
                          {getAge(child.birth_date || child.date_of_birth)}
                        </p>
                      </div>
                      <svg className="w-6 h-6 text-white/70 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Progress Section */}
                  {child.progress_summary && child.progress_summary.total_works > 0 && (
                    <div className="p-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Overall Progress</span>
                        <span className="font-bold text-gray-900">{child.progress_summary.overall_percent}%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                          style={{ width: `${child.progress_summary.overall_percent}%` }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-gray-600">{child.progress_summary.mastered} mastered</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-gray-600">{child.progress_summary.practicing} practicing</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span className="text-gray-600">{child.progress_summary.presented} presented</span>
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tips Section */}
        {children.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💡</span>
              </div>
              <div>
                <h3 className="font-bold mb-1">Tip of the Day</h3>
                <p className="text-green-100 text-sm">
                  Play learning games together! The Games section has phonics and reading activities that reinforce what your child is learning at school.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Link Child Modal */}
      {showLinkChild && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Link a Child</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a child from your school to link to your family account
            </p>
            
            {availableChildren.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">🔍</span>
                <p className="text-gray-500">No unlinked children available</p>
                <p className="text-sm text-gray-400 mt-2">
                  Ask your teacher to add your child first
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableChildren.map((child, index) => (
                  <button
                    key={child.id}
                    onClick={() => linkChild(child.id)}
                    disabled={linking}
                    className="w-full p-4 bg-gray-50 hover:bg-green-50 rounded-xl text-left transition-all border-2 border-transparent hover:border-green-500 disabled:opacity-50 flex items-center gap-3"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(index)} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{child.name}</div>
                      <div className="text-sm text-gray-500">{getAge(child.birth_date || child.date_of_birth)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setShowLinkChild(false)}
              className="w-full mt-4 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
