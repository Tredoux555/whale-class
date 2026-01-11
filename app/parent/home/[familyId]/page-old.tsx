'use client';

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
  Package,
  CalendarDays,
  ShoppingCart
} from 'lucide-react';

interface Child {
  id: string;
  name: string;
  birth_date: string;
  color: string;
  progress_summary?: {
    total_works: number;
    mastered: number;
    practicing: number;
    presented: number;
    overall_percent: number;
  };
}

interface Family {
  id: string;
  name: string;
  email: string;
  children: Child[];
}

export default function FamilyDashboard({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = use(params);
  const router = useRouter();
  const [family, setFamily] = useState<Family | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', birth_date: '', color: '#4F46E5' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadFamily();
  }, [familyId]);

  const loadFamily = async () => {
    try {
      // Load family
      const famRes = await fetch(`/api/montree-home/families?id=${familyId}`);
      const famData = await famRes.json();
      if (famData.families?.[0]) {
        setFamily(famData.families[0]);
      }

      // Load children with progress
      const childRes = await fetch(`/api/montree-home/children?family_id=${familyId}&include_progress=true`);
      const childData = await childRes.json();
      setChildren(childData.children || []);
    } catch (err) {
      console.error('Error loading family:', err);
    } finally {
      setLoading(false);
    }
  };

  const addChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch('/api/montree-home/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          ...newChild
        })
      });
      if (res.ok) {
        setShowAddChild(false);
        setNewChild({ name: '', birth_date: '', color: '#4F46E5' });
        loadFamily();
      }
    } catch (err) {
      console.error('Error adding child:', err);
    } finally {
      setAdding(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('montree_family_id');
    router.push('/parent/home');
  };

  const getAge = (birthDate: string) => {
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
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => router.push(`/parent/home/${familyId}/materials`)}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Materials</h4>
              <p className="text-xs text-gray-500">Shopping checklist</p>
            </div>
          </button>
          <button
            onClick={() => router.push(`/parent/home/${familyId}/planner`)}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Planner</h4>
              <p className="text-xs text-gray-500">Weekly schedule</p>
            </div>
          </button>
        </div>

        {/* Children Cards */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Children</h3>
            <button
              onClick={() => setShowAddChild(true)}
              className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
            >
              <Plus className="w-4 h-4" />
              Add Child
            </button>
          </div>

          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Add your first child</h4>
              <p className="text-gray-600 text-sm mb-4">
                Get started by adding a child to track their Montessori journey
              </p>
              <button
                onClick={() => setShowAddChild(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-green-700"
              >
                Add Child
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
                      style={{ backgroundColor: child.color }}
                    >
                      {child.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">{child.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {getAge(child.birth_date)}
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
              value={250}
              label="Total Activities"
              color="blue"
            />
          </div>
        )}
      </main>

      {/* Add Child Modal */}
      {showAddChild && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add a Child</h3>
            <form onSubmit={addChild} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child&apos;s Name
                </label>
                <input
                  type="text"
                  value={newChild.name}
                  onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                  placeholder="Enter name"
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={newChild.birth_date}
                  onChange={(e) => setNewChild({ ...newChild, birth_date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewChild({ ...newChild, color })}
                      className={`w-8 h-8 rounded-full border-2 ${newChild.color === color ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddChild(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Child'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm text-center">
      <div className={`text-2xl font-bold ${colors[color as keyof typeof colors]?.split(' ')[1] || 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
