'use client';

// ============================================
// UNIFIED FAMILY DASHBOARD
// Uses unified APIs - reads from teacher database
// ============================================

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TreePine, 
  LogOut, 
  Plus, 
  Loader2,
  ChevronRight,
  Calendar,
  TrendingUp,
  ShoppingCart,
  CalendarDays,
  Gamepad2,
  Link as LinkIcon
} from 'lucide-react';

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
      // Load family from unified API
      const famRes = await fetch(`/api/unified/families?id=${familyId}`);
      const famData = await famRes.json();
      if (famData.families?.[0]) {
        setFamily(famData.families[0]);
      }

      // Load children with progress from unified API
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
    // Load all children without a family_id (unlinked children)
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
        body: JSON.stringify({
          child_id: childId,
          family_id: familyId
        })
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
    
    if (years < 1) {
      return `${months + (years * 12)} months`;
    }
    return `${years} years old`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Family not found</p>
          <button
            onClick={() => router.push('/parent/home')}
            className="text-green-600 hover:underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 pb-8">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <TreePine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Montree Home</h1>
              <p className="text-sm text-gray-500">{family.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Greeting */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {family.name.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-600 mt-1">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <button
            onClick={() => router.push(`/parent/home/${familyId}/materials`)}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
            <h4 className="font-medium text-gray-900 text-sm">Materials</h4>
          </button>
          <button
            onClick={() => router.push(`/parent/home/${familyId}/planner`)}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900 text-sm">Planner</h4>
          </button>
          <button
            onClick={() => router.push('/games')}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Gamepad2 className="w-5 h-5 text-purple-600" />
            </div>
            <h4 className="font-medium text-gray-900 text-sm">Games</h4>
          </button>
        </div>

        {/* Children Cards */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Children</h3>
            <button
              onClick={() => {
                loadAvailableChildren();
                setShowLinkChild(true);
              }}
              className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
            >
              <LinkIcon className="w-4 h-4" />
              Link Child
            </button>
          </div>

          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LinkIcon className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">No children linked yet</h4>
              <p className="text-gray-600 text-sm mb-4">
                Ask your child&apos;s teacher to link their profile to your family account
              </p>
              <button
                onClick={() => {
                  loadAvailableChildren();
                  setShowLinkChild(true);
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-green-700"
              >
                Link a Child
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => router.push(`/parent/home/${familyId}/${child.id}`)}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow text-left w-full"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: child.color || '#4F46E5' }}
                    >
                      {child.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">{child.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {getAge(child.birth_date || child.date_of_birth)}
                        </span>
                        {child.progress_summary && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {child.progress_summary.mastered} mastered
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Progress Bar */}
                  {child.progress_summary && child.progress_summary.total_works > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Overall Progress</span>
                        <span className="font-medium text-gray-900">
                          {child.progress_summary.overall_percent}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${child.progress_summary.overall_percent}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>🟢 {child.progress_summary.mastered} mastered</span>
                        <span>🟡 {child.progress_summary.practicing} practicing</span>
                        <span>🔵 {child.progress_summary.presented} presented</span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {children.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              value={children.reduce((sum, c) => sum + (c.progress_summary?.mastered || 0), 0)}
              label="Works Mastered"
              color="green"
            />
            <StatCard
              value={children.reduce((sum, c) => sum + (c.progress_summary?.practicing || 0), 0)}
              label="Practicing"
              color="yellow"
            />
            <StatCard
              value={children.length > 0 && children[0].progress_summary ? children[0].progress_summary.total_works : 0}
              label="Total Works"
              color="blue"
            />
          </div>
        )}
      </main>

      {/* Link Child Modal */}
      {showLinkChild && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Link a Child</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a child from your school to link to your family account
            </p>
            
            {availableChildren.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No unlinked children available</p>
                <p className="text-sm text-gray-400 mt-2">
                  Ask your teacher to add your child to the system first
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableChildren.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => linkChild(child.id)}
                    disabled={linking}
                    className="w-full p-4 bg-gray-50 hover:bg-green-50 rounded-xl text-left transition-colors border-2 border-transparent hover:border-green-500 disabled:opacity-50 flex items-center gap-3"
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: child.color || '#4F46E5' }}
                    >
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{child.name}</div>
                      <div className="text-sm text-gray-500">
                        {getAge(child.birth_date || child.date_of_birth)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setShowLinkChild(false)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  const colors = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600'
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm text-center">
      <div className={`text-2xl font-bold ${colors[color as keyof typeof colors] || 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
